'use client';
import { useState } from 'react';
import Painel from '@/components/Painel';
import AtivoModal from '@/components/AtivoModal';
import { Badge, Carga, SaudeBar, Vazio, useLoad } from '@/components/ui';
import { dataHora, faltam, situacao, useRelogio } from '@/components/PrevisaoFalha';
import { api } from '@/lib/util';
import { textoTempo } from '@/lib/regressao';

/* Previsão de falhas: todas as máquinas, da quebra mais próxima para a mais distante.
   A conta é a regressão linear de lib/regressao (mesma da API). */
export default function Previsao() {
  const [fs, setFs] = useState(''), [det, setDet] = useState(null);
  const todas = useLoad(() => api.maquinas());
  const l = useLoad(() => api.previsoes({ setor: fs }), [fs]);
  const agora = useRelogio();
  const setores = [...new Set((todas.data || []).map(m => m.setor))];

  return (
    <Painel titulo="Previsão de falhas">
      <Carga l={l}>{lista => {
        const seg = x => faltam(x.previsao, agora);
        const conta = f => lista.filter(f).length;
        const kpis = [
          ['Já acima do limite', conta(x => x.estado === 'ultrapassado' || x.estado === 'iminente'), 'Risco de quebra imediato'],
          ['Quebra em até 7 dias', conta(x => x.estado === 'previsto' && seg(x) <= 7 * 86400), 'Programar intervenção já'],
          ['Entre 8 e 30 dias', conta(x => x.estado === 'previsto' && seg(x) > 7 * 86400 && seg(x) <= 30 * 86400), 'Planejar na próxima janela'],
          ['Sem risco próximo', conta(x => !['ultrapassado', 'iminente'].includes(x.estado) && !(x.estado === 'previsto' && seg(x) <= 30 * 86400)), 'Mais de 30 dias, estável ou sem dados'],
        ];
        return <>
          <div className="row g-3 mb-3">{kpis.map(([a, b, s]) => <div className="col-6 col-xl-3" key={a}><div className="pm-card h-100"><p className="pm-lbl">{a}</p><p className="pm-kpi">{b}</p><p className="pm-sub">{s}</p></div></div>)}</div>

          <div className="pm-card mb-3"><div className="row g-3 align-items-end">
            <div className="col-md-4"><label className="form-label" htmlFor="pv-s">Setor</label><select id="pv-s" className="form-select" value={fs} onChange={e => setFs(e.target.value)}><option value="">Todos os setores</option>{setores.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="col-md-8"><p className="text-secondary small mb-0">Para cada máquina, o sistema traça uma reta (regressão linear) nas últimas leituras de vibração, temperatura e corrente e calcula quando ela encosta no limite crítico. Vale a grandeza que estoura primeiro.</p></div>
          </div></div>

          <div className="pm-card"><div className="table-responsive"><table className="table align-middle">
            <thead><tr><th>MÁQUINA</th><th>SETOR</th><th>SAÚDE</th><th>GRANDEZA</th><th>PODE QUEBRAR EM</th><th>FALTAM</th><th title="Quanto a reta acompanha as leituras (R²)">AJUSTE</th><th>SITUAÇÃO</th><th /></tr></thead>
            <tbody>{lista.length ? lista.map(x => {
              const p = x.previsao, s = seg(x), sit = situacao(x.estado, s), agoraJa = x.estado === 'ultrapassado' || x.estado === 'iminente';
              return (
                <tr key={x.maquina}>
                  <td><b>{x.maquina}</b><small className="d-block text-secondary">{x.nome}</small></td>
                  <td>{x.setor}</td>
                  <td style={{ minWidth: 150 }}><SaudeBar v={x.saude} /></td>
                  <td>{p ? p.nome : '—'}</td>
                  <td>{!p ? '—' : agoraJa ? <b>Agora</b> : dataHora(p.previsaoISO)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{!p ? '—' : agoraJa ? '0 d 00 h 00 min 00 s' : textoTempo(s)}</td>
                  <td>{p && p.r2 != null ? Math.round(p.r2 * 100) + '%' : '—'}</td>
                  <td><Badge k={sit.k}>{sit.t}</Badge></td>
                  <td><button className="btn btn-outline-dark btn-sm" onClick={() => setDet(x.maquina)}>Detalhes</button></td>
                </tr>);
            }) : <tr><td colSpan={9}><Vazio titulo="Nenhuma máquina neste setor" sub="Escolha outro setor." /></td></tr>}</tbody>
          </table></div></div>
        </>;
      }}</Carga>
      {det && <AtivoModal id={det} onClose={() => setDet(null)} />}
    </Painel>
  );
}
