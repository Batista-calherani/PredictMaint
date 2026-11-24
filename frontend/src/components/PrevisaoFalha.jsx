'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/util';
import { Badge, Gauge, useLoad } from '@/components/ui';
import { num } from '@/lib/util';
import { textoTempo } from '@/lib/regressao';

/* ============================================================
   PREVISÃO DE QUEBRA (regressão linear)
   Mostra quando a máquina pode quebrar, com data, hora, minuto
   e segundo, e uma contagem regressiva que anda sozinha.
   ============================================================ */

// Relógio que atualiza a cada segundo (para a contagem regressiva)
export function useRelogio() {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(i); }, []);
  return t;
}

// Segundos que faltam agora, a partir da data prevista (ISO)
export const faltam = (p, agoraMs) => (p && p.previsaoISO ? Math.max(0, (Date.parse(p.previsaoISO) - agoraMs) / 1000) : null);

// "28/11/2026 às 14:32:07" no fuso do navegador
export const dataHora = iso => {
  if (!iso) return '—';
  const d = new Date(iso), p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// Cor e rótulo de cada situação
export function situacao(estado, segundos) {
  if (estado === 'ultrapassado') return { k: 'critico', t: 'Acima do limite' };
  if (estado === 'iminente') return { k: 'critico', t: 'Quebra iminente' };
  if (estado === 'previsto') return segundos <= 7 * 86400 ? { k: 'critico', t: 'Até 7 dias' } : segundos <= 30 * 86400 ? { k: 'atencao', t: 'Até 30 dias' } : { k: 'normal', t: 'Mais de 30 dias' };
  if (estado === 'fora_do_horizonte') return { k: 'normal', t: 'Sem risco próximo' };
  if (estado === 'sem_tendencia') return { k: 'normal', t: 'Estável' };
  return { k: 'info', t: 'Sem dados suficientes' };
}

const pct = r2 => (r2 == null ? '—' : Math.round(r2 * 100) + '%');
const porDia = g => (g.inclinacaoDia == null ? '—' : `${g.inclinacaoDia > 0 ? '+' : ''}${num(g.inclinacaoDia, 3)} ${g.unidade}/dia`);

/* Contagem regressiva grande: 04 d 06 h 12 min 33 s */
export function Contagem({ segundos }) {
  const s = Math.max(0, Math.floor(segundos || 0));
  const partes = [[Math.floor(s / 86400), 'dias'], [Math.floor((s % 86400) / 3600), 'horas'], [Math.floor((s % 3600) / 60), 'min'], [s % 60, 'seg']];
  return (
    <div className="d-flex gap-2" role="timer" aria-label={`Faltam ${textoTempo(s)}`}>
      {partes.map(([v, r]) => <div key={r} className="pm-mini text-center" style={{ minWidth: 64 }}><b style={{ fontSize: '1.5rem', fontVariantNumeric: 'tabular-nums' }}>{String(v).padStart(2, '0')}</b><span className="pm-lbl">{r}</span></div>)}
    </div>
  );
}

/* Bloco completo para o detalhe de uma máquina */
export default function PrevisaoFalha({ id }) {
  const l = useLoad(() => api.previsaoFalha(id), [id]);
  const agora = useRelogio();
  if (l.erro) return <p className="text-secondary mb-3">Previsão de quebra indisponível: {l.erro}</p>;
  if (!l.data) return <p className="text-secondary mb-3" role="status">Calculando a previsão de quebra…</p>;

  const d = l.data, p = d.previsao, seg = faltam(p, agora), sit = situacao(d.estado, seg);
  return (
    <section className="pm-card mb-3" aria-labelledby={`prev-${id}`}>
      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
        <h3 className="h6 mb-0" id={`prev-${id}`}>Previsão de quebra · regressão linear</h3>
        <Badge k={sit.k}>{sit.t}</Badge>
      </div>

      {!p && <p className="mb-2">{d.grandezas.find(g => g.estado === 'sem_tendencia')?.mensagem || d.grandezas[0]?.mensagem || 'Sem leituras para calcular a tendência.'}</p>}

      {p && (p.estado === 'ultrapassado' || p.estado === 'iminente') && <div className="row g-3 align-items-center">
        <div className="col-sm-4"><Gauge dias={0} /></div>
        <div className="col-sm-8">
          <p className="mb-1"><b>{p.nome}</b>: {p.mensagem}</p>
          {p.cruzouLimiteTexto && <p className="text-secondary small mb-0">Pela reta, o limite foi atingido em {dataHora(new Date(p.cruzouLimiteTs * 1000).toISOString())}.</p>}
        </div>
      </div>}

      {p && (p.estado === 'previsto' || p.estado === 'fora_do_horizonte') && <>
        <div className="row g-3 align-items-center">
          <div className="col-sm-4"><Gauge dias={Math.floor(seg / 86400)} /></div>
          <div className="col-sm-8">
            <p className="pm-lbl mb-1">Pode quebrar em</p>
            <p className="mb-2" style={{ fontSize: '1.35rem', fontWeight: 700 }}>{dataHora(p.previsaoISO)}</p>
            <Contagem segundos={seg} />
          </div>
        </div>
        <p className="mt-2 mb-1">Quem manda na previsão: <b>{p.nome}</b>, subindo {porDia(p)} rumo ao limite de {num(p.limite, 1)} {p.unidade} (última leitura {num(p.ultimoValor, 1)} {p.unidade}).</p>
        {p.janela && <p className="text-secondary small mb-1">Faixa provável: entre {dataHora(p.janela.cedoISO)} e {p.janela.tardeISO ? dataHora(p.janela.tardeISO) : 'data indefinida'}.</p>}
        {p.entraAtencaoTs && <p className="text-secondary small mb-1">Entra em atenção ({num(p.atencao, 1)} {p.unidade}) em {dataHora(new Date(p.entraAtencaoTs * 1000).toISOString())}.</p>}
      </>}

      {d.grandezas && <div className="table-responsive mt-3"><table className="table table-sm mb-2">
        <thead><tr><th>GRANDEZA</th><th>ÚLTIMA</th><th>TENDÊNCIA</th><th title="Quanto a reta explica as leituras (R²)">AJUSTE</th><th>ATINGE O LIMITE EM</th><th /></tr></thead>
        <tbody>{d.grandezas.map(g => { const s = situacao(g.estado, faltam(g, agora)); return (
          <tr key={g.grandeza}>
            <td>{g.nome}</td>
            <td>{g.ultimoValor == null ? '—' : `${num(g.ultimoValor, 1)} ${g.unidade}`}</td>
            <td>{porDia(g)}</td>
            <td>{pct(g.r2)}</td>
            <td>{g.estado === 'previsto' || g.estado === 'fora_do_horizonte' ? <>{dataHora(g.previsaoISO)}<small className="d-block text-secondary">faltam {textoTempo(faltam(g, agora))}</small></> : g.estado === 'ultrapassado' || g.estado === 'iminente' ? 'Agora' : '—'}</td>
            <td><Badge k={s.k}>{s.t}</Badge></td>
          </tr>); })}</tbody>
      </table></div>}

      <p className="text-secondary small mb-0">
        {`Reta ajustada pelos mínimos quadrados sobre as últimas ${d.pontosUsados || 20} leituras de cada grandeza. `}
        {'O "ajuste" (R²) mostra o quanto a reta acompanha as leituras: perto de 100% a tendência é firme. '}
        {'É uma estimativa: se a máquina passar por manutenção ou mudar de carga, a previsão muda na próxima medição.'}
      </p>
    </section>
  );
}
