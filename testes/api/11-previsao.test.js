/* Previsão de quebra por regressão linear (/api/previsao) */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { get, tokens, status } from "./_util.js";

let T;
before(async () => { T = await tokens(); });

const ESTADOS = ["ultrapassado", "iminente", "previsto", "fora_do_horizonte", "sem_tendencia", "dados_insuficientes"];

test("gestor e técnico podem ver a previsão; funcionário e sem login não", async () => {
  status(await get("/previsao", { token: T.gestor }), 200, "gestor lista");
  status(await get("/previsao/CP-01", { token: T.tecnico }), 200, "técnico detalhe");
  status(await get("/previsao", { token: T.funcionario }), 403, "funcionário lista");
  status(await get("/previsao/CP-01", { token: T.funcionario }), 403, "funcionário detalhe");
  status(await get("/previsao/CP-01"), 401, "sem login");
});

test("máquina inexistente devolve 404", async () => {
  status(await get("/previsao/NAO-EXISTE", { token: T.gestor }), 404, "inexistente");
});

test("detalhe traz data, hora, segundos e a reta de cada grandeza", async () => {
  const r = await get("/previsao/CP-01", { token: T.gestor });
  status(r, 200, "CP-01");
  const d = r.body;
  assert.equal(d.maquina, "CP-01");
  assert.ok(ESTADOS.includes(d.estado), `estado desconhecido: ${d.estado}`);
  assert.deepEqual(d.grandezas.map((g) => g.grandeza).sort(), ["corrente", "temperatura", "vibracao"]);
  for (const g of d.grandezas) {
    assert.ok(ESTADOS.includes(g.estado));
    if (g.estado !== "dados_insuficientes") {
      assert.equal(typeof g.inclinacaoDia, "number");
      assert.ok(g.r2 >= 0 && g.r2 <= 1, `R² fora de 0..1: ${g.r2}`);
    }
  }
  // No seed, a temperatura do CP-01 sobe todo dia: a reta tem que prever uma data
  const temp = d.grandezas.find((g) => g.grandeza === "temperatura");
  assert.ok(temp.inclinacaoDia > 0, "temperatura do CP-01 deveria estar subindo");
  const p = d.previsao;
  assert.ok(p, "CP-01 deveria ter previsão");
  assert.ok(!Number.isNaN(Date.parse(p.previsaoISO)), "previsaoISO inválida");
  assert.match(p.previsaoTexto, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  const { dias, horas, minutos, segundos } = p.restante;
  assert.equal(dias * 86400 + horas * 3600 + minutos * 60 + segundos, p.segundosRestantes);
});

test("máquina já acima do limite aparece como risco imediato", async () => {
  const d = (await get("/previsao/PH-03", { token: T.gestor })).body;
  assert.ok(["ultrapassado", "iminente"].includes(d.estado), `PH-03 veio ${d.estado}`);
  assert.equal(d.previsao.segundosRestantes, 0);
});

test("lista vem da quebra mais próxima para a mais distante e filtra por setor", async () => {
  const lista = (await get("/previsao", { token: T.gestor })).body;
  const maquinas = (await get("/maquinas", { token: T.gestor })).body;
  assert.equal(lista.length, maquinas.length);
  const peso = (x) => ESTADOS.indexOf(x.estado);
  for (let i = 1; i < lista.length; i++) {
    const a = lista[i - 1], b = lista[i];
    assert.ok(peso(a) < peso(b) || (peso(a) === peso(b) && (a.previsao?.previsaoTs ?? Infinity) <= (b.previsao?.previsaoTs ?? Infinity)), `ordem errada entre ${a.maquina} e ${b.maquina}`);
  }
  const est = (await get("/previsao?setor=" + encodeURIComponent("Estamparia"), { token: T.gestor })).body;
  assert.ok(est.length > 0 && est.every((x) => x.setor === "Estamparia"));
});

test("parâmetros inválidos não quebram a rota", async () => {
  const r = await get("/previsao/CP-01?pontos=abc&horizonte=-5", { token: T.gestor });
  status(r, 200, "parâmetros inválidos");
  assert.equal(r.body.pontosUsados, 20);
});
