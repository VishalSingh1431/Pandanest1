import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin, authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pandanest_super_secret_jwt_key_2026_xyz';

// Gmail SMTP transporter for real OTP delivery
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'acubebeauty@gmail.com',
    pass: (process.env.EMAIL_APP_PASS || 'kxzs iolq jrcx qzjh').replace(/\s+/g, '')
  }
});

// In-memory OTP storage: email -> { otp: string, expiresAt: number }
const otpStore = new Map();

// Helper to find or create user in Postgres or Local Store
async function findOrCreateUser({ email, name, role = 'user' }) {
  const normalizedEmail = email.toLowerCase().trim();
  const { isPostgres, pool } = getDB();

  // List of Super Admin emails
  const SUPER_ADMIN_EMAILS = [
    'acubebeauty@gmail.com',
    'vishalsingh05072003@gmail.com',
    'vishalsingh05072003'
  ];
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.some(e => normalizedEmail === e || normalizedEmail.startsWith('vishalsingh05072003'));
  const assignedRole = isSuperAdminEmail ? 'super_admin' : role;

  if (isPostgres && pool) {
    const existing = await pool.query('SELECT * FROM admins WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      if (isSuperAdminEmail && existing.rows[0].role !== 'super_admin') {
        const updated = await pool.query("UPDATE admins SET role = 'super_admin' WHERE email = $1 RETURNING *", [normalizedEmail]);
        return updated.rows[0];
      }
      return existing.rows[0];
    }

    const dummyHash = await bcrypt.hash('oauth_or_otp_' + Math.random(), 10);
    const insertResult = await pool.query(
      `INSERT INTO admins (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [normalizedEmail, dummyHash, name || normalizedEmail.split('@')[0], assignedRole]
    );
    return insertResult.rows[0];
  } else {
    const store = readLocalStore();
    store.admins = store.admins || [];
    let existing = store.admins.find(a => a.email.toLowerCase() === normalizedEmail);
    if (existing) {
      if (isSuperAdminEmail && existing.role !== 'super_admin') {
        existing.role = 'super_admin';
        writeLocalStore(store);
      }
      return existing;
    }

    const dummyHash = await bcrypt.hash('oauth_or_otp_' + Math.random(), 10);
    const newUser = {
      id: Date.now(),
      email: normalizedEmail,
      password_hash: dummyHash,
      name: name || normalizedEmail.split('@')[0],
      role: assignedRole,
      phone: '',
      created_at: new Date().toISOString()
    };
    store.admins.push(newUser);
    writeLocalStore(store);
    return newUser;
  }
}

// 1. Send OTP to Gmail
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid Gmail / email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(normalizedEmail, { otp, expiresAt });

    // Send email via Gmail SMTP
    try {
      await transporter.sendMail({
        from: `"Panda Nest 🐼" <${process.env.EMAIL_USER || 'acubebeauty@gmail.com'}>`,
        to: normalizedEmail,
        subject: `Your Panda Nest Verification Code: ${otp} 🐼`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 32px 24px; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #047857; margin: 0 0 6px; font-size: 26px; font-weight: 800;">🐼 Panda Nest</h2>
              <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 600;">Safe Toys For Little Ones • pandanest.in</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1.5px dashed #10b981; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #065f46; font-size: 14px; font-weight: 600; margin: 0 0 10px;">Your 6-Digit Login & Verification Code</p>
              <div style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #047857; font-family: monospace;">${otp}</div>
              <p style="color: #059669; font-size: 12px; margin: 12px 0 0; font-weight: 600;">⏱️ Valid for 10 minutes</p>
            </div>

            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 16px;">
              Enter this code to access your Panda Nest account, track your toy orders, and unlock member rewards.
            </p>

            <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
              If you did not request this verification code, please ignore this email.<br/>
              © ${new Date().getFullYear()} Panda Nest (pandanest.in) • Spreading Smiles Across India
            </div>
          </div>
        `
      });
      console.log(`✉️ Real OTP sent successfully to ${normalizedEmail}`);
    } catch (mailErr) {
      console.warn(`⚠️ SMTP send issue (${mailErr.message}), falling back to console log: OTP for ${normalizedEmail} is ${otp}`);
    }

    res.json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}`,
      // In development, providing OTP hint if email transport hits rate limit
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

// 2. Verify OTP & Login/Signup
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, name } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const stored = otpStore.get(normalizedEmail);

    if (!stored) {
      return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (stored.otp !== cleanOtp) {
      return res.status(400).json({ error: 'Incorrect verification code. Please check your email and try again.' });
    }

    // OTP is valid - clear it
    otpStore.delete(normalizedEmail);

    // Find or create user
    const user = await findOrCreateUser({
      email: normalizedEmail,
      name: name || '',
      role: 'user'
    });

    const userRole = user.role || 'user';
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: userRole },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole,
        phone: user.phone || ''
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// 3. Continue with Google / Gmail
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId, avatar } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid Google account email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    const user = await findOrCreateUser({
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      role: 'user'
    });

    const userRole = user.role || 'user';
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: userRole },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole,
        phone: user.phone || '',
        avatar: avatar || ''
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google.' });
  }
});

// 4. Legacy Email + Password Login (For super_admin or staff direct login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const { isPostgres, pool } = getDB();
    let admin = null;

    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM admins WHERE email = $1', [normalizedEmail]);
      if (result.rows.length > 0) {
        admin = result.rows[0];
      }
    } else {
      const store = readLocalStore();
      admin = (store.admins || []).find(a => a.email.toLowerCase() === normalizedEmail);
    }

    if (!admin) {
      return res.status(401).json({ error: 'Account not found. Please log in using Gmail OTP or Google.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials or use OTP login.' });
    }

    const role = admin.role || 'user';
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: role },
      JWT_SECRET,
      { expiresIn: '30d' }
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

// 5. Verify current token (Fetches live role from DB and auto-upgrades Super Admins)
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    const userEmail = (req.user?.email || '').toLowerCase().trim();

    // List of Super Admin emails
    const SUPER_ADMIN_EMAILS = [
      'acubebeauty@gmail.com',
      'vishalsingh05072003@gmail.com',
      'vishalsingh05072003'
    ];
    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.some(e => userEmail === e || userEmail.startsWith('vishalsingh05072003'));

    let dbUser = null;
    let currentRole = isSuperAdminEmail ? 'super_admin' : (req.user?.role || 'user');

    if (isPostgres && pool) {
      const result = await pool.query('SELECT id, email, name, role, phone FROM admins WHERE email = $1', [userEmail]);
      if (result.rows.length > 0) {
        dbUser = result.rows[0];
        if (isSuperAdminEmail && dbUser.role !== 'super_admin') {
          await pool.query("UPDATE admins SET role = 'super_admin' WHERE email = $1", [userEmail]);
          dbUser.role = 'super_admin';
        }
        currentRole = dbUser.role;
      }
    } else {
      const store = readLocalStore();
      dbUser = (store.admins || []).find(a => a.email.toLowerCase() === userEmail);
      if (dbUser && isSuperAdminEmail && dbUser.role !== 'super_admin') {
        dbUser.role = 'super_admin';
        writeLocalStore(store);
      }
      if (dbUser) currentRole = dbUser.role;
    }

    const userData = {
      id: dbUser ? dbUser.id : req.user.id,
      email: userEmail,
      name: (dbUser && dbUser.name) ? dbUser.name : (req.user.name || userEmail.split('@')[0]),
      role: currentRole,
      phone: (dbUser && dbUser.phone) ? dbUser.phone : (req.user.phone || '')
    };

    const freshToken = jwt.sign(
      { id: userData.id, email: userData.email, name: userData.name, role: userData.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      admin: userData,
      user: userData,
      token: freshToken
    });
  } catch (err) {
    console.error('Error in /me:', err);
    res.json({ admin: req.user, user: req.user });
  }
});

export default router;
