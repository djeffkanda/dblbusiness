require('dotenv').config({ override: true });

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppass',
  database: process.env.DB_NAME || 'bldbusiness',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool.promise();
