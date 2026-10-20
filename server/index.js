import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import toyRoutes from './routes/toys.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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

startServer();
