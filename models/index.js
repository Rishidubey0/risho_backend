import { Category } from './Category.js';
import { Product } from './Product.js';
import { Admin } from './Admin.js';
import { Order } from './Order.js';
import { Customer } from './Customer.js';
import { ReturnRequest } from './ReturnRequest.js';
import { HeroSlide } from './HeroSlide.js';

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Product.hasMany(HeroSlide, { foreignKey: 'productId', as: 'heroSlides' });
HeroSlide.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Order.hasMany(ReturnRequest, { foreignKey: 'orderId', as: 'returnRequests' });
ReturnRequest.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

export { Category, Product, Admin, Order, Customer, ReturnRequest, HeroSlide };
