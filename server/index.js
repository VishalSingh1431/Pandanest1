import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import toyRoutes from './routes/toys.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import categoryRoutes from './routes/categories.js';
import videoRoutes from './routes/videos.js';
import couponRoutes from './routes/coupons.js';
import reviewRoutes from './routes/reviews.js';

dotenv.config();

// Startup env validation
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set — using insecure default. Set it in server/.env!');
}
if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASS) {
  console.warn('⚠️  Email (EMAIL_USER / EMAIL_APP_PASS) not configured — OTP emails will not be sent.');
}
if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('⚠️  GOOGLE_CLIENT_ID not set — Google Sign-In will be disabled.');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://pandanest.in',
  'http://pandanest.in',
  'https://www.pandanest.in',
  'http://www.pandanest.in'
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ORIGINS, ...envOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, same-origin reverse-proxy, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.pandanest.in')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} is not allowed.`));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Rate limiting — OTP endpoint: max 5 requests per IP per 15 minutes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests from this device. Please wait 15 minutes before trying again.' }
});
app.use('/api/auth/send-otp', otpLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Pandanest.in API',
    time: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/toys', toyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server and Database
async function startServer() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Pandanest Server running on http://localhost:${PORT}`);
    console.log(`🌐 API ready for Pandanest.in storefront and admin`);
  });
}

startServer().catch(err => {
  console.error('🚨 Fatal startup error — server could not start:', err);
  process.exit(1);
});
