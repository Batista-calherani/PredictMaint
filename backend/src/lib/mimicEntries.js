// Simulador de cadastro de máquinas (dados fictícios para desenvolvimento/demonstração).
//
// Uso (ex.: em src/server.js):
//   import { pool } from "./config/database.js";
//   import { mimicEntries } from "./lib/mimicEntries.js";
//   if (process.env.SIMULAR === "1") mimicEntries(pool);
//
const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const machineSet = [
  "Prensa Hidráulica", "Máquina de Corte", "Torno Automático", "Britadeira", "Fresadora",
  "Serra de Fita", "Politriz", "Retífica", "Mandrilhadora", "Calandra",
];

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

// FIX 1: a função original não montava nem retornava a string (retornava undefined,
// e o código ficava "undefined-42").
function randomString(length) {
  let result = "";
  for (let i = 0; i < length; i++) result += sortear(charSet);
  return result;
}

/**
 * Insere máquinas fictícias na tabela `maquinas` em intervalos regulares.
 *
 * @param {object} pool  pool do mysql2/promise (FIX 2: recebido por parâmetro, em vez de
 *                       depender de uma variável global que pode não existir)
 * @param {object} [opcoes]
 * @param {number} [opcoes.intervaloMs=300000]  intervalo entre inserções (padrão: 5 min)
 * @param {(erro: Error) => void} [opcoes.aoErro]  o que fazer quando uma inserção falha
 * @param {(maquina: object) => void} [opcoes.aoInserir]  chamado após cada inserção
 * @returns {{ parar: () => void, inserirUma: () => Promise<object> }}
 */
export function mimicEntries(pool, { intervaloMs = 5000, aoErro = console.error, aoInserir } = {}) {
  async function inserirUma() {
    // FIX 3: setor_id é uma chave estrangeira (número). A original mandava o NOME do setor
    // ("Usinagem"), o que o MySQL rejeita. Aqui sorteamos um setor que existe de verdade.
    const [setores] = await pool.query("SELECT id, nome FROM setores");
    if (setores.length === 0) throw new Error("Nenhum setor cadastrado na tabela `setores`.");
    const setor = sortear(setores);

    const dias = Math.floor(Math.random() * 30);
    const needed = {
      codigo: randomString(2) + "-" + Math.floor(Math.random() * 100).toString().padStart(2, "0"),
      nome: sortear(machineSet),
      setor_id: setor.id,
      custo_parada_hora: Math.floor(Math.random() * 1000) + 1,
      proxima_manutencao: new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    };

    const [resultado] = await pool.query(
      `INSERT INTO maquinas (codigo, nome, setor_id, saude, custo_parada_hora, proxima_manutencao)
       VALUES (?, ?, ?, 100, ?, ?)`,
      [needed.codigo, needed.nome, needed.setor_id, needed.custo_parada_hora, needed.proxima_manutencao],
    );

    const maquina = { id: resultado.insertId, ...needed, setor_nome: setor.nome };
    aoInserir?.(maquina);
    return maquina;
  }

  // FIX 4: o callback precisa ser `async` para poder usar `await` (sem isso, o arquivo
  // nem carrega: SyntaxError).
  const timer = setInterval(async () => {
    try {
      await inserirUma();
    } catch (e) {
      // FIX 5: `next` só existe dentro de uma rota/middleware do Express. Aqui não há
      // requisição, então `next(e)` gerava um ReferenceError e derrubava o processo.
      aoErro(e);
    }
  }, intervaloMs);

  // FIX 6: devolve um jeito de parar o simulador (útil em testes e ao desligar o servidor).
  return { parar: () => clearInterval(timer), inserirUma };
}