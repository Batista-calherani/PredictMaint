// Simulador de medições (sensores fictícios) para desenvolvimento/demonstração.
//
// Faz o mesmo que o POST /api/medicoes faz quando alguém lança uma medição:
//   1. grava a medição;
//   2. atualiza maquinas.ultima_medicao;
//   3. abre um alerta se o valor passar do limite crítico (sem duplicar alerta aberto).
//
// Uso (ex.: em src/server.js):
//   import { pool } from "./config/database.js";
//   import { mimicMedicoes } from "./lib/mimicMedicoes.js";
//   if (process.env.SIMULAR === "1") mimicMedicoes(pool);
import { situacaoMedicao, virgula } from "./regras.js";

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
const arred = (n) => Math.round(n * 100) / 100;

// Gera um valor realista a partir dos limites da própria grandeza (tabela `grandezas`):
// ~85% das leituras normais, ~10% em atenção e ~5% críticas.
function gerarValor(g) {
  const atencao = Number(g.limite_atencao);
  const critico = Number(g.limite_critico);
  const r = Math.random();
  if (r < 0.05) return arred(critico * (1.01 + Math.random() * 0.15)); // acima do crítico
  if (r < 0.15) return arred(atencao + Math.random() * (critico - atencao)); // faixa de atenção
  return arred(atencao * (0.5 + Math.random() * 0.45)); // normal
}

/**
 * @param {object} pool  pool do mysql2/promise (src/config/database.js)
 * @param {object} [opcoes]
 * @param {number} [opcoes.intervaloMs=60000]  intervalo entre medições (padrão: 1 min)
 * @param {(erro: Error) => void} [opcoes.aoErro]
 * @param {(medicao: object) => void} [opcoes.aoInserir]
 * @returns {{ parar: () => void, inserirUma: () => Promise<object> }}
 */
export function mimicMedicoes(pool, { intervaloMs = 60000, aoErro = console.error, aoInserir } = {}) {
  async function inserirUma() {
    // Só máquinas ativas (a mesma regra do POST /api/medicoes)
    const [maquinas] = await pool.query("SELECT id, codigo FROM maquinas WHERE ativo = TRUE");
    if (maquinas.length === 0) throw new Error("Nenhuma máquina ativa na tabela `maquinas`.");

    // As grandezas vêm da tabela `grandezas` (códigos: vibracao, temperatura, corrente)
    const [grandezas] = await pool.query("SELECT * FROM grandezas");
    if (grandezas.length === 0) throw new Error("Nenhuma grandeza cadastrada na tabela `grandezas`.");

    const maquina = sortear(maquinas);
    const g = sortear(grandezas);
    const valor = gerarValor(g);
    const situacao = situacaoMedicao(valor, g);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // medido_em fica com o DEFAULT do banco (data E hora de agora).
      // usuario_id NULL = leitura de sensor.
      const [r] = await conn.query(
        "INSERT INTO medicoes (maquina_id, grandeza, valor, observacao) VALUES (?, ?, ?, ?)",
        [maquina.id, g.codigo, valor, "Leitura simulada"],
      );
      await conn.query(
        "UPDATE maquinas SET ultima_medicao = GREATEST(COALESCE(ultima_medicao, '1000-01-01'), NOW()) WHERE id = ?",
        [maquina.id],
      );

      let alertaCriado = false;
      if (situacao === "critico") {
        const titulo = `${g.nome} acima do limite`;
        const [aberto] = await conn.query(
          "SELECT id FROM alertas WHERE maquina_id = ? AND titulo = ? AND estado <> 'resolvido' LIMIT 1",
          [maquina.id, titulo],
        );
        if (!aberto[0]) {
          await conn.query(
            `INSERT INTO alertas (maquina_id, medicao_id, grandeza, nivel, titulo, valor_medido, valor_limite, previsao, acao)
             VALUES (?, ?, ?, 'critico', ?, ?, ?, 'A calcular', 'Inspecionar a máquina e confirmar a leitura.')`,
            [maquina.id, r.insertId, g.codigo, titulo, `${virgula(valor)} ${g.unidade}`, `${virgula(g.limite_critico)} ${g.unidade}`],
          );
          alertaCriado = true;
        }
      }

      await conn.commit();

      const medicao = { id: r.insertId, maquina: maquina.codigo, grandeza: g.codigo, valor, unidade: g.unidade, situacao, alertaCriado };
      aoInserir?.(medicao);
      return medicao;
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  }

  const timer = setInterval(async () => {
    try {
      await inserirUma();
    } catch (e) {
      aoErro(e);
    }
  }, intervaloMs);

  return { parar: () => clearInterval(timer), inserirUma };
}