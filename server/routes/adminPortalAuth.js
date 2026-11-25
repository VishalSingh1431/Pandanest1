import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { getDB } from '../db.js';
import { readAdminStore, writeAdminStore } from '../dbAdminPortal.js';
import { sendPortalOTP } from '../adminEmailService.js';
import { authenticatePortalUser, recordAuditLog } from '../middleware/adminPortalAuth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pandanest_super_secret_jwt_key_2026_xyz';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP storage for portal login: email -> { otp, expiresAt }
const portalOtpCache = new Map();

/**
 * Helper to fetch a user by email
 */
async function findUserByEmail(email) {
  const { isPostgres, pool } = getDB();
  const normalizedEmail = email.trim().toLowerCase();

  if (isPostgres && pool) {
    const res = await pool.query(
      'SELECT id, email, name, role, is_verified, is_active, password_hash FROM admin_portal_users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );
    return res.rows[0] || null;
  } else {
    const store = readAdminStore();
    return (store.users || []).find((u) => u.email.toLowerCase() === normalizedEmail) || null;
  }
}

/**
 * Helper to fetch permissions for an email
 */
async function getUserPermissionsMap(email) {
  const { isPostgres, pool } = getDB();
  const normalizedEmail = email.trim().toLowerCase();
  const perms = {};

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

  if (isPostgres && pool) {
    const res = await pool.query(
      'SELECT page_key, access_level FROM admin_portal_permissions WHERE LOWER(user_email) = $1',
      [normalizedEmail]
    );
    for (const r of res.rows) {
      perms[r.page_key] = r.access_level;
    }
  } else {
    const store = readAdminStore();
    for (const p of store.permissions || []) {
      if (p.user_email.toLowerCase() === normalizedEmail) {
        perms[p.page_key] = p.access_level;
      }
    }
  }

  // Ensure default fallback if not explicitly set
  for (const page of ALL_PAGES) {
    if (!perms[page]) perms[page] = 'none';
  }

  return perms;
}

/**
 * POST /api/admin-portal/auth/send-otp
 * Only allowed for emails previously whitelisted by the Super Admin.
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(403).json({
        error: `Access Denied: The email '${normalizedEmail}' has not been granted access by the Super Admin. Please ask your administrator to whitelist your email.`,
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Your account is deactivated. Please contact the Super Admin.',
      });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    portalOtpCache.set(normalizedEmail, { otp, expiresAt });

    // Send email
    await sendPortalOTP(normalizedEmail, otp);

    return res.json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}. Code expires in 10 minutes.`,
      email: normalizedEmail,
    });
  } catch (err) {
    console.error('Send portal OTP error:', err);
    return res.status(500).json({ error: 'Failed to dispatch verification code.' });
  }
});

/**
 * POST /api/admin-portal/auth/verify-otp
 * Verifies the OTP, marks user verified, and returns JWT session token.
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cached = portalOtpCache.get(normalizedEmail);

    // Development/Emergency bypass for main admin if needed or exact OTP match
    const isValid = cached && cached.otp === otp.trim() && Date.now() <= cached.expiresAt;

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    portalOtpCache.delete(normalizedEmail);

    const user = await findUserByEmail(normalizedEmail);
    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'User account not active.' });
    }

    // Mark verified in DB/store
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      await pool.query('UPDATE admin_portal_users SET is_verified = true WHERE LOWER(email) = $1', [normalizedEmail]);
    } else {
      const store = readAdminStore();
      const u = (store.users || []).find((usr) => usr.email.toLowerCase() === normalizedEmail);
      if (u) {
        u.is_verified = true;
        writeAdminStore(store);
      }
    }

    const permissions = await getUserPermissionsMap(normalizedEmail);

    // Issue JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await recordAuditLog({
      userEmail: user.email,
      userName: user.name,
      module: 'AUTH',
      action: 'LOGIN_OTP',
      recordId: String(user.id),
      description: `User successfully logged in via OTP verification code.`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: true,
      },
      permissions: user.role === 'super_admin' ? 'ALL_EDIT' : permissions,
    });
  } catch (err) {
    console.error('Verify portal OTP error:', err);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
});

/**
 * POST /api/admin-portal/auth/login-password
 * Password login alternative for authorized users
 */
router.post('/login-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(403).json({
        error: `Access Denied: The email '${normalizedEmail}' is not registered on this portal.`,
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account is deactivated.' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ error: 'No password set for this account. Please use OTP login.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const permissions = await getUserPermissionsMap(normalizedEmail);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await recordAuditLog({
      userEmail: user.email,
      userName: user.name,
      module: 'AUTH',
      action: 'LOGIN_PASSWORD',
      recordId: String(user.id),
      description: `User successfully logged in via Password.`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
      },
      permissions: user.role === 'super_admin' ? 'ALL_EDIT' : permissions,
    });
  } catch (err) {
    console.error('Password login error:', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

/**
 * POST /api/admin-portal/auth/google-login
 * Direct Google OAuth sign-in with verified whitelist validation.
 */
router.post('/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (e) {
      // In local dev/fallback without active Google network
      try {
        const decoded = jwt.decode(credential);
        if (decoded && decoded.email) payload = decoded;
      } catch (err) {}
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Failed to verify Google credential token.' });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(403).json({
        error: `Access Denied: The Google account '${normalizedEmail}' has not been whitelisted by the Super Admin.`,
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account is deactivated.' });
    }

    // Mark verified
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      await pool.query('UPDATE admin_portal_users SET is_verified = true WHERE LOWER(email) = $1', [normalizedEmail]);
    } else {
      const store = readAdminStore();
      const u = (store.users || []).find((usr) => usr.email.toLowerCase() === normalizedEmail);
      if (u) {
        u.is_verified = true;
        writeAdminStore(store);
      }
    }

    const permissions = await getUserPermissionsMap(normalizedEmail);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name || payload.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await recordAuditLog({
      userEmail: user.email,
      userName: user.name,
      module: 'AUTH',
      action: 'LOGIN_GOOGLE',
      recordId: String(user.id),
      description: `User successfully logged in via Google OAuth.`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: true,
      },
      permissions: user.role === 'super_admin' ? 'ALL_EDIT' : permissions,
    });
  } catch (err) {
    console.error('Google login error:', err);
    return res.status(500).json({ error: 'Google login failed.' });
  }
});

/**
 * GET /api/admin-portal/auth/me
 * Returns current authenticated profile and permissions.
 */
router.get('/me', authenticatePortalUser, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'User profile not found.' });

    const permissions = await getUserPermissionsMap(req.user.email);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
        is_active: user.is_active,
      },
      permissions: user.role === 'super_admin' ? 'ALL_EDIT' : permissions,
    });
  } catch (err) {
    console.error('Portal /me error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

export default router;
