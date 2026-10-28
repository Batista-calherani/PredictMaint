'use client';
import { useEffect, useRef, useState } from 'react';
import Painel from '@/components/Painel';
import AtivoModal from '@/components/AtivoModal';
import { Badge, Carga, Gauge, useLoad, useToast, Vazio } from '@/components/ui';
import { api } from '@/lib/api';
import { NOMES } from '@/lib/util';
import Link from 'next/link';

function PainelAtivo({ id, onHistorico }) {
  const toast = useToast(), l = useLoad(() => api.ativoPreditivo(id), [id]);
  async function gerar(p, e) {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      const o = await api.criarOS({ ativo: p.id, titulo: 'Inspeção preditiva · ' + p.nome, prioridade: p.status === 'critico' ? 'alta' : p.status === 'atencao' ? 'media' : 'baixa', origem: 'planta' });
      toast(<>{o.id} criada para a {p.id}. <Link className="text-warning fw-bold" href={`/ordens?os=${o.id}`}>Ver no quadro</Link></>);
    } catch (err) { toast(err.message, 'danger'); } finally { btn.disabled = false; }
  }
  return <Carga l={l}>{p => <>
    <h2>{p.id} · {p.nome}</h2><Gauge dias={p.rulDias} />
    <p className="text-center text-secondary mb-3">Confiança do modelo: <b className="text-body">{p.confianca}%</b></p>
    <h3 className="h6">O que está causando o alerta</h3>
    {p.causas.map(c => <div className="mb-2" key={c.nome}><div className="pm-row"><span>{c.nome}</span><span>{c.pct}%</span></div><div className="pm-bar y"><i style={{ width: c.pct + '%' }} /></div></div>)}
    <div className="d-grid gap-2 mt-4"><button className="btn btn-primary py-2" onClick={e => gerar(p, e)}>Gerar ordem de serviço</button><button className="btn btn-outline-dark py-2" onClick={onHistorico}>Ver histórico do ativo</button></div></>}</Carga>;
}

export default function Planta() {
  const [horas, setHoras] = useState(0), [horasAplicadas, setAplicadas] = useState(0), [seg, setSeg] = useState(0), [sel, setSel] = useState(null), [hist, setHist] = useState(null);
  const l = useLoad(() => api.planta({ horas: horasAplicadas }), [horasAplicadas]);
  const ref = useRef({});
  ref.current = { horasAplicadas, recarregar: l.recarregar };

  useEffect(() => { if (l.data && !sel) { const all = l.data.zonas.flatMap(z => z.maquinas); setSel((all.find(m => m.status === 'critico') || all[0]).id); } }, [l.data, sel]);
  useEffect(() => { setSeg(0); }, [l.data]);
  useEffect(() => {
    const t = setInterval(() => setSeg(s => {
      if (ref.current.horasAplicadas !== 0) return s;
      if (s + 1 >= 15) { ref.current.recarregar(); return 0; }
      return s + 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  function exportar() {
    if (!l.data) return;
    const linhas = ['Setor;Máquina;Nome;Saúde (%);Status', ...l.data.zonas.flatMap(z => z.maquinas.map(m => [z.nome, m.id, m.nome, m.saude, NOMES[m.status]].join(';')))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv' }));
    a.download = 'planta-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); URL.revokeObjectURL(a.href);
  }
  return (
    <Painel titulo="Planta ao vivo · mapa de calor" acao={{ label: 'Exportar relatório', onClick: exportar }}>
      <Carga l={l}>{d => <div className="row g-3">
        <div className="col-xl-8"><section className="pm-card h-100">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <span role="status">{horas === 0 ? <><span className="live-dot" /><b>Ao vivo</b> · atualizado há {seg} s</> : <><b>Replay</b> · a planta como estava há {-horas} h</>}</span>
            <span className="d-flex gap-2"><Badge k="normal" /><Badge k="atencao" /><Badge k="critico" /></span>
          </div>
          <div className="row g-3">{d.zonas.map(z => <div className="col-md-6" key={z.nome}><div className="pm-zone"><h3>{z.nome}</h3><div className="pm-nodes">{z.maquinas.map(m => <button key={m.id} className={`pm-node n-${m.status}${m.id === sel ? ' sel' : ''}`} title={`${m.nome} · saúde ${m.saude}%`} aria-label={`${m.id}, ${m.nome}, ${NOMES[m.status]}, saúde ${m.saude}%`} onClick={() => setSel(m.id)}>{m.id}</button>)}</div></div></div>)}</div>
          <div className="mt-4"><label className="form-label" htmlFor="rep">Voltar no tempo: replay das últimas 24 h</label>
            <div className="d-flex align-items-center gap-3"><span>-24 h</span>
              <input id="rep" className="pm-replay" type="range" min="-24" max="0" step="1" value={horas} onChange={e => setHoras(+e.target.value)} onMouseUp={() => setAplicadas(horas)} onTouchEnd={() => setAplicadas(horas)} onKeyUp={() => setAplicadas(horas)} />
              <strong>{horas === 0 ? 'Agora' : horas + ' h'}</strong></div></div>
        </section></div>
        <div className="col-xl-4"><section className="pm-card h-100" aria-live="polite">{sel ? <PainelAtivo id={sel} onHistorico={() => setHist(sel)} /> : <Vazio titulo="Escolha uma máquina" />}</section></div>
      </div>}</Carga>
      {hist && <AtivoModal id={hist} onClose={() => setHist(null)} />}
    </Painel>
  );
}
