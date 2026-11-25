import express from 'express';
import { getDB } from '../db.js';
import { readAdminStore, writeAdminStore } from '../dbAdminPortal.js';
import {
  authenticatePortalUser,
  requirePagePermission,
  recordAuditLog,
} from '../middleware/adminPortalAuth.js';
import {
  sendFirmDailyReport,
  sendConsolidatedDailyReport,
} from '../adminEmailService.js';
import { sendDailyConsolidatedSMS } from '../adminSmsService.js';

const router = express.Router();

// All accounting routes require authenticated portal user
router.use(authenticatePortalUser);

// ============================================================================
// PAGE 1: MULTI-FIRM CASHBOOK & DAILY LEDGER (Acube, Treo, Tritoy, Cash)
// ============================================================================

/**
 * GET /api/admin-portal/accounting/firms
 */
router.get('/firms', requirePagePermission('main_ledger', 'view'), async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM admin_portal_firms WHERE is_active = true ORDER BY display_order ASC');
      return res.json({ firms: result.rows });
    } else {
      const store = readAdminStore();
      return res.json({ firms: (store.firms || []).filter((f) => f.is_active) });
    }
  } catch (err) {
    console.error('Fetch firms error:', err);
    return res.status(500).json({ error: 'Failed to fetch firms.' });
  }
});

/**
 * GET /api/admin-portal/accounting/ledger-entries
 * Filter by date (defaults to today or specified date) and firm_code
 */
router.get('/ledger-entries', requirePagePermission('main_ledger', 'view'), async (req, res) => {
  try {
    const { firm_code, date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      let sql = 'SELECT * FROM admin_portal_ledger_entries WHERE entry_date = $1';
      const params = [targetDate];
      if (firm_code) {
        sql += ' AND firm_code = $2';
        params.push(firm_code);
      }
      sql += ' ORDER BY id DESC';
      const result = await pool.query(sql, params);
      return res.json({ entries: result.rows, date: targetDate, userAccessLevel: req.accessLevel });
    } else {
      const store = readAdminStore();
      let entries = (store.ledger_entries || []).filter((e) => {
        const matchesDate = e.entry_date === targetDate;
        const matchesFirm = firm_code ? e.firm_code === firm_code : true;
        return matchesDate && matchesFirm;
      });
      return res.json({ entries, date: targetDate, userAccessLevel: req.accessLevel });
    }
  } catch (err) {
    console.error('Fetch ledger entries error:', err);
    return res.status(500).json({ error: 'Failed to fetch ledger transactions.' });
  }
});

/**
 * POST /api/admin-portal/accounting/ledger-entries
 * Add In/Out transaction
 */
router.post('/ledger-entries', requirePagePermission('main_ledger', 'edit'), async (req, res) => {
  try {
    const { firm_code, flow_type, entry_date, category, party_name, reason, amount } = req.body;
    if (!firm_code || !flow_type || !amount) {
      return res.status(400).json({ error: 'Firm, flow type (in/out), and amount are required.' });
    }

    const tDate = entry_date || new Date().toISOString().split('T')[0];
    const parsedAmount = Number(amount);
    const { isPostgres, pool } = getDB();
    let newEntry = null;

    if (isPostgres && pool) {
      const result = await pool.query(
        `INSERT INTO admin_portal_ledger_entries 
         (firm_code, flow_type, entry_date, category, party_name, reason, amount, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [firm_code, flow_type, tDate, category || '', party_name || '', reason || '', parsedAmount, req.user.email]
      );
      newEntry = result.rows[0];
    } else {
      const store = readAdminStore();
      const newId = (store.ledger_entries || []).length > 0 ? Math.max(...store.ledger_entries.map((e) => e.id || 0)) + 1 : 1;
      newEntry = {
        id: newId,
        firm_code,
        flow_type,
        entry_date: tDate,
        category: category || '',
        party_name: party_name || '',
        reason: reason || '',
        amount: parsedAmount,
        created_by: req.user.email,
        created_at: new Date().toISOString(),
      };
      if (!store.ledger_entries) store.ledger_entries = [];
      store.ledger_entries.unshift(newEntry);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'MAIN_LEDGER',
      action: 'CREATE_TRANSACTION',
      recordId: String(newEntry.id),
      description: `Logged ₹${parsedAmount} (${flow_type.toUpperCase()}) for ${firm_code.toUpperCase()} [${category || party_name || ''}]`,
      newValues: newEntry,
      ipAddress: req.ip,
    });

    return res.json({ success: true, entry: newEntry });
  } catch (err) {
    console.error('Create ledger entry error:', err);
    return res.status(500).json({ error: 'Failed to record transaction.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/ledger-entries/:id
 */
router.delete('/ledger-entries/:id', requirePagePermission('main_ledger', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let oldEntry = null;

    if (isPostgres && pool) {
      const oldRes = await pool.query('SELECT * FROM admin_portal_ledger_entries WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) return res.status(404).json({ error: 'Transaction not found.' });
      oldEntry = oldRes.rows[0];
      await pool.query('DELETE FROM admin_portal_ledger_entries WHERE id = $1', [id]);
    } else {
      const store = readAdminStore();
      const idx = (store.ledger_entries || []).findIndex((e) => e.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Transaction not found.' });
      oldEntry = store.ledger_entries[idx];
      store.ledger_entries.splice(idx, 1);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'MAIN_LEDGER',
      action: 'DELETE_TRANSACTION',
      recordId: String(id),
      description: `Deleted ₹${oldEntry.amount} transaction from ${oldEntry.firm_code}`,
      oldValues: oldEntry,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Transaction deleted.' });
  } catch (err) {
    console.error('Delete ledger entry error:', err);
    return res.status(500).json({ error: 'Failed to delete transaction.' });
  }
});

/**
 * PUT /api/admin-portal/accounting/ledger-entries/:id
 * Edit existing In/Out ledger transaction
 */
router.put('/ledger-entries/:id', requirePagePermission('main_ledger', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firm_code, flow_type, entry_date, category, party_name, reason, amount } = req.body;
    const { isPostgres, pool } = getDB();

    let oldEntry = null;
    let updatedEntry = null;
    const parsedAmount = Number(amount);

    if (isPostgres && pool) {
      const oldRes = await pool.query('SELECT * FROM admin_portal_ledger_entries WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) return res.status(404).json({ error: 'Transaction not found.' });
      oldEntry = oldRes.rows[0];

      const upRes = await pool.query(
        `UPDATE admin_portal_ledger_entries 
         SET firm_code = COALESCE($1, firm_code),
             flow_type = COALESCE($2, flow_type),
             entry_date = COALESCE($3, entry_date),
             category = COALESCE($4, category),
             party_name = COALESCE($5, party_name),
             reason = COALESCE($6, reason),
             amount = COALESCE($7, amount),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 RETURNING *`,
        [firm_code, flow_type, entry_date, category, party_name, reason, parsedAmount, id]
      );
      updatedEntry = upRes.rows[0];
    } else {
      const store = readAdminStore();
      const idx = (store.ledger_entries || []).findIndex((e) => e.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Transaction not found.' });
      oldEntry = { ...store.ledger_entries[idx] };

      if (firm_code) store.ledger_entries[idx].firm_code = firm_code;
      if (flow_type) store.ledger_entries[idx].flow_type = flow_type;
      if (entry_date) store.ledger_entries[idx].entry_date = entry_date;
      if (category !== undefined) store.ledger_entries[idx].category = category;
      if (party_name !== undefined) store.ledger_entries[idx].party_name = party_name;
      if (reason !== undefined) store.ledger_entries[idx].reason = reason;
      if (amount !== undefined) store.ledger_entries[idx].amount = parsedAmount;
      store.ledger_entries[idx].updated_at = new Date().toISOString();

      updatedEntry = store.ledger_entries[idx];
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'MAIN_LEDGER',
      action: 'UPDATE_TRANSACTION',
      recordId: String(id),
      description: `Updated transaction #${id} in ${updatedEntry.firm_code}: ₹${parsedAmount}`,
      oldValues: oldEntry,
      newValues: updatedEntry,
      ipAddress: req.ip,
    });

    return res.json({ success: true, entry: updatedEntry });
  } catch (err) {
    console.error('Update ledger entry error:', err);
    return res.status(500).json({ error: 'Failed to update transaction.' });
  }
});

/**
 * POST /api/admin-portal/accounting/send-eod-reports
 * Sends individual firm email reports + consolidated EOD summary report
 */
router.post('/send-eod-reports', requirePagePermission('main_ledger', 'edit'), async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { isPostgres, pool } = getDB();
    let firms = [];
    let entries = [];

    if (isPostgres && pool) {
      const fRes = await pool.query('SELECT * FROM admin_portal_firms WHERE is_active = true');
      firms = fRes.rows;
      const eRes = await pool.query('SELECT * FROM admin_portal_ledger_entries WHERE entry_date = $1', [targetDate]);
      entries = eRes.rows;
    } else {
      const store = readAdminStore();
      firms = (store.firms || []).filter((f) => f.is_active);
      entries = (store.ledger_entries || []).filter((e) => e.entry_date === targetDate);
    }

    const firmSummaries = [];
    let overallIn = 0;
    let overallOut = 0;

    for (const firm of firms) {
      const firmEntries = entries.filter((e) => e.firm_code === firm.code);
      const inTotal = firmEntries.filter((e) => e.flow_type === 'in').reduce((s, e) => s + Number(e.amount), 0);
      const outTotal = firmEntries.filter((e) => e.flow_type === 'out').reduce((s, e) => s + Number(e.amount), 0);
      const netBalance = inTotal - outTotal;

      overallIn += inTotal;
      overallOut += outTotal;

      firmSummaries.push({
        name: firm.name,
        code: firm.code,
        assigned_email: firm.assigned_email,
        inTotal,
        outTotal,
        netBalance,
      });

      // Send per-firm report to assigned partner
      if (firm.assigned_email) {
        await sendFirmDailyReport({
          firmName: firm.name,
          recipientEmail: firm.assigned_email,
          date: targetDate,
          inTotal,
          outTotal,
          balance: netBalance,
          entries: firmEntries,
        });
      }
    }

    const overallNet = overallIn - overallOut;

    // Send overall consolidated report
    await sendConsolidatedDailyReport({
      date: targetDate,
      firmSummaries,
      overallIn,
      overallOut,
      overallNet,
    });

    // Send overall consolidated SMS
    await sendDailyConsolidatedSMS({
      date: targetDate,
      overallIn,
      overallOut,
      overallNet,
    });

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'MAIN_LEDGER',
      action: 'TRIGGER_EOD_REPORTS',
      description: `Dispatched EOD financial email reports for date ${targetDate} (Overall Net: ₹${overallNet})`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Daily financial reports for ${targetDate} successfully sent to partners!`,
      overallIn,
      overallOut,
      overallNet,
      firmSummaries,
    });
  } catch (err) {
    console.error('Trigger EOD reports error:', err);
    return res.status(500).json({ error: 'Failed to send EOD reports.' });
  }
});

// ============================================================================
// PAGE 2: PARTNER KHARCHA (गल्ला / DAILY PETTY EXPENSES)
// ============================================================================

/**
 * GET /api/admin-portal/accounting/galla
 */
router.get('/galla', requirePagePermission('partner_kharcha', 'view'), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const resDb = await pool.query(
        'SELECT * FROM admin_portal_galla_expenses WHERE entry_date = $1 ORDER BY id DESC',
        [targetDate]
      );
      return res.json({ expenses: resDb.rows, date: targetDate, userAccessLevel: req.accessLevel });
    } else {
      const store = readAdminStore();
      const expenses = (store.galla_expenses || []).filter((e) => e.entry_date === targetDate);
      return res.json({ expenses, date: targetDate, userAccessLevel: req.accessLevel });
    }
  } catch (err) {
    console.error('Fetch galla expenses error:', err);
    return res.status(500).json({ error: 'Failed to fetch partner expenses.' });
  }
});

/**
 * POST /api/admin-portal/accounting/galla
 */
router.post('/galla', requirePagePermission('partner_kharcha', 'edit'), async (req, res) => {
  try {
    const { partner_name, entry_date, reason, amount } = req.body;
    if (!partner_name || !amount || !reason) {
      return res.status(400).json({ error: 'Partner name, amount, and reason are required.' });
    }

    const tDate = entry_date || new Date().toISOString().split('T')[0];
    const parsedAmount = Number(amount);
    const { isPostgres, pool } = getDB();
    let newExp = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        `INSERT INTO admin_portal_galla_expenses (partner_name, entry_date, reason, amount, logged_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [partner_name, tDate, reason, parsedAmount, req.user.email]
      );
      newExp = resDb.rows[0];

      // Auto-Sync to Cash Outflow on Page 1
      await pool.query(
        `INSERT INTO admin_portal_ledger_entries (firm_code, flow_type, entry_date, category, party_name, reason, amount, created_by)
         VALUES ('cash', 'out', $1, 'Partner Draw', $2, $3, $4, $5)`,
        [tDate, partner_name, `[GALLA #${newExp.id}] ${reason}`, parsedAmount, req.user.email]
      );
    } else {
      const store = readAdminStore();
      const newId = (store.galla_expenses || []).length > 0 ? Math.max(...store.galla_expenses.map((e) => e.id || 0)) + 1 : 1;
      newExp = {
        id: newId,
        partner_name,
        entry_date: tDate,
        reason,
        amount: parsedAmount,
        logged_by: req.user.email,
        created_at: new Date().toISOString(),
      };
      if (!store.galla_expenses) store.galla_expenses = [];
      store.galla_expenses.unshift(newExp);

      // Auto-Sync to Cash Outflow on Page 1
      const newLedgerId = (store.ledger_entries || []).length > 0 ? Math.max(...store.ledger_entries.map((e) => e.id || 0)) + 1 : 1;
      if (!store.ledger_entries) store.ledger_entries = [];
      store.ledger_entries.unshift({
        id: newLedgerId,
        firm_code: 'cash',
        flow_type: 'out',
        entry_date: tDate,
        category: 'Partner Draw',
        party_name: partner_name,
        reason: `[GALLA #${newId}] ${reason}`,
        amount: parsedAmount,
        created_by: req.user.email,
        created_at: new Date().toISOString(),
      });

      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'PARTNER_KHARCHA',
      action: 'LOG_GALLA_EXPENSE',
      recordId: String(newExp.id),
      description: `Logged Galla expense ₹${parsedAmount} for partner ${partner_name} (${reason})`,
      newValues: newExp,
      ipAddress: req.ip,
    });

    return res.json({ success: true, expense: newExp });
  } catch (err) {
    console.error('Record galla expense error:', err);
    return res.status(500).json({ error: 'Failed to record partner expense.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/galla/:id
 */
router.delete('/galla/:id', requirePagePermission('partner_kharcha', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let oldExp = null;

    if (isPostgres && pool) {
      const resDb = await pool.query('SELECT * FROM admin_portal_galla_expenses WHERE id = $1', [id]);
      if (resDb.rows.length === 0) return res.status(404).json({ error: 'Expense not found.' });
      oldExp = resDb.rows[0];
      await pool.query('DELETE FROM admin_portal_galla_expenses WHERE id = $1', [id]);
      // Remove synced entry from Cash ledger
      await pool.query(`DELETE FROM admin_portal_ledger_entries WHERE firm_code = 'cash' AND reason LIKE $1`, [`%[GALLA #${id}]%`]);
    } else {
      const store = readAdminStore();
      const idx = (store.galla_expenses || []).findIndex((e) => e.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Expense not found.' });
      oldExp = store.galla_expenses[idx];
      store.galla_expenses.splice(idx, 1);
      // Remove synced entry from Cash ledger
      if (store.ledger_entries) {
        store.ledger_entries = store.ledger_entries.filter(
          (e) => !(e.firm_code === 'cash' && e.reason && e.reason.includes(`[GALLA #${id}]`))
        );
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'PARTNER_KHARCHA',
      action: 'DELETE_GALLA_EXPENSE',
      recordId: String(id),
      description: `Deleted partner expense ₹${oldExp.amount} for ${oldExp.partner_name} and synced with Cash`,
      oldValues: oldExp,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Expense deleted and cash balance synced.' });
  } catch (err) {
    console.error('Delete galla expense error:', err);
    return res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

/**
 * PUT /api/admin-portal/accounting/galla/:id
 * Edit existing partner kharcha and update synced cash outflow
 */
router.put('/galla/:id', requirePagePermission('partner_kharcha', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { partner_name, entry_date, reason, amount } = req.body;
    const parsedAmount = Number(amount);
    const { isPostgres, pool } = getDB();

    let oldExp = null;
    let updatedExp = null;

    if (isPostgres && pool) {
      const oldRes = await pool.query('SELECT * FROM admin_portal_galla_expenses WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) return res.status(404).json({ error: 'Expense not found.' });
      oldExp = oldRes.rows[0];

      const upRes = await pool.query(
        `UPDATE admin_portal_galla_expenses 
         SET partner_name = COALESCE($1, partner_name),
             entry_date = COALESCE($2, entry_date),
             reason = COALESCE($3, reason),
             amount = COALESCE($4, amount),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [partner_name, entry_date, reason, parsedAmount, id]
      );
      updatedExp = upRes.rows[0];

      // Update synced cash ledger entry
      await pool.query(
        `UPDATE admin_portal_ledger_entries
         SET party_name = COALESCE($1, party_name),
             entry_date = COALESCE($2, entry_date),
             reason = $3,
             amount = COALESCE($4, amount),
             updated_at = CURRENT_TIMESTAMP
         WHERE firm_code = 'cash' AND reason LIKE $5`,
        [partner_name, entry_date, `[GALLA #${id}] ${reason || updatedExp.reason}`, parsedAmount, `%[GALLA #${id}]%`]
      );
    } else {
      const store = readAdminStore();
      const idx = (store.galla_expenses || []).findIndex((e) => e.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Expense not found.' });
      oldExp = { ...store.galla_expenses[idx] };

      if (partner_name) store.galla_expenses[idx].partner_name = partner_name;
      if (entry_date) store.galla_expenses[idx].entry_date = entry_date;
      if (reason) store.galla_expenses[idx].reason = reason;
      if (amount !== undefined) store.galla_expenses[idx].amount = parsedAmount;
      store.galla_expenses[idx].updated_at = new Date().toISOString();
      updatedExp = store.galla_expenses[idx];

      // Update synced cash ledger entry
      if (store.ledger_entries) {
        const cIdx = store.ledger_entries.findIndex(
          (e) => e.firm_code === 'cash' && e.reason && e.reason.includes(`[GALLA #${id}]`)
        );
        if (cIdx !== -1) {
          if (partner_name) store.ledger_entries[cIdx].party_name = partner_name;
          if (entry_date) store.ledger_entries[cIdx].entry_date = entry_date;
          store.ledger_entries[cIdx].reason = `[GALLA #${id}] ${reason || updatedExp.reason}`;
          if (amount !== undefined) store.ledger_entries[cIdx].amount = parsedAmount;
          store.ledger_entries[cIdx].updated_at = new Date().toISOString();
        }
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'PARTNER_KHARCHA',
      action: 'UPDATE_GALLA_EXPENSE',
      recordId: String(id),
      description: `Updated Galla expense #${id} for ${updatedExp.partner_name}: ₹${parsedAmount}`,
      oldValues: oldExp,
      newValues: updatedExp,
      ipAddress: req.ip,
    });

    return res.json({ success: true, expense: updatedExp });
  } catch (err) {
    console.error('Update galla expense error:', err);
    return res.status(500).json({ error: 'Failed to update partner expense.' });
  }
});

// ============================================================================
// PAGE 3: VENDOR KHATA & OUTSTANDING BALANCE ("Kitna Rehta Hai")
// ============================================================================

/**
 * GET /api/admin-portal/accounting/vendors
 * Returns all vendors along with aggregated purchases, payments, and outstanding balance!
 */
router.get('/vendors', requirePagePermission('vendor_page', 'view'), async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const vendorsRes = await pool.query('SELECT * FROM admin_portal_vendors WHERE is_active = true ORDER BY id ASC');
      const recordsRes = await pool.query('SELECT * FROM admin_portal_vendor_records ORDER BY record_date DESC, id DESC');

      const vendorsWithBalances = vendorsRes.rows.map((v) => {
        const vRecs = recordsRes.rows.filter((r) => r.vendor_id === v.id);
        const totalPurchased = vRecs
          .filter((r) => r.record_type === 'purchase')
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const totalPaid = vRecs
          .filter((r) => r.record_type === 'payment')
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const balancePending = totalPurchased - totalPaid;

        return {
          ...v,
          totalPurchased,
          totalPaid,
          balancePending,
          records: vRecs,
        };
      });

      return res.json({ vendors: vendorsWithBalances, userAccessLevel: req.accessLevel });
    } else {
      const store = readAdminStore();
      const records = store.vendor_records || [];
      const vendors = (store.vendors || []).filter((v) => v.is_active).map((v) => {
        const vRecs = records.filter((r) => r.vendor_id === v.id);
        const totalPurchased = vRecs
          .filter((r) => r.record_type === 'purchase')
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const totalPaid = vRecs
          .filter((r) => r.record_type === 'payment')
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const balancePending = totalPurchased - totalPaid;

        return {
          ...v,
          totalPurchased,
          totalPaid,
          balancePending,
          records: vRecs,
        };
      });

      return res.json({ vendors, userAccessLevel: req.accessLevel });
    }
  } catch (err) {
    console.error('Fetch vendors error:', err);
    return res.status(500).json({ error: 'Failed to fetch vendor list.' });
  }
});

/**
 * POST /api/admin-portal/accounting/vendors
 * Admin creates new vendor dynamically ("hum vendor add kar sake")
 */
router.post('/vendors', requirePagePermission('vendor_page', 'edit'), async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Vendor name is required.' });
    }

    const { isPostgres, pool } = getDB();
    let newVendor = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        `INSERT INTO admin_portal_vendors (name, phone, address, notes)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name.trim(), phone || '', address || '', notes || '']
      );
      newVendor = resDb.rows[0];
    } else {
      const store = readAdminStore();
      const newId = (store.vendors || []).length > 0 ? Math.max(...store.vendors.map((v) => v.id || 0)) + 1 : 1;
      newVendor = {
        id: newId,
        name: name.trim(),
        phone: phone || '',
        address: address || '',
        notes: notes || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      if (!store.vendors) store.vendors = [];
      store.vendors.push(newVendor);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'VENDOR_PAGE',
      action: 'ADD_VENDOR',
      recordId: String(newVendor.id),
      description: `Added new vendor '${newVendor.name}'`,
      newValues: newVendor,
      ipAddress: req.ip,
    });

    return res.json({ success: true, vendor: newVendor });
  } catch (err) {
    console.error('Create vendor error:', err);
    return res.status(500).json({ error: 'Failed to create vendor.' });
  }
});

/**
 * POST /api/admin-portal/accounting/vendors/:id/records
 * Logs a purchase (khareeda) or payment (diya)
 */
router.post('/vendors/:id/records', requirePagePermission('vendor_page', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { record_type, record_date, bill_no, amount, notes } = req.body;

    if (!record_type || !amount) {
      return res.status(400).json({ error: 'Record type (purchase/payment) and amount are required.' });
    }

    const tDate = record_date || new Date().toISOString().split('T')[0];
    const parsedAmount = Number(amount);
    const { isPostgres, pool } = getDB();
    let newRec = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        `INSERT INTO admin_portal_vendor_records 
         (vendor_id, record_type, record_date, bill_no, amount, notes, logged_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, record_type, tDate, bill_no || '', parsedAmount, notes || '', req.user.email]
      );
      newRec = resDb.rows[0];
    } else {
      const store = readAdminStore();
      const newId = (store.vendor_records || []).length > 0 ? Math.max(...store.vendor_records.map((r) => r.id || 0)) + 1 : 1;
      newRec = {
        id: newId,
        vendor_id: Number(id),
        record_type,
        record_date: tDate,
        bill_no: bill_no || '',
        amount: parsedAmount,
        notes: notes || '',
        logged_by: req.user.email,
        created_at: new Date().toISOString(),
      };
      if (!store.vendor_records) store.vendor_records = [];
      store.vendor_records.unshift(newRec);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'VENDOR_PAGE',
      action: 'ADD_VENDOR_TRANSACTION',
      recordId: String(newRec.id),
      description: `Logged vendor ${record_type.toUpperCase()} ₹${parsedAmount} for vendor ID ${id}`,
      newValues: newRec,
      ipAddress: req.ip,
    });

    return res.json({ success: true, record: newRec });
  } catch (err) {
    console.error('Log vendor record error:', err);
    return res.status(500).json({ error: 'Failed to record vendor transaction.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/vendors/records/:recordId
 */
router.delete('/vendors/records/:recordId', requirePagePermission('vendor_page', 'edit'), async (req, res) => {
  try {
    const { recordId } = req.params;
    const { isPostgres, pool } = getDB();
    let oldRec = null;

    if (isPostgres && pool) {
      const resDb = await pool.query('SELECT * FROM admin_portal_vendor_records WHERE id = $1', [recordId]);
      if (resDb.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
      oldRec = resDb.rows[0];
      await pool.query('DELETE FROM admin_portal_vendor_records WHERE id = $1', [recordId]);
    } else {
      const store = readAdminStore();
      const idx = (store.vendor_records || []).findIndex((r) => r.id === Number(recordId));
      if (idx === -1) return res.status(404).json({ error: 'Record not found.' });
      oldRec = store.vendor_records[idx];
      store.vendor_records.splice(idx, 1);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'VENDOR_PAGE',
      action: 'DELETE_VENDOR_TRANSACTION',
      recordId: String(recordId),
      description: `Deleted vendor transaction ₹${oldRec.amount} (${oldRec.record_type})`,
      oldValues: oldRec,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Vendor transaction deleted.' });
  } catch (err) {
    console.error('Delete vendor record error:', err);
    return res.status(500).json({ error: 'Failed to delete transaction.' });
  }
});

/**
 * PUT /api/admin-portal/accounting/vendors/:id
 * Edit vendor profile
 */
router.put('/vendors/:id', requirePagePermission('vendor_page', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, notes } = req.body;
    const { isPostgres, pool } = getDB();

    let oldVendor = null;
    let updatedVendor = null;

    if (isPostgres && pool) {
      const oldRes = await pool.query('SELECT * FROM admin_portal_vendors WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) return res.status(404).json({ error: 'Vendor not found.' });
      oldVendor = oldRes.rows[0];

      const upRes = await pool.query(
        `UPDATE admin_portal_vendors
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             address = COALESCE($3, address),
             notes = COALESCE($4, notes)
         WHERE id = $5 RETURNING *`,
        [name, phone, address, notes, id]
      );
      updatedVendor = upRes.rows[0];
    } else {
      const store = readAdminStore();
      const idx = (store.vendors || []).findIndex((v) => v.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Vendor not found.' });
      oldVendor = { ...store.vendors[idx] };

      if (name) store.vendors[idx].name = name;
      if (phone !== undefined) store.vendors[idx].phone = phone;
      if (address !== undefined) store.vendors[idx].address = address;
      if (notes !== undefined) store.vendors[idx].notes = notes;
      updatedVendor = store.vendors[idx];
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'VENDOR_PAGE',
      action: 'UPDATE_VENDOR',
      recordId: String(id),
      description: `Updated vendor details for ${updatedVendor.name}`,
      oldValues: oldVendor,
      newValues: updatedVendor,
      ipAddress: req.ip,
    });

    return res.json({ success: true, vendor: updatedVendor });
  } catch (err) {
    console.error('Update vendor error:', err);
    return res.status(500).json({ error: 'Failed to update vendor.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/vendors/:id
 */
router.delete('/vendors/:id', requirePagePermission('vendor_page', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let oldVendor = null;

    if (isPostgres && pool) {
      const oldRes = await pool.query('SELECT * FROM admin_portal_vendors WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) return res.status(404).json({ error: 'Vendor not found.' });
      oldVendor = oldRes.rows[0];
      await pool.query('DELETE FROM admin_portal_vendors WHERE id = $1', [id]);
    } else {
      const store = readAdminStore();
      const idx = (store.vendors || []).findIndex((v) => v.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Vendor not found.' });
      oldVendor = store.vendors[idx];
      store.vendors.splice(idx, 1);
      // Remove vendor records
      if (store.vendor_records) {
        store.vendor_records = store.vendor_records.filter((r) => r.vendor_id !== Number(id));
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'VENDOR_PAGE',
      action: 'DELETE_VENDOR',
      recordId: String(id),
      description: `Deleted vendor ${oldVendor.name}`,
      oldValues: oldVendor,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `Vendor ${oldVendor.name} deleted.` });
  } catch (err) {
    console.error('Delete vendor error:', err);
    return res.status(500).json({ error: 'Failed to delete vendor.' });
  }
});

/**
 * PUT /api/admin-portal/accounting/vendors/records/:recordId
 * Edit existing purchase or payment transaction
 */
router.put('/vendors/records/:recordId', requirePagePermission('vendor_page', 'edit'), async (req, res) => {
  try {
    const { recordId } = req.params;
    const { record_type, record_date, bill_no, amount, notes } = req.body;
    const parsedAmount = Number(amount);
    const { isPostgres, pool } = getDB();

    let oldRec = null;
    let updatedRec = null;

    if (isPostgres && pool) {
      const oldRes = await pool.query('SELECT * FROM admin_portal_vendor_records WHERE id = $1', [recordId]);
      if (oldRes.rows.length === 0) return res.status(404).json({ error: 'Transaction not found.' });
      oldRec = oldRes.rows[0];

      const upRes = await pool.query(
        `UPDATE admin_portal_vendor_records
         SET record_type = COALESCE($1, record_type),
             record_date = COALESCE($2, record_date),
             bill_no = COALESCE($3, bill_no),
             amount = COALESCE($4, amount),
             notes = COALESCE($5, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [record_type, record_date, bill_no, parsedAmount, notes, recordId]
      );
      updatedRec = upRes.rows[0];
    } else {
      const store = readAdminStore();
      const idx = (store.vendor_records || []).findIndex((r) => r.id === Number(recordId));
      if (idx === -1) return res.status(404).json({ error: 'Transaction not found.' });
      oldRec = { ...store.vendor_records[idx] };

      if (record_type) store.vendor_records[idx].record_type = record_type;
      if (record_date) store.vendor_records[idx].record_date = record_date;
      if (bill_no !== undefined) store.vendor_records[idx].bill_no = bill_no;
      if (amount !== undefined) store.vendor_records[idx].amount = parsedAmount;
      if (notes !== undefined) store.vendor_records[idx].notes = notes;
      store.vendor_records[idx].updated_at = new Date().toISOString();
      updatedRec = store.vendor_records[idx];
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'VENDOR_PAGE',
      action: 'UPDATE_VENDOR_TRANSACTION',
      recordId: String(recordId),
      description: `Updated vendor transaction #${recordId}: ₹${parsedAmount} (${updatedRec.record_type})`,
      oldValues: oldRec,
      newValues: updatedRec,
      ipAddress: req.ip,
    });

    return res.json({ success: true, record: updatedRec });
  } catch (err) {
    console.error('Update vendor record error:', err);
    return res.status(500).json({ error: 'Failed to update transaction.' });
  }
});

// ============================================================================
// PAGE 4: SABKA SALARY + RENT (MONTH-WISE)
// ============================================================================

/**
 * GET /api/admin-portal/accounting/payroll-rent
 * Returns staff list with current month's salary slips & properties with current month's rent slips
 */
router.get('/payroll-rent', requirePagePermission('salary_rent', 'view'), async (req, res) => {
  try {
    const { month_year } = req.query;
    const targetMonth = month_year || new Date().toISOString().slice(0, 7); // e.g. '2026-11'
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const staffRes = await pool.query('SELECT * FROM admin_portal_employees WHERE is_active = true ORDER BY id ASC');
      const salaryRes = await pool.query('SELECT * FROM admin_portal_salary_records WHERE month_year = $1', [targetMonth]);

      const propRes = await pool.query('SELECT * FROM admin_portal_rent_properties WHERE is_active = true ORDER BY id ASC');
      const rentRes = await pool.query('SELECT * FROM admin_portal_rent_records WHERE month_year = $1', [targetMonth]);

      const staffWithSlips = staffRes.rows.map((s) => {
        const slip = salaryRes.rows.find((r) => r.employee_id === s.id) || null;
        return { ...s, currentMonthRecord: slip };
      });

      const propsWithSlips = propRes.rows.map((p) => {
        const slip = rentRes.rows.find((r) => r.property_id === p.id) || null;
        return { ...p, currentMonthRecord: slip };
      });

      const totalSalary = salaryRes.rows.reduce((sum, r) => sum + Number(r.net_paid || r.salary_amount || 0), 0);
      const totalRent = rentRes.rows.reduce((sum, r) => sum + Number(r.total_paid || r.rent_amount || 0), 0);

      return res.json({
        month_year: targetMonth,
        staff: staffWithSlips,
        properties: propsWithSlips,
        totalSalary,
        totalRent,
        totalPayrollAndRent: totalSalary + totalRent,
        userAccessLevel: req.accessLevel,
      });
    } else {
      const store = readAdminStore();
      const salaryRecords = (store.salary_records || []).filter((r) => r.month_year === targetMonth);
      const rentRecords = (store.rent_records || []).filter((r) => r.month_year === targetMonth);

      const staffWithSlips = (store.employees || []).filter((e) => e.is_active).map((s) => {
        const slip = salaryRecords.find((r) => r.employee_id === s.id) || null;
        return { ...s, currentMonthRecord: slip };
      });

      const propsWithSlips = (store.rent_properties || []).filter((p) => p.is_active).map((p) => {
        const slip = rentRecords.find((r) => r.property_id === p.id) || null;
        return { ...p, currentMonthRecord: slip };
      });

      const totalSalary = salaryRecords.reduce((sum, r) => sum + Number(r.net_paid || r.salary_amount || 0), 0);
      const totalRent = rentRecords.reduce((sum, r) => sum + Number(r.total_paid || r.rent_amount || 0), 0);

      return res.json({
        month_year: targetMonth,
        staff: staffWithSlips,
        properties: propsWithSlips,
        totalSalary,
        totalRent,
        totalPayrollAndRent: totalSalary + totalRent,
        userAccessLevel: req.accessLevel,
      });
    }
  } catch (err) {
    console.error('Fetch payroll & rent error:', err);
    return res.status(500).json({ error: 'Failed to fetch payroll and rent data.' });
  }
});

/**
 * POST /api/admin-portal/accounting/staff
 * "hum larke add kar sake admin pannel se"
 */
router.post('/staff', requirePagePermission('salary_rent', 'edit'), async (req, res) => {
  try {
    const { name, role, phone, default_salary } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Staff name is required.' });

    const { isPostgres, pool } = getDB();
    let newEmp = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        `INSERT INTO admin_portal_employees (name, role, phone, default_salary)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name.trim(), role || 'Staff Member', phone || '', Number(default_salary || 0)]
      );
      newEmp = resDb.rows[0];
    } else {
      const store = readAdminStore();
      const newId = (store.employees || []).length > 0 ? Math.max(...store.employees.map((e) => e.id || 0)) + 1 : 1;
      newEmp = {
        id: newId,
        name: name.trim(),
        role: role || 'Staff Member',
        phone: phone || '',
        default_salary: Number(default_salary || 0),
        is_active: true,
        created_at: new Date().toISOString(),
      };
      if (!store.employees) store.employees = [];
      store.employees.push(newEmp);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'SALARY_RENT',
      action: 'ADD_EMPLOYEE',
      recordId: String(newEmp.id),
      description: `Added staff member '${newEmp.name}' (Default Salary ₹${newEmp.default_salary})`,
      newValues: newEmp,
      ipAddress: req.ip,
    });

    return res.json({ success: true, employee: newEmp });
  } catch (err) {
    console.error('Add employee error:', err);
    return res.status(500).json({ error: 'Failed to add staff member.' });
  }
});

/**
 * POST /api/admin-portal/accounting/salary-record
 * Update or save month-wise salary entry for an employee
 */
router.post('/salary-record', requirePagePermission('salary_rent', 'edit'), async (req, res) => {
  try {
    const { employee_id, month_year, salary_amount, advance_deduction, payment_status, notes } = req.body;
    if (!employee_id || !month_year) return res.status(400).json({ error: 'Employee ID and month are required.' });

    const sAmount = Number(salary_amount || 0);
    const advDeduction = Number(advance_deduction || 0);
    const netPaid = sAmount - advDeduction;
    const { isPostgres, pool } = getDB();
    let savedRecord = null;

    if (isPostgres && pool) {
      const checkRes = await pool.query(
        'SELECT id FROM admin_portal_salary_records WHERE employee_id = $1 AND month_year = $2',
        [employee_id, month_year]
      );
      if (checkRes.rows.length > 0) {
        const updateRes = await pool.query(
          `UPDATE admin_portal_salary_records 
           SET salary_amount = $1, advance_deduction = $2, net_paid = $3, payment_status = $4, notes = $5, logged_by = $6, updated_at = CURRENT_TIMESTAMP
           WHERE id = $7 RETURNING *`,
          [sAmount, advDeduction, netPaid, payment_status || 'Paid', notes || '', req.user.email, checkRes.rows[0].id]
        );
        savedRecord = updateRes.rows[0];
      } else {
        const insertRes = await pool.query(
          `INSERT INTO admin_portal_salary_records 
           (employee_id, month_year, salary_amount, advance_deduction, net_paid, payment_status, notes, logged_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [employee_id, month_year, sAmount, advDeduction, netPaid, payment_status || 'Paid', notes || '', req.user.email]
        );
        savedRecord = insertRes.rows[0];
      }
    } else {
      const store = readAdminStore();
      if (!store.salary_records) store.salary_records = [];
      const existing = store.salary_records.find(
        (r) => r.employee_id === Number(employee_id) && r.month_year === month_year
      );
      if (existing) {
        existing.salary_amount = sAmount;
        existing.advance_deduction = advDeduction;
        existing.net_paid = netPaid;
        existing.payment_status = payment_status || 'Paid';
        existing.notes = notes || '';
        existing.logged_by = req.user.email;
        existing.updated_at = new Date().toISOString();
        savedRecord = existing;
      } else {
        const newId = store.salary_records.length > 0 ? Math.max(...store.salary_records.map((r) => r.id || 0)) + 1 : 1;
        savedRecord = {
          id: newId,
          employee_id: Number(employee_id),
          month_year,
          salary_amount: sAmount,
          advance_deduction: advDeduction,
          net_paid: netPaid,
          payment_status: payment_status || 'Paid',
          notes: notes || '',
          logged_by: req.user.email,
          created_at: new Date().toISOString(),
        };
        store.salary_records.push(savedRecord);
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'SALARY_RENT',
      action: 'UPDATE_SALARY_RECORD',
      recordId: String(savedRecord.id),
      description: `Updated salary record for staff ID ${employee_id} (${month_year}): Net Paid ₹${netPaid}`,
      newValues: savedRecord,
      ipAddress: req.ip,
    });

    return res.json({ success: true, record: savedRecord });
  } catch (err) {
    console.error('Save salary record error:', err);
    return res.status(500).json({ error: 'Failed to save salary record.' });
  }
});

/**
 * POST /api/admin-portal/accounting/properties
 * Add property / landlord
 */
router.post('/properties', requirePagePermission('salary_rent', 'edit'), async (req, res) => {
  try {
    const { property_name, landlord_name, default_rent } = req.body;
    if (!property_name || !property_name.trim()) return res.status(400).json({ error: 'Property name is required.' });

    const { isPostgres, pool } = getDB();
    let newProp = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        `INSERT INTO admin_portal_rent_properties (property_name, landlord_name, default_rent)
         VALUES ($1, $2, $3) RETURNING *`,
        [property_name.trim(), landlord_name || '', Number(default_rent || 0)]
      );
      newProp = resDb.rows[0];
    } else {
      const store = readAdminStore();
      const newId = (store.rent_properties || []).length > 0 ? Math.max(...store.rent_properties.map((p) => p.id || 0)) + 1 : 1;
      newProp = {
        id: newId,
        property_name: property_name.trim(),
        landlord_name: landlord_name || '',
        default_rent: Number(default_rent || 0),
        is_active: true,
        created_at: new Date().toISOString(),
      };
      if (!store.rent_properties) store.rent_properties = [];
      store.rent_properties.push(newProp);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'SALARY_RENT',
      action: 'ADD_PROPERTY',
      recordId: String(newProp.id),
      description: `Added rent property '${newProp.property_name}' (Default Rent ₹${newProp.default_rent})`,
      newValues: newProp,
      ipAddress: req.ip,
    });

    return res.json({ success: true, property: newProp });
  } catch (err) {
    console.error('Add property error:', err);
    return res.status(500).json({ error: 'Failed to add rent property.' });
  }
});

/**
 * POST /api/admin-portal/accounting/rent-record
 * Update or save month-wise rent entry for a property
 */
router.post('/rent-record', requirePagePermission('salary_rent', 'edit'), async (req, res) => {
  try {
    const { property_id, month_year, rent_amount, electricity_charges, payment_status, notes } = req.body;
    if (!property_id || !month_year) return res.status(400).json({ error: 'Property ID and month are required.' });

    const rAmount = Number(rent_amount || 0);
    const elecCharges = Number(electricity_charges || 0);
    const totalPaid = rAmount + elecCharges;
    const { isPostgres, pool } = getDB();
    let savedRecord = null;

    if (isPostgres && pool) {
      const checkRes = await pool.query(
        'SELECT id FROM admin_portal_rent_records WHERE property_id = $1 AND month_year = $2',
        [property_id, month_year]
      );
      if (checkRes.rows.length > 0) {
        const updateRes = await pool.query(
          `UPDATE admin_portal_rent_records 
           SET rent_amount = $1, electricity_charges = $2, total_paid = $3, payment_status = $4, notes = $5, logged_by = $6, updated_at = CURRENT_TIMESTAMP
           WHERE id = $7 RETURNING *`,
          [rAmount, elecCharges, totalPaid, payment_status || 'Paid', notes || '', req.user.email, checkRes.rows[0].id]
        );
        savedRecord = updateRes.rows[0];
      } else {
        const insertRes = await pool.query(
          `INSERT INTO admin_portal_rent_records 
           (property_id, month_year, rent_amount, electricity_charges, total_paid, payment_status, notes, logged_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [property_id, month_year, rAmount, elecCharges, totalPaid, payment_status || 'Paid', notes || '', req.user.email]
        );
        savedRecord = insertRes.rows[0];
      }
    } else {
      const store = readAdminStore();
      if (!store.rent_records) store.rent_records = [];
      const existing = store.rent_records.find(
        (r) => r.property_id === Number(property_id) && r.month_year === month_year
      );
      if (existing) {
        existing.rent_amount = rAmount;
        existing.electricity_charges = elecCharges;
        existing.total_paid = totalPaid;
        existing.payment_status = payment_status || 'Paid';
        existing.notes = notes || '';
        existing.logged_by = req.user.email;
        existing.updated_at = new Date().toISOString();
        savedRecord = existing;
      } else {
        const newId = store.rent_records.length > 0 ? Math.max(...store.rent_records.map((r) => r.id || 0)) + 1 : 1;
        savedRecord = {
          id: newId,
          property_id: Number(property_id),
          month_year,
          rent_amount: rAmount,
          electricity_charges: elecCharges,
          total_paid: totalPaid,
          payment_status: payment_status || 'Paid',
          notes: notes || '',
          logged_by: req.user.email,
          created_at: new Date().toISOString(),
        };
        store.rent_records.push(savedRecord);
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'SALARY_RENT',
      action: 'UPDATE_RENT_RECORD',
      recordId: String(savedRecord.id),
      description: `Updated rent record for property ID ${property_id} (${month_year}): Total Paid ₹${totalPaid}`,
      newValues: savedRecord,
      ipAddress: req.ip,
    });

    return res.json({ success: true, record: savedRecord });
  } catch (err) {
    console.error('Save rent record error:', err);
    return res.status(500).json({ error: 'Failed to save rent record.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/staff/:id
 */
router.delete('/staff/:id', requirePagePermission('salary_rent', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let oldEmp = null;

    if (isPostgres && pool) {
      const eRes = await pool.query('SELECT * FROM admin_portal_employees WHERE id = $1', [id]);
      if (eRes.rows.length === 0) return res.status(404).json({ error: 'Staff member not found.' });
      oldEmp = eRes.rows[0];
      await pool.query('DELETE FROM admin_portal_employees WHERE id = $1', [id]);
    } else {
      const store = readAdminStore();
      const idx = (store.employees || []).findIndex((e) => e.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Staff member not found.' });
      oldEmp = store.employees[idx];
      store.employees.splice(idx, 1);
      if (store.salary_records) {
        store.salary_records = store.salary_records.filter((r) => r.employee_id !== Number(id));
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'SALARY_RENT',
      action: 'DELETE_EMPLOYEE',
      recordId: String(id),
      description: `Removed staff member ${oldEmp.name}`,
      oldValues: oldEmp,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `Staff member ${oldEmp.name} removed.` });
  } catch (err) {
    console.error('Delete staff error:', err);
    return res.status(500).json({ error: 'Failed to remove staff member.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/properties/:id
 */
router.delete('/properties/:id', requirePagePermission('salary_rent', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let oldProp = null;

    if (isPostgres && pool) {
      const pRes = await pool.query('SELECT * FROM admin_portal_rent_properties WHERE id = $1', [id]);
      if (pRes.rows.length === 0) return res.status(404).json({ error: 'Property not found.' });
      oldProp = pRes.rows[0];
      await pool.query('DELETE FROM admin_portal_rent_properties WHERE id = $1', [id]);
    } else {
      const store = readAdminStore();
      const idx = (store.rent_properties || []).findIndex((p) => p.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Property not found.' });
      oldProp = store.rent_properties[idx];
      store.rent_properties.splice(idx, 1);
      if (store.rent_records) {
        store.rent_records = store.rent_records.filter((r) => r.property_id !== Number(id));
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'SALARY_RENT',
      action: 'DELETE_PROPERTY',
      recordId: String(id),
      description: `Removed rent property ${oldProp.property_name}`,
      oldValues: oldProp,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `Property ${oldProp.property_name} removed.` });
  } catch (err) {
    console.error('Delete property error:', err);
    return res.status(500).json({ error: 'Failed to remove property.' });
  }
});

// ============================================================================
// PAGE 5: PROFIT OF ALL PLATFORMS (CONNECTED P&L ENGINE)
// ============================================================================

/**
 * GET /api/admin-portal/accounting/pnl
 * Dynamically connects with Page 4: Pulls Salary + Rent for the month,
 * sums Platform Profits, and computes Gross Profit & Net Profit!
 */
router.get('/pnl', requirePagePermission('platform_profit', 'view'), async (req, res) => {
  try {
    const { month_year } = req.query;
    const targetMonth = month_year || new Date().toISOString().slice(0, 7); // e.g. '2026-11'
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const platRes = await pool.query('SELECT * FROM admin_portal_platforms WHERE is_active = true ORDER BY display_order ASC, id ASC');
      const pnlRes = await pool.query('SELECT * FROM admin_portal_platform_pnl WHERE month_year = $1', [targetMonth]);

      // Connect dynamically with Page 4 (Salary + Rent)
      const salaryRes = await pool.query('SELECT SUM(net_paid) as total_salary FROM admin_portal_salary_records WHERE month_year = $1', [targetMonth]);
      const rentRes = await pool.query('SELECT SUM(total_paid) as total_rent FROM admin_portal_rent_records WHERE month_year = $1', [targetMonth]);

      const summaryRes = await pool.query('SELECT * FROM admin_portal_monthly_pnl_summary WHERE month_year = $1', [targetMonth]);

      const salaryKharcha = Number(salaryRes.rows[0]?.total_salary || 0);
      const rentKharcha = Number(rentRes.rows[0]?.total_rent || 0);
      const otherKharcha = Number(summaryRes.rows[0]?.other_kharcha || 0);

      const platformsWithData = platRes.rows.map((p) => {
        const record = pnlRes.rows.find((r) => r.platform_id === p.id) || null;
        return {
          ...p,
          record: record || {
            gross_sales: 0,
            returns_amount: 0,
            cogs_amount: 0,
            platform_fees: 0,
            net_profit: 0,
          },
        };
      });

      const totalGrossProfit = platformsWithData.reduce((sum, p) => sum + Number(p.record?.net_profit || 0), 0);
      const totalExpenses = salaryKharcha + rentKharcha + otherKharcha;
      const netProfit = totalGrossProfit - totalExpenses;

      return res.json({
        month_year: targetMonth,
        platforms: platformsWithData,
        calculations: {
          totalGrossProfit,
          salaryKharcha,
          rentKharcha,
          otherKharcha,
          totalExpenses,
          netProfit,
        },
        userAccessLevel: req.accessLevel,
      });
    } else {
      const store = readAdminStore();
      const platforms = (store.platforms || []).filter((p) => p.is_active);
      const pnlRecords = (store.platform_pnl || []).filter((r) => r.month_year === targetMonth);

      const salaryRecords = (store.salary_records || []).filter((r) => r.month_year === targetMonth);
      const rentRecords = (store.rent_records || []).filter((r) => r.month_year === targetMonth);
      const summary = (store.monthly_pnl_summaries || []).find((s) => s.month_year === targetMonth);

      const salaryKharcha = salaryRecords.reduce((sum, r) => sum + Number(r.net_paid || 0), 0);
      const rentKharcha = rentRecords.reduce((sum, r) => sum + Number(r.total_paid || 0), 0);
      const otherKharcha = Number(summary?.other_kharcha || 0);

      const platformsWithData = platforms.map((p) => {
        const record = pnlRecords.find((r) => r.platform_id === p.id) || null;
        return {
          ...p,
          record: record || {
            gross_sales: 0,
            returns_amount: 0,
            cogs_amount: 0,
            platform_fees: 0,
            net_profit: 0,
          },
        };
      });

      const totalGrossProfit = platformsWithData.reduce((sum, p) => sum + Number(p.record?.net_profit || 0), 0);
      const totalExpenses = salaryKharcha + rentKharcha + otherKharcha;
      const netProfit = totalGrossProfit - totalExpenses;

      return res.json({
        month_year: targetMonth,
        platforms: platformsWithData,
        calculations: {
          totalGrossProfit,
          salaryKharcha,
          rentKharcha,
          otherKharcha,
          totalExpenses,
          netProfit,
        },
        userAccessLevel: req.accessLevel,
      });
    }
  } catch (err) {
    console.error('Fetch platform P&L error:', err);
    return res.status(500).json({ error: 'Failed to calculate platform P&L.' });
  }
});

/**
 * POST /api/admin-portal/accounting/platforms
 * "hum aur platform add kar sake"
 */
router.post('/platforms', requirePagePermission('platform_profit', 'edit'), async (req, res) => {
  try {
    const { name, platform_type, firm_code } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Platform name is required.' });

    const { isPostgres, pool } = getDB();
    let newPlat = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        `INSERT INTO admin_portal_platforms (name, platform_type, firm_code)
         VALUES ($1, $2, $3) RETURNING *`,
        [name.trim(), platform_type || 'General', firm_code || 'general']
      );
      newPlat = resDb.rows[0];
    } else {
      const store = readAdminStore();
      const newId = (store.platforms || []).length > 0 ? Math.max(...store.platforms.map((p) => p.id || 0)) + 1 : 1;
      newPlat = {
        id: newId,
        name: name.trim(),
        platform_type: platform_type || 'General',
        firm_code: firm_code || 'general',
        display_order: (store.platforms || []).length + 1,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      if (!store.platforms) store.platforms = [];
      store.platforms.push(newPlat);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'PLATFORM_PROFIT',
      action: 'ADD_PLATFORM',
      recordId: String(newPlat.id),
      description: `Added sales platform '${newPlat.name}'`,
      newValues: newPlat,
      ipAddress: req.ip,
    });

    return res.json({ success: true, platform: newPlat });
  } catch (err) {
    console.error('Add platform error:', err);
    return res.status(500).json({ error: 'Failed to add platform.' });
  }
});

/**
 * POST /api/admin-portal/accounting/platform-pnl-record
 * Update profit or sales metrics for a specific platform in a month
 */
router.post('/platform-pnl-record', requirePagePermission('platform_profit', 'edit'), async (req, res) => {
  try {
    const { platform_id, month_year, gross_sales, returns_amount, cogs_amount, platform_fees, net_profit, notes } = req.body;
    if (!platform_id || !month_year) return res.status(400).json({ error: 'Platform ID and month are required.' });

    const gSales = Number(gross_sales || 0);
    const returnsAmt = Number(returns_amount || 0);
    const cogsAmt = Number(cogs_amount || 0);
    const pFees = Number(platform_fees || 0);
    const nProfit = net_profit !== undefined ? Number(net_profit) : gSales - (returnsAmt + cogsAmt + pFees);

    const { isPostgres, pool } = getDB();
    let saved = null;

    if (isPostgres && pool) {
      const checkRes = await pool.query(
        'SELECT id FROM admin_portal_platform_pnl WHERE platform_id = $1 AND month_year = $2',
        [platform_id, month_year]
      );
      if (checkRes.rows.length > 0) {
        const updateRes = await pool.query(
          `UPDATE admin_portal_platform_pnl 
           SET gross_sales = $1, returns_amount = $2, cogs_amount = $3, platform_fees = $4, net_profit = $5, notes = $6, logged_by = $7, updated_at = CURRENT_TIMESTAMP
           WHERE id = $8 RETURNING *`,
          [gSales, returnsAmt, cogsAmt, pFees, nProfit, notes || '', req.user.email, checkRes.rows[0].id]
        );
        saved = updateRes.rows[0];
      } else {
        const insertRes = await pool.query(
          `INSERT INTO admin_portal_platform_pnl 
           (platform_id, month_year, gross_sales, returns_amount, cogs_amount, platform_fees, net_profit, notes, logged_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [platform_id, month_year, gSales, returnsAmt, cogsAmt, pFees, nProfit, notes || '', req.user.email]
        );
        saved = insertRes.rows[0];
      }
    } else {
      const store = readAdminStore();
      if (!store.platform_pnl) store.platform_pnl = [];
      const existing = store.platform_pnl.find(
        (r) => r.platform_id === Number(platform_id) && r.month_year === month_year
      );
      if (existing) {
        existing.gross_sales = gSales;
        existing.returns_amount = returnsAmt;
        existing.cogs_amount = cogsAmt;
        existing.platform_fees = pFees;
        existing.net_profit = nProfit;
        existing.notes = notes || '';
        existing.logged_by = req.user.email;
        existing.updated_at = new Date().toISOString();
        saved = existing;
      } else {
        const newId = store.platform_pnl.length > 0 ? Math.max(...store.platform_pnl.map((r) => r.id || 0)) + 1 : 1;
        saved = {
          id: newId,
          platform_id: Number(platform_id),
          month_year,
          gross_sales: gSales,
          returns_amount: returnsAmt,
          cogs_amount: cogsAmt,
          platform_fees: pFees,
          net_profit: nProfit,
          notes: notes || '',
          logged_by: req.user.email,
          created_at: new Date().toISOString(),
        };
        store.platform_pnl.push(saved);
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'PLATFORM_PROFIT',
      action: 'UPDATE_PLATFORM_PNL',
      recordId: String(saved.id),
      description: `Updated platform ID ${platform_id} P&L for ${month_year}: Profit ₹${nProfit}`,
      newValues: saved,
      ipAddress: req.ip,
    });

    return res.json({ success: true, record: saved });
  } catch (err) {
    console.error('Update platform P&L error:', err);
    return res.status(500).json({ error: 'Failed to save platform P&L.' });
  }
});

/**
 * POST /api/admin-portal/accounting/pnl-summary-other
 * Update 'other kharcha' for a month
 */
router.post('/pnl-summary-other', requirePagePermission('platform_profit', 'edit'), async (req, res) => {
  try {
    const { month_year, other_kharcha, notes } = req.body;
    if (!month_year) return res.status(400).json({ error: 'Month is required.' });

    const oKharcha = Number(other_kharcha || 0);
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      await pool.query(
        `INSERT INTO admin_portal_monthly_pnl_summary (month_year, other_kharcha, notes)
         VALUES ($1, $2, $3)
         ON CONFLICT (month_year) DO UPDATE SET other_kharcha = $2, notes = $3, updated_at = CURRENT_TIMESTAMP`,
        [month_year, oKharcha, notes || '']
      );
    } else {
      const store = readAdminStore();
      if (!store.monthly_pnl_summaries) store.monthly_pnl_summaries = [];
      const existing = store.monthly_pnl_summaries.find((s) => s.month_year === month_year);
      if (existing) {
        existing.other_kharcha = oKharcha;
        existing.notes = notes || '';
        existing.updated_at = new Date().toISOString();
      } else {
        store.monthly_pnl_summaries.push({
          id: store.monthly_pnl_summaries.length + 1,
          month_year,
          other_kharcha: oKharcha,
          notes: notes || '',
          updated_at: new Date().toISOString(),
        });
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'PLATFORM_PROFIT',
      action: 'UPDATE_OTHER_KHARCHA',
      description: `Updated other operational expenses for ${month_year} to ₹${oKharcha}`,
      newValues: { month_year, other_kharcha: oKharcha, notes },
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Other kharcha updated.' });
  } catch (err) {
    console.error('Update other kharcha error:', err);
    return res.status(500).json({ error: 'Failed to update other expenses.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/platforms/:id
 */
router.delete('/platforms/:id', requirePagePermission('platform_profit', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let oldPlat = null;

    if (isPostgres && pool) {
      const pRes = await pool.query('SELECT * FROM admin_portal_platforms WHERE id = $1', [id]);
      if (pRes.rows.length === 0) return res.status(404).json({ error: 'Platform not found.' });
      oldPlat = pRes.rows[0];
      await pool.query('DELETE FROM admin_portal_platforms WHERE id = $1', [id]);
    } else {
      const store = readAdminStore();
      const idx = (store.platforms || []).findIndex((p) => p.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Platform not found.' });
      oldPlat = store.platforms[idx];
      store.platforms.splice(idx, 1);
      if (store.platform_pnl) {
        store.platform_pnl = store.platform_pnl.filter((r) => r.platform_id !== Number(id));
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'PLATFORM_PROFIT',
      action: 'DELETE_PLATFORM',
      recordId: String(id),
      description: `Deleted sales platform ${oldPlat.name}`,
      oldValues: oldPlat,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `Platform ${oldPlat.name} deleted.` });
  } catch (err) {
    console.error('Delete platform error:', err);
    return res.status(500).json({ error: 'Failed to delete platform.' });
  }
});

/**
 * GET /api/admin-portal/accounting/pnl/auto-pull-sales
 * Scans Page 1 Inflows for the month and maps them to platforms (f-A, f-Treo, m-A, etc.)
 */
router.get('/pnl/auto-pull-sales', requirePagePermission('platform_profit', 'view'), async (req, res) => {
  try {
    const { month_year } = req.query;
    const targetMonth = month_year || new Date().toISOString().slice(0, 7);
    const { isPostgres, pool } = getDB();

    let entries = [];
    let platforms = [];

    if (isPostgres && pool) {
      const eRes = await pool.query(
        `SELECT * FROM admin_portal_ledger_entries 
         WHERE flow_type = 'in' AND TO_CHAR(entry_date, 'YYYY-MM') = $1`,
        [targetMonth]
      );
      entries = eRes.rows;
      const pRes = await pool.query('SELECT * FROM admin_portal_platforms WHERE is_active = true');
      platforms = pRes.rows;
    } else {
      const store = readAdminStore();
      entries = (store.ledger_entries || []).filter(
        (e) => e.flow_type === 'in' && e.entry_date && e.entry_date.startsWith(targetMonth)
      );
      platforms = (store.platforms || []).filter((p) => p.is_active);
    }

    const suggestions = {};
    for (const p of platforms) {
      const pNameLower = p.name.toLowerCase();
      // Match rules:
      // f - A: firm_code === 'acube' & category/reason has 'flipkart' or 'f'
      // f - Treo: firm_code === 'treo' & category/reason has 'flipkart' or 'f'
      // f - Tri: firm_code === 'tritoy' & category/reason has 'flipkart' or 'f'
      // m - A: firm_code === 'acube' & category/reason has 'meesho' or 'm'
      // m - Tre: firm_code === 'treo' & category/reason has 'meesho' or 'm'
      // m - Tri: firm_code === 'tritoy' & category/reason has 'meesho' or 'm'
      // Amazon: category/reason has 'amazon'
      // Myntra: category/reason has 'myntra'
      let matchingEntries = [];

      if (pNameLower.includes('f - a') || (p.platform_type === 'Flipkart' && p.firm_code === 'acube')) {
        matchingEntries = entries.filter((e) => e.firm_code === 'acube' && (e.category?.toLowerCase().includes('flipkart') || e.category?.toLowerCase() === 'f'));
      } else if (pNameLower.includes('f - treo') || (p.platform_type === 'Flipkart' && p.firm_code === 'treo')) {
        matchingEntries = entries.filter((e) => e.firm_code === 'treo' && (e.category?.toLowerCase().includes('flipkart') || e.category?.toLowerCase() === 'f'));
      } else if (pNameLower.includes('f - tri') || (p.platform_type === 'Flipkart' && p.firm_code === 'tritoy')) {
        matchingEntries = entries.filter((e) => e.firm_code === 'tritoy' && (e.category?.toLowerCase().includes('flipkart') || e.category?.toLowerCase() === 'f'));
      } else if (pNameLower.includes('m - a') || (p.platform_type === 'Meesho' && p.firm_code === 'acube')) {
        matchingEntries = entries.filter((e) => e.firm_code === 'acube' && (e.category?.toLowerCase().includes('meesho') || e.category?.toLowerCase() === 'm'));
      } else if (pNameLower.includes('m - tre') || (p.platform_type === 'Meesho' && p.firm_code === 'treo')) {
        matchingEntries = entries.filter((e) => e.firm_code === 'treo' && (e.category?.toLowerCase().includes('meesho') || e.category?.toLowerCase() === 'm'));
      } else if (pNameLower.includes('m - tri') || (p.platform_type === 'Meesho' && p.firm_code === 'tritoy')) {
        matchingEntries = entries.filter((e) => e.firm_code === 'tritoy' && (e.category?.toLowerCase().includes('meesho') || e.category?.toLowerCase() === 'm'));
      } else if (pNameLower.includes('amazon')) {
        matchingEntries = entries.filter((e) => e.category?.toLowerCase().includes('amazon') || e.category?.toLowerCase() === 'a');
      } else if (pNameLower.includes('myntra')) {
        matchingEntries = entries.filter((e) => e.category?.toLowerCase().includes('myntra'));
      }

      const totalSales = matchingEntries.reduce((sum, e) => sum + Number(e.amount), 0);
      suggestions[p.id] = {
        platform_id: p.id,
        platform_name: p.name,
        calculated_sales: totalSales,
        transactions_count: matchingEntries.length,
      };
    }

    return res.json({ success: true, month_year: targetMonth, suggestions });
  } catch (err) {
    console.error('Auto pull sales error:', err);
    return res.status(500).json({ error: 'Failed to auto-pull sales data.' });
  }
});

// ============================================================================
// PAGE 6: INVESTMENT TRACKER (CAPITAL CONTRIBUTIONS BY MONTH)
// ============================================================================

/**
 * GET /api/admin-portal/accounting/investments
 * Returns partner list with all historical and current month investment records
 */
router.get('/investments', requirePagePermission('investment', 'view'), async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const partnersRes = await pool.query('SELECT * FROM admin_portal_investors WHERE is_active = true ORDER BY display_order ASC, id ASC');
      const recordsRes = await pool.query('SELECT * FROM admin_portal_investments ORDER BY month_year ASC, id ASC');

      const partnersWithRecords = partnersRes.rows.map((p) => {
        const pRecs = recordsRes.rows.filter((r) => r.investor_id === p.id);
        const totalInvested = pRecs.reduce((sum, r) => sum + Number(r.amount), 0);
        return {
          ...p,
          totalInvested,
          investments: pRecs,
        };
      });

      const grandTotalInvested = recordsRes.rows.reduce((sum, r) => sum + Number(r.amount), 0);

      return res.json({
        investors: partnersWithRecords,
        allRecords: recordsRes.rows,
        grandTotalInvested,
        userAccessLevel: req.accessLevel,
      });
    } else {
      const store = readAdminStore();
      const records = store.investments || [];
      const partners = (store.investors || []).filter((p) => p.is_active).map((p) => {
        const pRecs = records.filter((r) => r.investor_id === p.id);
        const totalInvested = pRecs.reduce((sum, r) => sum + Number(r.amount), 0);
        return {
          ...p,
          totalInvested,
          investments: pRecs,
        };
      });

      const grandTotalInvested = records.reduce((sum, r) => sum + Number(r.amount), 0);

      return res.json({
        investors: partners,
        allRecords: records,
        grandTotalInvested,
        userAccessLevel: req.accessLevel,
      });
    }
  } catch (err) {
    console.error('Fetch investments error:', err);
    return res.status(500).json({ error: 'Failed to fetch investment records.' });
  }
});

/**
 * POST /api/admin-portal/accounting/investors
 * Add new partner / investor
 */
router.post('/investors', requirePagePermission('investment', 'edit'), async (req, res) => {
  try {
    const { partner_name, phone, email } = req.body;
    if (!partner_name || !partner_name.trim()) return res.status(400).json({ error: 'Partner name is required.' });

    const { isPostgres, pool } = getDB();
    let newInv = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        `INSERT INTO admin_portal_investors (partner_name, phone, email)
         VALUES ($1, $2, $3) RETURNING *`,
        [partner_name.trim(), phone || '', email || '']
      );
      newInv = resDb.rows[0];
    } else {
      const store = readAdminStore();
      const newId = (store.investors || []).length > 0 ? Math.max(...store.investors.map((i) => i.id || 0)) + 1 : 1;
      newInv = {
        id: newId,
        partner_name: partner_name.trim(),
        phone: phone || '',
        email: email || '',
        display_order: (store.investors || []).length + 1,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      if (!store.investors) store.investors = [];
      store.investors.push(newInv);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'INVESTMENT',
      action: 'ADD_INVESTOR',
      recordId: String(newInv.id),
      description: `Added new investor/partner '${newInv.partner_name}'`,
      newValues: newInv,
      ipAddress: req.ip,
    });

    return res.json({ success: true, investor: newInv });
  } catch (err) {
    console.error('Add investor error:', err);
    return res.status(500).json({ error: 'Failed to add investor.' });
  }
});

/**
 * POST /api/admin-portal/accounting/investments
 * Log capital addition for an investor in a month
 */
router.post('/investments', requirePagePermission('investment', 'edit'), async (req, res) => {
  try {
    const { investor_id, month_year, amount, investment_date, notes } = req.body;
    if (!investor_id || !month_year || !amount) {
      return res.status(400).json({ error: 'Investor ID, month, and amount are required.' });
    }

    const parsedAmount = Number(amount);
    const tDate = investment_date || new Date().toISOString().split('T')[0];
    const { isPostgres, pool } = getDB();
    let saved = null;

    if (isPostgres && pool) {
      const resDb = await pool.query(
        `INSERT INTO admin_portal_investments 
         (investor_id, month_year, amount, investment_date, notes, logged_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [investor_id, month_year, parsedAmount, tDate, notes || '', req.user.email]
      );
      saved = resDb.rows[0];
    } else {
      const store = readAdminStore();
      const newId = (store.investments || []).length > 0 ? Math.max(...store.investments.map((i) => i.id || 0)) + 1 : 1;
      saved = {
        id: newId,
        investor_id: Number(investor_id),
        month_year,
        amount: parsedAmount,
        investment_date: tDate,
        notes: notes || '',
        logged_by: req.user.email,
        created_at: new Date().toISOString(),
      };
      if (!store.investments) store.investments = [];
      store.investments.push(saved);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'INVESTMENT',
      action: 'ADD_CAPITAL_ENTRY',
      recordId: String(saved.id),
      description: `Logged capital investment ₹${parsedAmount} for investor ID ${investor_id} (${month_year})`,
      newValues: saved,
      ipAddress: req.ip,
    });

    return res.json({ success: true, record: saved });
  } catch (err) {
    console.error('Record investment error:', err);
    return res.status(500).json({ error: 'Failed to record investment.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/investments/:id
 */
router.delete('/investments/:id', requirePagePermission('investment', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let oldInv = null;

    if (isPostgres && pool) {
      const resDb = await pool.query('SELECT * FROM admin_portal_investments WHERE id = $1', [id]);
      if (resDb.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
      oldInv = resDb.rows[0];
      await pool.query('DELETE FROM admin_portal_investments WHERE id = $1', [id]);
    } else {
      const store = readAdminStore();
      const idx = (store.investments || []).findIndex((i) => i.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Record not found.' });
      oldInv = store.investments[idx];
      store.investments.splice(idx, 1);
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'INVESTMENT',
      action: 'DELETE_CAPITAL_ENTRY',
      recordId: String(id),
      description: `Deleted capital investment record ₹${oldInv.amount} for investor ID ${oldInv.investor_id}`,
      oldValues: oldInv,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Investment record deleted.' });
  } catch (err) {
    console.error('Delete investment record error:', err);
    return res.status(500).json({ error: 'Failed to delete investment record.' });
  }
});

/**
 * DELETE /api/admin-portal/accounting/investors/:id
 */
router.delete('/investors/:id', requirePagePermission('investment', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let oldInv = null;

    if (isPostgres && pool) {
      const iRes = await pool.query('SELECT * FROM admin_portal_investors WHERE id = $1', [id]);
      if (iRes.rows.length === 0) return res.status(404).json({ error: 'Investor not found.' });
      oldInv = iRes.rows[0];
      await pool.query('DELETE FROM admin_portal_investors WHERE id = $1', [id]);
    } else {
      const store = readAdminStore();
      const idx = (store.investors || []).findIndex((i) => i.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Investor not found.' });
      oldInv = store.investors[idx];
      store.investors.splice(idx, 1);
      if (store.investments) {
        store.investments = store.investments.filter((r) => r.investor_id !== Number(id));
      }
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'INVESTMENT',
      action: 'DELETE_INVESTOR',
      recordId: String(id),
      description: `Deleted partner/investor ${oldInv.partner_name}`,
      oldValues: oldInv,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `Investor ${oldInv.partner_name} removed.` });
  } catch (err) {
    console.error('Delete investor error:', err);
    return res.status(500).json({ error: 'Failed to remove investor.' });
  }
});

/**
 * PUT /api/admin-portal/accounting/investments/:id
 * Direct inline cell edit for monthly contribution
 */
router.put('/investments/:id', requirePagePermission('investment', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    const parsedAmount = Number(amount);
    const { isPostgres, pool } = getDB();

    let oldInv = null;
    let updatedInv = null;

    if (isPostgres && pool) {
      const oldRes = await pool.query('SELECT * FROM admin_portal_investments WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) return res.status(404).json({ error: 'Investment record not found.' });
      oldInv = oldRes.rows[0];

      const upRes = await pool.query(
        `UPDATE admin_portal_investments
         SET amount = COALESCE($1, amount),
             notes = COALESCE($2, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 RETURNING *`,
        [parsedAmount, notes, id]
      );
      updatedInv = upRes.rows[0];
    } else {
      const store = readAdminStore();
      const idx = (store.investments || []).findIndex((r) => r.id === Number(id));
      if (idx === -1) return res.status(404).json({ error: 'Investment record not found.' });
      oldInv = { ...store.investments[idx] };

      if (amount !== undefined) store.investments[idx].amount = parsedAmount;
      if (notes !== undefined) store.investments[idx].notes = notes;
      store.investments[idx].updated_at = new Date().toISOString();
      updatedInv = store.investments[idx];
      writeAdminStore(store);
    }

    await recordAuditLog({
      userEmail: req.user.email,
      userName: req.user.name,
      module: 'INVESTMENT',
      action: 'UPDATE_CAPITAL_ENTRY',
      recordId: String(id),
      description: `Updated capital contribution #${id} for investor ID ${updatedInv.investor_id}: ₹${parsedAmount}`,
      oldValues: oldInv,
      newValues: updatedInv,
      ipAddress: req.ip,
    });

    return res.json({ success: true, record: updatedInv });
  } catch (err) {
    console.error('Update investment error:', err);
    return res.status(500).json({ error: 'Failed to update investment.' });
  }
});

export default router;
