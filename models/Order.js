import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    items: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      defaultValue: 'cod',
    },
    paymentStatus: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
    paymentRef: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'orders',
    timestamps: true,
  }
);
