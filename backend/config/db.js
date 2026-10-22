
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const isLocalDatabase =
  process.env.DB_HOST === "localhost" ||
  process.env.DB_HOST === "127.0.0.1";

if (!isLocalDatabase && process.env.DB_SSL_CA) {
  const certificatePath = path.resolve(__dirname, "..", process.env.DB_SSL_CA);

  dbConfig.ssl = {
    ca: fs.readFileSync(certificatePath, "utf8"),
    rejectUnauthorized: true,
  };
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;
