import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB, readLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pandanest_super_secret_jwt_key_2026_xyz';

// Admin & Super Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { isPostgres, pool } = getDB();
    let admin = null;

    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email.toLowerCase().trim()]);
      if (result.rows.length > 0) {
        admin = result.rows[0];
      }
    } else {
      const store = readLocalStore();
      admin = (store.admins || []).find(a => a.email.toLowerCase() === email.toLowerCase().trim());
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Role check: Only admin and super_admin can enter admin dashboard
    const role = admin.role || 'admin';
    if (role === 'user') {
      return res.status(403).json({ error: 'Access denied. You currently have customer/user privileges. Please ask a Super Admin to promote your account.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: role,
        phone: admin.phone || ''
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Verify current token
router.get('/me', authenticateAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

export default router;
