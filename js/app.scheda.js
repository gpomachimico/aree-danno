// ---------- Fase 6 (22/11/2026): Scheda merce – riconoscimento della merce pericolosa dal numero ONU (IMDG Code 42-24, ERG 2024) ----------
// Scelta di Luca: un'unica app. La scheda usa la stessa ricerca della sezione "Aree di danno"; i dati completi della DGL
// (js/imdg.js, circa 1,2 MB) si caricano solo quando si apre la scheda.
let modo = 'aree', imdgPronto = null;
function caricaIMDG() {
  if (DATA.dgl && DATA.ems) return Promise.resolve();
  const carica = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('dati non disponibili: ' + src)); document.head.appendChild(s); });
  if (!imdgPronto) imdgPronto = Promise.all([carica('js/imdg.js'), carica('js/ems.js')]).catch(e => { imdgPronto = null; throw e; });
  return imdgPronto;
}
// 7.1.3 categorie di stivaggio (testo del Codice, riassunto in italiano)
const CAT_STIVA = {
  A: ['in coperta o sotto coperta', 'in coperta o sotto coperta'], B: ['in coperta o sotto coperta', 'solo in coperta'],
  C: ['solo in coperta', 'solo in coperta'], D: ['solo in coperta', 'vietato'], E: ['in coperta o sotto coperta', 'vietato']
};
const CAT_STIVA1 = {
  '01': ['in coperta in unità di trasporto chiusa o sotto coperta', 'in coperta in unità di trasporto chiusa o sotto coperta'],
  '02': ['in coperta in unità di trasporto chiusa o sotto coperta', 'in coperta in unità di trasporto chiusa o sotto coperta in unità di trasporto chiusa secondo 7.1.4.4.6'],
  '03': ['in coperta in unità di trasporto chiusa o sotto coperta', 'vietato, salvo 7.1.4.4.6'],
  '04': ['in coperta in unità di trasporto chiusa o sotto coperta in unità di trasporto chiusa', 'vietato, salvo 7.1.4.4.6'],
  '05': ['solo in coperta in unità di trasporto chiusa', 'vietato, salvo 7.1.4.4.6']
};
const SEGR_TERMINI = { 1: '“away from” – a distanza da', 2: '“separated from” – separato da', 3: '“separated by a complete compartment or hold from” – separato da un compartimento o una stiva completa', 4: '“separated longitudinally by an intervening complete compartment or hold from” – separato longitudinalmente da un compartimento o una stiva completa intermedia', X: 'consultare la DGL per eventuali prescrizioni specifiche', '*': 'tra merci della classe 1 vedere 7.2.7.1' };
const SEGR_COL = ['1.1', '1.3', '1.4', '2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '5.2', '6.1', '6.2', '7', '8', '9'];
const SEGR_NOMI = { '1.1': 'esplosivi 1.1, 1.2, 1.5', '1.3': 'esplosivi 1.3, 1.6', '1.4': 'esplosivi 1.4', '2.1': 'gas infiammabili', '2.2': 'gas non infiammabili, non tossici', '2.3': 'gas tossici', 3: 'liquidi infiammabili', '4.1': 'solidi infiammabili', '4.2': 'materie soggette ad accensione spontanea', '4.3': 'materie che con l\'acqua sviluppano gas infiammabili', '5.1': 'comburenti', '5.2': 'perossidi organici', '6.1': 'tossiche', '6.2': 'infettive', 7: 'radioattive', 8: 'corrosive', 9: 'varie' };
function rigaSegr(cl) {
  const c = String(cl).trim(), m = c.match(/^1\.(\d)/);
  if (c === '1') return '1.1'; if (c === '2') return null; // UN 0190 campioni; UN 1950 e 2037 divisione secondo il contenuto
  if (m) return { 1: '1.1', 2: '1.1', 5: '1.1', 3: '1.3', 6: '1.3', 4: '1.4' }[m[1]];
  const k = c.match(/^\d(\.\d)?/); return k ? k[0] : null;
}
const lista = s => (s || '').split(/[\s,]+/).filter(Boolean);
function codiciTesto(campo, pref) {
  const C = DATA.imdgCod[pref];
  return [...new Set((campo.match(new RegExp('\\b' + pref + '\\d+\\b', 'g')) || []))].map(k => [k, C[k] || '(codice non trovato nel capitolo 7)']);
}
function schedaDati(riga) {
  const C = DATA.imdgCod, sp = [...new Set((riga['6'] || '').match(/\d+/g) || [])];
  const cat = (riga['16a'].match(/Category\s+(\w+)/) || [])[1];
  const prim = rigaSegr(riga['3']);
  const sub = (riga['4'] || '').split(/[\/\s]+/).filter(x => /^\d(\.\d)?$/.test(x)).map(rigaSegr).filter(Boolean);
  return { sp: sp.map(n => [n, C.SP[n] || '(testo non trovato nel capitolo 3.3)']), cat,
    catTxt: cat ? (CAT_STIVA[cat] || CAT_STIVA1[cat]) : null,
    sw: codiciTesto(riga['16a'], 'SW'), h: codiciTesto(riga['16a'], 'H'),
    sg: codiciTesto(riga['16b'], 'SG'), sgg: codiciTesto(riga['16b'], 'SGG'),
    segr: [prim, ...sub].filter(Boolean).map(k => [k, C.SEGR[k]]),
    e: C.E[riga['7b']] || '' };
}
// ---------- Schede EmS (23/11/2026): MSC.1/Circ.1588/Rev.4, testo originale; dati in js/ems.js (tools/build_ems.py) ----------
function emsCodici(u, r) { // codici F e S della voce; per 3166 e 3542 ("*") quelli indicati nell'indice della guida
  const s = r['15'] || '', n = DATA.ems && DATA.ems.note[u];
  return [...new Set(((s === '*' && n ? n : s).match(/[FS]-[A-Z]/g) || []))];
}
function emsCasoVale(x, u, r) { // il caso speciale riguarda questa voce?
  if (x.un.length) return x.un.includes(u);
  const sub = (r['4'] || '').split(/[\/\s]+/);
  if (/^Class 4\.3, packing group I$/.test(x.c)) return r['3'] === '4.3' && r['5'] === 'I';
  if (/^Subsidiary hazard label/.test(x.c)) return sub.includes('4.2') || sub.includes('4.3');
  if (/^Marine pollutant mark/.test(x.c)) return sub.includes('P');
  return false;
}
const EMS_NOMI = { F: 'Incendio (FIRE)', S: 'Spandimento (SPILLAGE)' };
function emsHTML(u, righe, esc, perStampa) {
  const E = DATA.ems; if (!E) return '';
  const cod = [...new Set(righe.flatMap(r => emsCodici(u, r)))].sort((a, b) => a[0] === b[0] ? 0 : a[0] === 'F' ? -1 : 1);
  if (!cod.length) return '';
  const cls = perStampa ? 'nota' : 'small';
  let h = `<h4>Schede EmS (${esc(cod.join(', '))})</h4><p class="${cls}">Fonte: guida IMO EmS, MSC.1/Circ.1588/Rev.4 del 14/07/2026 (allineata all'emendamento 43-26, applicazione volontaria dal 1/1/2027), testo originale inglese. I codici EmS di tutte le voci della DGL 42-24 coincidono con l'indice della Rev.4.${E.note[u] ? ' Codici dall\'indice della guida: ' + esc(E.note[u]) : ''}</p>`;
  for (const c of cod) {
    const s = E.sched[c]; if (!s) continue;
    const casi = s.sc.filter(x => righe.some(r => emsCasoVale(x, u, r)));
    let b = '';
    if (casi.length) b += `<div class="emsSc"><b>Caso speciale per questa merce</b>${casi.map(x => `<p>${x.c ? '<i>' + esc(x.c) + '</i>: ' : ''}${x.p.map(esc).join('<br>')}${x.amb ? ` <span class="${cls}">(nel documento il testo vale per UN ${esc(x.un.join(' e '))} senza una ripartizione certa fra i due numeri; riportato per intero)</span>` : ''}</p>`).join('')}</div>`;
    b += '<table class="ems">' + s.r.map(r => `<tr><td>${r.l.map(l => esc(l.filter(Boolean).join(' – '))).join('<br>')}</td><td>${r.p.map(esc).join('<br>')}</td></tr>`).join('');
    if (s.sc.length) b += `<tr><td>Special cases</td><td>${s.sc.map(x => `<p${casi.includes(x) ? ' class="emsQ"' : ''}><b>${esc([x.c, x.un.map(n => 'UN ' + n).join(', ')].filter(Boolean).join(' '))}</b>: ${x.p.map(esc).join(' ')}</p>`).join('')}</td></tr>`;
    else b += '<tr><td>Special cases</td><td>None.</td></tr>';
    b += '</table>';
    const tit = `${esc(c)} – ${EMS_NOMI[c[0]]}: ${esc(s.t)}`;
    h += perStampa ? `<p class="nota"><b>${tit}</b></p>${b}` : `<details${casi.length ? ' open' : ''}><summary><b>${tit}</b>${casi.length ? ' – caso speciale' : ''}</summary>${b}</details>`;
  }
  for (const k of ['F', 'S']) if (cod.some(c => c[0] === k)) {
    const g = E.lg[k], b = `<ul class="${perStampa ? '' : 'ip'}">${g.punti.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p class="${cls}">${esc(g.prec)}</p>`;
    const tit = `General guidelines for ${k === 'F' ? 'FIRE' : 'SPILLAGE'}`;
    h += perStampa ? `<p class="nota"><b>${tit}</b></p>${b}` : `<details><summary>${tit}</summary>${b}</details>`;
  }
  return h;
}
function schedaHTML(u, esc = x => x, perStampa = false) {
  const righe = DATA.dgl[u] || [], d = DATA.db[u], g = d ? DATA.guide[d.guida] : null;
  if (!righe.length) return '<div class="warn">Numero ONU non presente nella Dangerous Goods List dell\'IMDG Code 42-24.</div>';
  const cls = perStampa ? 'nota' : 'small';
  let h = `<p class="${cls}">Fonte: IMDG Code, Emendamento 42-24 (Ris. MSC.556(108)), Dangerous Goods List e capitoli 3.3, 3.5, 7.1 e 7.2, testo originale inglese; ERG 2024. Dati da estrazione automatica dal PDF ufficiale, con i controlli descritti nella documentazione dell'app.</p>`;
  righe.forEach((r, i) => {
    const x = schedaDati(r), mp = /\bP\b/.test(r['4']);
    h += `${righe.length > 1 ? `<h3>Voce ${i + 1} di ${righe.length} della DGL</h3>` : ''}
    <table class="scheda">
      <tr><td>(1) Numero ONU</td><td><b>UN ${esc(u)}</b>${r.seg ? ` <span class="${cls}">(${esc(r.seg)} modifica dell'emendamento 42-24)</span>` : ''}</td></tr>
      <tr><td>(2) Nome di spedizione</td><td><b>${esc(r['2'])}</b></td></tr>
      <tr><td>(3) Classe o divisione</td><td>${esc(r['3'])}</td></tr>
      <tr><td>(4) Rischi sussidiari</td><td>${esc(r['4'] || '–')}${mp ? ' – <b>inquinante marino</b> (P)' : ''}</td></tr>
      <tr><td>(5) Gruppo di imballaggio</td><td>${esc(r['5'] || '–')}</td></tr>
      <tr><td>(6) Disposizioni speciali</td><td>${esc(r['6'] || '–')}</td></tr>
      <tr><td>(7a) Quantità limitate</td><td>${esc(r['7a'] || '–')}${r['7a'] === '0' ? ' (non ammesse)' : ''}</td></tr>
      <tr><td>(7b) Quantità esenti</td><td>${esc(r['7b'] || '–')}${x.e ? ' – ' + esc(x.e) + (r['7b'] !== 'E0' ? ' (grammi per i solidi, mL per liquidi e gas; 3.5.1.2)' : '') : ''}</td></tr>
      <tr><td>(8)(9) Imballaggi: istruzioni e disposizioni</td><td>${esc(r['8'] || '–')} · ${esc(r['9'] || '–')}</td></tr>
      <tr><td>(10)(11) IBC: istruzioni e disposizioni</td><td>${esc(r['10'] || '–')} · ${esc(r['11'] || '–')}</td></tr>
      <tr><td>(13)(14) Cisterne mobili: istruzioni e disposizioni</td><td>${esc(r['13'] || '–')} · ${esc(r['14'] || '–')}</td></tr>
      <tr><td>(15) EmS</td><td><b>${esc(r['15'] || '–')}</b> <span class="${cls}">(F = incendio, S = spandimento; ${emsCodici(u, r).length ? 'schede riportate più sotto' : 'nessuna scheda assegnata'})</span></td></tr>
      <tr><td>(16a) Stivaggio e movimentazione</td><td>${esc(r['16a'] || '–')}</td></tr>
      <tr><td>(16b) Segregazione</td><td>${esc(r['16b'] || '–')}</td></tr>
      <tr><td>(17) Proprietà e osservazioni</td><td>${esc(r['17'] || '–')}</td></tr>
    </table>`;
    if (x.sp.length) h += `<h4>Disposizioni speciali (3.3.1)</h4>${x.sp.map(([n, t]) => perStampa ? `<p class="nota"><b>SP ${esc(n)}</b> – ${esc(t).replace(/\n/g, '<br>')}</p>` : `<details><summary>SP ${esc(n)}</summary><p class="small">${esc(t).replace(/\n/g, '<br>')}</p></details>`).join('')}`;
    if (x.cat || x.sw.length || x.h.length) {
      h += '<h4>Stivaggio e movimentazione (7.1.3, 7.1.5, 7.1.6)</h4><ul class="' + (perStampa ? '' : 'ip') + '">';
      if (x.catTxt) h += `<li><b>Categoria ${esc(x.cat)}</b>: ${/^\d/.test(x.cat) ? 'navi da carico (fino a 12 passeggeri)' : 'navi da carico e navi passeggeri entro il limite di passeggeri'}: ${esc(x.catTxt[0])}; ${/^\d/.test(x.cat) ? 'navi passeggeri' : 'altre navi passeggeri'}: ${esc(x.catTxt[1])}</li>`;
      for (const [k, t] of [...x.sw, ...x.h]) h += `<li><b>${esc(k)}</b> – ${esc(t)}</li>`;
      h += '</ul>';
    }
    if (x.sg.length || x.sgg.length) h += `<h4>Segregazione particolare (7.2.5, 7.2.8)</h4><ul class="${perStampa ? '' : 'ip'}">${[...x.sgg.map(([k, t]) => [k, 'gruppo di segregazione: ' + t]), ...x.sg].map(([k, t]) => `<li><b>${esc(k)}</b> – ${esc(t)}</li>`).join('')}</ul>`;
    if (x.segr.length) {
      h += `<h4>Tabella di segregazione (7.2.4)</h4><p class="${cls}">Righe della classe ${x.segr.length > 1 ? 'e dei rischi sussidiari (si applica la prescrizione più severa, 7.2.3.3)' : ''}; le prescrizioni della colonna 16b prevalgono (7.2.3.1).</p>
        <table class="segr"><tr><th>Classe</th>${x.segr.map(([k]) => `<th>${esc(k === '1.1' ? '1.1/1.2/1.5' : k === '1.3' ? '1.3/1.6' : k)}</th>`).join('')}</tr>
        ${SEGR_COL.map(c => `<tr><td>${esc(/^1\./.test(c) ? SEGR_NOMI[c] : c + ' ' + SEGR_NOMI[c])}</td>${x.segr.map(([, R]) => `<td class="n">${esc(R[c])}</td>`).join('')}</tr>`).join('')}</table>
        <p class="${cls}">${[1, 2, 3, 4, 'X', '*'].map(k => `${k} = ${esc(SEGR_TERMINI[k])}`).join(' · ')}.</p>`;
    }
  });
  h += emsHTML(u, righe, esc, perStampa);
  if (d && g) {
    h += `<h4>ERG 2024 – Guida ${esc(d.guida)}</h4><p class="${cls}">${esc(g.titolo_it || g.titolo)}</p><table>${ergRighe(g, d.guida).map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>`;
    if (d.tih) h += `<p class="${cls}"><b>Sostanza tossica per inalazione (TIH)</b>: distanze della Tabella 1 ERG nella sezione "Aree di danno". ${esc(NOTA_T1)}</p>`;
    if (d.t2) h += `<p class="${cls}"><b>Reagisce con l'acqua (Tabella 2 ERG)</b>: gas sviluppati ${esc(d.t2.join(', '))}.</p>`;
    if (ONU.t3[u]) { const h3 = tabella3HTML(esc); h += perStampa ? h3.replace(/class="small"/g, 'class="nota"') : h3; }
  }
  return h;
}
function mostraScheda() {
  const box = $('schedabox');
  if (!cur || !cur.u) { box.innerHTML = '<p class="small">Inserire un numero ONU o un nome nella ricerca qui sopra.</p>'; return; }
  box.innerHTML = '<p class="small">Caricamento dei dati IMDG…</p>';
  const u = cur.u;
  caricaIMDG().then(() => { if (cur && cur.u === u) box.innerHTML = schedaHTML(u); })
    .catch(() => { box.innerHTML = '<div class="warn">Dati IMDG completi non disponibili: connessione assente e dati non ancora salvati sul dispositivo. Riprovare con la rete.</div>'; });
}
function applicaModo() {
  const sch = modo === 'scheda';
  $('mAree').classList.toggle('on', !sch); $('mScheda').classList.toggle('on', sch);
  $('schedacard').classList.toggle('hide', !sch);
  ['luogobox'].forEach(id => $(id).classList.toggle('hide', sch));
  if (sch) { ['inbox', 'meteobox', 'calc'].forEach(id => $(id).classList.add('hide')); $('out').style.display = 'none'; mostraScheda(); }
  else if (cur && cur.u) mostraVoce(cur.iv || 0);
}
$('mAree').onclick = () => { modo = 'aree'; applicaModo(); };
$('mScheda').onclick = () => { modo = 'scheda'; applicaModo(); };
$('schedaCalc').onclick = () => { modo = 'aree'; applicaModo(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
{ // dopo ogni selezione della merce, in modalità scheda si aggiorna la scheda e si nascondono i campi del calcolo
  const mv = mostraVoce;
  mostraVoce = function (iv) { mv(iv); if (modo === 'scheda') { ['inbox', 'meteobox', 'calc'].forEach(id => $(id).classList.add('hide')); mostraScheda(); } };
  $('onu').addEventListener('input', () => { if (modo === 'scheda' && !cur) mostraScheda(); });
}
$('schedaPrint').onclick = () => {
  if (!cur || !cur.u || !DATA.dgl) return;
  const s = leggiImpostazioni(), quando = new Date().toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' });
  let h = s.carta ? cartaHTML() : '';
  h += `<div class="intest"><h1>Scheda merce pericolosa – UN ${esc(cur.u)}</h1><table class="dati"><tr><td>Data di redazione</td><td>${esc(quando)}</td></tr><tr><td>Riferimenti</td><td>IMDG Code, Emendamento 42-24 (Ris. MSC.556(108)); ERG 2024</td></tr></table></div>`;
  h += schedaHTML(cur.u, esc, true);
  h += `<p class="nota">Scheda di supporto tecnico redatta con l'app v${VERSIONE}: non sostituisce il documento di trasporto né la consultazione del testo ufficiale del Codice IMDG; i testi delle disposizioni sono riportati nella lingua originale.</p>`;
  h += `<div class="firma"><div>${esc(s.nome)}</div><div>${esc(s.qualifica)}</div><div class="linea">Firma ____________________________</div></div>`;
  $('report').innerHTML = h;
  window.print();
};
