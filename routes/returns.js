import { Router } from 'express';
import { ReturnRequest, Order } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/** Customer: submit return request (order # + email must match order) */
router.post('/request', async (req, res) => {
  try {
    const orderId = parseInt(req.body.orderId, 10);
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const reason = String(req.body.reason || '').trim();

    if (!Number.isFinite(orderId) || orderId < 1 || !email || !reason) {
      return res.status(400).json({ error: 'Order number, email, and reason are required' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const orderEmail = String(order.customerEmail || '')
      .trim()
      .toLowerCase();
    if (orderEmail !== email) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const existing = await ReturnRequest.findOne({
      where: { orderId, status: 'pending' },
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending return request for this order' });
    }

    const row = await ReturnRequest.create({
      orderId,
      customerEmail: order.customerEmail,
      reason,
      status: 'pending',
    });

    res.status(201).json({
      id: row.id,
      message: 'Return request submitted. We will review it shortly.',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Admin: list all return requests with order summary */
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const rows = await ReturnRequest.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: Order, as: 'order', required: false }],
    });

    const list = rows.map((r) => {
      const j = r.toJSON();
      const o = j.order;
      return {
        id: j.id,
        orderId: j.orderId,
        customerEmail: j.customerEmail,
        reason: j.reason,
        status: j.status,
        adminNote: j.adminNote,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        order: o
          ? {
              id: o.id,
              customerName: o.customerName,
              totalAmount: o.totalAmount,
              status: o.status,
              createdAt: o.createdAt,
            }
          : null,
      };
    });

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Admin: approve or reject */
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const { status, adminNote } = req.body;
    const next = String(status || '').toLowerCase();
    if (!['approved', 'rejected'].includes(next)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const row = await ReturnRequest.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.status !== 'pending') {
      return res.status(409).json({ error: 'This request has already been processed' });
    }

    await row.update({
      status: next,
      adminNote: adminNote != null ? String(adminNote).trim() || null : row.adminNote,
    });

    const j = row.toJSON();
    res.json(j);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
