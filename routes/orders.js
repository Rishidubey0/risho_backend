import { Router } from 'express';
import { Order, Product, Customer } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, address, items, totalAmount, paymentMethod: rawMethod } =
      req.body;
    if (!customerName || !customerEmail || !customerPhone || !address || !items || totalAmount == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const methodRaw = String(rawMethod || 'cod').toLowerCase();
    let paymentMethod = 'cod';
    let paymentStatus = 'pending';
    let paymentRef = null;
    if (methodRaw === 'online') {
      paymentMethod = 'online';
      paymentStatus = 'paid';
      paymentRef = `DEMO-${Date.now()}`;
    } else if (methodRaw === 'upi_qr') {
      paymentMethod = 'upi_qr';
      paymentStatus = 'pending';
      paymentRef = null;
    }

    const order = await Order.create({
      customerName,
      customerEmail,
      customerPhone,
      address,
      items: typeof items === 'string' ? items : JSON.stringify(items),
      totalAmount: parseFloat(totalAmount),
      status: 'pending',
      paymentMethod,
      paymentStatus,
      paymentRef,
    });

    // Upsert customer record
    try {
      const email = customerEmail.trim().toLowerCase();
      const [cust] = await Customer.findOrCreate({
        where: { email },
        defaults: { name: customerName, email, phone: customerPhone || '', address: address || '', totalOrders: 0, totalSpent: 0 },
      });
      await cust.update({
        name: customerName,
        phone: customerPhone || cust.phone,
        address: address || cust.address,
        totalOrders: cust.totalOrders + 1,
        totalSpent: cust.totalSpent + parseFloat(totalAmount),
      });
    } catch { /* non-critical */ }

    res.status(201).json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const totalOrders = await Order.count();
    const totalProducts = await Product.count();
    const recent = await Order.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
    });

    const allOrders = await Order.findAll({
      attributes: ['id', 'status', 'totalAmount', 'createdAt'],
      raw: true,
    });

    const statusOrder = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    const ordersByStatus = Object.fromEntries(statusOrder.map((s) => [s, 0]));
    let totalRevenue = 0;
    for (const o of allOrders) {
      totalRevenue += Number(o.totalAmount) || 0;
      const s = String(o.status || 'pending').toLowerCase();
      if (s in ordersByStatus) ordersByStatus[s] += 1;
      else ordersByStatus.pending += 1;
    }

    // Bucket by UTC calendar day — matches Sequelize storing createdAt as UTC (+00:00).
    // Local-midnight windows were dropping or mis-placing orders for many timezones.
    const now = new Date();
    const ordersByDay = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i, 0, 0, 0, 0)
      );
      const key = day.toISOString().slice(0, 10);
      let count = 0;
      let revenue = 0;
      for (const o of allOrders) {
        const orderKey = new Date(o.createdAt).toISOString().slice(0, 10);
        if (orderKey === key) {
          count += 1;
          revenue += Number(o.totalAmount) || 0;
        }
      }
      ordersByDay.push({
        key,
        label: day.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        }),
        orders: count,
        revenue: Math.round(revenue),
      });
    }

    res.json({
      totalOrders,
      totalProducts,
      totalRevenue: Math.round(totalRevenue),
      recentOrders: recent,
      ordersByStatus,
      ordersByDay,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Public lookup: order number + email must match (same message on mismatch for privacy). */
router.get('/public/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const email = String(req.query.email || '')
      .trim()
      .toLowerCase();
    if (!Number.isFinite(id) || id < 1 || !email) {
      return res.status(400).json({ error: 'Order number and email are required' });
    }
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const orderEmail = String(order.customerEmail || '')
      .trim()
      .toLowerCase();
    if (orderEmail !== email) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const json = order.toJSON();
    let itemsParsed = [];
    try {
      itemsParsed = JSON.parse(json.items);
    } catch {
      itemsParsed = [];
    }
    res.json({
      ...json,
      itemsParsed,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
    const parsed = orders.map((o) => ({
      ...o.toJSON(),
      itemsParsed: (() => {
        try {
          return JSON.parse(o.items);
        } catch {
          return [];
        }
      })(),
    }));
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const { status, paymentStatus } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (paymentStatus && ['pending', 'paid', 'failed', 'refunded'].includes(String(paymentStatus).toLowerCase())) {
      updates.paymentStatus = String(paymentStatus).toLowerCase();
    }
    if (Object.keys(updates).length) await order.update(updates);
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
