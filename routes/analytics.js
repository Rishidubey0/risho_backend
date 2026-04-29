import { Router } from 'express';
import { Order, Product, Customer } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const allOrders = await Order.findAll({ raw: true });
    const allProducts = await Product.findAll({ raw: true });
    const customerCount = await Customer.count();

    let totalRevenue = 0;
    const statusCounts = { pending: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 };

    // Monthly revenue (last 12 months)
    const now = new Date();
    const monthlyMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthlyMap[key] = { key, label, revenue: 0, orders: 0 };
    }

    // Daily revenue (last 30 days)
    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      dailyMap[key] = { key, label, revenue: 0, orders: 0 };
    }

    // Top products and category sales
    const productSales = {};
    const categorySales = {};

    for (const o of allOrders) {
      const amt = Number(o.totalAmount) || 0;
      totalRevenue += amt;

      const st = (o.status || 'pending').toLowerCase();
      if (st in statusCounts) statusCounts[st]++;

      // Monthly bucket
      const d = new Date(o.createdAt);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[mKey]) {
        monthlyMap[mKey].revenue += amt;
        monthlyMap[mKey].orders += 1;
      }

      // Daily bucket
      const dKey = new Date(o.createdAt).toISOString().slice(0, 10);
      if (dailyMap[dKey]) {
        dailyMap[dKey].revenue += amt;
        dailyMap[dKey].orders += 1;
      }

      // Product & category breakdown from items
      let items = [];
      try { items = JSON.parse(o.items); } catch { /* skip */ }
      for (const item of items) {
        const pName = item.name || 'Unknown';
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const lineTotal = price * qty;
        const cat = item.category || 'Other';

        if (!productSales[pName]) productSales[pName] = { name: pName, quantity: 0, revenue: 0 };
        productSales[pName].quantity += qty;
        productSales[pName].revenue += lineTotal;

        if (!categorySales[cat]) categorySales[cat] = { name: cat, quantity: 0, revenue: 0 };
        categorySales[cat].quantity += qty;
        categorySales[cat].revenue += lineTotal;
      }
    }

    const monthlyRevenue = Object.values(monthlyMap).map((m) => ({
      ...m,
      revenue: Math.round(m.revenue),
    }));

    const dailyRevenue = Object.values(dailyMap).map((d) => ({
      ...d,
      revenue: Math.round(d.revenue),
    }));

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({ ...p, revenue: Math.round(p.revenue) }));

    const categoryBreakdown = Object.values(categorySales)
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({ ...c, revenue: Math.round(c.revenue) }));

    // Average order value
    const avgOrderValue = allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;

    res.json({
      totalRevenue: Math.round(totalRevenue),
      totalOrders: allOrders.length,
      totalProducts: allProducts.length,
      totalCustomers: customerCount,
      avgOrderValue,
      statusCounts,
      monthlyRevenue,
      dailyRevenue,
      topProducts,
      categoryBreakdown,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
