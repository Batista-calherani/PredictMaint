/* ============================================================
   REGRESSÃO LINEAR — previsão de quando a máquina pode quebrar.

   O MESMO arquivo existe em:
     backend/src/lib/regressao.js      (API de verdade)
     frontend/src/lib/regressao.jsx    (modo demonstração)
   Se mudar a conta em um, copie para o outro.

   Como funciona (para cada grandeza: vibração, temperatura, corrente):
     1. Pega as últimas leituras da máquina (tempo x valor).
     2. Ajusta a reta  valor = a + b · t  pelos mínimos quadrados
        (t = dias desde a primeira leitura; b = quanto sobe por dia).
     3. Descobre o instante em que a reta encosta no limite crítico:
          t_falha = (limite - a) / b
     4. A previsão da máquina é a grandeza que estoura PRIMEIRO.

   Nada aqui acessa banco nem rede: só recebe números e devolve números.
   ============================================================ */

const DIA = 86400; // segundos em um dia

/* Mínimos quadrados. pontos = [{ x, y }]
   Devolve { a, b, r2, n, mediaX, mediaY, erroPadraoB } ou null se não der para ajustar. */
export function regressaoLinear(pontos) {
  const n = pontos.length;
  if (n < 2) return null;
  const mediaX = pontos.reduce((s, p) => s + p.x, 0) / n;
  const mediaY = pontos.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pontos) {
    const dx = p.x - mediaX, dy = p.y - mediaY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return null; // todas as leituras no mesmo instante

  const b = sxy / sxx;
  const a = mediaY - b * mediaX;
  const sse = pontos.reduce((s, p) => s + (p.y - (a + b * p.x)) ** 2, 0);
  const r2 = syy === 0 ? 1 : Math.max(0, Math.min(1, 1 - sse / syy));
  // Erro padrão da inclinação: usado para a "faixa provável" da previsão
  const erroPadraoB = n > 2 ? Math.sqrt(sse / (n - 2) / sxx) : null;
  return { a, b, r2, n, mediaX, mediaY, erroPadraoB };
}

/* Segundos -> { dias, horas, minutos, segundos } */
export function quebrarTempo(seg) {
  const s = Math.max(0, Math.floor(seg || 0));
  return {
    dias: Math.floor(s / DIA),
    horas: Math.floor((s % DIA) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  };
}

/* Segundos -> "4 d 06 h 12 min 33 s" */
export function textoTempo(seg) {
  const t = quebrarTempo(seg), p = (n) => String(n).padStart(2, "0");
  return `${t.dias} d ${p(t.horas)} h ${p(t.minutos)} min ${p(t.segundos)} s`;
}

/* Timestamp (segundos) -> "28/11/2026 14:32:07". fuso vazio = fuso do computador. */
export function formatarDataHora(ts, fuso) {
  if (ts == null) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso || undefined,
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ts * 1000)).replace(",", "");
}

// 6.4 -> "6,4" (padrão das telas)
const virgula = (n) => String(n).replace(".", ",");

const arred = (v, casas = 4) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** casas) / 10 ** casas);

/* Previsão de UMA grandeza.
   leituras = [{ ts, valor }] (ts em segundos), em qualquer ordem
   g = { codigo, nome, unidade, limite_critico, limite_atencao }
   agora = timestamp atual em segundos
   Estados possíveis:
     ultrapassado        -> a última leitura já passou do limite crítico
     iminente            -> a reta já cruzou o limite (a quebra pode acontecer a qualquer momento)
     previsto            -> a reta cruza o limite no futuro, dentro do horizonte
     fora_do_horizonte   -> cruza, mas daqui a mais de `horizonteDias`
     sem_tendencia       -> a grandeza está estável ou caindo: a reta não indica quebra
     dados_insuficientes -> poucas leituras para traçar uma reta confiável */
export function preverFalhaGrandeza(leituras, g, agora, opcoes = {}) {
  const minPontos = opcoes.minPontos ?? 3;
  const horizonteDias = opcoes.horizonteDias ?? 365;
  const lim = Number(g.limite_critico), atencao = Number(g.limite_atencao);
  const ord = [...leituras]
    .map((l) => ({ ts: Number(l.ts), valor: Number(l.valor) }))
    .filter((l) => Number.isFinite(l.ts) && Number.isFinite(l.valor))
    .sort((x, y) => x.ts - y.ts);
  const ultima = ord[ord.length - 1];

  const base = {
    grandeza: g.codigo,
    nome: g.nome,
    unidade: g.unidade,
    limite: lim,
    atencao,
    pontos: ord.length,
    ultimoValor: ultima ? ultima.valor : null,
    ultimaLeituraTs: ultima ? ultima.ts : null,
  };

  if (ord.length < minPontos) {
    return { ...base, estado: "dados_insuficientes", previsaoTs: null, segundosRestantes: null,
      mensagem: `São precisas pelo menos ${minPontos} leituras de ${g.nome.toLowerCase()} para calcular a tendência (há ${ord.length}).` };
  }

  const t0 = ord[0].ts;
  const reg = regressaoLinear(ord.map((l) => ({ x: (l.ts - t0) / DIA, y: l.valor })));
  if (!reg) {
    return { ...base, estado: "dados_insuficientes", previsaoTs: null, segundosRestantes: null,
      mensagem: "As leituras estão todas no mesmo instante: não dá para traçar uma reta." };
  }

  const { a, b, r2 } = reg;
  // Em que instante (segundos) a reta y = mediaY + b'(x - mediaX) chega ao valor `alvo`
  const cruza = (alvo, inc = b) => (inc > 0 ? t0 + (reg.mediaX + (alvo - reg.mediaY) / inc) * DIA : null);
  const xAgora = (agora - t0) / DIA;

  const comum = {
    ...base,
    inclinacaoDia: arred(b),          // quanto a grandeza sobe (ou desce) por dia
    intercepto: arred(a),
    r2: arred(r2),                    // 0 a 1: quanto a reta explica as leituras
    valorEstimadoAgora: arred(a + b * xAgora, 2),
    inicioTs: t0,
    // dois pontos da reta (início e agora) para desenhar no gráfico, se quiser
    reta: [{ ts: t0, valor: arred(a, 3) }, { ts: agora, valor: arred(a + b * xAgora, 3) }],
  };

  // Faixa provável: refaz a conta com a inclinação ± 1 erro padrão
  const janela = () => {
    if (!(b > 0) || reg.erroPadraoB == null) return null;
    const cedo = cruza(lim, b + reg.erroPadraoB);
    const tarde = b - reg.erroPadraoB > 0 ? cruza(lim, b - reg.erroPadraoB) : null;
    return { cedoTs: cedo != null ? Math.max(agora, Math.round(cedo)) : null, tardeTs: tarde != null ? Math.max(agora, Math.round(tarde)) : null };
  };

  if (ultima.valor > lim) {
    const cruzou = cruza(lim);
    return { ...comum, estado: "ultrapassado", previsaoTs: Math.round(agora), segundosRestantes: 0,
      cruzouLimiteTs: cruzou != null && cruzou <= agora ? Math.round(cruzou) : null, janela: null,
      mensagem: `A última leitura (${virgula(ultima.valor)} ${g.unidade}) já passou do limite crítico (${virgula(lim)} ${g.unidade}). Risco de quebra imediato.` };
  }

  if (!(b > 0)) {
    return { ...comum, estado: "sem_tendencia", previsaoTs: null, segundosRestantes: null, janela: null,
      mensagem: `${g.nome} está estável ou caindo: a regressão não indica quebra por essa grandeza.` };
  }

  const ts = cruza(lim);
  const entraAtencaoTs = ultima.valor < atencao ? cruza(atencao) : null;
  const extra = { janela: janela(), entraAtencaoTs: entraAtencaoTs != null && entraAtencaoTs > agora ? Math.round(entraAtencaoTs) : null };

  if (ts <= agora) {
    return { ...comum, ...extra, estado: "iminente", previsaoTs: Math.round(agora), segundosRestantes: 0,
      mensagem: `Pela tendência, ${g.nome.toLowerCase()} já deveria ter chegado ao limite crítico. A quebra pode acontecer a qualquer momento.` };
  }

  const segundos = Math.round(ts - agora);
  if (segundos > horizonteDias * DIA) {
    return { ...comum, ...extra, estado: "fora_do_horizonte", previsaoTs: Math.round(ts), segundosRestantes: segundos,
      mensagem: `${g.nome} sobe devagar: pela reta, só chega ao limite daqui a mais de ${horizonteDias} dias.` };
  }
  return { ...comum, ...extra, estado: "previsto", previsaoTs: Math.round(ts), segundosRestantes: segundos,
    mensagem: `Mantida a tendência, ${g.nome.toLowerCase()} chega ao limite crítico (${virgula(lim)} ${g.unidade}) na data prevista.` };
}

// Ordem de gravidade para escolher a grandeza que manda na previsão da máquina
const PESO = { ultrapassado: 0, iminente: 1, previsto: 2, fora_do_horizonte: 3, sem_tendencia: 4, dados_insuficientes: 5 };

/* Previsão da MÁQUINA: roda a regressão em cada grandeza e fica com a que estoura primeiro.
   leiturasPorGrandeza = { vibracao: [{ ts, valor }], temperatura: [...], ... } */
export function preverFalhaMaquina(leiturasPorGrandeza, grandezas, agora, opcoes = {}) {
  const lista = grandezas
    .map((g) => preverFalhaGrandeza(leiturasPorGrandeza[g.codigo] || [], g, agora, opcoes))
    .sort((x, y) => PESO[x.estado] - PESO[y.estado] || (x.previsaoTs ?? Infinity) - (y.previsaoTs ?? Infinity));
  const principal = lista.find((x) => PESO[x.estado] <= PESO.fora_do_horizonte) || null;
  return { estado: principal ? principal.estado : lista.some((x) => x.estado === "sem_tendencia") ? "sem_tendencia" : "dados_insuficientes", previsao: principal, grandezas: lista };
}

/* Acrescenta datas prontas (ISO e "dd/mm/aaaa hh:mm:ss") e o tempo restante quebrado. */
export function comDatas(x, fuso) {
  if (!x) return x;
  const iso = (ts) => (ts == null ? null : new Date(ts * 1000).toISOString());
  const out = {
    ...x,
    previsaoISO: iso(x.previsaoTs),
    previsaoTexto: formatarDataHora(x.previsaoTs, fuso),
    restante: x.segundosRestantes == null ? null : quebrarTempo(x.segundosRestantes),
    restanteTexto: x.segundosRestantes == null ? null : textoTempo(x.segundosRestantes),
    ultimaLeituraTexto: formatarDataHora(x.ultimaLeituraTs, fuso),
  };
  if (x.janela) out.janela = { ...x.janela, cedoISO: iso(x.janela.cedoTs), tardeISO: iso(x.janela.tardeTs), cedoTexto: formatarDataHora(x.janela.cedoTs, fuso), tardeTexto: formatarDataHora(x.janela.tardeTs, fuso) };
  if (x.entraAtencaoTs != null) out.entraAtencaoTexto = formatarDataHora(x.entraAtencaoTs, fuso);
  if (x.cruzouLimiteTs != null) out.cruzouLimiteTexto = formatarDataHora(x.cruzouLimiteTs, fuso);
  return out;
}

/* Resposta completa de uma máquina, no formato que a API devolve. */
export function montarPrevisao(maquina, resultado, agora, fuso) {
  return {
    maquina: maquina.id,
    nome: maquina.nome,
    setor: maquina.setor,
    saude: maquina.saude,
    metodo: "Regressão linear (mínimos quadrados) sobre as últimas leituras de cada grandeza",
    geradoEm: new Date(agora * 1000).toISOString(),
    geradoEmTexto: formatarDataHora(agora, fuso),
    estado: resultado.estado,
    previsao: comDatas(resultado.previsao, fuso),
    grandezas: resultado.grandezas.map((g) => comDatas(g, fuso)),
  };
}
