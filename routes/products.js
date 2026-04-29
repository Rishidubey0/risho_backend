import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Product } from '../models/index.js';
import { Category } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only images allowed'), ok);
  },
});

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { categoryId, featured, search } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (featured === 'true') where.featured = true;
    const products = await Product.findAll({
      where,
      include: [{ model: Category, as: 'category' }],
      order: [['createdAt', 'DESC']],
    });
    let list = products;
    if (search) {
      const q = String(search).toLowerCase();
      list = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category' }],
    });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, originalPrice, categoryId, featured, stock } = req.body;
    if (!name || price == null || !categoryId) {
      return res.status(400).json({ error: 'name, price, categoryId required' });
    }
    let image = req.body.imageUrl || null;
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }
    const product = await Product.create({
      name,
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      image,
      categoryId: parseInt(categoryId, 10),
      featured: featured === 'true' || featured === true,
      stock: stock != null ? parseInt(stock, 10) : 0,
    });
    const full = await Product.findByPk(product.id, {
      include: [{ model: Category, as: 'category' }],
    });
    res.status(201).json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    const { name, description, price, originalPrice, categoryId, featured, stock } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = parseFloat(price);
    if (originalPrice !== undefined) updates.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    if (categoryId !== undefined) updates.categoryId = parseInt(categoryId, 10);
    if (featured !== undefined) updates.featured = featured === 'true' || featured === true;
    if (stock !== undefined) updates.stock = parseInt(stock, 10);
    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl !== undefined) {
      updates.image = req.body.imageUrl || null;
    }
    await product.update(updates);
    const full = await Product.findByPk(product.id, {
      include: [{ model: Category, as: 'category' }],
    });
    res.json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    await product.destroy();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
