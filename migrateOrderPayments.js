import { DataTypes } from 'sequelize';
import { sequelize } from './config/database.js';
import { Order } from './models/Order.js';

function ordersTableName() {
  return Order.tableName;
}

function hasColumn(desc, name) {
  const lower = name.toLowerCase();
  return Object.keys(desc).some((k) => k.toLowerCase() === lower);
}

/** Add payment columns to `orders` if missing (MySQL). */
export async function migrateOrderPaymentColumns() {
  const qi = sequelize.getQueryInterface();
  const tableName = ordersTableName();

  let desc;
  try {
    desc = await qi.describeTable(tableName);
  } catch {
    return;
  }

  if (!hasColumn(desc, 'paymentMethod')) {
    await qi.addColumn(tableName, 'paymentMethod', {
      type: DataTypes.STRING(255),
      defaultValue: 'cod',
      allowNull: true,
    });
  }
  if (!hasColumn(desc, 'paymentStatus')) {
    await qi.addColumn(tableName, 'paymentStatus', {
      type: DataTypes.STRING(255),
      defaultValue: 'pending',
      allowNull: true,
    });
  }
  if (!hasColumn(desc, 'paymentRef')) {
    await qi.addColumn(tableName, 'paymentRef', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  }
}
