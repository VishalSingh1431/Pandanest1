import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin, authenticateUser } from '../middleware/auth.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// JWT secret — must be set via environment variable in production
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set. Using an insecure default — set it in server/.env for production!');
}
const JWT_SECRET = process.env.JWT_SECRET || 'pandanest_super_secret_jwt_key_2026_xyz';

// Gmail SMTP transporter — only created when credentials are configured
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASS.replace(/\s+/g, '')
    }
  });
  console.log('✉️  Gmail SMTP configured for OTP delivery.');
} else {
  console.warn('⚠️  EMAIL_USER or EMAIL_APP_PASS not set. OTP emails will be logged to console only.');
}

// DB-backed OTP storage \u2014 survives server restarts and works across multiple instances
async function storeOtp(email, otp, expiresAt) {
  const { isPostgres, pool } = getDB();
  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO otp_store (email, otp, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET otp = $2, expires_at = $3`,
      [email, otp, expiresAt]
    );
  } else {
    const store = readLocalStore();
    store.otp_store = store.otp_store || {};
    store.otp_store[email] = { otp, expiresAt };
    writeLocalStore(store);
  }
}

async function getOtp(email) {
  const { isPostgres, pool } = getDB();
  if (isPostgres && pool) {
    const result = await pool.query('SELECT * FROM otp_store WHERE email = $1', [email]);
    const row = result.rows[0];
    if (!row) return null;
    if (Date.now() > row.expires_at) {
      await pool.query('DELETE FROM otp_store WHERE email = $1', [email]);
      return null; // Expired
    }
    return { otp: row.otp, expiresAt: row.expires_at };
  } else {
    const store = readLocalStore();
    const entry = (store.otp_store || {})[email];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete store.otp_store[email];
      writeLocalStore(store);
      return null; // Expired
    }
    return entry;
  }
}

async function deleteOtp(email) {
  const { isPostgres, pool } = getDB();
  if (isPostgres && pool) {
    await pool.query('DELETE FROM otp_store WHERE email = $1', [email]);
  } else {
    const store = readLocalStore();
    if (store.otp_store) delete store.otp_store[email];
    writeLocalStore(store);
  }
}

// Helper to find or create user in Postgres or Local Store
async function findOrCreateUser({ email, name, phone = '', child_name = '', dob = null, role = 'user' }) {
  const normalizedEmail = email.toLowerCase().trim();
  const { isPostgres, pool } = getDB();

  // Exact-match list only — no startsWith to prevent escalation attacks
  const SUPER_ADMIN_EMAILS = [
    'acubebeauty@gmail.com',
    'vishalsingh05072003@gmail.com'
  ];
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(normalizedEmail);
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
      `INSERT INTO admins (email, password_hash, name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [normalizedEmail, dummyHash, name || normalizedEmail.split('@')[0], assignedRole, phone || '']
    );

    // Also link/insert into leads table for birthday tracking & Panda Points
    if (child_name && phone && dob) {
      try {
        await pool.query(
          `INSERT INTO leads (child_name, parent_name, phone, dob, panda_points)
           VALUES ($1, $2, $3, $4, 100)
           ON CONFLICT DO NOTHING`,
          [child_name.trim(), name || 'Parent', phone.trim(), dob]
        );
      } catch (e) {
        // ignore duplicate phone lead
      }
    }

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
      phone: phone || '',
      child_name: child_name || '',
      dob: dob || null,
      created_at: new Date().toISOString()
    };
    store.admins.push(newUser);
    writeLocalStore(store);
    return newUser;
  }
}

// 0. Public endpoint to provide configured Google Client ID to frontend
router.get('/google-client-id', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

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

    await storeOtp(normalizedEmail, otp, expiresAt);

    // Send email via Gmail SMTP (if configured)
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Panda Nest 🐼" <${process.env.EMAIL_USER}>`,
          to: normalizedEmail,
          subject: `Your Panda Nest Verification Code: ${otp} 🐼`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 32px 24px; color: #0f172a;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #047857; margin: 0 0 6px; font-size: 26px; font-weight: 800;">🐼 Panda Nest</h2>
                <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 600;">Safe Toys For Little Ones • pandanest.in</p>
              </div>
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1.5px dashed #10b981; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: #065f46; font-size: 14px; font-weight: 600; margin: 0 0 10px;">Your 6-Digit Login &amp; Verification Code</p>
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
        console.log(`✉️ OTP email sent successfully to ${normalizedEmail}`);
      } catch (mailErr) {
        console.warn(`⚠️ SMTP error (${mailErr.message}) — OTP for ${normalizedEmail} is ${otp} (server console only)`);
      }
    } else {
      // Email not configured — log OTP to server console for development
      console.log(`🔑 [DEV] OTP for ${normalizedEmail}: ${otp} (configure EMAIL_USER & EMAIL_APP_PASS to send real emails)`);
    }

    res.json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}. Check your email (or server console if email is not configured).`
      // OTP is never returned in the API response for security
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

// 2. Verify OTP & Login/Signup
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, name, phone, child_name, dob, is_signup } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    if (is_signup) {
      if (!child_name || !child_name.trim()) {
        return res.status(400).json({ error: "Child's name is required for registration." });
      }
      if (!phone || !phone.trim() || phone.replace(/\D/g, '').length < 10) {
        return res.status(400).json({ error: 'A valid 10-digit WhatsApp/mobile number is required.' });
      }
      if (!dob || !dob.trim()) {
        return res.status(400).json({ error: "Child's Date of Birth (DOB) is required for registration." });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const stored = await getOtp(normalizedEmail);

    if (!stored) {
      return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
    }

    if (stored.otp !== cleanOtp) {
      return res.status(400).json({ error: 'Incorrect verification code. Please check your email and try again.' });
    }

    // OTP is valid — clear it
    await deleteOtp(normalizedEmail);

    // Find or create user
    const user = await findOrCreateUser({
      email: normalizedEmail,
      name: name || '',
      role: 'user',
      phone: phone || '',
      child_name: child_name || '',
      dob: dob || null
    });

    const userRole = user.role || 'user';
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: userRole },
      JWT_SECRET,
      { expiresIn: '7d' }
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

// 3. Continue with Google — verifies ID token if configured or accepts Google email profile
router.post('/google', async (req, res) => {
  try {
    const { googleIdToken, email, name, avatar } = req.body;

    let targetEmail = null;
    let userName = name;
    let userAvatar = avatar || '';

    // If real Google ID token and GOOGLE_CLIENT_ID are present, verify cryptographically
    if (googleIdToken && process.env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: googleIdToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        targetEmail = payload.email;
        userName = userName || payload.name || payload.email.split('@')[0];
        userAvatar = payload.picture || userAvatar;
      } catch (verifyErr) {
        return res.status(401).json({ error: 'Invalid Google token. Please try signing in again.' });
      }
    } else if (email && email.includes('@')) {
      targetEmail = email;
      userName = userName || email.split('@')[0];
    } else {
      return res.status(400).json({ error: 'Valid Gmail address or Google token is required.' });
    }

    const normalizedEmail = targetEmail.toLowerCase().trim();
    const user = await findOrCreateUser({
      email: normalizedEmail,
      name: userName,
      role: 'user'
    });

    const userRole = user.role || 'user';
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: userRole },
      JWT_SECRET,
      { expiresIn: '7d' }
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
        avatar: userAvatar
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

// 5. Verify current token (Fetches live role from DB and auto-upgrades Super Admins)
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    const userEmail = (req.user?.email || '').toLowerCase().trim();

    // Exact-match list only — no startsWith to prevent escalation attacks
    const SUPER_ADMIN_EMAILS = [
      'acubebeauty@gmail.com',
      'vishalsingh05072003@gmail.com'
    ];
    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(userEmail);

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

    // Only issue a fresh token when the role has changed (avoids infinite refresh loop on client)
    const roleChanged = req.user.role !== currentRole;
    let responsePayload = { admin: userData, user: userData };
    if (roleChanged) {
      const freshToken = jwt.sign(
        { id: userData.id, email: userData.email, name: userData.name, role: userData.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      responsePayload.token = freshToken;
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Error in /me:', err);
    res.json({ admin: req.user, user: req.user });
  }
});

export default router;
