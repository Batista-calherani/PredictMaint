export const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const num = (n, d = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const NOMES = { critico: 'Crítico', atencao: 'Atenção', normal: 'Normal', info: 'Info', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
export const STATUS_OS = { aberta: 'Abertas', andamento: 'Em andamento', peca: 'Aguardando peça', concluida: 'Concluídas' };
export const EQUIPES = ['Mecânica', 'Elétrica', 'Utilidades', 'Lubrificação', 'Usinagem', 'Corte'];
export const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
export const param = n => typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(n);
export const getUser = () => { try { return JSON.parse(localStorage.getItem('pm_user')); } catch { return null; } };
