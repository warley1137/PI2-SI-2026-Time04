require('dotenv').config();
const mysql = require('mysql2/promise');

module.exports = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'senha',
  database: 'pronto_socorro',
  waitForConnections: true,
  connectionLimit: 5,
  dateStrings: true
});