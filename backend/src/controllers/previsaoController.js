/* Previsão de falha por regressão linear.
   Só LÊ o banco (medicoes, grandezas, vw_maquinas): não grava nem altera nada.
   A conta fica em ../lib/regressao.js. */
import { pool } from "../config/database.js";
import { erro404 } from "../lib/http.js";
import { montarPrevisao, preverFalhaMaquina } from "../lib/regressao.js";

// Fuso usado nos textos "28/11/2026 14:32:07". As datas ISO são sempre absolutas (UTC).
const FUSO = process.env.FUSO_HORARIO || "America/Sao_Paulo";

// Quantas leituras recentes de cada grandeza entram na reta (o gráfico de tendência usa 20)
const pontosDe = (q) => Math.max(3, Math.min(200, Number(q) || 20));
const horizonteDe = (q) => Math.max(7, Math.min(3650, Number(q) || 365));

/* Últimas N leituras de cada (máquina, grandeza), com o horário em segundos (UNIX_TIMESTAMP).
   O horário vem do próprio MySQL, então não importa o fuso do servidor da API. */
async function buscarLeituras(maquinaIds, pontos) {
  const [rows] = await pool.query(
    `SELECT maquina_id, grandeza, ts, valor FROM (
       SELECT me.maquina_id, me.grandeza, UNIX_TIMESTAMP(me.medido_em) AS ts, me.valor,
              ROW_NUMBER() OVER (PARTITION BY me.maquina_id, me.grandeza ORDER BY me.medido_em DESC, me.id DESC) AS rn
         FROM medicoes me
        WHERE me.maquina_id IN (?)
     ) t
     WHERE t.rn <= ?
     ORDER BY t.maquina_id, t.grandeza, t.ts`,
    [maquinaIds, pontos],
  );
  const porMaquina = {};
  for (const r of rows) {
    const m = (porMaquina[r.maquina_id] ||= {});
    (m[r.grandeza] ||= []).push({ ts: Number(r.ts), valor: Number(r.valor) });
  }
  return porMaquina;
}

async function contexto() {
  const [grandezas] = await pool.query("SELECT codigo, nome, unidade, limite_atencao, limite_critico FROM grandezas ORDER BY codigo");
  const [[{ agora }]] = await pool.query("SELECT UNIX_TIMESTAMP() AS agora");
  return { grandezas, agora: Number(agora) };
}

// GET /api/previsao/:id?pontos=20&horizonte=365  -> previsão detalhada de uma máquina
export async function getPrevisao(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT maquina_id, id, nome, setor, saude FROM vw_maquinas WHERE id = ?", [req.params.id]);
    const m = rows[0];
    if (!m) throw erro404("Máquina não encontrada.");

    const pontos = pontosDe(req.query.pontos);
    const { grandezas, agora } = await contexto();
    const leituras = (await buscarLeituras([m.maquina_id], pontos))[m.maquina_id] || {};
    const resultado = preverFalhaMaquina(leituras, grandezas, agora, { horizonteDias: horizonteDe(req.query.horizonte) });

    res.json({ ...montarPrevisao(m, resultado, agora, FUSO), pontosUsados: pontos });
  } catch (e) {
    next(e);
  }
}

// GET /api/previsao?setor=Estamparia  -> todas as máquinas, da quebra mais próxima para a mais distante
export async function getPrevisoes(req, res, next) {
  try {
    const where = req.query.setor ? "WHERE setor = ?" : "";
    const [maqs] = await pool.query(`SELECT maquina_id, id, nome, setor, saude FROM vw_maquinas ${where} ORDER BY id`, req.query.setor ? [req.query.setor] : []);
    if (!maqs.length) return res.json([]);

    const pontos = pontosDe(req.query.pontos);
    const { grandezas, agora } = await contexto();
    const leituras = await buscarLeituras(maqs.map((m) => m.maquina_id), pontos);
    const opcoes = { horizonteDias: horizonteDe(req.query.horizonte) };

    const lista = maqs.map((m) => {
      const p = montarPrevisao(m, preverFalhaMaquina(leituras[m.maquina_id] || {}, grandezas, agora, opcoes), agora, FUSO);
      // Na lista vai só o resumo; o detalhe por grandeza fica em /previsao/:id
      delete p.grandezas;
      return p;
    });
    const peso = { ultrapassado: 0, iminente: 1, previsto: 2, fora_do_horizonte: 3, sem_tendencia: 4, dados_insuficientes: 5 };
    lista.sort((x, y) => peso[x.estado] - peso[y.estado] || (x.previsao?.previsaoTs ?? Infinity) - (y.previsao?.previsaoTs ?? Infinity));
    res.json(lista);
  } catch (e) {
    next(e);
  }
}
