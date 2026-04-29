import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sequelize } from './config/database.js';
import { Admin, Category, Product } from './models/index.js';
import { DEFAULT_CATEGORIES } from './data/defaultCategories.js';
import { ensureDefaultCategories } from './lib/ensureDefaultCategories.js';

async function seed() {
  const force = process.env.SEED_FORCE === 'true';

  if (!force) {
    await sequelize.sync();
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const email = process.env.ADMIN_EMAIL || 'admin@jewelry.com';
    const [admin, created] = await Admin.findOrCreate({
      where: { email },
      defaults: {
        name: 'Store Admin',
        password: hashed,
      },
    });
    if (created) {
      console.log('Admin created:', email);
    } else {
      console.log('Admin already exists:', email, '(password unchanged)');
    }
    await ensureDefaultCategories();
    console.log(
      'Tip: use SEED_FORCE=true to drop all tables and load demo categories/products (destructive).'
    );
    process.exit(0);
    return;
  }

  await sequelize.sync({ force: true });

  const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await Admin.create({
    name: 'Store Admin',
    email: process.env.ADMIN_EMAIL || 'admin@jewelry.com',
    password: hashed,
  });

  const cats = [];
  for (const c of DEFAULT_CATEGORIES) {
    cats.push(await Category.create(c));
  }

  const products = [
    {
      name: 'Rose Gold Chain Bracelet',
      description: 'Delicate rose gold plated chain bracelet with adjustable clasp.',
      price: 1299,
      originalPrice: 1599,
      image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80',
      featured: true,
      stock: 25,
      categoryId: cats[0].id,
    },
    {
      name: 'Pearl Charm Bracelet',
      description: 'Freshwater pearls with sterling silver accents.',
      price: 1899,
      originalPrice: null,
      image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80',
      featured: true,
      stock: 15,
      categoryId: cats[0].id,
    },
    {
      name: 'Crystal Drop Earrings',
      description: 'Elegant crystal drops for evening wear.',
      price: 899,
      originalPrice: 1199,
      image:
        'https://images.pexels.com/photos/1078958/pexels-photo-1078958.jpeg?auto=compress&cs=tinysrgb&w=600',
      featured: true,
      stock: 40,
      categoryId: cats[1].id,
    },
    {
      name: 'Minimal Gold Hoops',
      description: 'Classic hoops in 18k gold tone.',
      price: 699,
      originalPrice: null,
      image:
        'https://images.pexels.com/photos/1078958/pexels-photo-1078958.jpeg?auto=compress&cs=tinysrgb&w=600',
      featured: true,
      stock: 50,
      categoryId: cats[1].id,
    },
    {
      name: 'Tiny Nose Stud',
      description: 'Sterling silver nose stud with cubic zirconia.',
      price: 399,
      originalPrice: null,
      image:
        'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=600',
      featured: false,
      stock: 30,
      categoryId: cats[2].id,
    },
    {
      name: 'Solitaire Ring',
      description: 'Minimal solitaire ring with crystal center.',
      price: 1499,
      originalPrice: 1999,
      image:
        'https://images.pexels.com/photos/10475790/pexels-photo-10475790.jpeg?auto=compress&cs=tinysrgb&w=600',
      featured: true,
      stock: 20,
      categoryId: cats[3].id,
    },
    {
      name: 'Layered Pendant Necklace',
      description: 'Triple layer chain with heart pendant.',
      price: 2199,
      originalPrice: null,
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
      featured: true,
      stock: 12,
      categoryId: cats[4].id,
    },
    {
      name: 'Silver Bangle Set',
      description: 'Set of 3 slim silver bangles.',
      price: 999,
      originalPrice: 1299,
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80',
      featured: false,
      stock: 22,
      categoryId: cats[0].id,
    },
    {
      name: 'Delicate Chain Anklet',
      description: 'Lightweight chain anklet with adjustable clasp — perfect for everyday.',
      price: 599,
      originalPrice: 799,
      image:
        'https://images.pexels.com/photos/265906/pexels-photo-265906.jpeg?auto=compress&cs=tinysrgb&w=600',
      featured: true,
      stock: 35,
      categoryId: cats[5].id,
    },
  ];

  await Product.bulkCreate(products);

  console.log('Seed complete. Admin:', process.env.ADMIN_EMAIL || 'admin@jewelry.com');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
