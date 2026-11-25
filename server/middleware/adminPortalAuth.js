import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getDB } from '../db.js';
import { readAdminStore, writeAdminStore } from '../dbAdminPortal.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'pandanest_super_secret_jwt_key_2026_xyz';

/**
 * Authenticates requests to the admin.pandanest.in portal.
 * Verifies JWT token, ensures user is active and verified.
 */
export async function authenticatePortalUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No authorization token provided.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Malformed authorization token format.' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user is active in DB/store
    const { isPostgres, pool } = getDB();
    let user = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        'SELECT id, email, name, role, is_verified, is_active FROM admin_portal_users WHERE email = $1',
        [decoded.email]
      );
      if (resDb.rows.length > 0) user = resDb.rows[0];
    } else {
      const store = readAdminStore();
      user = (store.users || []).find((u) => u.email.toLowerCase() === decoded.email.toLowerCase());
    }

    if (!user) {
      return res.status(401).json({ error: 'User account not found or access revoked.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your portal access has been deactivated. Please contact the Super Admin.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Email verification required before accessing this portal.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

/**
 * RBAC Guard: Checks whether user has permission to view or edit the specified page.
 * @param {string} pageKey - e.g. 'main_ledger', 'partner_kharcha', 'vendor_page', 'salary_rent', 'platform_profit', 'investment', 'audit_logs', 'user_access'
 * @param {'view'|'edit'} requiredMode - 'view' or 'edit'
 */
export function requirePagePermission(pageKey, requiredMode = 'view') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Super Admin has full unrestricted EDIT rights to everything
    if (req.user.role === 'super_admin') {
      req.accessLevel = 'edit';
      return next();
    }

    const { isPostgres, pool } = getDB();
    let accessLevel = 'none';

    try {
      if (isPostgres && pool) {
        const permRes = await pool.query(
          'SELECT access_level FROM admin_portal_permissions WHERE user_email = $1 AND page_key = $2',
          [req.user.email, pageKey]
        );
        if (permRes.rows.length > 0) {
          accessLevel = permRes.rows[0].access_level;
        }
      } else {
        const store = readAdminStore();
        const perm = (store.permissions || []).find(
          (p) => p.user_email.toLowerCase() === req.user.email.toLowerCase() && p.page_key === pageKey
        );
        if (perm) accessLevel = perm.access_level;
      }

      if (accessLevel === 'none' || !accessLevel) {
        return res.status(403).json({
          error: `Access Denied: You do not have permission to view or access the '${pageKey}' module.`,
        });
      }

      if (requiredMode === 'edit' && accessLevel !== 'edit') {
        return res.status(403).json({
          error: `Read-Only: You have View-Only access to the '${pageKey}' module. Edits, additions, and deletions are disabled.`,
        });
      }

      req.accessLevel = accessLevel;
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ error: 'Failed to verify module permissions.' });
    }
  };
}

/**
 * Super Admin strictly only
 */
export function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Restricted action. Super Admin credentials required.' });
  }
  next();
}

/**
 * Central Audit Logger Helper: Records who edited what, when, and changes diff.
 */
export async function recordAuditLog({
  userEmail,
  userName,
  module,
  action,
  recordId,
  description,
  oldValues = null,
  newValues = null,
  ipAddress = '',
}) {
  const { isPostgres, pool } = getDB();

  try {
    if (isPostgres && pool) {
      await pool.query(
        `INSERT INTO admin_portal_audit_logs 
         (user_email, user_name, module, action, record_id, description, old_values, new_values, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userEmail,
          userName || userEmail,
          module,
          action,
          recordId ? String(recordId) : null,
          description || '',
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          ipAddress,
        ]
      );
    } else {
      const store = readAdminStore();
      const logs = store.audit_logs || [];
      const newLog = {
        id: logs.length > 0 ? Math.max(...logs.map((l) => l.id || 0)) + 1 : 1,
        user_email: userEmail,
        user_name: userName || userEmail,
        module,
        action,
        record_id: recordId ? String(recordId) : null,
        description: description || '',
        old_values: oldValues,
        new_values: newValues,
        ip_address: ipAddress,
        created_at: new Date().toISOString(),
      };
      logs.unshift(newLog);
      store.audit_logs = logs.slice(0, 5000); // Keep last 5000 logs
      writeAdminStore(store);
    }
    console.log(`📝 [AUDIT LOG] ${userEmail} performed ${action} on ${module} (${recordId || 'N/A'})`);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
