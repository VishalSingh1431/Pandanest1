import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'pandanest_super_secret_jwt_key_2026_xyz';

// Authenticates any admin or super_admin
export function authenticateAdmin(req, res, next) {
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
    if (!['super_admin', 'admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Access restricted to administrators only.' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// Authenticates only super_admin
export function authenticateSuperAdmin(req, res, next) {
  authenticateAdmin(req, res, () => {
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Permission denied. Only Super Admin can manage users and roles.' });
    }
    next();
  });
}
