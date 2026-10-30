import mysql from "mysql2/promise";
import dotenv from 'dotenv';

//Normalmente o .env fica na raiz do projeto, não no src.
//Por isso precisa mostrar o caminho para ele.
dotenv.config({ path: './src/.env' });

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function checkDatabaseConnection() {
  const [rows] = await pool.query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}
