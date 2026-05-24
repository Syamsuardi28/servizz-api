require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const authRoutes         = require('./routes/authRoutes');
const orderRoutes        = require('./routes/orderRoutes');
const negoRoutes         = require('./routes/negoRoutes');
const paymentRoutes      = require('./routes/paymentRoutes');
const evidenceRoutes     = require('./routes/evidenceRoutes');
const serviceRoutes      = require('./routes/serviceRoutes');
const technicianRoutes   = require('./routes/technicianRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes      = require('./routes/messageRoutes');

const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security & Logging ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body Parser ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Static Files ────────────────────────────────────────────
const path = require('path');
const uploadFolder = process.env.VERCEL === '1' || process.env.VERCEL_REGION ? '/tmp/uploads' : path.join(__dirname, '../public/uploads');
app.use('/uploads', express.static(uploadFolder));

// ── Health Check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'SERVIZZ API', timestamp: new Date().toISOString() });
});

// ── Routes ──────────────────────────────────────────────────
const adminRoutes = require('./routes/adminRoutes');

app.use('/auth',        authRoutes);
app.use('/order',       orderRoutes);
app.use('/nego',        negoRoutes);
app.use('/payment',     paymentRoutes);
app.use('/evidence',    evidenceRoutes);
app.use('/services',    serviceRoutes);
app.use('/technicians', technicianRoutes);
app.use('/rating',      technicianRoutes);
app.use('/admin',       adminRoutes);
app.use('/notifications', notificationRoutes);
app.use('/messages',      messageRoutes);

// ── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.` });
});

// ── Global Error Handler (harus di akhir) ───────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────
// Vercel handles the port and server listening automatically.
if (process.env.VERCEL !== '1') {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.listen(PORT, () => {
    console.log(`\n🚀 SERVIZZ API berjalan di http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database    : ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
  });
}

module.exports = app;
