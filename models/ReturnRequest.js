import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ReturnRequest = sequelize.define(
  'ReturnRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
    adminNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'return_requests',
    timestamps: true,
  }
);
