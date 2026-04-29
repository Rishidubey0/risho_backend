import { Router } from 'express';
import { Category } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['id', 'ASC']] });
    res.json(categories);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const cat = await Category.create({ name, image: image || null });
    res.status(201).json(cat);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    const { name, image } = req.body;
    await cat.update({ name: name ?? cat.name, image: image !== undefined ? image : cat.image });
    res.json(cat);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    await cat.destroy();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
