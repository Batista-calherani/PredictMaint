import { pool } from "../config/database.js";

//Mostrar todos os registros da tabela de maquinas
export async function getMaquinas(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM maquinas");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching maquinas:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

//Inserir na tabela uma máquina
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

//Deletar a máquina por id
export async function deleteMaquina(req, res, next) {
  try{
    const {id} = req.params;
    const sql = "DELETE FROM maquinas WHERE id = ?";
    const [resultado] = await pool.query(sql, [id]);

    if(resultado.affectedRows === 0){
      return res.status(400).json({
        error: "Máquina não encontrada"
      })
    }

    res.json({
      mensagem: "Máquina excluída com sucesso",
      resultado: resultado.affectedRows
    })

  } catch(error){
    console.error("Error deleting maquina:", error);
    res.status(500).json({ error: "Internal server error" });
  }
  
}

//Atuzalizar a máquina por id

export async function updateMaquina(req, res, next) {
  try{
    const {id} = req.params; //pega os parametros do id que o cliente mandou
    const { codigo, nome, categoria, status, health, manutencao, mediacao } = req.body

    const sql = `UPDATE maquinas SET codigo = ?, nome = ?, categoria = ?, status = ?, health = ?, manutencao = ?, mediacao = ? WHERE id = ?`;
    const valores = [codigo, nome, categoria, status, health, manutencao, mediacao, id];
    const [resultados] = await pool.query(sql, valores);
    res.json({
      mensagem: "Maquina atualizada com sucesso",
      resultado: resultados.affectedRows
    });
  }catch(e){
    next(e);
  }
  
}


