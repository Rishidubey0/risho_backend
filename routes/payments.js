import { Router } from 'express';
import { Order } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function normalizeMethod(m) {
  const v = String(m || 'cod').toLowerCase();
  if (v === 'online') return 'online';
  if (v === 'upi_qr') return 'upi_qr';
  return 'cod';
}

function normalizePayStatus(s) {
  const v = String(s || 'pending').toLowerCase();
  if (['pending', 'paid', 'failed', 'refunded'].includes(v)) return v;
  return 'pending';
}

/** Combined payload for admin Payments page */
router.get('/', authMiddleware, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });

    let codCount = 0;
    let onlineCount = 0;
    let upiCount = 0;
    let codAmount = 0;
    let onlineAmount = 0;
    let upiAmount = 0;
    const paymentStatusBreakdown = { pending: 0, paid: 0, failed: 0, refunded: 0 };

    const transactions = orders.map((o) => {
      const j = o.toJSON();
      const method = normalizeMethod(j.paymentMethod);
      const paySt = normalizePayStatus(j.paymentStatus);
      const amt = Number(j.totalAmount) || 0;

      if (method === 'online') {
        onlineCount += 1;
        onlineAmount += amt;
      } else if (method === 'upi_qr') {
        upiCount += 1;
        upiAmount += amt;
      } else {
        codCount += 1;
        codAmount += amt;
      }
      if (paySt in paymentStatusBreakdown) paymentStatusBreakdown[paySt] += 1;
      else paymentStatusBreakdown.pending += 1;

      return {
        id: j.id,
        createdAt: j.createdAt,
        customerName: j.customerName,
        customerEmail: j.customerEmail,
        totalAmount: j.totalAmount,
        orderStatus: j.status,
        paymentMethod: method,
        paymentStatus: paySt,
        paymentRef: j.paymentRef || null,
      };
    });

    res.json({
      summary: {
        totalTransactions: orders.length,
        codCount,
        onlineCount,
        upiCount,
        codAmount: Math.round(codAmount),
        onlineAmount: Math.round(onlineAmount),
        upiAmount: Math.round(upiAmount),
        paymentStatusBreakdown,
      },
      transactions,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
