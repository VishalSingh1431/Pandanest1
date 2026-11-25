import express from 'express';
import bcrypt from 'bcryptjs';
import { getDB } from '../db.js';
import { readAdminStore, writeAdminStore } from '../dbAdminPortal.js';
import { authenticatePortalUser, requireSuperAdmin, recordAuditLog } from '../middleware/adminPortalAuth.js';

const router = express.Router();

const ALL_PAGES = [
  'main_ledger',
  'partner_kharcha',
  'vendor_page',
  'salary_rent',
  'platform_profit',
  'investment',
  'audit_logs',
  'user_access'
];

// All routes here strictly require Super Admin credentials
router.use(authenticatePortalUser, requireSuperAdmin);

/**
 * GET /api/admin-portal/users
 * Returns all portal users with their current page permission assignments
 */
router.get('/', async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const usersRes = await pool.query(
        'SELECT id, email, name, role, is_verified, is_active, created_at FROM admin_portal_users ORDER BY id ASC'
      );
      const permsRes = await pool.query(
        'SELECT user_email, page_key, access_level FROM admin_portal_permissions'
      );

      const permsMap = {};
      for (const p of permsRes.rows) {
        const email = p.user_email.toLowerCase();
        if (!permsMap[email]) permsMap[email] = {};
        permsMap[email][p.page_key] = p.access_level;
      }

      const users = usersRes.rows.map((u) => ({
        ...u,
        permissions: u.role === 'super_admin' ? 'ALL_EDIT' : {
          ...ALL_PAGES.reduce((acc, pg) => ({ ...acc, [pg]: 'none' }), {}),
          ...(permsMap[u.email.toLowerCase()] || {}),
        },
      }));

      return res.json({ users });
    } else {
      const store = readAdminStore();
      const permsMap = {};
      for (const p of store.permissions || []) {
        const email = p.user_email.toLowerCase();
        if (!permsMap[email]) permsMap[email] = {};
        permsMap[email][p.page_key] = p.access_level;
      }

      const users = (store.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        is_verified: u.is_verified,
        is_active: u.is_active,
        created_at: u.created_at,
        permissions: u.role === 'super_admin' ? 'ALL_EDIT' : {
          ...ALL_PAGES.reduce((acc, pg) => ({ ...acc, [pg]: 'none' }), {}),
          ...(permsMap[u.email.toLowerCase()] || {}),
        },
      }));

      return res.json({ users });
    }
  } catch (err) {
    console.error('Fetch portal users error:', err);
    return res.status(500).json({ error: 'Failed to retrieve portal users.' });
  }
});

/**
 * POST /api/admin-portal/users/invite
 * Adds a new authorized user and sets their initial page-level permissions.
 */
router.post('/invite', async (req, res) => {
  try {
    const { email, name, role = 'member', permissions = {}, initialPassword } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { isPostgres, pool } = getDB();

    let passwordHash = null;
    if (initialPassword) {
      passwordHash = bcrypt.hashSync(initialPassword, 10);
    } else {
      passwordHash = bcrypt.hashSync('Pandanest@123', 10);
    }

    let createdUser = null;

    if (isPostgres && pool) {
      // Check if already exists
      const existing = await pool.query('SELECT id FROM admin_portal_users WHERE LOWER(email) = $1', [normalizedEmail]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: `User with email '${normalizedEmail}' already exists.` });
      }

      const insertRes = await pool.query(
        `INSERT INTO admin_portal_users (email, name, role, is_verified, is_active, password_hash)
         VALUES ($1, $2, $3, true, true, $4) RETURNING id, email, name, role, is_verified, is_active, created_at`,
        [normalizedEmail, name || normalizedEmail.split('@')[0], role, passwordHash]
      );
      createdUser = insertRes.rows[0];

      // Insert permissions
      for (const page of ALL_PAGES) {
        const level = permissions[page] || (role === 'super_admin' ? 'edit' : 'view');
        await pool.query(
          `INSERT INTO admin_portal_permissions (user_email, page_key, access_level, granted_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_email, page_key) DO UPDATE SET access_level = $3`,
          [normalizedEmail, page, level, req.user.email]
        );
      }
    } else {
      const store = readAdminStore();
      const existing = (store.users || []).find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        return res.status(400).json({ error: `User with email '${normalizedEmail}' already exists.` });
      }

      const newId = (store.users || []).length > 0 ? Math.max(...store.users.map((u) => u.id || 0)) + 1 : 1;
      createdUser = {
        id: newId,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        role,
        is_verified: true,
        is_active: true,
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
      };
      store.users.push(createdUser);

      // Save permissions
      if (!store.permissions) store.permissions = [];
      for (const page of ALL_PAGES) {
        const level = permissions[page] || (role === 'super_admin' ? 'edit' : 'view');
        store.permissions.push({
          id: `${normalizedEmail}_${page}`,
          user_email: normalizedEmail,
          page_key: page,
          access_level: level,
          granted_by: req.user.email,
          updated_at: new Date().toISOString(),
        });
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'USER_ACCESS',
      action: 'INVITE_USER',
      recordId: String(createdUser.id),
      description: `Invited user ${normalizedEmail} with role '${role}'.`,
      newValues: { email: normalizedEmail, role, permissions },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `User '${normalizedEmail}' successfully added to authorized list.`,
      user: createdUser,
    });
  } catch (err) {
    console.error('Invite portal user error:', err);
    return res.status(500).json({ error: 'Failed to add user.' });
  }
});

/**
 * PUT /api/admin-portal/users/:id/permissions
 * Updates the page permissions matrix for a user.
 */
router.put('/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, role } = req.body;

    const { isPostgres, pool } = getDB();
    let targetUser = null;
    let oldPermissions = {};

    if (isPostgres && pool) {
      const userRes = await pool.query('SELECT id, email, name, role FROM admin_portal_users WHERE id = $1', [id]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
      targetUser = userRes.rows[0];

      // Fetch old permissions for diff log
      const oldPermsRes = await pool.query('SELECT page_key, access_level FROM admin_portal_permissions WHERE LOWER(user_email) = $1', [targetUser.email.toLowerCase()]);
      for (const r of oldPermsRes.rows) oldPermissions[r.page_key] = r.access_level;

      if (role && role !== targetUser.role) {
        await pool.query('UPDATE admin_portal_users SET role = $1 WHERE id = $2', [role, id]);
      }

      for (const [pageKey, accessLevel] of Object.entries(permissions || {})) {
        if (ALL_PAGES.includes(pageKey)) {
          await pool.query(
            `INSERT INTO admin_portal_permissions (user_email, page_key, access_level, granted_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_email, page_key) DO UPDATE SET access_level = $3, updated_at = CURRENT_TIMESTAMP`,
            [targetUser.email.toLowerCase(), pageKey, accessLevel, req.user.email]
          );
        }
      }
    } else {
      const store = readAdminStore();
      targetUser = (store.users || []).find((u) => u.id === Number(id));
      if (!targetUser) return res.status(404).json({ error: 'User not found.' });

      // Grab old permissions
      for (const p of store.permissions || []) {
        if (p.user_email.toLowerCase() === targetUser.email.toLowerCase()) {
          oldPermissions[p.page_key] = p.access_level;
        }
      }

      if (role) targetUser.role = role;

      if (!store.permissions) store.permissions = [];
      for (const [pageKey, accessLevel] of Object.entries(permissions || {})) {
        if (ALL_PAGES.includes(pageKey)) {
          const existing = store.permissions.find(
            (p) => p.user_email.toLowerCase() === targetUser.email.toLowerCase() && p.page_key === pageKey
          );
          if (existing) {
            existing.access_level = accessLevel;
            existing.updated_at = new Date().toISOString();
            existing.granted_by = req.user.email;
          } else {
            store.permissions.push({
              id: `${targetUser.email}_${pageKey}`,
              user_email: targetUser.email.toLowerCase(),
              page_key: pageKey,
              access_level: accessLevel,
              granted_by: req.user.email,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'USER_ACCESS',
      action: 'UPDATE_PERMISSIONS',
      recordId: String(id),
      description: `Updated permissions for ${targetUser.email}.`,
      oldValues: oldPermissions,
      newValues: permissions,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Permissions updated successfully for ${targetUser.email}.`,
    });
  } catch (err) {
    console.error('Update permissions error:', err);
    return res.status(500).json({ error: 'Failed to update permissions.' });
  }
});

/**
 * PUT /api/admin-portal/users/:id/status
 * Toggles user active/inactive status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { isPostgres, pool } = getDB();
    let targetEmail = '';

    if (isPostgres && pool) {
      const uRes = await pool.query('SELECT email, is_active FROM admin_portal_users WHERE id = $1', [id]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
      targetEmail = uRes.rows[0].email;

      await pool.query('UPDATE admin_portal_users SET is_active = $1 WHERE id = $2', [is_active, id]);
    } else {
      const store = readAdminStore();
      const u = (store.users || []).find((usr) => usr.id === Number(id));
      if (!u) return res.status(404).json({ error: 'User not found.' });
      targetEmail = u.email;
      u.is_active = is_active;
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'USER_ACCESS',
      action: 'TOGGLE_STATUS',
      recordId: String(id),
      description: `${is_active ? 'Activated' : 'Deactivated'} account for ${targetEmail}.`,
      newValues: { is_active },
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `User status changed to ${is_active ? 'Active' : 'Inactive'}.` });
  } catch (err) {
    console.error('Toggle status error:', err);
    return res.status(500).json({ error: 'Failed to change user status.' });
  }
});

/**
 * DELETE /api/admin-portal/users/:id
 * Deletes user account and associated permissions
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let deletedEmail = '';

    if (isPostgres && pool) {
      const uRes = await pool.query('SELECT email, role FROM admin_portal_users WHERE id = $1', [id]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
      if (uRes.rows[0].role === 'super_admin' && uRes.rows[0].email === 'ashishpsd91@gmail.com') {
        return res.status(400).json({ error: 'The Primary Super Admin cannot be removed.' });
      }
      deletedEmail = uRes.rows[0].email;

      await pool.query('DELETE FROM admin_portal_permissions WHERE LOWER(user_email) = $1', [deletedEmail.toLowerCase()]);
      await pool.query('DELETE FROM admin_portal_users WHERE id = $1', [id]);
    } else {
      const store = readAdminStore();
      const uIndex = (store.users || []).findIndex((u) => u.id === Number(id));
      if (uIndex === -1) return res.status(404).json({ error: 'User not found.' });
      if (store.users[uIndex].email === 'ashishpsd91@gmail.com') {
        return res.status(400).json({ error: 'The Primary Super Admin cannot be removed.' });
      }
      deletedEmail = store.users[uIndex].email;
      store.users.splice(uIndex, 1);
      store.permissions = (store.permissions || []).filter((p) => p.user_email.toLowerCase() !== deletedEmail.toLowerCase());
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'USER_ACCESS',
      action: 'DELETE_USER',
      recordId: String(id),
      description: `Deleted portal user ${deletedEmail}.`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `User '${deletedEmail}' deleted successfully.` });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
