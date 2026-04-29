import { Sequelize } from 'sequelize';

/**
 * MySQL only (phpMyAdmin / XAMPP / hosting).
 * Required in backend/.env: DB_NAME, DB_USER (and usually DB_PASSWORD, DB_HOST, DB_PORT).
 */
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;

if (!dbName || dbUser === undefined || dbUser === null) {
  console.error(
    '\n[database] This app uses MySQL only. Set in backend/.env:\n' +
      '  DB_NAME=your_database\n' +
      '  DB_USER=root\n' +
      '  DB_PASSWORD=\n' +
      '  DB_HOST=localhost\n' +
      '  DB_PORT=3306\n' +
      'Copy backend/.env.example → backend/.env and fill your phpMyAdmin database.\n'
  );
  process.exit(1);
}

const dbPass = process.env.DB_PASSWORD ?? '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

export const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
});
