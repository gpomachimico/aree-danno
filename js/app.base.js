

const $ = id => document.getElementById(id);
const M = window.MotoreAree;
let cur = null, risultati = [], tabSel = 0, meteoUser = false;

// ricerca per numero ONU o per nome (tutte le voci IMDG 42-24)
function mostraRicerca() {
  const q = $('onu').value, box = $('onures');
  if (/^\d{4}$/.test(q.trim()) && DATA.db[q.trim()]) { box.innerHTML = ''; return; }
  const l = q.trim().length >= (/^\d/.test(q.trim()) ? 1 : 3) ? cercaVoci(q) : [];
  box.innerHTML = l.map(([u, n]) => `<button type="button" class="res" data-u="${u}"><b>${u}</b> ${n}</button>`).join('') + (l.length === 40 ? '<p class="small">Mostrate le prime 40: affina la ricerca.</p>' : '');
  box.querySelectorAll('button').forEach(b => b.onclick = () => { $('onu').value = b.dataset.u; box.innerHTML = ''; $('onu').dispatchEvent(new Event('input')); });
}

const NOMI_MOD = { PF: 'Pool fire', BL: 'BLEVE / fireball', GA: 'Dispersione tossica', GL: 'Gas tossico liquefatto', TNT: 'Esplosione (TNT equivalente)', ERG: 'Solo distanze ERG', NOS: 'Nome tecnico necessario' };

$('onu').addEventListener('input', () => {
  mostraRicerca();
  const q = $('onu').value.trim(), u = /^\d{4}$/.test(q) ? q : '';
  const d = DATA.db[u];
  $('out').style.display = 'none';
  if (!d) { $('idbox').innerHTML = /^\d{4}$/.test(q) ? '<div class="warn">Numero ONU non presente nella Dangerous Goods List dell\'IMDG Code 42-24.</div>' : ''; ['inbox', 'meteobox', 'calc'].forEach(x => $(x).classList.add('hide')); cur = null; return; }
  cur = { u, ...d };
  mostraVoce(0);
});
function mostraVoce(iv) {
  const d = DATA.db[cur.u], u = cur.u;
  Object.assign(cur, { psn: d.psn, classe: d.classe, ems: d.ems, pg: d.pg, sub: d.sub, mp: d.mp, sn: d.sn, st: d.varianti ? d.varianti[0].st : '', im: d.varianti ? d.varianti[0].im : undefined });
  if (d.varianti && d.varianti[iv] && (d.automatica || iv > 0)) { const v = d.varianti[iv]; Object.assign(cur, { psn: v.n, classe: v.c, ems: v.e || '–', pg: v.pg, sub: v.s || '', mp: !!v.p, sn: v.sn || '', st: v.st || '', im: v.im }); }
  if (/\(/.test(cur.classe)) cur.sub = '';
  cur.iv = iv;
  const varSel = d.varianti && d.varianti.length > 1 ? `<label for="varSel">Voci della DGL per questo numero (${d.varianti.length})</label><select id="varSel">${d.varianti.map((v, i) => `<option value="${i}" ${i === iv ? 'selected' : ''}>${v.pg !== '–' ? 'GI ' + v.pg + ' – ' : ''}${v.n.slice(0, 80)}${v.e && v.e !== d.varianti[0].e ? ' (' + v.e + ')' : ''}</option>`).join('')}</select>` : '';
  const g = DATA.guide[cur.guida];
  $('idbox').innerHTML = `<div class="id"><b>UN ${u}</b> – ${cur.psn}<br>
    <span class="tag">Classe ${cur.classe}${cur.sub ? ' (' + cur.sub + ')' : ''}</span>${cur.pg && cur.pg !== '–' ? `<span class="tag">GI ${cur.pg}</span>` : ''}<span class="tag">EmS ${cur.ems}</span><span class="tag">ERG Guida ${cur.guida}${d.guide && d.guide.length > 1 ? ' (anche ' + d.guide.slice(1).join(', ') + ')' : ''}</span>${cur.mp ? '<span class="tag">Inquinante marino</span>' : ''}${cur.tih ? '<span class="tag tih">TIH – Tabella 1</span>' : ''}<span class="tag">${NOMI_MOD[cur.modello]}</span>
    ${cur.sn ? `<br><span class="small">Rischio sussidiario: ${cur.sn} (IMDG)</span>` : ''}${cur.ems === '*' ? '<br><span class="small">EmS: la DGL rimanda alla nota (*) della colonna 15.</span>' : ''}${/P$/.test(cur.guida) ? '<br><span class="small">Guida con "P": rischio di polimerizzazione violenta se riscaldato o contaminato.</span>' : ''}${d.guidaRegola ? '<br><span class="small">Esplosivi: l\'ERG non li elenca per numero ONU; guida assegnata dalla divisione (112 per 1.1, 1.2, 1.3, 1.5; 114 per 1.4, 1.6).</span>' : ''}${d.automatica ? '<br><span class="small">Dati da estrazione automatica (IMDG 42-24, ERG 2024): voce non ancora verificata a mano.</span>' : ''}</div>${varSel}`;
  if ($('varSel')) $('varSel').onchange = e => mostraVoce(+e.target.value);
  if (d.modelli && d.modelli.length > 1) {
    if (!d.modelli.includes(cur.modello)) cur.modello = d.modelli[0];
    $('idbox').insertAdjacentHTML('beforeend', `<label>Scenario</label><div class="chips" id="modSel">${d.modelli.map(m => `<button type="button" class="chip ${m === cur.modello ? 'on' : ''}" data-m="${m}">${NOMI_MOD[m]}</button>`).join('')}</div>`);
    $('modSel').querySelectorAll('button').forEach(b => b.onclick = () => { cur.modello = b.dataset.m; $('modSel').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('out').style.display = 'none'; buildFields(); });
  }
  buildFields();
}

function f(id, lab, val, extra = '') { return `<div><label for="${id}">${lab}</label><input id="${id}" type="number" inputmode="decimal" step="any" value="${val}" ${extra}></div>`; }


function chk(id, lab) { return `<label style="display:flex;gap:10px;align-items:center;font-size:15px;color:var(--ink);margin-top:12px"><input id="${id}" type="checkbox" style="width:22px;height:22px;flex:none"> ${lab}</label>`; }

function explFields(conCalcolo, p) {
  return `<label>Imballaggio / configurazione</label><select id="imbx">
      <option value="collo">Collo singolo</option><option value="pallet">Pallet / più colli</option>
      <option value="c20" selected>Container 20'</option><option value="c40">Container 40'</option><option value="stiva">Stiva / carico di nave</option><option value="altro">Altro</option></select>
    <label>Massa netta esplosiva (NEM/NEQ)</label>
    <div class="chips"><button class="chip on" id="nemTot" type="button">Totale dal documento di trasporto</button><button class="chip" id="nemCol" type="button">N. colli × NEM per collo</button></div>
    <div id="boxTot">${f('nem', 'NEM totale (kg) – IMDG 5.4.1.5.1', 100)}</div>
    <div id="boxCol" class="hide"><div class="row">${f('ncolli', 'Numero di colli', 10)}${f('nemcollo', 'NEM per collo (kg)', 10)}</div>
      <p class="small">NEM per collo: dal documento di classificazione o dalla marcatura del collo.</p></div>
    ${conCalcolo ? `<div class="row">${f('fatt', 'Fattore TNT', p.fattore)}<div></div></div><p class="small">Fattore: ${p.fonte}.</p>` :
      (/^1\.[15]/.test(cur.classe) ? `<p class="small">Divisione ${cur.classe} (esplosione di massa): fattore TNT non ancora verificato per questa voce, quindi l'app applica solo le distanze ERG. Il calcolo della sovrappressione è disponibile per le voci con fattore verificato (es. UN 0209, 0483, 0484, 0221, 0286).</p>` : `<p class="small">Divisione ${cur.classe}: nessuna esplosione di massa; nella prima versione si applicano le distanze ERG.</p>`)}
    ${chk('parte', 'Coinvolta una parte consistente del carico, senza incendio (ERG "Large Spill")')}
    ${chk('fuoco', 'Incendio in atto o che può raggiungere il carico')}
    <p class="small">L'ERG non lega le distanze per gli esplosivi alla massa netta: la scelta tra misura immediata, "Large Spill" e incendio dipende dalla situazione valutata sul posto.</p>`;
}
function ergFields() {
  const solido = cur.st ? cur.st !== 'l' : SOLIDO_RE.test(cur.psn), gas = cur.classe.startsWith('2');
  const g = DATA.guide[cur.guida], liqSol = typeof g.isolamento_m === 'string';
  const ST = { l: 'liquido', s: 'solido', o: 'oggetto/articolo (quantità in kg)' };
  const statoHtml = gas ? '' : cur.st
    ? `<input type="hidden" id="stato" value="${cur.st === 'l' ? 'liq' : 'sol'}"><p class="small"><b>Stato fisico: ${ST[cur.st]}</b> (dalla voce IMDG: nome di spedizione o istruzioni di imballaggio).</p>`
    : `<label for="stato">Stato fisico</label><select id="stato"><option value="liq" ${solido ? '' : 'selected'}>Liquido</option><option value="sol" ${solido ? 'selected' : ''}>Solido</option></select><p class="small">La voce IMDG non indica lo stato fisico: sceglierlo in base alla merce.</p>`;
  return `${statoHtml}${!gas && liqSol ? '<p class="small">Per questa guida l\'ERG distingue l\'isolamento iniziale tra liquidi e solidi.</p>' : ''}
    <label>Imballaggio</label>${opzioniImb(gas, solido)}
    <div class="row">${f('qta', gas ? 'Capacità del recipiente (L)' : `Quantità coinvolta (<span id="qtaU">${solido ? 'kg' : 'L'}</span>)`, 1000)}<div></div></div>
    ${gas ? '' : `<div id="solBox" class="${solido ? '' : 'hide'}">
      <div class="row">${f('ncolli2', 'Colli coinvolti', 1, 'min="1" step="1"')}${f('rhoapp', 'Densità apparente (kg/L) – facoltativa', '', 'placeholder="non nota"')}</div>
      ${chk('piccolaPerdita', 'Solo una piccola perdita da un grande imballaggio')}
      <p class="small">Solidi: l'ERG fissa la soglia solo in volume (208 L). Senza densità l'app applica il criterio per imballaggio: piccolo = un solo collo fino a 400 kg (IMDG 6.1.4; grandi imballaggi oltre 400 kg o 450 L, IMDG 1.2.1) o piccola perdita da un grande imballaggio; grande = IBC, grande imballaggio, cisterna, container o più colli. Con la densità apparente si confronta il volume con 208 L.</p></div>`}
    ${chk('fuoco', 'Incendio in atto o probabile')}${cur.tih ? campiTIH() : ''}`;
}
function bindExtra() {
  const a = $('nemTot'), b = $('nemCol');
  if (a) { a.onclick = () => { a.classList.add('on'); b.classList.remove('on'); $('boxTot').classList.remove('hide'); $('boxCol').classList.add('hide'); };
           b.onclick = () => { b.classList.add('on'); a.classList.remove('on'); $('boxCol').classList.remove('hide'); $('boxTot').classList.add('hide'); }; }
  if ($('stato')) $('stato').onchange = () => { const s = $('stato').value === 'sol'; if ($('qtaU')) $('qtaU').textContent = s ? 'kg' : 'L'; if ($('solBox')) $('solBox').classList.toggle('hide', !s); };
  if ($('t1sel')) { aggiornaT1sel(); if ($('inAcqua')) $('inAcqua').onchange = aggiornaT1sel; }
  const ie = $('imbe');
  const preset = () => { const v = { collo: 50, fusto: 200, lp: 1000, ibc: 1000, bk: 20000, cist: 24000, cont: 10000 }[ie.value]; if (v) $('qta').value = v; };
  if (ie) { ie.onchange = preset; preset(); }
}
function leggiNEM() {
  if ($('nemCol') && $('nemCol').classList.contains('on')) {
    const n = num('ncolli'), q = num('nemcollo');
    if (!n || !q) throw 'Inserire numero di colli e NEM per collo';
    return { nem: n * q, origine: `${n} colli × ${q} kg NEM per collo = ${(n * q).toFixed(1)} kg` };
  }
  const t = num('nem'); if (!t || t <= 0) throw 'Inserire la NEM totale';
  return { nem: t, origine: `NEM totale ${t} kg dal documento di trasporto (IMDG 5.4.1.5.1)` };
}
// Imballaggi proposti in base allo stato fisico e a quelli ammessi dalla DGL IMDG per la voce:
// G bombole (P200/P203), L grandi imballaggi (LP), I IBC (col. 10), T cisterne mobili (col. 13), B contenitori per rinfuse (BK)
function opzioniImb(gas, solido) {
  const im = cur.im ?? 'GLITB', ok = k => im.includes(k), o = cur.st === 'o';
  const op = [];
  if (gas) {
    op.push(['collo', 'Bombola singola']);
    if (ok('T')) op.push(['cist', 'Cisterna / tank-container']);
    op.push(['cont', 'Container o pacco con più bombole']);
  } else if (o) {
    op.push(['collo', 'Collo singolo']);
    if (ok('L')) op.push(['lp', 'Grande imballaggio']);
    op.push(['cont', 'Container con più colli']);
  } else {
    if (ok('G') && !/P00[12]/.test(cur.pi || '')) op.push(['collo', 'Recipiente a pressione (bombola) singolo']);
    else {
      op.push(['collo', solido ? 'Collo singolo (sacco, scatola) fino a 400 kg' : 'Collo singolo (bottiglia, latta, tanica)']);
      op.push(['fusto', solido ? 'Fusto' : 'Fusto (fino a 200 L)']);
    }
    if (ok('L')) op.push(['lp', 'Grande imballaggio']);
    if (ok('I')) op.push(['ibc', solido ? 'IBC (big bag, contenitore rigido)' : 'IBC 1000 L']);
    if (ok('B')) op.push(['bk', 'Contenitore per rinfuse (BK)']);
    if (ok('T')) op.push(['cist', solido ? 'Cisterna mobile (solidi)' : 'Cisterna / tank-container']);
    op.push(['cont', 'Container con più colli']);
  }
  op.push(['altro', 'Altro']);
  const def = gas ? 'collo' : ['ibc', 'fusto', 'collo'].find(k => op.some(x => x[0] === k));
  const esclusi = gas ? (ok('T') ? '' : 'cisterne') : o ? '' : [!ok('I') && 'IBC', !ok('T') && 'cisterne mobili', !ok('L') && 'grandi imballaggi'].filter(Boolean).join(', ');
  return `<select id="imbe">${op.map(([v, t]) => `<option value="${v}" ${v === def ? 'selected' : ''}>${t}</option>`).join('')}</select>` +
    `<p class="small">Imballaggi proposti in base a quelli ammessi dalla DGL IMDG per questa voce (colonne 8, 10 e 13)${esclusi ? ': non ammessi ' + esclusi : ''}.</p>`;
}
// imballaggi per i modelli di calcolo dei liquidi (pool fire, dispersione)
function opzioniImbLiquidi() {
  const im = cur.im ?? 'IT', op = [['200', 'Fusto 200 L']];
  if (im.includes('I')) op.push(['1000', 'IBC 1000 L']);
  if (im.includes('T')) op.push(['24000', 'Cisterna / tank-container 24 000 L']);
  op.push(['0', 'Altro (inserisci volume)']);
  const def = op.find(x => x[0] === '1000') ? '1000' : '200';
  return { html: `<select id="imb">${op.map(([v, t]) => `<option value="${v}" ${v === def ? 'selected' : ''}>${t}</option>`).join('')}</select>`, vol: +def };
}
const NOMI_IMB = { lp: 'grande imballaggio', bk: 'contenitore per rinfuse (BK)', collo: 'collo singolo', pallet: 'pallet / più colli', c20: "container 20'", c40: "container 40'", stiva: 'stiva / carico di nave', altro: 'altro', fusto: 'fusto', ibc: 'IBC', cist: 'cisterna / tank-container', cont: 'container con più colli' };

function buildFields() {
  const m = cur.modello, p = DATA.props[cur.u] || {};
  let h = '';
  if (m === 'PF') {
    h = `<label>Imballaggio</label>${opzioniImbLiquidi().html}
      <div class="row">${f('vol', 'Volume rilasciato (L)', opzioniImbLiquidi().vol)}${f('area', 'Area bacino (m²) – vuoto = non confinato', '', 'placeholder="non confinato"')}</div>
      <p class="small">Sostanza di calcolo: ${p.nome}</p>`;
  } else if (m === 'BL') {
    const rho = p.rho_liq || 0.5, mk = V => Math.round(V * rho * 0.8 / 100) * 100;
    h = `<label>Contenitore</label><select id="imb"><option value="${mk(1000)}">Bombola/serbatoio 1000 L (~${mk(1000)} kg)</option><option value="${mk(22000)}" selected>Serbatoio 22 000 L (~${mk(22000)} kg)</option><option value="${mk(42000)}">Tank 42 000 L (~${mk(42000)} kg)</option><option value="0">Altro (inserisci massa)</option></select>
      <div class="row">${f('massa', `Massa di ${p.nome.split(' (')[0]} (kg)`, mk(22000))}${f('pmpa', 'Pressione al cedimento (MPa)', 1.7)}</div>
      <p class="small">Sostanza di calcolo: ${p.nome}. Masse proposte: volume × densità del liquido ${String(rho).replace('.', ',')} kg/L × riempimento 80%.${p.fonte ? ' Dati: ' + p.fonte + '.' : ''}</p>`;
  } else if (m === 'GA' && typeof p.pv === 'number') {
    h = `<label>Imballaggio</label>${opzioniImbLiquidi().html}
      <div class="row">${f('vol', 'Volume rilasciato (L)', opzioniImbLiquidi().vol)}${f('area', 'Area bacino (m²)', '', 'placeholder="non confinato"')}</div>
      <div class="row">${f('pv', `Tensione di vapore (kPa) – vuoto = ${String(p.pv).replace('.', ',')} kPa`, '', 'placeholder="da banca dati"')}<div></div></div>
      <p class="small">Sostanza di calcolo: ${p.nome}. Soglie: LC50 ${p.LC50} ppm (ratto, ${p.LC50_t}) · IDLH ${p.IDLH} ppm · LOC ${p.LOC} ppm</p>`;
  } else if (m === 'GA') {
    h = `<label>Imballaggio</label>${opzioniImbLiquidi().html}
      <div class="row">${f('vol', 'Volume rilasciato (L)', opzioniImbLiquidi().vol)}${f('conc', 'Concentrazione HCl (%)', 33, 'min="30" max="38"')}</div>
      <div class="row">${f('pv', 'Tensione di vapore (kPa) – vuoto = da tabella', '', 'placeholder="da tabella"')}${f('area', 'Area bacino (m²)', '', 'placeholder="non confinato"')}</div>
      <p class="small">Soglie: LC50 30 min ${p.LC50} ppm · IDLH ${p.IDLH} ppm · LOC ${p.LOC} ppm</p>`;
  } else if (m === 'GL') {
    h = campiGL(p);
  } else if (cur.classe.startsWith('1.')) {
    h = explFields(m === 'TNT', p);
  } else {
    h = (m === 'NOS' ? `<div class="warn">Voce n.o.s.: per il calcolo delle zone serve il nome tecnico. Con quantità e imballaggio l'app indica quale distanza ERG applicare.</div>` :
      `<p class="small">Per questa voce la prima versione non ha un modello di calcolo: quantità, imballaggio e presenza di incendio servono a scegliere la distanza ERG da applicare.</p>`) + ergFields();
  }
  $('fields').innerHTML = h;
  $('inbox').classList.remove('hide');
  $('meteobox').classList.toggle('hide', m !== 'GA' && m !== 'GL');
  if (p.fonte && m !== 'BL') $('fields').insertAdjacentHTML('beforeend', `<p class="small">Fonti dei dati: ${p.fonte}.</p>`);
  $('calc').classList.remove('hide');
  bindExtra();
  const imb = $('imb');
  if (imb) imb.addEventListener('change', () => { const v = +imb.value; if (v) { if ($('vol')) $('vol').value = v; if ($('massa')) $('massa').value = v; } });
  if (m === 'GL') bindGL();
}

// ---------- gas tossici liquefatti (V2, gruppo 1) ----------
function contenitoriGL() {
  const im = cur.im || 'G', op = [];
  if (im.includes('G')) op.push(['bomb', 'Bombola', 50, 10], ['ton', 'Recipiente a pressione da 1 t (fusto a pressione)', 1000, 10]);
  if (im.includes('T')) op.push(['cist', 'Cisterna / tank-container', 20000, 25]);
  op.push(['altro', 'Altro recipiente a pressione', 1000, 10]);
  return op;
}
function campiGL(p) {
  const op = contenitoriGL(), def = op.find(o => o[0] === 'ton') || op[0];
  return `<label>Recipiente</label><select id="glc">${op.map(([v, t]) => `<option value="${v}" ${v === def[0] ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <label>Scenario di rilascio</label><select id="gls">
      <option value="tot">Rilascio totale in 10 minuti (rottura del recipiente)</option>
      <option value="liq">Perdita da foro in fase liquida (foro sotto il pelo del liquido)</option>
      <option value="gas">Perdita da foro in fase gassosa (valvola o foro in alto)</option></select>
    <div class="row">${f('massa', 'Contenuto del recipiente (kg)', def[2])}<div id="glfw">${f('dforo', 'Diametro del foro (mm)', def[3])}</div></div>
    <p class="small">Sostanza di calcolo: ${p.nome}. Soglie: LC50 ${p.LC50} ppm (ratto, ${p.LC50_t}) · IDLH ${p.IDLH} ppm · LOC ${p.LOC} ppm. La temperatura del contenuto è quella dell'aria indicata nel meteo.</p>`;
}
function bindGL() {
  const c = $('glc'), s = $('gls'), w = $('glfw');
  const agg = () => { w.style.visibility = s.value === 'tot' ? 'hidden' : 'visible'; };
  c.addEventListener('change', () => { const o = contenitoriGL().find(x => x[0] === c.value); if (o) { $('massa').value = o[2]; $('dforo').value = o[3]; } });
  s.addEventListener('change', agg); agg();
}

$('mPre').onclick = () => { meteoUser = false; $('mPre').classList.add('on'); $('mUser').classList.remove('on'); $('meteoUser').classList.add('hide'); };
$('mUser').onclick = () => { meteoUser = true; $('mUser').classList.add('on'); $('mPre').classList.remove('on'); $('meteoUser').classList.remove('hide'); };

const num = id => { const e = $(id); if (!e || e.value === '') return null; const v = parseFloat(e.value.replace(',', '.')); return Number.isFinite(v) ? v : null; };
function interpLog(tab, c) { const k = Object.keys(tab).map(Number).sort((a, b) => a - b); c = Math.min(Math.max(c, k[0]), k[k.length - 1]); for (let i = 0; i < k.length - 1; i++) if (c <= k[i + 1]) { const a = k[i], b = k[i + 1]; return Math.exp(Math.log(tab[a]) + (Math.log(tab[b]) - Math.log(tab[a])) * (c - a) / (b - a)); } return tab[k[k.length - 1]]; }
function interpLin(tab, c) { const k = Object.keys(tab).map(Number).sort((a, b) => a - b); c = Math.min(Math.max(c, k[0]), k[k.length - 1]); for (let i = 0; i < k.length - 1; i++) if (c <= k[i + 1]) { const a = k[i], b = k[i + 1]; return tab[a] + (tab[b] - tab[a]) * (c - a) / (b - a); } return tab[k[k.length - 1]]; }

$('calc').onclick = () => {
  const m = cur.modello, p = DATA.props[cur.u] || {}, sost = `UN ${cur.u} ${cur.psn}`;
  risultati = []; tabSel = 0;
  try {
    if (m === 'PF') {
      const vol = num('vol'); if (!vol || vol <= 0) throw 'Inserire il volume';
      risultati = [M.poolFire({ volume_m3: vol / 1000, densita_rel: p.dens, mburn: p.mburn, dHc_kJkg: p.dHc, area_m2: num('area'), sostanza: sost + ' (' + p.nome + ')' })];
      if (p.fonte) risultati[0].ipotesi.push('Dati della sostanza: ' + p.fonte);
    } else if (m === 'BL') {
      const ms = num('massa'); if (!ms || ms <= 0) throw 'Inserire la massa';
      risultati = [M.bleve({ massa_kg: ms, P_MPa: num('pmpa') || 1.7, dHc_kJkg: p.dHc, sostanza: sost + (p.nome ? ' (' + p.nome + ')' : '') })];
      risultati[0].ipotesi.push(`Calore di combustione ${p.dHc} kJ/kg` + (p.fonte ? ': ' + p.fonte : ''));
    } else if (m === 'GA' && typeof p.pv === 'number') {
      const vol = num('vol'); if (!vol || vol <= 0) throw 'Inserire il volume';
      const pvU = num('pv'), pv = pvU ?? p.pv, Trif = p.pv_T ?? 20;
      const meteo = meteoUser ? [{ stabilita: $('stab').value, u_ms: num('vento') || 1, T_C: num('temp') ?? 20 }] : M.METEO_PREDEFINITO;
      risultati = M.gaussianoMeteo({ volume_m3: vol / 1000, densita_soluzione: p.dens, frazione_tossico: p.frazione || 1, pm: p.pm, Pv_kPa: pv, Pv_rif_T_C: pvU ? undefined : Trif, area_m2: num('area'),
        soglie_ppm: { LC50: p.LC50, IDLH: p.IDLH, LOC: p.LOC }, sostanza: `${sost} (${p.nome})`,
        nota_soglie: `Soglie: LC50 = ${p.LC50} ppm (ratto, ${p.LC50_t}, senza correzione temporale: cautelativo se la durata supera 30 min); IDLH ${p.IDLH} ppm (NIOSH); LOC = IDLH/10 = ${p.LOC} ppm. Tensione di vapore ${pv} kPa ${pvU ? '(inserita dall\'utente)' : '(banca dati, ' + Trif + ' °C)'}${p.frazione ? '; frazione di sostanza tossica ' + p.frazione : ''}. Fonti: ${p.fonte}` }, meteo);
      if (p.avviso) risultati.forEach(r => r.avvisi = [p.avviso, ...(r.avvisi || [])]);
    } else if (m === 'GA') {
      const vol = num('vol'); if (!vol || vol <= 0) throw 'Inserire il volume';
      const c = num('conc') || 33, pvU = num('pv');
      const pv = pvU ?? interpLog(p.pv, c), dens = interpLin(p.dens, c);
      const meteo = meteoUser ? [{ stabilita: $('stab').value, u_ms: num('vento') || 1, T_C: num('temp') ?? 20 }] : M.METEO_PREDEFINITO;
      risultati = M.gaussianoMeteo({ volume_m3: vol / 1000, densita_soluzione: dens, frazione_tossico: c / 100, pm: p.pm, Pv_kPa: +pv.toFixed(2), Pv_rif_T_C: pvU ? undefined : 20, area_m2: num('area'),
        soglie_ppm: { LC50: p.LC50, IDLH: p.IDLH, LOC: p.LOC }, sostanza: `${sost} ${c}%`,
        nota_soglie: `Soglie: LC50 30 min = ${p.LC50} ppm (LC50 ratto 1 h senza correzione temporale, scelta cautelativa); IDLH ${p.IDLH} ppm (NIOSH); LOC = IDLH/10 = ${p.LOC} ppm. Concentrazione ${c}%, densità ${dens.toFixed(3)}, tensione di vapore ${pv.toFixed(2)} kPa ${pvU ? '(inserita dall\'utente)' : '(International Critical Tables, 20 °C, tensione totale: cautelativo)'}` }, meteo);
    } else if (m === 'GL') {
      const ms = num('massa'); if (!ms || ms <= 0) throw 'Inserire il contenuto del recipiente';
      const sc = $('gls').value, dmm = num('dforo') || 10;
      if (sc !== 'tot' && (dmm <= 0 || dmm > 300)) throw 'Diametro del foro fuori campo (1–300 mm)';
      const nomeC = { bomb: 'bombola', ton: 'recipiente a pressione da 1 t', cist: 'cisterna / tank-container', altro: 'recipiente a pressione' }[$('glc').value];
      const meteo = meteoUser ? [{ stabilita: $('stab').value, u_ms: num('vento') || 1, T_C: num('temp') ?? 20 }] : M.METEO_PREDEFINITO;
      risultati = M.gasLiquefattoMeteo({ massa_kg: ms, scenario: sc, d_mm: dmm, h_m: $('glc').value === 'cist' ? 2 : 1, prop: p,
        soglie_ppm: { LC50: p.LC50, IDLH: p.IDLH, LOC: p.LOC }, sostanza: `${sost} (${p.nome})`,
        contenitore: `Recipiente: ${nomeC}, contenuto ${ms} kg di ${p.nome} liquefatto sotto pressione alla temperatura dell'aria`,
        nota_soglie: `Soglie: LC50 = ${p.LC50} ppm (ratto, ${p.LC50_t}, senza correzione temporale); IDLH ${p.IDLH} ppm (NIOSH); LOC = IDLH/10 = ${p.LOC} ppm. Fonti: ${p.fonte}` }, meteo);
      if (p.avviso) risultati.forEach(r => r.avvisi = [p.avviso, ...(r.avvisi || [])]);
    } else if (m === 'TNT') {
      const { nem, origine } = leggiNEM();
      const fatt = num('fatt') || p.fattore, imbx = $('imbx').value;
      const r = M.tnt({ neq_kg: nem, fattore_tnt: fatt, fonte_fattore: fatt !== p.fattore ? 'inserito dall\'utente' : p.fonte, sostanza: sost });
      r.ipotesi.unshift(`Massa netta esplosiva: ${origine}`, `Imballaggio / configurazione: ${NOMI_IMB[imbx]} (effetto di confinamento e frammenti del contenitore non calcolati); si assume la detonazione dell'intero contenuto`);
      r.avvisi = [avvisoEsplosivi()];
      r.ergCaso = casoERGesplosivi(imbx);
      risultati = [r];
    } else {
      let ipo, caso;
      if (cur.classe.startsWith('1.')) {
        const { origine } = leggiNEM(); const imbx = $('imbx').value;
        caso = casoERGesplosivi(imbx);
        ipo = [`Massa netta esplosiva: ${origine}`, `Imballaggio / configurazione: ${NOMI_IMB[imbx]}`, caso.motivo, `Divisione ${cur.classe}: nessun modello di calcolo nella prima versione; distanze ERG 2024 Guida ${cur.guida}`];
      } else {
        const q = num('qta'); if (!q || q <= 0) throw 'Inserire la quantità';
        const imbe = $('imbe').value;
        caso = casoERGgenerico(imbe, q);
        const NOTE_UN = { '1791': 'Attenzione: a contatto con acidi l\'ipoclorito sviluppa cloro; scenario di dispersione del cloro non calcolato (versione successiva)' };
        ipo = [...(NOTE_UN[cur.u] ? [NOTE_UN[cur.u]] : []), `${cur.classe.startsWith('2') ? 'Capacità del recipiente' : 'Quantità coinvolta'}: ${q} ${unitaQ()}${$('stato') ? ' (' + ($('stato').value === 'sol' ? 'solido' : 'liquido') + ')' : ''}; imballaggio: ${NOMI_IMB[imbe]}`, caso.motivo, `Nessun modello di calcolo per questa voce nella prima versione: distanze ERG 2024 Guida ${cur.guida}`];
      }
      const avvisiE = [];
      if (cur.classe.startsWith('1.')) {
        const { nem } = leggiNEM();
        avvisiE.push(`Divisione ${cur.classe}: le distanze ERG sono fisse e NON variano con la massa netta esplosiva (qui ${nem} kg) né con l'imballaggio. Dipendono solo dalla situazione indicata (misura immediata, parte consistente del carico, incendio). Il calcolo in funzione della NEM per le divisioni 1.2 e 1.3 è previsto nella versione successiva.`);
        avvisiE.push(avvisoEsplosivi());
      }
      risultati = [{ scenario: 'Distanze ERG 2024', sostanza: sost, soloERG: true, ergCaso: caso, ipotesi: ipo, avvisi: avvisiE }];
    }
  } catch (e) { alertBox(String(e)); return; }
  mostra();
};


function avvisoEsplosivi() {
  return "Esplosivi: frammenti, effetto del contenitore e propagazione tra colli o container NON sono calcolati in questa versione. Per frammenti e proiezioni valgono le distanze ERG (Guida 112: fino a 1600 m e oltre se il fuoco raggiunge il carico).";
}
// quale distanza ERG applicare
function casoERGesplosivi(imbx) {
  const g = DATA.guide[cur.guida], fuoco = $('fuoco') && $('fuoco').checked, parte = $('parte') && $('parte').checked;
  if (fuoco) return { chiave: 'incendio', dist: g.incendio_m, etichetta: 'Incendio che coinvolge il carico', motivo: 'Incendio in atto o che può raggiungere il carico (indicato dall\'utente)' };
  if (parte) return { chiave: 'grande', dist: g.evac_grande_m, etichetta: 'Parte consistente del carico coinvolta (ERG "Large Spill")', motivo: 'Parte consistente del carico coinvolta, senza incendio (indicato dall\'utente)' };
  return { chiave: 'iso', dist: g.isolamento_m, etichetta: 'Colli danneggiati o dispersi (misura immediata)', motivo: 'Misura immediata: nessun incendio e nessuna parte consistente del carico indicata' };
}
function casoERGgenerico(imbe, q) {
  const g = DATA.guide[cur.guida], fuoco = $('fuoco') && $('fuoco').checked;
  if (cur.tih && !(fuoco && g.incendio_m && imbe !== 'collo' && imbe !== 'fusto')) { const c = casoTIH(imbe, q); if (c) return c; }
  const isoNum = isoNumero(g);
  if (fuoco && g.incendio_m && imbe !== 'collo' && imbe !== 'fusto')
    return { chiave: 'incendio', dist: g.incendio_m, etichetta: 'Incendio (cisterna o carico)', motivo: 'Incendio con cisterna, IBC o carico coinvolti: distanza ERG per incendio' };
  const sp = tipoSpandimento(imbe, q), grande = sp.grande;
  if (grande && g.evac_grande_m)
    return { chiave: 'grande', dist: g.evac_grande_m, dir: g.evac_grande_dir, etichetta: 'Grande spandimento', motivo: sp.motivo };
  return { chiave: 'iso', dist: isoNum, etichetta: 'Isolamento iniziale', motivo: sp.motivo + (grande ? '; per questa guida l\'ERG indica di aumentare la distanza sottovento se necessario' : '') + (fuoco && !grande ? ' (incendio di collo singolo: valutare caso per caso)' : '') };
}

function alertBox(t) { $('idbox').insertAdjacentHTML('beforeend', `<div class="warn">${t}</div>`); }

// stato fisico: scelto dall'utente; valore iniziale dal nome IMDG
const SOLIDO_RE = /SOLID|ASBESTOS|POWDER|GRANUL|FLAKES|PELLET|CHIPS|DUST/;
function statoSolido() { const e = $('stato'); return e ? e.value === 'sol' : (cur.st ? cur.st !== 'l' : SOLIDO_RE.test(cur.psn)); }
const unitaQ = () => statoSolido() ? 'kg' : 'L';
// Piccolo o grande spandimento. Liquidi e gas: soglia ERG 208 L. Solidi (criterio approvato da Luca 18/11/2026):
// con densità apparente -> volume confrontato con 208 L; senza -> criterio per imballaggio (ERG + IMDG 1.2.1 e 6.1.4)
function tipoSpandimento(imbe, q) {
  if (!statoSolido() || cur.classe.startsWith('2')) {
    const grande = q > 208 && imbe !== 'collo';
    return { grande, motivo: grande ? 'Quantità > 208 L: grande spandimento (definizione ERG)' : 'Quantità ≤ 208 L o collo singolo: piccolo spandimento (definizione ERG)' };
  }
  const rho = num('rhoapp'), SL = cur.st === 'o' ? 'Oggetti' : 'Solido';
  if (rho && rho > 0) {
    const V = q / rho, grande = V > 208;
    return { grande, motivo: `${SL}: ${q} kg con densità apparente ${rho} kg/L = ${V.toFixed(0)} L ${grande ? '>' : '≤'} 208 L: ${grande ? 'grande' : 'piccolo'} spandimento (soglia ERG in volume)` };
  }
  const n = Math.max(1, Math.round(num('ncolli2') || 1)), pp = $('piccolaPerdita') && $('piccolaPerdita').checked;
  const CRIT = ' (criterio per imballaggio per i solidi: ERG, descrizione di piccolo e grande spandimento; IMDG 42-24 6.1.4, massa netta massima del collo 400 kg, e 1.2.1, grandi imballaggi oltre 400 kg o 450 L)';
  const singolo = imbe === 'collo' || imbe === 'fusto' || (imbe === 'altro' && q <= 400);
  if (pp && !singolo) return { grande: false, motivo: SL + ': piccola perdita da un grande imballaggio: piccolo spandimento' + CRIT };
  if (singolo && n === 1 && q <= 400) return { grande: false, motivo: `${SL}: un solo collo (${q} kg ≤ 400 kg): piccolo spandimento` + CRIT };
  if (singolo && n === 1) return { grande: true, motivo: `${SL}: ${q} kg in un solo imballaggio, oltre i 400 kg di un collo: grande spandimento` + CRIT };
  if (singolo) return { grande: true, motivo: `${SL}: ${n} colli coinvolti: grande spandimento (molti colli piccoli)` + CRIT };
  if (imbe === 'cont') return { grande: true, motivo: SL + ': container con più colli: grande spandimento (molti colli)' + CRIT };
  return { grande: true, motivo: `${SL}: ${{ lp: 'grande imballaggio', bk: 'contenitore per rinfuse', ibc: 'IBC', cist: 'cisterna / tank-container', cont: 'container con più colli', altro: 'imballaggio oltre 400 kg' }[imbe] || imbe}: grande spandimento (grande imballaggio)` + CRIT };
}
const notaSolidi = () => '';
function isoNumero(g) { return typeof g.isolamento_m === 'number' ? g.isolamento_m : (statoSolido() ? 25 : 50); }
const isoTxt = g => typeof g.isolamento_m === 'number' ? g.isolamento_m + ' m' : String(g.isolamento_m).replace(/(\d+) liquidi/, '$1 m liquidi').replace(/(\d+) solidi/, '$1 m solidi');
const fmt = v => v === null ? 'non raggiunta' : !Number.isFinite(v) ? `> ${((risultati[tabSel] && risultati[tabSel].oltre_m) || 50000) / 1000} km` : v + ' m';

function mostra() {
  $('out').style.display = 'block';
  $('tabs').innerHTML = risultati.length > 1 ? risultati.map((r, i) => `<button class="chip ${i === tabSel ? 'on' : ''}" data-i="${i}" type="button">${r.meteo.stabilita}${r.meteo.vento_ms}</button>`).join('') : '';
  $('tabs').querySelectorAll('button').forEach(b => b.onclick = () => { tabSel = +b.dataset.i; mostra(); });
  const r = risultati[tabSel];
  const g = DATA.guide[cur.guida];
  disegna(r, g);
  // tabella
  let t = '<table>';
  if (!r.soloERG) {
    const zl = { I: ['Zona I – sicuro impatto (elevata letalità)', 'var(--z1)'], II: ['Zona II – danno (lesioni irreversibili)', 'var(--z2)'], III: ['Zona III – attenzione (lesioni reversibili)', 'var(--z3)'] };
    for (const z of ['I', 'II', 'III']) t += `<tr><td><span class="sw" style="background:${zl[z][1]}"></span>${zl[z][0]}</td><td class="n">${fmt(r.zone_m[z])}</td></tr>`;
    t += '</table><p class="small" style="margin:10px 0 4px">Dettaglio soglie D.M. 9/5/2001</p><table>';
    for (const [k, v] of Object.entries(r.distanze_m)) t += `<tr><td>${k.replace(/_/g, ' ')}</td><td class="n">${fmt(v)}</td></tr>`;
    t += '</table><p class="small" style="margin:10px 0 4px">Dati di calcolo</p><table>';
    for (const [k, v] of Object.entries(r.dettagli || {})) t += `<tr><td>${k.replace(/_/g, ' ')}</td><td class="n">${v}</td></tr>`;
  } else {
    const c = r.ergCaso;
    t += `<tr><td><span class="sw" style="background:var(--z2)"></span><b>Distanza da applicare</b><br><span class="small">${c.etichetta}</span></td><td class="n">${c.dist} m${c.prot_km ? '<br><span class="small">in tutte le direzioni</span>' : (c.dir ? ' ' + c.dir : '')}</td></tr>`;
    if (c.prot_km) t += `<tr><td><span class="sw" style="background:var(--z3)"></span><b>Poi proteggere sottovento</b><br><span class="small">${c.per === 'notte' ? 'di notte' : 'di giorno'}</span></td><td class="n">${String(c.prot_km).replace('.', ',')}${c.plus ? '+' : ''} km</td></tr>`;
    t += `<tr><td colspan="2" class="small">${c.motivo}</td></tr>`;
  }
  $('tab').innerHTML = t + '</table>';
  $('ip').innerHTML = r.ipotesi.map(x => `<li>${x}</li>`).join('') + (r.meteo ? `<li>Meteo ${r.meteo.origine}: ${r.meteo.stabilita}, ${r.meteo.vento_ms} m/s, ${r.meteo.temperatura_C} °C</li>` : '');
  $('avv').innerHTML = (r.avvisi || []).map(a => `<div class="warn">${a}</div>`).join('');
  $('ergbox').innerHTML = ergHTML(g, r);
  $('out').scrollIntoView({ behavior: 'smooth' });
}


// Etichette ERG per tipo di guida: per gli esplosivi "Large Spill" non è uno spandimento di liquido
function ergRighe(g, guida) {
  guida = +guida;
  if (guida === 112 || guida === 114) {
    const r = [
      ['Colli danneggiati o dispersi (misura immediata)', `isolare ${g.isolamento_m} m in tutte le direzioni`],
      ['Parte consistente del carico coinvolta, senza incendio (ERG "Large Spill")', `valutare evacuazione ${g.evac_grande_m} m in tutte le direzioni`],
      ['Incendio che coinvolge il veicolo o il carico', `isolare ed evacuare ${g.incendio_m} m, anche i soccorritori`]
    ];
    if (guida === 112) r.push(['Frammenti', 'proiezione fino a 1600 m o oltre se il fuoco raggiunge il carico']);
    if (guida === 114) r.push(['Solo colli 1.4S minacciati dal fuoco', 'isolare almeno 15 m']);
    return r;
  }
  return [
    ...(cur.tih ? righeT1() : []),
    ['Isolamento iniziale (misura immediata)', isoTxt(g)],
    ['Grande spandimento', g.evac_grande_m ? `${g.evac_grande_m} m ${g.evac_grande_dir}` : (g.evac_grande_dir || '–')],
    ['Incendio (cisterna o carico)', g.incendio_m ? g.incendio_m + ' m' : '–']
  ];
}
function ergHTML(g, r) {
  const rows = ergRighe(g, cur.guida).map(([a, b]) => `<tr><td>${a}</td><td class="v">${b}</td></tr>`).join('');
  let note = '';
  if (+cur.guida === 112 || +cur.guida === 114)
    note = `<p class="small">Per gli esplosivi l'ERG usa la voce "Large Spill" senza definirla in quantità: si intende un incidente in cui una parte consistente del carico è danneggiata o dispersa, senza incendio. Le zone D.M. calcolate dall'app riguardano solo la sovrappressione: frammenti e proiezioni sono coperti dalle distanze ERG.</p>`;
  else if (g.evac_grande_m)
    note = `<p class="small">"Grande spandimento": l'ERG definisce piccoli i rilasci fino a 208 L e grandi quelli superiori (definizione riportata per la Tabella 1).${statoSolido() ? ' Per i solidi l\'app usa il criterio per imballaggio o, se indicata, la densità apparente (vedi ipotesi).' : ''}</p>`;
  if (g.incendio_nota && !(+cur.guida === 112 || +cur.guida === 114)) note += `<p class="small">${g.incendio_nota}</p>`;
  if (ONU.t3[cur.u]) note += tabella3HTML();
  if (cur.tih) note += `<p class="small">Tabella 1: piccolo spandimento fino a 208 L (collo piccolo o piccola perdita da un grande imballaggio); grande spandimento oltre 208 L (grande imballaggio o più colli piccoli).${statoSolido() ? ' Per i solidi l\'app usa il criterio per imballaggio o, se indicata, la densità apparente (vedi ipotesi).' : ''} La distanza di protezione è sottovento; nello schema e sulla mappa è disegnata come cerchio (inviluppo cautelativo per direzione del vento incerta). "+": la distanza può essere maggiore in certe condizioni atmosferiche.</p>`;
  if (g.automatica) note += `<p class="small">Valori letti automaticamente dalla guida ERG.</p>`;
  if (g.testo_en) note += `<details class="small"><summary>Testo originale ERG (Evacuation)</summary><p>${g.testo_en}</p></details>`;
  return `<table><tr><td>Guida ${cur.guida}</td><td class="v small">${g.titolo_it || g.titolo}</td></tr>${rows}</table>${note}${cur.modello === 'BL' ? bleveERG(r) : ''}`;
}

function bleveERG(r) {
  const rows = DATA.bleve_erg.righe, m = r.dettagli ? +$('massa').value : 0;
  const row = rows.reduce((a, b) => Math.abs(b[3] - m) < Math.abs(a[3] - m) ? b : a);
  return `<p class="small">Tabella BLEVE ERG (riga più vicina: ${row[0]} L, ${row[3]} kg): raggio fireball ${row[6]} m; distanza di risposta ${row[7]} m; evacuazione minima ${row[8]} m, preferita ${row[9]} m (frammenti).</p>`;
}

function disegna(r, g) {
  const W = 340, C = W / 2;
  let cer = [];
  if (!r.soloERG) {
    if (Number.isFinite(r.zone_m.III) && r.zone_m.III) cer.push([r.zone_m.III, 'var(--z3)', 'III']);
    if (Number.isFinite(r.zone_m.II) && r.zone_m.II) cer.push([r.zone_m.II, 'var(--z2)', 'II']);
    if (Number.isFinite(r.zone_m.I) && r.zone_m.I) cer.push([r.zone_m.I, 'var(--z1)', 'I']);
  }
  const iso = isoNumero(g);
  if (r.soloERG && r.ergCaso && r.ergCaso.prot_km) cer.push([r.ergCaso.prot_km * 1000, 'var(--z3)', 'PROT']);
  if (r.soloERG && r.ergCaso && r.ergCaso.dist !== iso) cer.push([r.ergCaso.dist, 'var(--z2)', 'ERG']);
  const ergApp = !r.soloERG && r.ergCaso ? r.ergCaso.dist : 0;
  const rmax = Math.max(iso, ergApp, ...cer.map(c => c[0]));
  const sc = (C - 14) / rmax;
  let s = `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Zone di danno in scala">`;
  for (const [rr, col] of cer) s += `<circle cx="${C}" cy="${C}" r="${rr * sc}" fill="${col}" fill-opacity=".55" stroke="${col}"/>`;
  s += `<circle cx="${C}" cy="${C}" r="${iso * sc}" fill="none" stroke="var(--erg)" stroke-width="1.6" stroke-dasharray="5 4"/>`;
  if (ergApp) s += `<circle cx="${C}" cy="${C}" r="${ergApp * sc}" fill="none" stroke="var(--erg)" stroke-width="1.2" stroke-dasharray="2 4"/>`;
  s += `<circle cx="${C}" cy="${C}" r="3" fill="var(--ink)"/>`;
  // scala
  const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(v => v * sc > 50) || 5000;
  s += `<line x1="12" y1="${W - 14}" x2="${12 + nice * sc}" y2="${W - 14}" stroke="var(--ink)" stroke-width="2"/><text x="12" y="${W - 20}" font-size="11" fill="var(--ink)">${nice} m</text>`;
  if (r.meteo) s += `<text x="${W - 12}" y="18" font-size="11" text-anchor="end" fill="var(--ink)">vento → sottovento</text>`;
  $('graf').innerHTML = s + '</svg>';
  $('grafnote').textContent = (r.meteo ? 'Distanze sottovento rappresentate come cerchi (inviluppo cautelativo per direzione del vento incerta). ' : '') + 'Tratteggio: isolamento iniziale ERG ' + iso + ' m. ' + (ergApp ? 'Puntinato: distanza ERG applicabile (' + r.ergCaso.etichetta + ') ' + ergApp + ' m. ' : '') + (r.soloERG ? 'Area colorata: distanza ERG da applicare' + (r.ergCaso && r.ergCaso.prot_km ? ` (arancio: isolamento ${r.ergCaso.dist} m; giallo: protezione sottovento ${String(r.ergCaso.prot_km).replace('.', ',')} km, disegnata come cerchio). ` : '. ') : '') + (cer.length < 3 && !r.soloERG ? 'Le zone non raggiunte non sono disegnate.' : '');
}

$('copy').onclick = async () => {
  const r = risultati[tabSel], g = DATA.guide[cur.guida];
  const oggi = new Date().toLocaleString('it-IT');
  let t = `STIMA AREE DI DANNO – parere tecnico (non atto amministrativo)\n${oggi}\n\n${r.sostanza}\n${classif()} · ERG Guida ${cur.guida}\nScenario: ${r.scenario}\n\n`;
  if (!r.soloERG) { t += `Zona I (elevata letalità): ${fmt(r.zone_m.I)}\nZona II (lesioni irreversibili): ${fmt(r.zone_m.II)}\nZona III (lesioni reversibili): ${fmt(r.zone_m.III)}\n\nSoglie D.M. 9/5/2001:\n`; for (const [k, v] of Object.entries(r.distanze_m)) t += `- ${k.replace(/_/g, ' ')}: ${fmt(v)}\n`; }
  if (r.ergCaso) t += `\nDistanza ERG da applicare: ${r.ergCaso.dist} m${r.ergCaso.dir ? ' ' + r.ergCaso.dir : ''} – ${r.ergCaso.etichetta} (${r.ergCaso.motivo})\n`;
  t += `\nIpotesi:\n${r.ipotesi.map(x => '- ' + x).join('\n')}\n`;
  if (r.meteo) t += `- Meteo ${r.meteo.origine}: ${r.meteo.stabilita}, ${r.meteo.vento_ms} m/s, ${r.meteo.temperatura_C} °C\n`;
  if (r.avvisi && r.avvisi.length) t += `\nAvvisi:\n${r.avvisi.map(x => '- ' + x).join('\n')}\n`;
  t += `\nERG 2024 Guida ${cur.guida} (${g.titolo_it || g.titolo}):\n${ergRighe(g, cur.guida).map(([a, b]) => '- ' + a + ': ' + b).join('\n')}\n\nRiferimenti: D.M. 9/5/2001 Tab. 2; Linee guida PEE (Dir. 7/12/2022); IMDG Code 42-24; ERG 2024.\n`;
  try { await navigator.clipboard.writeText(t); $('copymsg').textContent = 'Report copiato negli appunti.'; }
  catch (e) { $('copymsg').innerHTML = 'Copia non consentita: seleziona il testo qui sotto.<textarea style="width:100%;height:220px;margin-top:6px;font-size:12px">' + t.replace(/</g, '&lt;') + '</textarea>'; }
};
