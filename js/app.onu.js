// Banca dati estesa: tutte le voci della Dangerous Goods List IMDG 42-24 + ERG 2024 (guide, Tabelle 1, 2 e 3).
// Le 40 voci verificate a mano in data.js restano prioritarie; le altre vengono costruite da onu.js.
(function estendiBancaDati() {
  // guide ERG: tutte le 62 guide, stesso formato delle 17 verificate
  for (const [k, o] of Object.entries(ONU.guide)) {
    const base = DATA.guide[k];
    if (base) { base.titolo_it = o.t; base.testo_en = o.en; continue; }
    let nota = '';
    if (/rail car or trailer/.test(o.en)) nota = 'vagone o rimorchio coinvolto in incendio';
    else if (/tank/.test(o.en)) nota = 'cisterna coinvolta in incendio';
    DATA.guide[k] = {
      titolo: o.t_en, titolo_it: o.t, testo_en: o.en,
      isolamento_m: o.iso_liq ? `${o.iso_liq} liquidi / ${o.iso_sol} solidi` : (o.iso ?? null),
      evac_grande_m: o.grande ?? null,
      evac_grande_dir: o.grande ? o.grande_dir : (o.t1 ? 'vedi Tabella 1 per le voci TIH' : 'aumentare sottovento se necessario'),
      incendio_m: o.fuoco ?? null, incendio_nota: o.fuoco ? nota : '',
      automatica: true
    };
  }
  for (const k of Object.keys(DATA.guide)) if (!/P$/.test(k)) DATA.guide[k + 'P'] = DATA.guide[k];

  for (const [u, o] of Object.entries(ONU.onu)) {
    const v = o.v[0];
    const e = DATA.db[u] || {
      psn: v.n, classe: v.c, ems: v.e || '–', guida: (o.g || ['111'])[0],
      modello: /N\.O\.S\./.test(v.n) ? 'NOS' : 'ERG', automatica: true
    };
    e.pg = v.pg; e.sub = v.s || ''; e.mp = !!v.p; e.sn = v.sn || '';
    e.varianti = o.v; e.guide = o.g || [e.guida]; e.guidaRegola = !!o.gx;
    e.tih = !!o.tih; e.t2 = o.t2 || null; e.t3 = !!o.t3;
    DATA.db[u] = e;
  }
})();

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const INDICE = Object.entries(ONU.onu).flatMap(([u, o]) => [...new Set(o.v.map(v => v.n))].map(n => [u, n, norm(n)]))
  .concat(Object.entries(ONU.t1).filter(([u]) => DATA.db[u]).flatMap(([u, l]) => l.map(x => [u, x.n + ' (ERG)', norm(x.n)])));

function cercaVoci(q) {
  q = norm(q.trim());
  if (!q) return [];
  if (/^\d{1,4}$/.test(q)) return INDICE.filter(x => x[0].startsWith(q)).slice(0, 40);
  const parole = q.split(/\s+/);
  return INDICE.filter(x => parole.every(p => x[2].includes(p))).slice(0, 40);
}

// Classificazione in forma breve: classe (sussidiario) · GI · EmS · P
function classif(c = cur) {
  let t = `Classe ${c.classe}${c.sub ? ' (' + c.sub + ')' : ''}`;
  if (c.pg && c.pg !== '–') t += ` · GI ${c.pg}`;
  t += ` · EmS ${c.ems === '*' ? 'vedi DGL (*)' : c.ems}`;
  if (c.mp) t += ' · inquinante marino';
  return t;
}

// Voci della Tabella 1 per la merce corrente, raggruppate per dati uguali
function vociT1(u, inAcqua) {
  const l = ONU.t1[u] || [];
  const acqua = l.filter(x => /when spilled in water/.test(x.n)), terra = l.filter(x => !/when spilled in water/.test(x.n));
  let scelte = inAcqua && acqua.length ? acqua : terra;
  if (!scelte.length) return { voci: [], soloAcqua: true };
  const gruppi = [];
  for (const x of scelte) {
    const k = JSON.stringify(x.d), g = gruppi.find(y => y.k === k);
    if (g) g.nomi.push(x.n); else gruppi.push({ k, nomi: [x.n], d: x.d, g: x.g });
  }
  return { voci: gruppi, soloAcqua: false };
}

function campiTIH() {
  const u = cur.u, haAcqua = (ONU.t1[u] || []).some(x => /when spilled in water/.test(x.n)) || cur.t2;
  const ev = $('evData') && $('evData').value ? new Date($('evData').value) : new Date();
  const ora = ev.getHours(), giorno = ora >= 7 && ora < 19;
  let h = `<div class="warn">Voce TIH (tossica per inalazione) evidenziata nell'ERG: per lo spandimento valgono le distanze della Tabella 1.</div>`;
  if (haAcqua) h += `<label style="display:flex;gap:10px;align-items:center;font-size:15px;color:var(--ink);margin-top:12px"><input id="inAcqua" type="checkbox" style="width:22px;height:22px;flex:none"> Rilascio in acqua (mare, bacino)</label>`;
  h += `<div id="t1sel"></div>
    <label for="periodo">Periodo</label><select id="periodo"><option value="giorno" ${giorno ? 'selected' : ''}>Giorno (tra alba e tramonto)</option><option value="notte" ${giorno ? '' : 'selected'}>Notte</option></select><p class="small">Proposto dall'ora dell'evento (giorno 7–19): verificare alba e tramonto.</p>`;
  if (cur.t3) {
    const righe = ONU.t3[u].righe;
    h += `<div id="t3box"><label for="t3cont">Contenitore (Tabella 3, grandi spandimenti)</label><select id="t3cont">${righe.map((r, i) => `<option value="${i}">${TRAD_CONT[r.contenitore] || r.contenitore}</option>`).join('')}</select>
      <label for="t3vento">Vento</label><select id="t3vento"><option value="debole">Debole (&lt; 10 km/h)</option><option value="moderato" selected>Moderato (10–20 km/h)</option><option value="forte">Forte (&gt; 20 km/h)</option></select></div>`;
  }
  return h;
}
const TRAD_CONT = { 'Rail tank car': 'Carro cisterna ferroviario', 'Highway tank truck or trailer': 'Autocisterna o rimorchio cisterna', 'Agricultural nurse tank': 'Serbatoio agricolo', 'Multiple small cylinders': 'Più bombole piccole', 'Multiple ton cylinders': 'Più bombole da una tonnellata', 'Multiple small cylinders or single ton cylinder': 'Più bombole piccole o una bombola da una tonnellata' };

// etichetta breve per la scelta della voce: zona di pericolo per inalazione se presente
function etichettaT1(v) {
  const z = [...new Set(v.nomi.map(n => (n.match(/Hazard\s*Zone\s*([A-D])/) || [])[1]).filter(Boolean))];
  const senza = v.nomi.some(n => !/Hazard\s*Zone/.test(n));
  if (z.length) return 'Zona ' + z.join('/') + (senza ? ' (anche zona non indicata)' : '') + ' – ' + v.nomi[0].replace(/\s*\(Inhalation Hazard Zone [A-D]\)/, '');
  return v.nomi[0] + (v.nomi.length > 1 ? ' (e sinonimi)' : '');
}
function aggiornaT1sel() {
  const box = $('t1sel'); if (!box) return;
  const { voci, soloAcqua } = vociT1(cur.u, $('inAcqua') && $('inAcqua').checked);
  if (soloAcqua) { box.innerHTML = `<p class="small">Questa voce è in Tabella 1 solo per il rilascio in acqua: per il rilascio a terra valgono le distanze della guida ERG (nota 2 della Tabella 2).</p>`; return; }
  box.innerHTML = voci.length > 1 ? `<label for="t1voce">Voce della Tabella 1</label><select id="t1voce">${voci.map((v, i) => `<option value="${i}">${etichettaT1(v)}</option>`).join('')}</select>` : `<p class="small">Tabella 1: ${voci[0].nomi.length > 3 ? voci[0].nomi[0] + ` e altre ${voci[0].nomi.length - 1} voci (sinonimi e zone) con gli stessi valori` : voci[0].nomi.join(' / ')}</p>`;
}

// Caso ERG per le voci TIH: Tabella 1 (e Tabella 3 per i grandi spandimenti dei sei gas)
function casoTIH(imbe, q) {
  const inAcqua = $('inAcqua') && $('inAcqua').checked;
  const { voci, soloAcqua } = vociT1(cur.u, inAcqua);
  if (soloAcqua) return null;
  const v = voci[$('t1voce') ? +$('t1voce').value : 0];
  const per = $('periodo') ? $('periodo').value : 'giorno';
  const sp = tipoSpandimento(imbe, q), grande = sp.grande;
  const nomeVoce = v.nomi[0];
  const acquaTxt = inAcqua ? ' – rilascio in acqua' + (cur.t2 ? ` (gas sviluppati: ${cur.t2.join(', ')}, Tabella 2)` : '') : '';
  if (grande && v.d.grande === 'Tabella 3') {
    const i = +$('t3cont').value, vento = $('t3vento').value, r = ONU.t3[cur.u].righe[i];
    const km = String(r[per + '_km'][vento]).replace('.', ',');
    const plus = r.plus.includes((per === 'giorno' ? 1 : 4) + ['debole', 'moderato', 'forte'].indexOf(vento));
    return { chiave: 't3', dist: r.isol_m, prot_km: r[per + '_km'][vento], plus, per,
      dir: `in tutte le direzioni; poi protezione sottovento ${km}${plus ? '+' : ''} km (${per})`,
      etichetta: `Tabella 3 ERG – grande spandimento, ${TRAD_CONT[r.contenitore] || r.contenitore}, vento ${vento}`,
      motivo: `${sp.motivo}; ${nomeVoce}${acquaTxt}. Tabella 3 ERG 2024 (isolamento ${r.isol_m} m; protezione ${per} ${km}${plus ? '+' : ''} km)` };
  }
  const d = grande ? v.d.grande : v.d.piccolo;
  const km = String(d[per + '_km']).replace('.', ','), plus = per === 'notte' && d.notte_plus;
  return { chiave: 't1', dist: d.isol_m, prot_km: d[per + '_km'], plus, per,
    dir: `in tutte le direzioni; poi protezione sottovento ${km}${plus ? '+' : ''} km (${per})`,
    etichetta: `Tabella 1 ERG – ${grande ? 'grande' : 'piccolo'} spandimento`,
    motivo: `${sp.motivo}; ${nomeVoce}${acquaTxt}. Tabella 1 ERG 2024: isolare ${d.isol_m} m, proteggere sottovento ${km}${plus ? '+' : ''} km di ${per}` };
}

function righeT1() {
  const { voci } = vociT1(cur.u, $('inAcqua') && $('inAcqua').checked);
  if (!voci.length) return [];
  const v = voci[$('t1voce') ? +$('t1voce').value : 0], s = v.d.piccolo, g = v.d.grande;
  const kmv = x => String(x).replace('.', ',');
  const r = [['Tabella 1 – piccolo spandimento', `isolare ${s.isol_m} m; proteggere sottovento ${kmv(s.giorno_km)} km di giorno, ${kmv(s.notte_km)}${s.notte_plus ? '+' : ''} km di notte`]];
  r.push(['Tabella 1 – grande spandimento', g === 'Tabella 3' ? 'si applica la Tabella 3 ERG (per contenitore, periodo e vento), riportata sotto' : `isolare ${g.isol_m} m; proteggere sottovento ${kmv(g.giorno_km)} km di giorno, ${kmv(g.notte_km)}${g.notte_plus ? '+' : ''} km di notte`]);
  return r;
}

// ---------- Tabella 3 ERG nel report e nel riquadro ERG ----------
const NOTA_T1 = 'Tabella 1 ERG 2024 (pagine verdi, "Initial Isolation and Protective Action Distances"): distanze per le sostanze tossiche per inalazione (TIH). Piccolo spandimento: fino a 208 L (un collo piccolo o una piccola perdita da un grande imballaggio); grande spandimento: oltre 208 L. Isolamento: raggio in tutte le direzioni; protezione: distanza sottovento entro cui proteggere le persone (evacuazione o riparo al chiuso), di giorno o di notte.';
const NOTA_T3 = 'Tabella 3 ERG 2024 (pagine verdi, "Initial Isolation and Protective Action Distances for Different Quantities of Six Common TIH Gases"): distanze per i grandi spandimenti di sei gas tossici per inalazione di uso comune (ammoniaca anidra, cloro, ossido di etilene, acido cloridrico anidro e refrigerato, acido fluoridrico anidro, anidride solforosa), in funzione del tipo di contenitore, del periodo (giorno o notte) e del vento: debole < 10 km/h, moderato 10–20 km/h, forte > 20 km/h. "+": la distanza può essere maggiore in certe condizioni atmosferiche.';
function rigaT3Scelta() {
  const t = ONU.t3[cur.u]; if (!t) return -1;
  if (cur.modello === 'GL' && $('glc')) {
    const c = $('glc').value, f = re => t.righe.findIndex(r => re.test(r.contenitore));
    if (c === 'cist') return f(/Highway/);
    if (c === 'bomb' || c === 'ton') { const i = f(/single ton/); return i >= 0 ? i : f(/small cylinders/); }
    return -1;
  }
  const r = typeof risultati !== 'undefined' && risultati[tabSel];
  return $('t3cont') && r && r.ergCaso && r.ergCaso.chiave === 't3' ? +$('t3cont').value : -1;
}
function tabella3() {
  const t = ONU.t3[cur.u]; if (!t) return null;
  const sel = rigaT3Scelta(), V = ['debole', 'moderato', 'forte'], n = x => String(x).replace('.', ',');
  const righe = t.righe.map((r, i) => ({
    sel: i === sel, cont: TRAD_CONT[r.contenitore] || r.contenitore, isol: r.isol_m,
    giorno: V.map((v, j) => n(r.giorno_km[v]) + (r.plus.includes(1 + j) ? '+' : '')),
    notte: V.map((v, j) => n(r.notte_km[v]) + (r.plus.includes(4 + j) ? '+' : ''))
  }));
  return { nome: t.nome, righe, sel };
}
function tabella3HTML(esc = x => x) {
  const T = tabella3(); if (!T) return '';
  const rows = T.righe.map(r => `<tr${r.sel ? ' style="font-weight:bold"' : ''}><td>${esc(r.cont)}${r.sel ? ' ◀' : ''}</td><td class="n">${r.isol} m</td>${r.giorno.map(x => `<td class="n">${x}</td>`).join('')}${r.notte.map(x => `<td class="n">${x}</td>`).join('')}</tr>`).join('');
  return `<p class="small" style="margin:10px 0 4px"><b>Tabella 3 ERG 2024 – ${esc(T.nome)}</b> (protezione sottovento in km)</p>
    <table class="t3"><tr><th rowspan="2">Contenitore</th><th rowspan="2">Isolamento</th><th colspan="3">Giorno – vento</th><th colspan="3">Notte – vento</th></tr>
    <tr><th>debole</th><th>mod.</th><th>forte</th><th>debole</th><th>mod.</th><th>forte</th></tr>${rows}</table>
    <p class="small">${esc(NOTA_T3)}${T.sel >= 0 ? ' In grassetto (◀) la riga corrispondente al recipiente indicato.' : ''}</p>`;
}
function tabella3Testo() {
  const T = tabella3(); if (!T) return '';
  return `\nTabella 3 ERG 2024 – ${T.nome} (isolamento; protezione sottovento in km, giorno e notte con vento debole/moderato/forte):\n` +
    T.righe.map(r => `- ${r.cont}${r.sel ? ' [recipiente indicato]' : ''}: isolare ${r.isol} m; giorno ${r.giorno.join(' / ')}; notte ${r.notte.join(' / ')}`).join('\n') + `\n${NOTA_T3}\n`;
}
