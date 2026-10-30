import { pool } from "../config/database.js";

//Mostrar todos os registros da tabela de usuários
export async function getUsers(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}


//Inserir na tabela de usuários
export async function createUsers(req, res, next) {
  try {
    const { email, senha, nome, perfil} = req.body;

    const sql =
      "INSERT INTO users ( email, senha, nome, perfil) values (?, ?, ?, ?)";
    const valores = [email, senha, nome, perfil];
    const [resultados] = await pool.query(sql, valores); // uso valores, qnd vou enviar os dados ? no banco
    res.json({
      mensagem: "Usuario criado com sucesso",
      resultado: resultados.insertId,
    });
  } catch (e) {
    next(e);
  }
}


//Deletar user por id
export async function deleteUsers(req, res, next) {
  try{
    const {id} = req.params;
    const sql = "DELETE FROM users WHERE id = ?";
    const [resultado] = await pool.query(sql, [id]);

    if(resultado.affectedRows === 0){
      return res.status(400).json({
        error: "Usuário não encontrado"
      })
    }

    res.json({
      mensagem: "Usuário excluído com sucesso",
      resultado: resultado.affectedRows
    })

  } catch(error){
    console.error("Error deleting users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
  
}


//Atualizando usuário por id

export async function updateUsers(req, res, next) {
  try{
    const {id} = req.params; //pega os parametros do id que o cliente mandou
    const { email, senha, nome, perfil} = req.body

    const sql = `UPDATE users SET email = ?, senha = ?, nome = ?, perfil = ? WHERE  id = ?`;
    const valores = [email, senha, nome, perfil, id];
    const [resultados] = await pool.query(sql, valores);
    res.json({
      mensagem: "Users atualizada com sucesso",
      resultado: resultados.affectedRows
    });
  }catch(e){
    next(e);
  }
  
}
