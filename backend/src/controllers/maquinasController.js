import { pool } from "../config/database.js";

export async function getMaquinas(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM maquinas");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching maquinas:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createMaquina(req, res, next) {
  try {
    const { codigo, nome, categoria, status, health, manutencao, mediacao } = req.body;

    const sql =
      "INSERT INTO maquinas ( codigo, nome, categoria, status, health, manutencao, mediacao) values (?, ?, ?, ?, ?, ?, ?)";
    const valores = [codigo, nome, categoria, status, health, manutencao, mediacao];
    const [resultados] = await pool.query(sql, valores); // uso valores, qnd vou enviar os dados ? no banco
    res.json({
      mensagem: "Maquina criada com sucesso",
      resultado: resultados.insertId,
    });
  } catch (e) {
    next(e);
  }
}