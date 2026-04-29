import { Router } from 'express';
import { Customer, Order } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/** Seed customers from existing orders (idempotent) */
router.post('/sync', authMiddleware, async (_req, res) => {
  try {
    const orders = await Order.findAll({ raw: true });
    const map = {};
    for (const o of orders) {
      const email = (o.customerEmail || '').trim().toLowerCase();
      if (!email) continue;
      if (!map[email]) {
        map[email] = {
          name: o.customerName,
          email,
          phone: o.customerPhone || '',
          address: o.address || '',
          totalOrders: 0,
          totalSpent: 0,
        };
      }
      map[email].totalOrders += 1;
      map[email].totalSpent += Number(o.totalAmount) || 0;
      if (new Date(o.createdAt) > new Date(map[email]._lastOrder || 0)) {
        map[email].name = o.customerName;
        map[email].phone = o.customerPhone || map[email].phone;
        map[email].address = o.address || map[email].address;
        map[email]._lastOrder = o.createdAt;
      }
    }

    let created = 0;
    let updated = 0;
    for (const c of Object.values(map)) {
      delete c._lastOrder;
      const [cust, wasCreated] = await Customer.findOrCreate({
        where: { email: c.email },
        defaults: c,
      });
      if (wasCreated) {
        created++;
      } else {
        await cust.update({
          totalOrders: c.totalOrders,
          totalSpent: c.totalSpent,
          name: c.name,
          phone: c.phone,
          address: c.address,
        });
        updated++;
      }
    }
    res.json({ synced: created + updated, created, updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** List all customers */
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const customers = await Customer.findAll({ order: [['createdAt', 'DESC']] });
    res.json(customers);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Get customer order history */
router.get('/:id/orders', authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const orders = await Order.findAll({
      where: { customerEmail: customer.email },
      order: [['createdAt', 'DESC']],
    });

    const parsed = orders.map((o) => ({
      ...o.toJSON(),
      itemsParsed: (() => {
        try { return JSON.parse(o.items); } catch { return []; }
      })(),
    }));
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Block / unblock customer */
router.patch('/:id/block', authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    await customer.update({ blocked: !customer.blocked });
    res.json(customer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
