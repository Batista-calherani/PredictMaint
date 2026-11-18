/* Telas de visão geral: dashboard, planta, preditivo e busca */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { get, post, put, del, tokens, status } from "./_util.js";

let T;
before(async () => { T = await tokens(); });

test("dashboard traz indicadores, alertas, saúde e OS", async () => {
  const r = await get("/dashboard", { token: T.gestor });
  status(r, 200, "dashboard");
  assert.equal(r.body.kpis.length, 4);
  assert.ok(Array.isArray(r.body.saude) && r.body.saude.length >= 10);
  assert.ok(r.body.osPorStatus && typeof r.body.osPorStatus.abertas === "number");
});

test("planta ao vivo e replay de 6 horas atrás", async () => {
  const agora = await get("/planta", { token: T.tecnico });
  status(agora, 200, "planta");
  assert.ok(agora.body.zonas.length >= 1, "a planta veio sem setores");
  const antes = await get("/planta?horas=-6", { token: T.tecnico });
  assert.equal(antes.body.horas, -6);
  // O resumo da planta precisa bater com o total de máquinas ativas (vale para qualquer banco, não só o de exemplo)
  const resumo = (await get("/planta/resumo", { token: T.tecnico })).body;
  const maquinas = (await get("/maquinas", { token: T.tecnico })).body;
  const soma = Number(resumo.criticos) + Number(resumo.atencao) + Number(resumo.normais);
  assert.equal(soma, maquinas.length, `resumo ${JSON.stringify(resumo)} não bate com ${maquinas.length} máquinas`);
  const naPlanta = agora.body.zonas.reduce((t, z) => t + z.maquinas.length, 0);
  assert.equal(naPlanta, maquinas.length, "a planta não mostra todas as máquinas ativas");
});

test("previsão de vida útil e causas somando 100%", async () => {
  const r = await get("/planta/PH-03/preditivo", { token: T.gestor });
  status(r, 200, "preditivo");
  assert.ok(r.body.rulDias > 0);
  assert.equal(r.body.causas.reduce((s, c) => s + c.pct, 0), 100);
  status(await get("/planta/NAO-EXISTE/preditivo", { token: T.gestor }), 404, "máquina inexistente");
});

test("busca encontra máquina e OS", async () => {
  const r = await get("/busca?q=PH-03", { token: T.gestor });
  status(r, 200, "busca");
  assert.ok(r.body.some((x) => x.tipo === "Máquina"));
});

test("acentos e ç chegam certos do banco (UTF-8)", async () => {
  const setores = (await get("/setores", { token: T.gestor })).body;
  assert.ok(setores.includes("Logística"), `setores com acento errado: ${setores.join(", ")}`);
  const ordens = (await get("/ordens", { token: T.gestor })).body;
  const textos = ordens.map((o) => `${o.titulo} ${o.equipe}`).join(" ");
  assert.match(textos, /Mecânica/, "a palavra Mecânica não veio certa");
  assert.doesNotMatch(textos, /Ã|Â|�/, "apareceu acento quebrado (banco sem UTF-8)");
});

test("dashboard não quebra com máquina sem medições, mesmo sendo a mais crítica", async () => {
  const cod = `TST-D${Date.now().toString(36).slice(-4).toUpperCase()}`;
  status(await post("/maquinas", { token: T.gestor, body: { id: cod, nome: "Máquina sem leituras", setor: "Usinagem" } }), 201, "cadastrar");
  try {
    status(await put(`/maquinas/${cod}`, { token: T.gestor, body: { saude: 5 } }), 200, "deixar crítica");
    const r = await get("/dashboard", { token: T.gestor });
    status(r, 200, "dashboard");
    assert.equal(r.body.saude[0].id, cod, "a máquina nova deveria ser a mais crítica");
    assert.ok(r.body.vibracao.pontos.length > 0, "o gráfico do dashboard ficou vazio");
    assert.notEqual(r.body.vibracao.maquina, cod, "o gráfico escolheu uma máquina sem leituras");
    assert.ok(r.body.vibracao.nomeMaquina, "faltou o nome da máquina do gráfico");
    const serie = await get(`/medicoes/serie?maquina=${cod}&grandeza=vibracao`, { token: T.gestor });
    status(serie, 200, "série vazia");
    assert.deepEqual(serie.body.pontos, []);
  } finally {
    await del(`/maquinas/${cod}`, { token: T.gestor });
  }
});

test("filtros de todas as listas respondem sem erro", async () => {
  const rotas = [
    "/maquinas?status=critico&setor=Estamparia&ordem=saude",
    "/alertas?setor=Estamparia",
    "/ordens?prioridade=alta&equipe=" + encodeURIComponent("Mecânica") + "&periodo=30",
    "/medicoes?maquina=PH-03&limite=5",
    "/users?perfil=tecnico&ativo=1&q=" + encodeURIComponent("José"),
    "/chamados",
    "/busca?q=" + encodeURIComponent("Prensa Hidráulica"),
  ];
  for (const rota of rotas) status(await get(rota, { token: T.gestor }), 200, rota);
});
