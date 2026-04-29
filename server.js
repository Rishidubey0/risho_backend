import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './config/database.js';
import './models/index.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import analyticsRoutes from './routes/analytics.js';
import paymentRoutes from './routes/payments.js';
import returnRoutes from './routes/returns.js';
import heroSlideRoutes from './routes/heroSlides.js';
import { migrateOrderPaymentColumns } from './migrateOrderPayments.js';
import { ensureDefaultCategories } from './lib/ensureDefaultCategories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5050;

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '2mb' }));

const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/hero-slides', heroSlideRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

async function start() {
  // Avoid sync({ alter: true }) on production MySQL — prefer explicit migrations for large changes.
  await sequelize.sync();
  await ensureDefaultCategories();
  await migrateOrderPaymentColumns();
  app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
