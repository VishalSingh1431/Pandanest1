import express from 'express';
import { getDB } from '../db.js';
import { readAdminStore } from '../dbAdminPortal.js';
import { authenticatePortalUser, requirePagePermission } from '../middleware/adminPortalAuth.js';

const router = express.Router();

router.use(authenticatePortalUser, requirePagePermission('audit_logs', 'view'));

/**
 * GET /api/admin-portal/audit-logs
 * Filterable and searchable audit trail
 */
router.get('/', async (req, res) => {
  try {
    const { module, email, action, search, limit = 100, offset = 0 } = req.query;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      let query = 'SELECT * FROM admin_portal_audit_logs WHERE 1=1';
      const params = [];
      let pIdx = 1;

      if (module) {
        query += ` AND module = $${pIdx++}`;
        params.push(module);
      }
      if (email) {
        query += ` AND LOWER(user_email) LIKE $${pIdx++}`;
        params.push(`%${email.toLowerCase()}%`);
      }
      if (action) {
        query += ` AND action = $${pIdx++}`;
        params.push(action);
      }
      if (search) {
        query += ` AND (description ILIKE $${pIdx} OR user_name ILIKE $${pIdx} OR record_id ILIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const countRes = await pool.query('SELECT COUNT(*) as count FROM admin_portal_audit_logs');
      const logsRes = await pool.query(query, params);

      return res.json({
        total: parseInt(countRes.rows[0].count, 10),
        logs: logsRes.rows,
      });
    } else {
      const store = readAdminStore();
      let logs = [...(store.audit_logs || [])];

      if (module) {
        logs = logs.filter((l) => l.module === module);
      }
      if (email) {
        logs = logs.filter((l) => l.user_email.toLowerCase().includes(email.toLowerCase()));
      }
      if (action) {
        logs = logs.filter((l) => l.action === action);
      }
      if (search) {
        const s = search.toLowerCase();
        logs = logs.filter(
          (l) =>
            (l.description && l.description.toLowerCase().includes(s)) ||
            (l.user_name && l.user_name.toLowerCase().includes(s)) ||
            (l.record_id && l.record_id.toLowerCase().includes(s))
        );
      }

      const total = logs.length;
      const paginated = logs.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

      return res.json({
        total,
        logs: paginated,
      });
    }
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

export default router;
