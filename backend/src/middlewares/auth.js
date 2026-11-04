import jwt from "jsonwebtoken";

import "../config/env.js";
import { erro401, erro403 } from "../lib/http.js";

export const JWT_SECRET = process.env.JWT_SECRET || "troque-este-segredo-no-env";

// Exige o token "Authorization: Bearer <token>" gerado no login.
// Depois dele, req.usuario = { id, nome, perfil, setor }.
export function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) return next(erro401("Faça login para continuar."));
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(erro401("Sua sessão expirou. Entre de novo."));
  }
}

// Libera a rota só para alguns perfis. Ex.: permitir("gestor", "tecnico")
export const permitir =
  (...perfis) =>
  (req, res, next) =>
    perfis.includes(req.usuario?.perfil)
      ? next()
      : next(erro403("Seu perfil não tem acesso a esta função."));
