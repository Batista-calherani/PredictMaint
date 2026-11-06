'use client';
/* Usuários (só gestor): cadastrar, listar, buscar, editar, desativar/reativar
   e mandar um alerta direto para a pessoa (ex.: urgência numa máquina). */
import { useEffect, useState } from 'react';
import Painel from '@/components/Painel';
import { Badge, Carga, Modal, Vazio, useLoad, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { getUser } from '@/lib/util';

const PERFIS = [['gestor', 'Gestor'], ['tecnico', 'Técnico'], ['funcionario', 'Funcionário']];
const NOME_PERFIL = Object.fromEntries(PERFIS);
const SENHA_PADRAO = 'senai@123';

function FormUsuario({ usuario, setores, onClose, onOk }) {
  const toast = useToast(), novo = !usuario;
  const [f, setF] = useState(usuario
    ? { nome: usuario.nome, email: usuario.email, matricula: usuario.matricula, senha: '', perfis: usuario.perfis, setor: usuario.setor || '' }
    : { nome: '', email: '', matricula: '', senha: SENHA_PADRAO, perfis: ['funcionario'], setor: '' });
  const [salvando, setSalvando] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const marca = p => setF({ ...f, perfis: f.perfis.includes(p) ? f.perfis.filter(x => x !== p) : [...f.perfis, p] });
  const ehFunc = f.perfis.includes('funcionario');
  async function salvar() {
    if (!f.perfis.length) return toast('Marque pelo menos um perfil.', 'danger');
    const dados = { nome: f.nome, email: f.email, matricula: f.matricula, perfis: f.perfis, setor: f.setor || null };
    if (f.senha) dados.senha = f.senha;
    setSalvando(true);
    try {
      if (novo) await api.criarUsuario(dados); else await api.editarUsuario(usuario.id, dados);
      toast(novo ? `${f.nome} cadastrado. Já pode entrar no sistema.` : 'Dados atualizados.');
      onOk();
    } catch (e) { toast(e.message, 'danger'); } finally { setSalvando(false); }
  }
  return (
    <Modal titulo={novo ? 'Cadastrar usuário' : `Editar ${usuario.nome}`} onClose={onClose} footer={<button className="btn btn-primary" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : novo ? 'Cadastrar' : 'Salvar alterações'}</button>}>
      <div className="row g-3">
        <div className="col-12"><label className="form-label" htmlFor="u-n">Nome completo</label><input className="form-control" id="u-n" value={f.nome} onChange={set('nome')} placeholder="Ex.: Maria Oliveira" /></div>
        <div className="col-sm-7"><label className="form-label" htmlFor="u-e">E-mail</label><input className="form-control" id="u-e" type="email" value={f.email} onChange={set('email')} placeholder="nome@mantech.com.br" /></div>
        <div className="col-sm-5"><label className="form-label" htmlFor="u-m">Matrícula</label><input className="form-control" id="u-m" value={f.matricula} onChange={set('matricula')} placeholder="Ex.: fun002" /></div>
        <div className="col-12"><span className="form-label d-block">Perfis de acesso</span>
          <div className="d-flex flex-wrap gap-2">{PERFIS.map(([v, t]) => <span key={v}><input type="checkbox" className="btn-check" id={'u-p-' + v} checked={f.perfis.includes(v)} onChange={() => marca(v)} /><label className="btn btn-outline-dark" htmlFor={'u-p-' + v}>{t}</label></span>)}</div>
          <small className="text-secondary">Gestor: acesso total. Técnico: opera máquinas, medições, alertas e OS. Funcionário: abre e acompanha chamados.</small>
        </div>
        <div className="col-sm-6"><label className="form-label" htmlFor="u-s">Setor {ehFunc ? '' : <small className="text-secondary">(opcional)</small>}</label>
          <select className="form-select" id="u-s" value={f.setor} onChange={set('setor')}><option value="">{ehFunc ? 'Escolha o setor' : 'Sem setor'}</option>{setores.map(s => <option key={s}>{s}</option>)}</select></div>
        <div className="col-sm-6"><label className="form-label" htmlFor="u-pw">{novo ? 'Senha inicial' : 'Nova senha'}</label>
          <input className="form-control" id="u-pw" value={f.senha} onChange={set('senha')} placeholder={novo ? '' : 'Deixe em branco para manter'} autoComplete="new-password" />
          <small className="text-secondary">{novo ? `Padrão da equipe: ${SENHA_PADRAO}` : 'Preencha só se quiser trocar.'}</small></div>
      </div>
    </Modal>
  );
}

function EnviarAlerta({ usuario, onClose }) {
  const toast = useToast(), maqs = useLoad(() => api.maquinas({ ordem: 'codigo' })), env = useLoad(() => api.notificacoesEnviadas(usuario.id), [usuario.id]);
  const [f, setF] = useState({ maquina: '', prioridade: 'urgente', titulo: 'Urgente: fale com o gestor', mensagem: '' }), [mexeuTitulo, setMexeu] = useState(false), [enviando, setEnviando] = useState(false);
  // Sugere o título a partir da máquina e da prioridade, até o gestor escrever o dele
  const muda = mudanca => setF(x => {
    const n = { ...x, ...mudanca };
    if (mexeuTitulo) return n;
    const m = (maqs.data || []).find(y => y.id === n.maquina);
    return { ...n, titulo: m ? `${n.prioridade === 'urgente' ? 'Urgência' : 'Atenção'} na ${m.id} · ${m.nome}` : n.prioridade === 'urgente' ? 'Urgente: fale com o gestor' : '' };
  });
  async function enviar() {
    setEnviando(true);
    try {
      await api.enviarNotificacao({ destinatario: usuario.id, ...f, maquina: f.maquina || null });
      toast(`Alerta enviado para ${usuario.nome}. Aparece no sininho dele.`);
      onClose();
    } catch (e) { toast(e.message, 'danger'); } finally { setEnviando(false); }
  }
  return (
    <Modal titulo={`Enviar alerta para ${usuario.nome}`} onClose={onClose} footer={<button className="btn btn-primary" disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar alerta'}</button>}>
      <div className="row g-3">
        <div className="col-sm-7"><label className="form-label" htmlFor="a-m">Máquina <small className="text-secondary">(opcional)</small></label>
          <select className="form-select" id="a-m" value={f.maquina} onChange={e => muda({ maquina: e.target.value })}><option value="">Nenhuma máquina específica</option>{(maqs.data || []).map(m => <option key={m.id} value={m.id}>{m.id} · {m.nome} ({m.saude}%)</option>)}</select></div>
        <div className="col-sm-5"><span className="form-label d-block">Prioridade</span>
          <div className="d-flex gap-2">{[['urgente', 'Urgente'], ['normal', 'Normal']].map(([v, t]) => <span key={v}><input type="radio" className="btn-check" name="a-p" id={'a-p-' + v} checked={f.prioridade === v} onChange={() => muda({ prioridade: v })} /><label className={`btn ${v === 'urgente' ? 'btn-outline-danger' : 'btn-outline-dark'}`} htmlFor={'a-p-' + v}>{t}</label></span>)}</div></div>
        <div className="col-12"><label className="form-label" htmlFor="a-t">Título</label><input className="form-control" id="a-t" maxLength={120} value={f.titulo} onChange={e => { setMexeu(true); setF({ ...f, titulo: e.target.value }); }} /></div>
        <div className="col-12"><label className="form-label" htmlFor="a-x">Mensagem</label><textarea className="form-control" id="a-x" rows={3} value={f.mensagem} onChange={e => setF({ ...f, mensagem: e.target.value })} placeholder="Ex.: A vibração da prensa subiu. Faça a inspeção dos mancais ainda hoje." /></div>
      </div>
      <h3 className="h6 mt-4 mb-2">Últimos alertas enviados para {usuario.nome.split(' ')[0]}</h3>
      <Carga l={env}>{lista => lista.length ? <ul className="list-unstyled small mb-0">{lista.slice(0, 5).map(n => <li key={n.id} className="py-1 border-bottom"><b>{n.titulo}</b> · {n.quando} · {n.lida ? 'lido' : <span className="text-danger fw-bold">não lido</span>}</li>)}</ul> : <p className="text-secondary small mb-0">Nenhum alerta enviado ainda.</p>}</Carga>
    </Modal>
  );
}

function Desativar({ usuario, onClose, onOk }) {
  const toast = useToast(), [indo, setIndo] = useState(false);
  async function confirmar() {
    setIndo(true);
    try { await api.desativarUsuario(usuario.id); toast(`${usuario.nome} foi desativado.`); onOk(); }
    catch (e) { toast(e.message, 'danger'); setIndo(false); }
  }
  return (
    <Modal titulo="Desativar usuário" onClose={onClose} footer={<><button className="btn btn-outline-dark" onClick={onClose}>Cancelar</button><button className="btn btn-danger" disabled={indo} onClick={confirmar}>Desativar {usuario.nome.split(' ')[0]}</button></>}>
      <p><b>{usuario.nome}</b> perde o acesso na hora e some das listas de envio de alertas.</p>
      <p className="text-secondary mb-0">O histórico dele (chamados, medições, orçamentos) continua guardado. Se precisar, é só reativar depois.</p>
    </Modal>
  );
}

export default function Usuarios() {
  const toast = useToast();
  const [busca, setBusca] = useState(''), [q, setQ] = useState(''), [perfil, setPerfil] = useState(''), [status, setStatus] = useState('1');
  useEffect(() => { const t = setTimeout(() => setQ(busca.trim()), 300); return () => clearTimeout(t); }, [busca]);
  const l = useLoad(() => api.usuarios({ q, perfil, ativo: status }), [q, perfil, status]);
  const todos = useLoad(() => api.usuarios());
  const setores = useLoad(() => api.setores());
  const [form, setForm] = useState(null), [alerta, setAlerta] = useState(null), [desativar, setDesativar] = useState(null);
  const eu = getUser();
  const recarregar = () => { l.recarregar(); todos.recarregar(); };
  async function reativar(u) {
    try { await api.editarUsuario(u.id, { ativo: true }); toast(`${u.nome} reativado.`); recarregar(); } catch (e) { toast(e.message, 'danger'); }
  }
  const T = todos.data || [], ativos = T.filter(u => u.ativo), conta = p => ativos.filter(u => u.perfis.includes(p)).length;
  return (
    <Painel soGestor titulo="Usuários e acessos" acao={{ label: 'Novo usuário', onClick: () => setForm('novo') }}>
      <div className="row g-3 mb-3">{[['Usuários ativos', ativos.length, `${T.length - ativos.length} desativado(s)`], ['Gestores', conta('gestor'), 'Acesso total'], ['Técnicos', conta('tecnico'), 'Operação e manutenção'], ['Funcionários', conta('funcionario'), 'Abrem chamados']].map(([a, b, s]) => <div className="col-6 col-xl-3" key={a}><div className="pm-card h-100"><p className="pm-lbl">{a}</p><p className="pm-kpi">{b}</p><p className="pm-sub">{s}</p></div></div>)}</div>
      <div className="pm-card mb-3"><div className="row g-3 align-items-end">
        <div className="col-md-5"><label className="form-label" htmlFor="u-b">Buscar</label><input className="form-control" id="u-b" type="search" placeholder="Nome, e-mail ou matrícula" value={busca} onChange={e => setBusca(e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label" htmlFor="u-fp">Perfil</label><select id="u-fp" className="form-select" value={perfil} onChange={e => setPerfil(e.target.value)}><option value="">Todos os perfis</option>{PERFIS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        <div className="col-md-2"><label className="form-label" htmlFor="u-fs">Situação</label><select id="u-fs" className="form-select" value={status} onChange={e => setStatus(e.target.value)}><option value="1">Ativos</option><option value="0">Desativados</option><option value="">Todos</option></select></div>
        <div className="col-md-2"><button className="btn btn-outline-dark w-100" onClick={() => { setBusca(''); setPerfil(''); setStatus('1'); }}>Limpar filtros</button></div>
      </div></div>
      <div className="pm-card"><Carga l={l}>{lista => <div className="table-responsive"><table className="table align-middle"><thead><tr><th>NOME</th><th>MATRÍCULA</th><th>PERFIS</th><th>SETOR</th><th>SITUAÇÃO</th><th className="text-end">AÇÕES</th></tr></thead>
        <tbody>{lista.length ? lista.map(u => <tr key={u.id} className={u.ativo ? '' : 'pm-inativo'}>
          <td><b>{u.nome}</b>{eu && eu.email === u.email && <small className="text-secondary"> (você)</small>}<small className="d-block text-secondary">{u.email}</small></td>
          <td>{u.matricula}</td>
          <td><div className="pm-perfis">{u.perfis.map(p => <Badge key={p} k={'perfil-' + p}>{NOME_PERFIL[p]}</Badge>)}</div></td>
          <td>{u.setor || '—'}</td>
          <td>{u.ativo ? <Badge k="normal">Ativo</Badge> : <Badge k="info">Desativado</Badge>}</td>
          <td className="text-end"><div className="d-inline-flex flex-wrap justify-content-end gap-1">
            {u.ativo && <button className="btn btn-sm btn-primary" onClick={() => setAlerta(u)}>Enviar alerta</button>}
            <button className="btn btn-sm btn-outline-dark" onClick={() => setForm(u)}>Editar</button>
            {u.ativo ? (eu && eu.email !== u.email && <button className="btn btn-sm btn-outline-danger" onClick={() => setDesativar(u)}>Desativar</button>)
              : <button className="btn btn-sm btn-outline-dark" onClick={() => reativar(u)}>Reativar</button>}
          </div></td></tr>)
          : <tr><td colSpan={6}><Vazio titulo="Ninguém encontrado" sub="Mude a busca ou os filtros, ou cadastre um novo usuário." /></td></tr>}</tbody></table></div>}</Carga></div>
      {form && <FormUsuario usuario={form === 'novo' ? null : form} setores={setores.data || []} onClose={() => setForm(null)} onOk={() => { setForm(null); recarregar(); }} />}
      {alerta && <EnviarAlerta usuario={alerta} onClose={() => setAlerta(null)} />}
      {desativar && <Desativar usuario={desativar} onClose={() => setDesativar(null)} onOk={() => { setDesativar(null); recarregar(); }} />}
    </Painel>
  );
}
