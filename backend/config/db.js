
const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Use SSL only when a CA certificate path is configured.
// This allows your existing local XAMPP connection to keep working.
if (process.env.DB_SSL_CA) {
  dbConfig.ssl = {
    ca: fs.readFileSync(process.env.DB_SSL_CA, "utf8"),
    rejectUnauthorized: true,
  };
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;
