require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pronto_socorro',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

async function transacao(funcao) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await funcao(conn);
    await conn.commit();
    return resultado;
  } catch (erro) {
    await conn.rollback();
    throw erro;
  } finally {
    conn.release();
  }
}

module.exports = { pool, transacao };
