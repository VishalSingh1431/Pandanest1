import express from 'express';
import bcrypt from 'bcryptjs';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - Super Admin: View all team members, admins, and role stats
router.get('/', authenticateSuperAdmin, async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    let adminsList = [];
    let totalCustomers = 0;

    if (isPostgres && pool) {
      const adminsRes = await pool.query(
        'SELECT id, name, email, role, phone, created_at FROM admins ORDER BY created_at ASC'
      );
      adminsList = adminsRes.rows;

      const leadsCountRes = await pool.query('SELECT COUNT(*) as count FROM leads');
      totalCustomers = parseInt(leadsCountRes.rows[0].count, 10);
    } else {
      const store = readLocalStore();
      adminsList = (store.admins || []).map(({ password_hash, ...rest }) => rest);
      totalCustomers = (store.leads || []).length;
    }

    const superAdminsCount = adminsList.filter(a => a.role === 'super_admin').length;
    const adminsCount = adminsList.filter(a => a.role === 'admin').length;
    const demotedUsersCount = adminsList.filter(a => a.role === 'user').length;

    res.json({
      team: adminsList,
      stats: {
        totalSuperAdmins: superAdminsCount,
        totalAdmins: adminsCount,
        totalDemotedUsers: demotedUsersCount,
        totalCustomers: totalCustomers
      }
    });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to retrieve team members.' });
  }
});

// POST /api/users/promote - Super Admin: Promote a user to Admin or Super Admin
router.post('/promote', authenticateSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required to promote or create an admin.' });
    }

    const targetRole = role === 'super_admin' ? 'super_admin' : 'admin';
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = (phone || '').trim();

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      // Check if user already exists
      const existing = await pool.query('SELECT id, role FROM admins WHERE email = $1', [cleanEmail]);

      if (existing.rows.length > 0) {
        // Update existing user with new role and password
        const updated = await pool.query(
          `UPDATE admins
           SET role = $1, password_hash = $2, name = COALESCE($3, name), phone = COALESCE($4, phone)
           WHERE id = $5
           RETURNING id, name, email, role, phone, created_at`,
          [targetRole, passwordHash, name.trim(), cleanPhone, existing.rows[0].id]
        );
        return res.json({
          success: true,
          message: `User ${name} promoted to ${targetRole === 'super_admin' ? 'Super Admin' : 'Admin'} successfully!`,
          user: updated.rows[0]
        });
      } else {
        // Insert new admin
        const result = await pool.query(
          `INSERT INTO admins (name, email, password_hash, role, phone)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, name, email, role, phone, created_at`,
          [name.trim(), cleanEmail, passwordHash, targetRole, cleanPhone]
        );
        return res.status(201).json({
          success: true,
          message: `User ${name} promoted to ${targetRole === 'super_admin' ? 'Super Admin' : 'Admin'} successfully!`,
          user: result.rows[0]
        });
      }
    } else {
      const store = readLocalStore();
      store.admins = store.admins || [];
      const idx = store.admins.findIndex(a => a.email.toLowerCase() === cleanEmail);

      if (idx !== -1) {
        store.admins[idx].role = targetRole;
        store.admins[idx].password_hash = passwordHash;
        store.admins[idx].name = name.trim();
        store.admins[idx].phone = cleanPhone;
        writeLocalStore(store);
        const { password_hash, ...safeUser } = store.admins[idx];
        return res.json({
          success: true,
          message: `User ${name} promoted to ${targetRole === 'super_admin' ? 'Super Admin' : 'Admin'} successfully!`,
          user: safeUser
        });
      } else {
        const newAdmin = {
          id: Date.now(),
          name: name.trim(),
          email: cleanEmail,
          password_hash: passwordHash,
          role: targetRole,
          phone: cleanPhone,
          created_at: new Date().toISOString()
        };
        store.admins.push(newAdmin);
        writeLocalStore(store);
        const { password_hash, ...safeUser } = newAdmin;
        return res.status(201).json({
          success: true,
          message: `User ${name} promoted to ${targetRole === 'super_admin' ? 'Super Admin' : 'Admin'} successfully!`,
          user: safeUser
        });
      }
    }
  } catch (err) {
    console.error('Promote user error:', err);
    res.status(500).json({ error: 'Failed to promote user: ' + err.message });
  }
});

// PATCH /api/users/:id/role - Super Admin: Change user hierarchy (super_admin, admin, user)
router.patch('/:id/role', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['super_admin', 'admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be super_admin, admin, or user.' });
    }

    // Prevent demoting oneself
    if (String(req.admin.id) === String(id) && role !== 'super_admin') {
      return res.status(400).json({ error: 'You cannot demote yourself from Super Admin status.' });
    }

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      // Check target user
      const targetUser = await pool.query('SELECT id, role, email FROM admins WHERE id = $1', [id]);
      if (targetUser.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Check if trying to demote the last super_admin
      if (targetUser.rows[0].role === 'super_admin' && role !== 'super_admin') {
        const superCount = await pool.query("SELECT COUNT(*) as count FROM admins WHERE role = 'super_admin'");
        if (parseInt(superCount.rows[0].count, 10) <= 1) {
          return res.status(400).json({ error: 'Cannot demote the only remaining Super Admin.' });
        }
      }

      const result = await pool.query(
        'UPDATE admins SET role = $1 WHERE id = $2 RETURNING id, name, email, role, phone, created_at',
        [role, id]
      );

      return res.json({
        success: true,
        message: `Role changed to ${role} successfully.`,
        user: result.rows[0]
      });
    } else {
      const store = readLocalStore();
      const user = (store.admins || []).find(a => String(a.id) === String(id));
      if (!user) return res.status(404).json({ error: 'User not found.' });

      if (user.role === 'super_admin' && role !== 'super_admin') {
        const superCount = store.admins.filter(a => a.role === 'super_admin').length;
        if (superCount <= 1) {
          return res.status(400).json({ error: 'Cannot demote the only remaining Super Admin.' });
        }
      }

      user.role = role;
      writeLocalStore(store);
      const { password_hash, ...safeUser } = user;
      return res.json({
        success: true,
        message: `Role changed to ${role} successfully.`,
        user: safeUser
      });
    }
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// DELETE /api/users/:id - Super Admin: Delete an admin account
router.delete('/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.admin.id) === String(id)) {
      return res.status(400).json({ error: 'You cannot delete your own Super Admin account.' });
    }

    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      await pool.query('DELETE FROM admins WHERE id = $1', [id]);
    } else {
      const store = readLocalStore();
      store.admins = (store.admins || []).filter(a => String(a.id) !== String(id));
      writeLocalStore(store);
    }

    res.json({ success: true, message: 'User account deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
