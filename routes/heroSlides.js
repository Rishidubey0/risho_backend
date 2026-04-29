import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { HeroSlide, Product } from '../models/index.js';
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
    cb(null, `hero-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
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

/** Storefront: up to 4 most recently created active slides (newest first). */
const STOREFRONT_SLIDE_LIMIT = 4;

router.get('/', async (_req, res) => {
  try {
    const slides = await HeroSlide.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
      limit: STOREFRONT_SLIDE_LIMIT,
      attributes: ['id', 'image', 'title', 'subtitle', 'productId'],
    });
    res.json(slides);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin', authMiddleware, async (_req, res) => {
  try {
    const slides = await HeroSlide.findAll({
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC'],
      ],
      include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
    });
    res.json(slides);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, productId, sortOrder, isActive, imageUrl } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title required' });
    }
    let image = imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : null;
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }
    if (!image) {
      return res.status(400).json({ error: 'image file or imageUrl required' });
    }
    const pid = productId != null && productId !== '' ? parseInt(productId, 10) : null;
    if (pid) {
      const p = await Product.findByPk(pid);
      if (!p) return res.status(400).json({ error: 'Invalid productId' });
    }
    const slide = await HeroSlide.create({
      image,
      title: String(title).trim(),
      subtitle: subtitle != null ? String(subtitle).trim() || null : null,
      productId: Number.isFinite(pid) ? pid : null,
      sortOrder: sortOrder != null ? parseInt(sortOrder, 10) || 0 : 0,
      isActive: isActive === 'true' || isActive === true,
    });
    const full = await HeroSlide.findByPk(slide.id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
    });
    res.status(201).json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const slide = await HeroSlide.findByPk(req.params.id);
    if (!slide) return res.status(404).json({ error: 'Not found' });
    const { title, subtitle, productId, sortOrder, isActive, imageUrl } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (subtitle !== undefined) updates.subtitle = subtitle ? String(subtitle).trim() : null;
    if (sortOrder !== undefined) updates.sortOrder = parseInt(sortOrder, 10) || 0;
    if (isActive !== undefined) updates.isActive = isActive === 'true' || isActive === true;
    if (productId !== undefined) {
      const raw = productId === '' || productId == null ? null : parseInt(productId, 10);
      if (raw) {
        const p = await Product.findByPk(raw);
        if (!p) return res.status(400).json({ error: 'Invalid productId' });
        updates.productId = raw;
      } else {
        updates.productId = null;
      }
    }
    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    } else if (imageUrl !== undefined) {
      const u = imageUrl && String(imageUrl).trim();
      updates.image = u || slide.image;
    }
    await slide.update(updates);
    const full = await HeroSlide.findByPk(slide.id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
    });
    res.json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const slide = await HeroSlide.findByPk(req.params.id);
    if (!slide) return res.status(404).json({ error: 'Not found' });
    await slide.destroy();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
