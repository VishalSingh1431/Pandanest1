import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public: Submit QR customer onboarding form (Parent Name removed as per discussion)
router.post('/', async (req, res) => {
  try {
    const { child_name, phone, dob, parent_name } = req.body;

    if (!child_name || !phone || !dob) {
      return res.status(400).json({ error: 'Child Name, Mobile Number, and Date of Birth (DOB) are required.' });
    }

    const { isPostgres, pool } = getDB();
    const finalParentName = (parent_name || '').trim();
    const pandaPoints = 100; // Welcome reward points for Panda Club

    if (isPostgres && pool) {
      const result = await pool.query(
        `INSERT INTO leads (child_name, parent_name, phone, dob, panda_points)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, child_name, parent_name, phone, dob, panda_points, created_at`,
        [child_name.trim(), finalParentName, phone.trim(), dob, pandaPoints]
      );
      return res.status(201).json({
        success: true,
        message: 'Welcome to Panda Club! 100 Panda Points added.',
        lead: result.rows[0],
        panda_points: pandaPoints
      });
    } else {
      const store = readLocalStore();
      const newLead = {
        id: Date.now(),
        child_name: child_name.trim(),
        parent_name: finalParentName,
        phone: phone.trim(),
        dob: dob,
        panda_points: pandaPoints,
        created_at: new Date().toISOString()
      };
      store.leads = store.leads || [];
      store.leads.unshift(newLead);
      writeLocalStore(store);

      return res.status(201).json({
        success: true,
        message: 'Welcome to Panda Club! 100 Panda Points added.',
        lead: newLead,
        panda_points: pandaPoints
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
