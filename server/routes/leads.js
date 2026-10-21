import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Normalize phone number for consistent deduplication
function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

// Public: Submit QR customer onboarding form (Parent Name removed as per discussion)
router.post('/', async (req, res) => {
  try {
    const { child_name, phone, dob, parent_name } = req.body;

    if (!child_name || !phone || !dob) {
      return res.status(400).json({ error: 'Child Name, Mobile Number, and Date of Birth (DOB) are required.' });
    }

    // Validate phone — must be a 10-digit Indian mobile number
    const PHONE_REGEX = /^[6-9]\d{9}$/;
    const cleanPhone = normalizePhone(phone);
    if (!PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).' });
    }

    const { isPostgres, pool } = getDB();
    const finalParentName = (parent_name || '').trim();
    const cleanChildName = child_name.trim();

    if (isPostgres && pool) {
      // Check if this mobile number already registered before
      const existing = await pool.query(
        `SELECT * FROM leads 
         WHERE phone = $1 
            OR phone = $2 
            OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($1, 10)
         LIMIT 1`,
        [cleanPhone, phone.trim()]
      );

      if (existing.rows.length > 0) {
        const lead = existing.rows[0];
        // User already filled the form previously: update details but DO NOT award 100 points again
        await pool.query(
          'UPDATE leads SET child_name = $1, parent_name = COALESCE(NULLIF($2, \'\'), parent_name), dob = $3 WHERE id = $4',
          [cleanChildName, finalParentName, dob, lead.id]
        );

        return res.status(200).json({
          success: true,
          already_registered: true,
          message: 'Welcome back! Your child details have been updated (100 welcome bonus points are only awarded once).',
          lead: { ...lead, child_name: cleanChildName, dob },
          panda_points: lead.panda_points || 100,
          points_awarded: 0
        });
      }

      // New user: grant 100 points on initial registration
      const pandaPoints = 100;
      const result = await pool.query(
        `INSERT INTO leads (child_name, parent_name, phone, dob, panda_points)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, child_name, parent_name, phone, dob, panda_points, created_at`,
        [cleanChildName, finalParentName, cleanPhone, dob, pandaPoints]
      );

      return res.status(201).json({
        success: true,
        already_registered: false,
        message: 'Welcome to Panda Club! 100 Panda Points added.',
        lead: result.rows[0],
        panda_points: pandaPoints,
        points_awarded: pandaPoints
      });
    } else {
      const store = readLocalStore();
      store.leads = store.leads || [];

      const existing = store.leads.find(l => {
        const p1 = normalizePhone(l.phone);
        const p2 = cleanPhone;
        return p1 === p2 || (p1.length >= 10 && p2.length >= 10 && p1.slice(-10) === p2.slice(-10));
      });

      if (existing) {
        // User already filled the form: update details but DO NOT award 100 points again
        existing.child_name = cleanChildName;
        if (finalParentName) existing.parent_name = finalParentName;
        existing.dob = dob;
        writeLocalStore(store);

        return res.status(200).json({
          success: true,
          already_registered: true,
          message: 'Welcome back! Your child details have been updated (100 welcome bonus points are only awarded once).',
          lead: existing,
          panda_points: existing.panda_points || 100,
          points_awarded: 0
        });
      }

      const pandaPoints = 100;
      const newLead = {
        id: Date.now(),
        child_name: cleanChildName,
        parent_name: finalParentName,
        phone: cleanPhone,
        dob: dob,
        panda_points: pandaPoints,
        created_at: new Date().toISOString()
      };
      store.leads.unshift(newLead);
      writeLocalStore(store);

      return res.status(201).json({
        success: true,
        already_registered: false,
        message: 'Welcome to Panda Club! 100 Panda Points added.',
        lead: newLead,
        panda_points: pandaPoints,
        points_awarded: pandaPoints
      });
    }
  } catch (err) {
    console.error('Lead submission error:', err);
    res.status(500).json({ error: 'Failed to record customer details.' });
  }
});

// Admin: Get all leads with upcoming birthday analytics
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    let leads = [];

    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
      leads = result.rows;
    } else {
      const store = readLocalStore();
      leads = store.leads || [];
    }

    const today = new Date();

    const enrichedLeads = leads.map(lead => {
      let isUpcomingBirthday = false;
      let daysUntilBirthday = null;
      let childAge = null;

      if (lead.dob) {
        const birthDate = new Date(lead.dob);
        childAge = today.getFullYear() - birthDate.getFullYear();
        if (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())) {
          childAge--;
        }

        const bdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        let diffMs = bdayThisYear - today;
        if (diffMs < 0) {
          const bdayNextYear = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
          diffMs = bdayNextYear - today;
        }

        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        daysUntilBirthday = diffDays;
        if (diffDays <= 30) {
          isUpcomingBirthday = true;
        }
      }

      return {
        ...lead,
        child_age: childAge,
        days_until_birthday: daysUntilBirthday,
        is_upcoming_birthday: isUpcomingBirthday
      };
    });

    res.json({
      total: leads.length,
      upcomingBirthdaysCount: enrichedLeads.filter(l => l.is_upcoming_birthday).length,
      leads: enrichedLeads
    });
  } catch (err) {
    console.error('Fetch leads error:', err);
    res.status(500).json({ error: 'Failed to retrieve customer leads.' });
  }
});

// Admin: Delete a lead
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      await pool.query('DELETE FROM leads WHERE id = $1', [id]);
    } else {
      const store = readLocalStore();
      store.leads = (store.leads || []).filter(l => String(l.id) !== String(id));
      writeLocalStore(store);
    }

    res.json({ success: true, message: 'Customer lead removed successfully.' });
  } catch (err) {
    console.error('Delete lead error:', err);
    res.status(500).json({ error: 'Failed to delete lead.' });
  }
});

export default router;
