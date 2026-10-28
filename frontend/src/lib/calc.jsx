/* Conta do orçamento. Corretiva = mesma intervenção depois da quebra
   (hora extra, peça urgente, parada mais longa). */
export function calcOrcamento(e, corretiva = false) {
  const f = corretiva ? (e.fatores || { mo: 1.5, pecas: 1.4, parada: 3 }) : { mo: 1, pecas: 1, parada: 1 };
  const mo = e.horas * e.tecnicos * e.valorHora * f.mo;
  const pecas = e.pecas.reduce((s, p) => s + p.qtd * p.valor, 0) * f.pecas;
  const terceiros = +e.terceiros || 0;
  const parada = e.horasParada * e.custoParadaHora * f.parada;
  const sub = mo + pecas + terceiros + parada;
  const contingencia = sub * (+e.contingencia || 0) / 100;
  return { mo, pecas, terceiros, parada, contingencia, total: sub + contingencia };
}
