import bcrypt from "bcryptjs";

import { pool } from "../config/database.js";
import { erro400, erro404 } from "../lib/http.js";

const PERFIS = ["gestor", "tecnico", "funcionario"];

const SQL_USUARIO = `
  SELECT u.id, u.nome, u.email, u.matricula, s.nome AS setor, u.ativo, u.criado_em,
         GROUP_CONCAT(p.perfil ORDER BY p.perfil) AS perfis
    FROM usuarios u
    LEFT JOIN setores s ON s.id = u.setor_id
    LEFT JOIN usuario_perfis p ON p.usuario_id = u.id`;

// A senha (hash) nunca sai da API
const formatar = (u) => ({ ...u, ativo: !!u.ativo, perfis: u.perfis ? u.perfis.split(",") : [] });

async function buscar(id) {
  const [rows] = await pool.query(`${SQL_USUARIO} WHERE u.id = ? GROUP BY u.id`, [id]);
  return rows[0] ? formatar(rows[0]) : null;
}

function validarPerfis(perfis) {
  const lista = Array.isArray(perfis) ? perfis : perfis ? [perfis] : [];
  if (!lista.length || !lista.every((p) => PERFIS.includes(p))) {
    throw erro400("Informe ao menos um perfil: gestor, tecnico ou funcionario.");
  }
  return [...new Set(lista)];
}

async function idDoSetor(nome) {
  if (!nome) return null;
  const [rows] = await pool.query("SELECT id FROM setores WHERE nome = ?", [nome]);
  if (!rows[0]) throw erro400(`Setor "${nome}" não existe.`);
  return rows[0].id;
}

const validarSenha = (s) => {
  if (String(s || "").length < 6) throw erro400("A senha precisa ter pelo menos 6 caracteres.");
};

// GET /api/users
export async function getUsers(req, res, next) {
  try {
    const [rows] = await pool.query(`${SQL_USUARIO} GROUP BY u.id ORDER BY u.nome`);
    res.json(rows.map(formatar));
  } catch (e) {
    next(e);
  }
}

// POST /api/users  { nome, email, matricula, senha, perfis: ["tecnico"], setor }
export async function createUsers(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { nome, email, matricula, senha, setor } = req.body;
    if (!nome || !email || !matricula) throw erro400("Informe nome, e-mail e matrícula.");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw erro400("E-mail inválido.");
    validarSenha(senha);
    const perfis = validarPerfis(req.body.perfis ?? req.body.perfil);

    await conn.beginTransaction();
    const [r] = await conn.query(
      "INSERT INTO usuarios (nome, email, matricula, senha_hash, setor_id) VALUES (?, ?, ?, ?, ?)",
      [String(nome).trim(), String(email).trim().toLowerCase(), String(matricula).trim(), await bcrypt.hash(String(senha), 10), await idDoSetor(setor)],
    );
    await conn.query("INSERT INTO usuario_perfis (usuario_id, perfil) VALUES ?", [perfis.map((p) => [r.insertId, p])]);
    await conn.commit();
    res.status(201).json(await buscar(r.insertId));
  } catch (e) {
    await conn.rollback().catch(() => {});
    next(e);
  } finally {
    conn.release();
  }
}

// PUT /api/users/:id  (só os campos enviados; senha opcional)
export async function updateUsers(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!(await buscar(id))) throw erro404("Usuário não encontrado.");

    const b = req.body, campos = [], valores = [];
    if (b.nome !== undefined) { campos.push("nome = ?"); valores.push(String(b.nome).trim()); }
    if (b.email !== undefined) { campos.push("email = ?"); valores.push(String(b.email).trim().toLowerCase()); }
    if (b.matricula !== undefined) { campos.push("matricula = ?"); valores.push(String(b.matricula).trim()); }
    if (b.setor !== undefined) { campos.push("setor_id = ?"); valores.push(await idDoSetor(b.setor)); }
    if (b.ativo !== undefined) { campos.push("ativo = ?"); valores.push(!!b.ativo); }
    if (b.senha) { validarSenha(b.senha); campos.push("senha_hash = ?"); valores.push(await bcrypt.hash(String(b.senha), 10)); }
    const perfis = b.perfis !== undefined ? validarPerfis(b.perfis) : null;
    if (!campos.length && !perfis) throw erro400("Nenhum campo para atualizar.");

    await conn.beginTransaction();
    if (campos.length) await conn.query(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`, [...valores, id]);
    if (perfis) {
      await conn.query("DELETE FROM usuario_perfis WHERE usuario_id = ?", [id]);
      await conn.query("INSERT INTO usuario_perfis (usuario_id, perfil) VALUES ?", [perfis.map((p) => [id, p])]);
    }
    await conn.commit();
    res.json(await buscar(id));
  } catch (e) {
    await conn.rollback().catch(() => {});
    next(e);
  } finally {
    conn.release();
  }
}

// DELETE /api/users/:id  -> desativa (o usuário não consegue mais entrar)
export async function deleteUsers(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (id === req.usuario.id) throw erro400("Você não pode desativar o seu próprio usuário.");
    const [r] = await pool.query("UPDATE usuarios SET ativo = FALSE WHERE id = ?", [id]);
    if (!r.affectedRows) throw erro404("Usuário não encontrado.");
    res.json({ mensagem: "Usuário desativado." });
  } catch (e) {
    next(e);
  }
}
