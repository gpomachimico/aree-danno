// ---------- Fase 6, punto 2 (22/11/2026): verifica di segregazione fra più merci di un carico ----------
// Regole del Codice IMDG 42-24: 3.4.4.2 e 3.5.8 (quantità limitate ed esenti), 7.2.2.2 (classe comprende i rischi sussidiari),
// 7.2.3 (tabella e colonna 16b, prescrizione più severa), 7.2.4 (tabella), 7.2.5 (gruppi), 7.2.6 (esenzioni), 7.2.7 (classe 1),
// 7.2.8 (codici SG), 7.3.4 (stessa unità di trasporto, alimenti), 7.4.3.2 (portacontainer con stive chiuse).
const CG = (() => { // 7.2.7.1.4: coppie di gruppi di compatibilità ammesse insieme, con il numero della nota
  const m = {}, s = (a, b, n = 0) => { m[a + b] = n; m[b + a] = n; };
  'ABCDEFGHJKNS'.split('').forEach(g => s(g, g)); delete m.LL; s('L', 'L', 2);
  s('C', 'D', 6); s('C', 'E', 6); s('D', 'E', 6); s('C', 'G', 1); s('D', 'G', 1); s('E', 'G', 1);
  s('C', 'N', 4); s('D', 'N', 4); s('E', 'N', 4); s('N', 'N', 3); s('N', 'S', 5);
  'BCDEFGHJK'.split('').forEach(g => s(g, 'S'));
  return m;
})();
const CG_NOTE = {
  1: 'nota 1: gli articoli del gruppo G (diversi dai fuochi d\'artificio) possono stare con gli articoli dei gruppi C, D ed E purché nello stesso compartimento, stiva o unità chiusa non vi siano materie esplosive',
  2: 'nota 2: una spedizione del gruppo L può stare solo con una spedizione dello stesso tipo del gruppo L',
  3: 'nota 3: articoli di tipo diverso della divisione 1.6 N solo se è provato che non c\'è rischio aggiuntivo di detonazione per simpatia; altrimenti si trattano come divisione 1.1',
  4: 'nota 4: con i gruppi C, D o E gli articoli del gruppo N si trattano come gruppo D',
  5: 'nota 5: con il gruppo S l\'intero carico si tratta come gruppo N',
  6: 'nota 6: combinazioni di articoli dei gruppi C, D ed E si trattano come gruppo E; combinazioni di materie dei gruppi C e D secondo 2.1.2.3, con il codice di classificazione complessivo su etichette e placche (5.2.2.2.2)'
};
// 7.2.8: codici "come per la classe" (sostituiscono la riga della classe principale; 7.2.6.2)
const SG_COME = { SG2: '1.1', SG3: '1.3', SG74: '1.4', SG4: '2.1', SG5: '3', SG6: '5.1', SG76: '7', SG77: '8' };
// codici riferiti a classi: [livello, classi o divisioni, eccezione]
const SG_CLASSE = {
  SG7: [1, ['3']], SG8: [1, ['4.1']], SG9: [1, ['4.3']], SG10: [1, ['5.1']], SG11: [1, ['6.2']], SG12: [1, ['7']], SG13: [1, ['8']],
  SG14: [2, ['1'], d => d.cl === '1.4S'], SG15: [2, ['3']], SG16: [2, ['4.1']], SG17: [2, ['5.1']], SG18: [2, ['6.2']], SG19: [2, ['7']],
  SG25: [2, ['2.1', '3']], SG63: [4, ['1']], SG65: [3, ['1'], d => d.div === '1.4'], SG78: [4, ['1.1', '1.2', '1.5']]
};
// codici riferiti ai gruppi di segregazione: [livello, gruppo, eccezione, condizione]
const SG_GRUPPO = {
  SG20: [1, 'SGG1'], SG21: [1, 'SGG18'], SG24: [1, 'SGG17'], SG28: [2, 'SGG2'], SG30: [1, 'SGG7'], SG31: [1, 'SGG9'],
  SG32: [1, 'SGG10'], SG33: [1, 'SGG15'], SG35: [2, 'SGG1'], SG36: [2, 'SGG18'], SG38: [2, 'SGG2'],
  SG39: [2, 'SGG2', d => d.u === '1444'], SG40: [2, 'SGG2', d => /PERSULPHATE/.test(d.nome)],
  SG42: [2, 'SGG3'], SG45: [2, 'SGG4'], SG47: [2, 'SGG5'], SG49: [2, 'SGG6'], SG51: [2, 'SGG8'], SG54: [2, 'SGG11'],
  SG56: [2, 'SGG12'], SG58: [2, 'SGG13'], SG59: [2, 'SGG14'], SG60: [2, 'SGG16'], SG61: [2, 'SGG15'],
  SG22: [1, 'SGG2', null, 'se l\'altra merce è un sale di ammonio (SG22 indica i sali di ammonio, il gruppo SGG2 i composti di ammonio)'],
  SG55: [2, 'SGG11', null, 'se l\'altra merce è un sale di mercurio'],
  SG70: [2, 'SGG1', null, 'se la merce è un solfuro di arsenico'],
  SG34: [2, 'SGG4', null, 'se la merce contiene composti di ammonio'], SG34b: [2, 'SGG13', null, 'se la merce contiene composti di ammonio']
};
// codici riferiti a sostanze nominate: [livello, numeri ONU, nome]
const SG_NOME = { SG37: [2, ['1005', '2073', '2672', '3318'], 'ammoniaca'], SG43: [2, ['1744'], 'bromo'], SG44: [2, ['1846'], 'tetracloruro di carbonio'],
  SG46: [2, ['1017'], 'cloro'], SG52: [2, ['1376'], 'ossido di ferro'], SG62: [2, ['1350', '2448'], 'zolfo'] };
const ESENTI = [['2014', '2984', '3105', '3107', '3109', '3149'], ['1295', '1818', '2189'], ['3391', '3392', '3393', '3394', '3395', '3396', '3397', '3398', '3399', '3400']];
const ESENTI4 = ['1325', '3101', '3102', '3103', '3104', '3105', '3106', '3107', '3108', '3109', '3110', '3111', '3112', '3113', '3114', '3115', '3116', '3117', '3118', '3119', '3120'];
const NITRATI = ['1942', '2067', '1451', '2722', '1486', '1477', '1498', '1446', '2464', '1454', '1474', '1507'];
const ESPL_MINA = ['0081', '0082', '0084', '0241', '0331', '0332']; // esplosivi da mina (EXPLOSIVE, BLASTING), escluso 0083
const TERMINE = { 0: 'nessuna segregazione', 1: '“away from”', 2: '“separated from”', 3: '“separated by a complete compartment or hold from”', 4: '“separated longitudinally by an intervening complete compartment or hold from”' };
const TERMINE_IT = { 0: 'nessuna segregazione richiesta', 1: 'a distanza da', 2: 'separato da', 3: 'separato da un compartimento o una stiva completa', 4: 'separato longitudinalmente da un compartimento o una stiva completa intermedia' };
// 7.4.3.2, colonna "closed versus closed": [verticale, longitudinale in coperta, longitudinale sotto coperta, trasversale in coperta, trasversale sotto coperta]
const NAVE = {
  1: ['uno sopra l\'altro ammesso', 'nessuna restrizione', 'nessuna restrizione', 'nessuna restrizione', 'nessuna restrizione'],
  2: ['non sulla stessa verticale, salvo separazione con un ponte', 'uno spazio container', 'uno spazio container o una paratia', 'uno spazio container', 'uno spazio container'],
  3: ['non sulla stessa verticale, salvo separazione con un ponte', 'uno spazio container', 'una paratia', 'due spazi container', 'una paratia'],
  4: ['vietato', 'distanza orizzontale minima 24 m', 'una paratia e distanza orizzontale minima 24 m (container ad almeno 6 m dalla paratia)', 'vietato', 'vietato']
};

function cgDati(it) { // classe, divisione, gruppo di compatibilità, rischi sussidiari della voce del carico
  const r = DATA.dgl[it.u][it.i || 0], o = it.opz || {};
  let cl = r['3'], div = (cl.match(/^\d(\.\d)?/) || [cl])[0];
  if (div === '2') div = o.div2 || '2.2'; if (div === '1') div = '1.1';
  const cg = (cl.match(/^1\.\d([A-S])$/) || [])[1] || null;
  let sub = (r['4'] || '').split(/[\/\s]+/).filter(x => /^\d(\.\d)?$/.test(x));
  if (/See/.test(r['4'] || '') && o.sub) sub = sub.concat(o.sub.split(/[\/\s,;]+/).filter(x => /^\d(\.\d)?$/.test(x)));
  const b16 = (r['16b'] || '').split(/\s+/).filter(x => /^SGG?\d+$/.test(x));
  const sgg = [...new Set(b16.filter(x => /^SGG/.test(x)).concat((o.sgg || '').toUpperCase().match(/SGG\d+/g) || []))];
  return { u: it.u, r, cl, div, cg, sub, sg: b16.filter(x => /^SG\d/.test(x)), sgg, nome: r['2'], pg: r['5'], lq: !!it.lq, eq: !!it.eq, o,
    nos: /N\.O\.S\./.test(r['2']), cl1: /^1/.test(cl) };
}
const rigaTab = div => { const m = div.match(/^1\.(\d)/); return m ? { 1: '1.1', 2: '1.1', 5: '1.1', 3: '1.3', 6: '1.3', 4: '1.4' }[m[1]] : div; };
function righeTab(d, altro) { // righe della tabella 7.2.4 da usare per la merce d: [riga, origine]
  const come = d.sg.find(k => SG_COME[k]);
  if (d.sg.includes('SG69')) return d.o.aer1L !== false ? [['9', 'SG69: aerosol fino a 1 L, come per la classe 9']] : [[d.div, 'SG69: aerosol oltre 1 L, come per la divisione ' + d.div]];
  if (d.sg.includes('SG68') && d.o.pf60) return [['3', 'SG68: punto di infiammabilità fino a 60 °C, come per la classe 3']];
  if (come) return [[SG_COME[come], come + ': come per la classe ' + SG_COME[come]]];
  const R = [[rigaTab(d.div), 'classe ' + d.cl]];
  if (d.sub.length === 1) {
    const s = d.sub[0];
    if (s === '1' && altro.cl1) { /* SG1: rispetto alla classe 1 vale la classe principale */ }
    else R.push([s === '1' ? '1.3' : rigaTab(s), 'rischio sussidiario ' + s + (s === '1' ? ' (come per la divisione 1.3, 7.2.3.3)' : ' (7.2.3.3)'), true]);
  }
  return R;
}
const haClasse = (d, c) => [d.div, ...d.sub].some(x => c === '1' ? /^1(\.|$)/.test(x) : x === c || (c.length === 3 && x === c));
function coppia(A, B) { // ritorna { lev, motivi: [{lev, txt, cond, der}], note: [] }
  const M = [], N = [], stessaCl = A.div === B.div || (A.cl1 && B.cl1);
  const add = (lev, txt, cond, der, noctu) => M.push({ lev, txt, cond, der, noctu });
  // esenzioni
  if (A.u === B.u && A.r === B.r) return { lev: 0, motivi: [{ lev: 0, txt: 'stessa voce della DGL' }], note: N, ctu: true };
  if (A.lq || B.lq) {
    const sA = A.lq && A.cl === '1.4S' && ['A', 'L'].includes(B.cg), sB = B.lq && B.cl === '1.4S' && ['A', 'L'].includes(A.cg);
    if (sA || sB) return { lev: 0, motivi: [{ lev: 0, txt: 'quantità limitate: esenti dalla segregazione, ma gli articoli 1.4S non stanno nello stesso compartimento, stiva o unità con la classe 1 dei gruppi A e L (3.4.4.2)' }], note: N, ctu: false };
    return { lev: 0, motivi: [{ lev: 0, txt: 'merce in quantità limitate: la segregazione dei capitoli 7.2–7.7 e della colonna 16b non si applica (3.4.4.2); nello stesso imballaggio esterno vale 3.4.4.1' }], note: N, ctu: true };
  }
  if (A.eq || B.eq) return { lev: 0, motivi: [{ lev: 0, txt: 'merce in quantità esenti: la segregazione dei capitoli 7.2–7.7 e della colonna 16b non si applica (3.5.8.1)' }], note: N, ctu: true };
  for (const T of ESENTI) if (T.includes(A.u) && T.includes(B.u)) return { lev: 0, motivi: [{ lev: 0, txt: 'stessa tabella delle merci compatibili (7.2.6.3.2): nessuna segregazione' }], note: N, ctu: true };
  if (ESENTI4.includes(A.u) && ESENTI4.includes(B.u)) return { lev: 0, motivi: [{ lev: 0, txt: 'entrambe nella tabella 7.2.6.3.4: nessuna segregazione, tenendo conto delle reazioni pericolose di 7.2.6.1.1–7.2.6.1.4 (7.2.6.4); non vale per i perossidi con nome tecnico PEROXYACETIC ACID' }], note: N, ctu: true };
  // classe 1 con classe 1 (7.2.7.1)
  if (A.cl1 && B.cl1) {
    const k = A.cg && B.cg ? CG[A.cg + B.cg] : undefined;
    if (k === undefined) add(2, `gruppi di compatibilità ${A.cg || '?'} e ${B.cg || '?'} non ammessi insieme (7.2.7.1.4): compartimenti o stive diversi, o unità di trasporto chiuse diverse “separated from” fra loro (7.2.7.1.1, 7.2.7.1.5)`);
    else {
      add(0, `gruppi di compatibilità ${A.cg} e ${B.cg} ammessi nello stesso compartimento, stiva o unità chiusa (7.2.7.1.4)${A.div !== B.div ? '; il carico misto si tratta come la divisione più pericolosa, nell\'ordine 1.1, 1.5, 1.2, 1.3, 1.6, 1.4 (7.2.7.1.3)' : ''}`);
      if (k) N.push(CG_NOTE[k]);
    }
  } else {
    // tabella 7.2.4 con le righe di ciascuna merce
    for (const [ra, oa, sa] of righeTab(A, B)) for (const [rb, ob, sb] of righeTab(B, A)) {
      const v = DATA.imdgCod.SEGR[ra] && DATA.imdgCod.SEGR[ra][rb];
      if (/^[1-4]$/.test(v)) add(+v, `tabella 7.2.4: ${oa} con ${ob}`, null, (sa || sb || /^SG/.test(oa + ob)) && A.div === B.div);
      else if (v === 'X') add(0, `tabella 7.2.4: ${oa} con ${ob}: X, nessuna prescrizione generale`);
    }
  }
  // colonna 16b, in entrambi i versi (7.2.3.1: prevale sulla tabella)
  for (const [P, Q] of [[A, B], [B, A]]) {
    const chi = `UN ${P.u}`;
    for (const k of P.sg) {
      if (SG_CLASSE[k]) {
        const [lev, cls, ecc] = SG_CLASSE[k];
        const c = cls.find(c => haClasse(Q, c));
        if (c && !(ecc && ecc(Q))) add(lev, `${chi}, ${k}: ${TERMINE[lev]} classe ${cls.join(' e ')}${Q.div === c || (c === '1' && Q.cl1) ? '' : ' (UN ' + Q.u + ' ha il rischio sussidiario ' + c + ', 7.2.2.2)'}`, null, P.div === Q.div);
        if (c && k === 'SG25' && P.sg.includes('SG26')) N.push(`${chi}, SG26: in coperta su portacontainer almeno due spazi container in senso trasversale dalle merci delle classi 2.1 e 3; su navi ro-ro 6 m in senso trasversale`);
      }
      if (k === 'SG67' && Q.cl1 && Q.cg !== 'J') add(Q.div === '1.4' ? 2 : 4, `${chi}, SG67: ${Q.div === '1.4' ? TERMINE[2] + ' divisione 1.4' : TERMINE[4] + ' divisioni 1.1, 1.2, 1.3, 1.5 e 1.6'}`);
      if (k === 'SG69' && P.o.aer1L !== false && Q.cl1 && Q.div !== '1.4') add(2, `${chi}, SG69: aerosol fino a 1 L ${TERMINE[2]} classe 1, salvo la divisione 1.4`);
      if (k === 'SG68' && P.o.pf60 && haClasse(Q, '4.1')) add(1, `${chi}, SG68: punto di infiammabilità fino a 60 °C, ${TERMINE[1]} classe 4.1`);
      if (k === 'SG68' && !P.o.pf60) N.push(`${chi}, SG68: se il punto di infiammabilità è fino a 60 °C (vaso chiuso) segregazione come per la classe 3 e “away from” classe 4.1; indicarlo nella voce del carico`);
      for (const kk of [k, k + 'b']) if (SG_GRUPPO[kk]) {
        const [lev, g, ecc, cond] = SG_GRUPPO[kk];
        if (Q.sgg.includes(g) && !(ecc && ecc(Q))) add(lev, `${chi}, ${k}: ${TERMINE[lev]} ${g} – ${DATA.imdgCod.SGG[g] || ''} (UN ${Q.u} appartiene al gruppo)`, cond);
      }
      if (SG_NOME[k] && SG_NOME[k][1].includes(Q.u)) add(SG_NOME[k][0], `${chi}, ${k}: ${TERMINE[SG_NOME[k][0]]} ${SG_NOME[k][2]}`);
      if (k === 'SG27' && Q.cl1) add(2, `${chi}, SG27: ${TERMINE[2]} esplosivi contenenti clorati o perclorati`, `se UN ${Q.u} contiene clorati o perclorati`);
      if (k === 'SG28' && Q.cl1) add(2, `${chi}, SG28: ${TERMINE[2]} esplosivi contenenti composti o sali di ammonio`, `se UN ${Q.u} contiene composti o sali di ammonio`);
      if (k === 'SG34' && Q.cl1) add(2, `${chi}, SG34: ${TERMINE[2]} esplosivi contenenti clorati o perclorati`, `se UN ${P.u} contiene composti di ammonio e UN ${Q.u} clorati o perclorati`);
      if ((k === 'SG48' || k === 'SG53') && ['2.1', '3', '4.1', '4.2'].some(c => haClasse(Q, c)))
        add(k === 'SG48' ? 2 : 0, `${chi}, ${k}: ${k === 'SG48' ? TERMINE[2] + ' materiale combustibile (in particolare liquidi)' : 'non nella stessa unità di trasporto del materiale combustibile'}`, `se UN ${Q.u} è materiale combustibile`, false, k === 'SG53');
      if (k === 'SG1' && P.sub.includes('1') && Q.cl1) N.push(`${chi}, SG1: rispetto alle merci della classe 1 si applica la segregazione della classe principale ${P.div}`);
    }
    if (P.nos && !P.sgg.length && Q.sg.some(k => SG_GRUPPO[k])) N.push(`UN ${P.u} è una voce n.o.s.: se lo speditore la assegna a un gruppo di segregazione, il gruppo è indicato nel documento di trasporto (7.2.5.3, 5.4.1.5.11); inserirlo nella voce del carico`);
  }
  // 7.2.6.5: classe 8 PG II o III con acidi o alcali
  if (A.div === '8' && B.div === '8' && ['II', 'III'].includes(A.pg) && ['II', 'III'].includes(B.pg)) {
    const ga = M.filter(m => /SGG1 |SGG18 /.test(m.txt + ' ') && !m.cond);
    if (ga.length) ga.forEach(m => { m.der = '7.2.6.5: ammesse nella stessa unità, anche nello stesso imballaggio, se non reagiscono pericolosamente (7.2.6.1), colli fino a 30 L o 30 kg, dichiarazione 5.4.1.5.11.3 nel documento di trasporto e rapporto di prova su richiesta'; });
  }
  // 7.2.7.2.1 nitrati con esplosivi da mina
  if ((NITRATI.includes(A.u) && ESPL_MINA.includes(B.u)) || (NITRATI.includes(B.u) && ESPL_MINA.includes(A.u)))
    N.push('7.2.7.2.1: il nitrato può essere stivato con gli esplosivi da mina se l\'insieme è trattato come esplosivo da mina della classe 1');
  const mx = L => Math.max(0, ...L.map(m => m.lev));
  const lev = mx(M.filter(m => !m.cond)), levDer = mx(M.filter(m => !m.cond && !m.der)), levCond = mx(M);
  return { lev, levDer, levCond, motivi: M, note: [...new Set(N)], ctu: lev === 0 && !M.some(m => m.noctu && !m.cond) };
}

// ---------- interfaccia ----------
let carico = [];
try { carico = JSON.parse(localStorage.getItem('carico') || '[]'); } catch (e) { carico = []; }
const salvaCarico = () => { try { localStorage.setItem('carico', JSON.stringify(carico)); } catch (e) { } };
function alimenti(d) { // 7.3.4.2
  const cls = [d.div, ...d.sub], gr = d.pg;
  const vieta = cls.some(c => ['2.3', '6.1', '6.2', '8'].includes(c)) || (cls.includes('7') && !['2908', '2909', '2910', '2911'].includes(d.u)) || d.sg.includes('SG29') || d.sg.includes('SG50');
  if (!vieta) return '';
  const tre = !d.sg.includes('SG50') && ((['6.1', '8'].includes(d.div) && gr === 'III') || (d.div === '8' && gr === 'II') || (gr === 'III' && d.sub.some(c => ['6.1', '8'].includes(c))) || d.sg.includes('SG29'));
  return tre ? 'con alimenti solo ad almeno 3 m (7.3.4.2.2)' : 'non nella stessa unità di trasporto con alimenti (7.3.4.2.1)';
}
function cgVoceHTML(it, n) {
  const R = DATA.dgl[it.u], d = cgDati(it), o = it.opz || {};
  let h = `<div class="cgv"><div><b>${n}. UN ${esc(it.u)}</b> – ${esc(d.nome.length > 90 ? d.nome.slice(0, 90) + '…' : d.nome)} <span class="small">(classe ${esc(d.cl)}${d.sub.length ? ', sussidiari ' + esc(d.sub.join('/')) : ''}${d.pg && d.pg !== '–' ? ', GI ' + esc(d.pg) : ''}${d.r['16b'] && d.r['16b'] !== '–' ? ', 16b ' + esc(d.r['16b']) : ''})</span></div><div class="row">`;
  if (R.length > 1) h += `<select data-k="i" data-n="${n - 1}">${R.map((r, j) => `<option value="${j}"${j === (it.i || 0) ? ' selected' : ''}>voce ${j + 1}: ${esc(r['2'].slice(0, 60))}${r['5'] && r['5'] !== '–' ? ' – GI ' + esc(r['5']) : ''}</option>`).join('')}</select>`;
  h += `<label class="ck"><input type="checkbox" data-k="lq" data-n="${n - 1}"${it.lq ? ' checked' : ''}> quantità limitate</label><label class="ck"><input type="checkbox" data-k="eq" data-n="${n - 1}"${it.eq ? ' checked' : ''}> quantità esenti</label>`;
  if (d.r['3'] === '2') h += `<select data-k="div2" data-n="${n - 1}">${['2.1', '2.2', '2.3'].map(x => `<option${x === (o.div2 || '2.2') ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
  if (d.sg.includes('SG69')) h += `<label class="ck"><input type="checkbox" data-k="aer1L" data-n="${n - 1}"${o.aer1L !== false ? ' checked' : ''}> capacità fino a 1 L</label>`;
  if (d.sg.includes('SG68')) h += `<label class="ck"><input type="checkbox" data-k="pf60" data-n="${n - 1}"${o.pf60 ? ' checked' : ''}> punto di infiammabilità ≤ 60 °C</label>`;
  if (/See/.test(d.r['4'] || '')) h += `<input type="text" data-k="sub" data-n="${n - 1}" value="${esc(o.sub || '')}" placeholder="rischi sussidiari (${esc(d.r['4'].replace(/^–\s*/, ''))})" style="width:12em">`;
  if (d.nos) h += `<input type="text" data-k="sgg" data-n="${n - 1}" value="${esc(o.sgg || '')}" placeholder="gruppo SGG dal documento di trasporto" style="width:15em">`;
  h += `<button type="button" class="sec" data-k="via" data-n="${n - 1}">Togli</button></div>`;
  const al = alimenti(d), fl = [al && 'Alimenti: ' + al];
  for (const k of d.sg) if (['SG23', 'SG41', 'SG57', 'SG71', 'SG72', 'SG29', 'SG50'].includes(k)) fl.push(`${k}: ${DATA.imdgCod.SG[k]}`);
  if (fl.filter(Boolean).length) h += `<p class="small">${fl.filter(Boolean).map(esc).join(' · ')}</p>`;
  if (d.cl === '1' && d.u === '0190') h += '<p class="small">Campioni di esplosivo: divisione e gruppo di compatibilità non indicati nella DGL; si usa la divisione 1.1, la più severa, e nessuna compatibilità con altre merci della classe 1.</p>';
  return h + '</div>';
}
const cella = p => `<td class="n cgl${p.lev}">${p.lev ? p.lev : '–'}${p.levDer < p.lev ? '<sup>d</sup>' : ''}${p.levCond > p.lev ? '*' : ''}</td>`;
function caricoRisHTML(perStampa = false) {
  const D = carico.map(cgDati), n = D.length, cls = perStampa ? 'nota' : 'small';
  if (n < 2) return `<p class="${cls}">Aggiungere almeno due merci.</p>`;
  const P = {};
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) P[a + '-' + b] = coppia(D[a], D[b]);
  let h = `<h4>Matrice di segregazione</h4><table class="segr cgm"><tr><th></th>${D.map((d, j) => `<th>${j + 1}</th>`).join('')}</tr>`;
  D.forEach((d, a) => { h += `<tr><td>${a + 1}. UN ${esc(d.u)}</td>${D.map((e, b) => a === b ? '<td class="n">·</td>' : cella(P[Math.min(a, b) + '-' + Math.max(a, b)])).join('')}</tr>`; });
  h += `</table><p class="${cls}">${[0, 1, 2, 3, 4].map(l => `${l || '–'} = ${l ? TERMINE[l] + ' (' + TERMINE_IT[l] + ')' : TERMINE_IT[0]}`).join(' · ')}. <sup>d</sup> = deroga possibile (7.2.6.1 o 7.2.6.5) se ne ricorrono le condizioni; * = prescrizione più severa se ricorrono condizioni da verificare sulla merce.</p>`;
  const usati = [1, 2, 3, 4].filter(l => Object.values(P).some(p => p.lev === l || p.levCond === l));
  if (usati.length) h += `<h4>A bordo: portacontainer con stive chiuse, container chiusi (7.4.3.2)</h4><table class="segr"><tr><th>Termine</th><th>Verticale</th><th>Longitudinale in coperta</th><th>Longitudinale sotto coperta</th><th>Trasversale in coperta</th><th>Trasversale sotto coperta</th></tr>${usati.map(l => `<tr><td>${l} ${esc(TERMINE[l])}</td>${NAVE[l].map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table><p class="${cls}">Spazio container: almeno 6 m in senso longitudinale o 2,4 m in senso trasversale (7.4.3.1.1). Paratie e ponti resistenti al fuoco e ai liquidi.</p>`;
  h += '<h4>Dettaglio per coppia</h4>';
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const p = P[a + '-' + b], cond = p.motivi.filter(m => m.cond && m.lev > p.lev), der = p.motivi.filter(m => m.der && !m.cond && m.lev > p.levDer);
    const titolo = `${a + 1}–${b + 1}: UN ${D[a].u} / UN ${D[b].u} → <b>${p.lev ? TERMINE[p.lev] : TERMINE_IT[0]}</b>${p.levDer < p.lev ? ` (deroga possibile: ${p.levDer ? TERMINE[p.levDer] : TERMINE_IT[0]})` : ''}${cond.length ? ' *' : ''}`;
    const ctu = p.lev === 0 ? (p.ctu ? 'ammesse nella stessa unità di trasporto' : 'non nella stessa unità di trasporto') : p.lev === 1 ? 'non nella stessa unità di trasporto, salvo approvazione dell\'autorità competente con un livello di sicurezza equivalente (7.3.4.1); non nello stesso imballaggio esterno (7.2.3.2)' : 'non nella stessa unità di trasporto né nello stesso imballaggio esterno (7.2.3.2, 7.3.4.1)';
    let c = `<ul class="${perStampa ? '' : 'ip'}">${p.motivi.filter(m => !m.cond && !(m.der && m.lev > p.levDer)).map(m => `<li>${esc(m.txt)}</li>`).join('')}`;
    c += der.map(m => `<li>${esc(m.txt)} – <i>${esc(typeof m.der === 'string' ? m.der : 'derogabile secondo 7.2.6.1 se le merci non reagiscono pericolosamente fra loro')}</i></li>`).join('');
    c += cond.map(m => `<li>* ${esc(m.txt)} – <i>${esc(m.cond)}</i></li>`).join('');
    c += p.note.map(t => `<li class="${cls}">${esc(t)}</li>`).join('');
    c += `<li><b>Unità di trasporto</b>: ${esc(ctu)}</li>`;
    c += '</ul>';
    h += perStampa ? `<p class="nota">${titolo}</p>${c}` : `<details${p.lev || cond.length ? ' open' : ''}><summary>${titolo}</summary>${c}</details>`;
  }
  h += `<p class="${cls}">Ipotesi della verifica: tabella 7.2.4 con la classe principale e, se la DGL indica un solo rischio sussidiario, anche con quello (7.2.3.3); con due o più rischi sussidiari valgono le prescrizioni della colonna 16b (7.2.3.4); i codici “come per la classe” sostituiscono la riga della classe principale (7.2.6.2); nei codici “classe …” della colonna 16b la classe comprende i rischi sussidiari (7.2.2.2); prevale la prescrizione più severa e la colonna 16b prevale sulla tabella (7.2.3.1). Le prescrizioni per le navi ro-ro (7.5), da carico generale (7.6) e le chiatte (7.7) non sono riportate. Verifica di supporto tecnico: la responsabilità della segregazione resta di chi prepara il carico.</p>`;
  return h;
}
function mostraCarico() {
  const box = $('cgLista'), ris = $('cgRis');
  if (!DATA.dgl) { box.innerHTML = '<p class="small">Caricamento dei dati IMDG…</p>'; caricaIMDG().then(mostraCarico).catch(() => { box.innerHTML = '<div class="warn">Dati IMDG non disponibili senza rete.</div>'; }); return; }
  carico = carico.filter(it => DATA.dgl[it.u]);
  box.innerHTML = carico.length ? carico.map((it, j) => cgVoceHTML(it, j + 1)).join('') : '<p class="small">Nessuna merce nel carico.</p>';
  ris.innerHTML = caricoRisHTML();
  salvaCarico();
}
function aggiungiCarico(u) {
  u = String(u || '').replace(/\D/g, '').padStart(4, '0');
  return caricaIMDG().then(() => {
    if (!DATA.dgl[u]) { $('cgMsg').textContent = `UN ${u} non è nella Dangerous Goods List.`; return; }
    $('cgMsg').textContent = ''; carico.push({ u, i: 0, opz: {} }); mostraCarico();
  });
}
$('cgAdd').onclick = () => { aggiungiCarico($('cgU').value); $('cgU').value = ''; };
$('cgU').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('cgAdd').click(); } });
$('cgDaScheda').onclick = () => { if (cur && cur.u) aggiungiCarico(cur.u); else $('cgMsg').textContent = 'Selezionare prima una merce con la ricerca.'; };
$('cgVuota').onclick = () => { carico = []; mostraCarico(); };
$('cgLista').addEventListener('change', e => {
  const t = e.target, n = +t.dataset.n, k = t.dataset.k; if (!k || !carico[n]) return;
  const it = carico[n]; it.opz = it.opz || {};
  if (k === 'i') it.i = +t.value; else if (k === 'lq' || k === 'eq') it[k] = t.checked;
  else if (k === 'aer1L' || k === 'pf60') it.opz[k] = t.checked; else it.opz[k] = t.value;
  mostraCarico();
});
$('cgLista').addEventListener('click', e => { const t = e.target; if (t.dataset.k === 'via') { carico.splice(+t.dataset.n, 1); mostraCarico(); } });
$('cgPrint').onclick = () => {
  if (!DATA.dgl || carico.length < 2) return;
  const s = leggiImpostazioni(), quando = new Date().toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' });
  let h = s.carta ? cartaHTML() : '';
  h += `<div class="intest"><h1>Verifica di segregazione del carico</h1><table class="dati"><tr><td>Data di redazione</td><td>${esc(quando)}</td></tr><tr><td>Riferimenti</td><td>IMDG Code, Emendamento 42-24 (Ris. MSC.556(108)), capitoli 3.4, 3.5, 7.2, 7.3 e 7.4</td></tr></table></div>`;
  h += '<h4>Merci del carico</h4><table class="dati">' + carico.map((it, j) => { const d = cgDati(it); return `<tr><td>${j + 1}. UN ${esc(d.u)}</td><td>${esc(d.nome)} – classe ${esc(d.cl)}${d.sub.length ? ', rischi sussidiari ' + esc(d.sub.join('/')) : ''}${d.pg && d.pg !== '–' ? ', GI ' + esc(d.pg) : ''}; 16b: ${esc(d.r['16b'] || '–')}${d.sgg.length && d.o.sgg ? '; gruppo dichiarato ' + esc(d.o.sgg) : ''}${it.lq ? '; quantità limitate' : ''}${it.eq ? '; quantità esenti' : ''}${alimenti(d) ? '; alimenti: ' + esc(alimenti(d)) : ''}</td></tr>`; }).join('') + '</table>';
  h += caricoRisHTML(true);
  h += `<p class="nota">Verifica di supporto tecnico redatta con l'app v${VERSIONE}: non sostituisce la consultazione del testo ufficiale del Codice IMDG.</p>`;
  h += `<div class="firma"><div>${esc(s.nome)}</div><div>${esc(s.qualifica)}</div><div class="linea">Firma ____________________________</div></div>`;
  $('report').innerHTML = h; window.print();
};
{ // la sezione del carico è visibile in modalità scheda
  const am = applicaModo;
  applicaModo = function () { am(); $('caricocard').classList.toggle('hide', modo !== 'scheda'); if (modo === 'scheda') mostraCarico(); };
}
