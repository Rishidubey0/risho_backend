import { Category } from '../models/index.js';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories.js';

/** Creates default jewelry categories if the table has no rows. */
export async function ensureDefaultCategories() {
  const n = await Category.count();
  if (n > 0) return;
  await Category.bulkCreate(DEFAULT_CATEGORIES);
  console.log(`[database] Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
}
