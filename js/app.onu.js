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
  const grande = q > 208 && imbe !== 'collo';
  const nomeVoce = v.nomi[0];
  const acquaTxt = inAcqua ? ' – rilascio in acqua' + (cur.t2 ? ` (gas sviluppati: ${cur.t2.join(', ')}, Tabella 2)` : '') : '';
  if (grande && v.d.grande === 'Tabella 3') {
    const i = +$('t3cont').value, vento = $('t3vento').value, r = ONU.t3[cur.u].righe[i];
    const km = r[per + '_km'][vento];
    const plus = r.plus.includes((per === 'giorno' ? 1 : 4) + ['debole', 'moderato', 'forte'].indexOf(vento));
    return { chiave: 't3', dist: r.isol_m, prot_km: km, plus, per,
      dir: `in tutte le direzioni; poi protezione sottovento ${km}${plus ? '+' : ''} km (${per})`,
      etichetta: `Tabella 3 ERG – grande spandimento, ${TRAD_CONT[r.contenitore] || r.contenitore}, vento ${vento}`,
      motivo: `Quantità > 208 L: grande spandimento; ${nomeVoce}${acquaTxt}. Tabella 3 ERG 2024 (isolamento ${r.isol_m} m; protezione ${per} ${km}${plus ? '+' : ''} km)` };
  }
  const d = grande ? v.d.grande : v.d.piccolo;
  const km = d[per + '_km'], plus = per === 'notte' && d.notte_plus;
  return { chiave: 't1', dist: d.isol_m, prot_km: km, plus, per,
    dir: `in tutte le direzioni; poi protezione sottovento ${km}${plus ? '+' : ''} km (${per})`,
    etichetta: `Tabella 1 ERG – ${grande ? 'grande' : 'piccolo'} spandimento`,
    motivo: `${grande ? 'Quantità > 208 L: grande spandimento' : 'Quantità ≤ 208 L o collo singolo: piccolo spandimento'} (definizione ERG); ${nomeVoce}${acquaTxt}. Tabella 1 ERG 2024: isolare ${d.isol_m} m, proteggere sottovento ${km}${plus ? '+' : ''} km di ${per}` };
}

function righeT1() {
  const { voci } = vociT1(cur.u, $('inAcqua') && $('inAcqua').checked);
  if (!voci.length) return [];
  const v = voci[$('t1voce') ? +$('t1voce').value : 0], s = v.d.piccolo, g = v.d.grande;
  const r = [['Tabella 1 – piccolo spandimento', `isolare ${s.isol_m} m; proteggere sottovento ${s.giorno_km} km di giorno, ${s.notte_km}${s.notte_plus ? '+' : ''} km di notte`]];
  r.push(['Tabella 1 – grande spandimento', g === 'Tabella 3' ? 'vedi Tabella 3 (per contenitore e vento)' : `isolare ${g.isol_m} m; proteggere sottovento ${g.giorno_km} km di giorno, ${g.notte_km}${g.notte_plus ? '+' : ''} km di notte`]);
  return r;
}
