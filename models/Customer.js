import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Customer = sequelize.define(
  'Customer',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    address: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalSpent: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'customers',
    timestamps: true,
  }
);
