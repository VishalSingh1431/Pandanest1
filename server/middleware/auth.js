import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'pandanest_super_secret_jwt_key_2026_xyz';

// Authenticates ANY valid user (super_admin, admin, or customer/user)
export function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No authorization token provided.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Malformed authorization token.' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.admin = decoded; // For backwards compatibility
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// Optional authentication — populates req.user if valid token provided, but does not block guests
export function optionalUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const decoded = jwt.verify(parts[1], JWT_SECRET);
      req.user = decoded;
      req.admin = decoded;
    } catch (err) {
      // Ignore token verification errors for guests
    }
  }
  next();
}

// Authenticates only admin or super_admin
export function authenticateAdmin(req, res, next) {
  authenticateUser(req, res, () => {
    if (!['super_admin', 'admin'].includes(req.admin?.role)) {
      return res.status(403).json({ error: 'Access restricted to administrators only.' });
    }
    next();
  });
}

// Authenticates only super_admin
export function authenticateSuperAdmin(req, res, next) {
  authenticateAdmin(req, res, () => {
    if (req.admin?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Permission denied. Only Super Admin can perform this action.' });
    }
    next();
  });
}
