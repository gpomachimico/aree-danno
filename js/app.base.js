

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

const NOMI_MOD = { PF: 'Pool fire', BL: 'BLEVE / fireball', GA: 'Dispersione tossica', GL: 'Gas tossico liquefatto', JF: 'Jet fire', FF: 'Flash fire', VCE: 'Esplosione da nube (VCE)', TNT: 'Esplosione (TNT equivalente)', ERG: 'Solo distanze ERG', NOS: 'Nome tecnico necessario' };

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
    ${/^1\.2/.test(cur.classe) ? `<div class="row">${f('nemart', 'NEM del singolo articolo (kg) – facoltativa', '', 'placeholder="non nota"')}<div></div></div><p class="small">Serve a distinguere HD 1.2.1 (oltre 0,73 kg per articolo) da HD 1.2.2 per le distanze DoD; se non è nota si usa HD 1.2.1 (cautelativo).</p>` : ''}
    ${/^1\.[15]/.test(cur.classe) ? chk('calibro', 'Bombe o proiettili di calibro ≥ 127 mm') + chk('ferro', 'Carico su carro ferroviario') : ''}
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
    else if (CIST_SOLO_TERRA[cur.u]) op.push(['cist', CIST_SOLO_TERRA[cur.u]]);
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
  const esclusi = gas ? (ok('T') || CIST_SOLO_TERRA[cur.u] ? '' : 'cisterne') : o ? '' : [!ok('I') && 'IBC', !ok('T') && 'cisterne mobili', !ok('L') && 'grandi imballaggi'].filter(Boolean).join(', ');
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
      <p class="small">Sostanza di calcolo: ${p.nome}</p>${campiFumi(p)}`;
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
  } else if (m === 'JF' || m === 'FF' || m === 'VCE') {
    h = campiGF(p, m);
  } else if (cur.classe.startsWith('1.')) {
    h = explFields(m === 'TNT', p);
  } else {
    h = (m === 'NOS' ? `<div class="warn">Voce n.o.s.: per il calcolo delle zone serve il nome tecnico. Con quantità e imballaggio l'app indica quale distanza ERG applicare.</div>` :
      `<p class="small">Per questa voce la prima versione non ha un modello di calcolo: quantità, imballaggio e presenza di incendio servono a scegliere la distanza ERG da applicare.</p>`) + ergFields();
  }
  $('fields').innerHTML = h;
  $('inbox').classList.remove('hide');
  $('meteobox').classList.toggle('hide', !(['GA', 'GL', 'JF', 'FF', 'VCE'].includes(m) || (m === 'PF' && p.fumi && p.fumi.tipo !== 'qual') || (cur.tih && !['PF', 'BL', 'TNT'].includes(m))));
  if (p.fonte && m !== 'BL') $('fields').insertAdjacentHTML('beforeend', `<p class="small">Fonti dei dati: ${p.fonte}.</p>`);
  $('calc').classList.remove('hide');
  bindExtra();
  const imb = $('imb');
  if (imb) imb.addEventListener('change', () => { const v = +imb.value; if (v) { if ($('vol')) $('vol').value = v; if ($('massa')) $('massa').value = v; } });
  if (m === 'GL') bindGL();
  if (m === 'JF' || m === 'FF' || m === 'VCE') bindGF(p);
}

// ---------- gas tossici liquefatti (V2, gruppo 1) ----------
// cisterne ammesse solo nel trasporto terrestre (scelta di Luca, 19/11/2026)
const CIST_SOLO_TERRA = { '1050': 'Cisterna stradale o ferroviaria (solo ADR/RID: l\'IMDG non ammette cisterne mobili per UN 1050)' };
function contenitoriGL() {
  const im = cur.im || 'G', op = [];
  if (im.includes('G')) op.push(['bomb', 'Bombola', 50, 10], ['ton', 'Recipiente a pressione da 1 t (fusto a pressione)', 1000, 10]);
  if (im.includes('T')) op.push(['cist', 'Cisterna / tank-container', 20000, 25]);
  else if (CIST_SOLO_TERRA[cur.u]) op.push(['cist', CIST_SOLO_TERRA[cur.u], 20000, 25]);
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

// ---------- esplosivi: distanze DoD in funzione della NEM ----------
function qdHTML(q, esc = x => x) {
  return `<p class="small">NEM considerata: ${String(q.nem_kg).replace('.', ',')} kg.</p><table>${q.righe.map(r => `<tr><td>${esc(r.nome)}<br><span class="small">${esc(r.descr)}</span></td><td class="n">${r.m} m</td></tr>`).join('')}</table>` +
    `<ul class="ip">${q.ipotesi.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${q.avvisi.map(x => `<div class="warn">${esc(x)}</div>`).join('')}`;
}
function qdTesto(q) {
  if (!q) return '';
  return `\nDISTANZE IN FUNZIONE DELLA NEM (DoD) – NEM ${q.nem_kg} kg\n${q.righe.map(r => `- ${r.nome}: ${r.m} m (${r.descr})`).join('\n')}\n${q.ipotesi.map(x => '  · ' + x).join('\n')}\n${q.avvisi.map(x => '  ! ' + x).join('\n')}\n`;
}

// ---------- fumi tossici di combustione ----------
function campiFumi(p) {
  const fu = p.fumi; if (!fu) return '';
  if (fu.tipo === 'zolfo') return `<div class="row">${f('zolfo', 'Zolfo nel prodotto (% in massa) – facoltativo', '', 'placeholder="non noto"')}</div>
    <p class="small">Con il tenore di zolfo l'app calcola anche l'anidride solforosa nei fumi (valori tipici: ${fu.tipico}). Il meteo serve per i fumi.</p>`;
  if (fu.tipo === 'calc') return `<p class="small">I fumi contengono ${fu.specie}: l'app ne calcola la dispersione. Il meteo serve per i fumi.</p>`;
  return `<p class="small">Fumi di combustione: ${fu.specie} (valutazione solo qualitativa).</p>`;
}
const STAZ = { PF: 'pool fire', JF: 'jet fire' };
// aggiunge a ogni risultato la valutazione dei fumi tossici; extra = { kgs, Qc_kW } per gli incendi stazionari, { massa_kg } per gli altri
function aggiungiFumi(m, p, ris, meteo) {
  const fu = p.fumi; if (!fu) return;
  const rif = fu.rif ? DATA.props[fu.rif] : null;
  for (const r of ris) {
    const o = { specie: fu.specie, tipo: fu.tipo, ipotesi: [] };
    if (fu.tipo === 'qual') { o.esito = 'qualitativa'; o.testo = fu.motivo; r.fumi = o; continue; }
    let resa = fu.resa, origine = fu.reazione;
    if (fu.tipo === 'zolfo') {
      const S = num('zolfo');
      if (!(S > 0)) { o.esito = 'non eseguita'; o.testo = `Valutazione non eseguita: il tenore di zolfo del ${fu.nomeProd} non è stato indicato (valori tipici: ${fu.tipico}). Lo zolfo brucia ad anidride solforosa: inserendo il tenore l'app calcola la dispersione dell'SO2.`; r.fumi = o; continue; }
      if (S > 6) throw 'Tenore di zolfo fuori campo (0–6%)';
      resa = S / 100 * 64.064 / 32.06;
      origine = `Zolfo ${String(S).replace('.', ',')}% in massa (dato inserito dall'utente), convertito tutto in SO2: ${resa.toFixed(4).replace('.', ',')} kg di SO2 per kg bruciato (S + O2 → SO2, cautelativo)`;
    }
    const sogl = { LC50: rif.LC50, IDLH: rif.IDLH, LOC: rif.LOC };
    o.soglie = sogl;
    o.ipotesi.push(origine, `Soglie: LC50 ${rif.LC50} ppm (ratto, ${rif.LC50_t}), IDLH ${rif.IDLH} ppm, LOC ${rif.LOC} ppm (stessi valori e fonti delle voci UN ${fu.rif})`);
    if (STAZ[m]) {
      const kgs = m === 'PF' ? r.dettagli.HRR_MW * 1000 / p.dHc : r.dettagli.portata_kg_s;
      const frad = m === 'PF' ? 0.3 : r.dettagli.frazione_irraggiata, Qc = (1 - frad) * kgs * p.dHc;
      o.esito = 'calcolata';
      o.portata_kgs = +(resa * kgs).toFixed(4);
      o.righe = M.fumiIncendio({ portata_kgs: resa * kgs, Qc_kW: Qc, pm: fu.pm, soglie_ppm: sogl, meteo });
      o.ipotesi.push(
        `Incendio stazionario (${STAZ[m]}): ${(kgs).toFixed(2).replace('.', ',')} kg/s di combustibile bruciato, ${o.portata_kgs.toString().replace('.', ',')} kg/s di ${fu.specie.split(' (')[0]} emessi per tutta la durata dell'incendio`,
        `Pennacchio caldo: calore convettivo ${(Qc / 1000).toFixed(1).replace('.', ',')} MW (${m === 'PF' ? '70% della potenza, il resto irraggiato' : 'potenza meno la quota irraggiata'}); innalzamento di Briggs (formule del modello EPA ISC3: graduale 1,6·F^(1/3)·x^(2/3)/u, finale limitato dalla stabilità con dθ/dz 0,020 K/m in E e 0,035 K/m in F)`,
        'Dispersione gaussiana con coefficienti di Briggs (rurale), concentrazione al suolo sull\'asse del pennacchio; vento a 10 m usato anche alla quota del pennacchio',
        'Colonna "senza innalzamento": stesso calcolo con emissione al suolo. È il limite cautelativo quando il pennacchio non sale (incendio che si spegne o cova, vento forte che abbatte i fumi, edifici vicini): va considerata soprattutto vicino all\'incendio e a fine evento'
      );
    } else {
      const mb = m === 'BL' ? num('massa') : m === 'VCE' ? r.dettagli.massa_infiammabile_kg
        : m === 'FF' ? ($('gls').value === 'tot' ? r.dettagli.massa_kg : Math.min(r.dettagli.massa_kg, r.interno.Q * (Number.isFinite(r.distanze_m.elevata_letalita) ? r.distanze_m.elevata_letalita || 0 : 0) / r.meteo.vento_ms)) : null;
      o.esito = 'non eseguita';
      const nomi = { BL: 'Nel BLEVE con fireball', FF: 'Nel flash fire', VCE: 'Nell\'esplosione da nube' };
      o.testo = `${nomi[m] || 'In questo scenario'} la combustione dura pochi secondi e i prodotti salgono con la nube calda: il pennacchio non è stazionario e il modello di dispersione dell'app non si può applicare in modo attendibile. Valutazione quantitativa non eseguita.` +
        (mb ? ` Si formano circa ${Math.round(resa * mb)} kg di ${fu.specie.split(' (')[0]} (${origine.split(':')[0]}).` : '') +
        ' Indicazione qualitativa: mantenere le persone fuori dalla nube di fumo sottovento, che ricade al suolo man mano che si raffredda e si diluisce.';
    }
    r.fumi = o;
  }
}
function fumiHTML(fu, esc = x => x) {
  if (!fu) return '';
  let h = `<p><b>${esc(fu.specie)}</b> – valutazione ${esc(fu.esito)}.</p>`;
  if (fu.testo) h += `<p class="small">${esc(fu.testo)}</p>`;
  if (fu.righe) {
    const k = ['LC50', 'IDLH', 'LOC'];
    h += `<table class="t3"><tr><th>Meteo</th><th>Pennacchio</th>${k.map(x => `<th>${x} ${fu.soglie[x]} ppm</th>`).join('')}</tr>` +
      fu.righe.map(r => `<tr><td rowspan="2">${r.meteo}</td><td>con innalzamento (finale ${r.dh_finale_m} m)</td>${k.map(x => `<td class="n">${fmtF(r.con[x])}</td>`).join('')}</tr><tr><td>senza innalzamento</td>${k.map(x => `<td class="n">${fmtF(r.senza[x])}</td>`).join('')}</tr>`).join('') + '</table>';
    h += `<p class="small">Distanze sottovento dal punto di incendio. "Non raggiunta": a terra la concentrazione resta sotto la soglia.</p>`;
  }
  if (fu.ipotesi && fu.ipotesi.length) h += `<ul class="ip">${fu.ipotesi.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return h;
}
const fmtF = v => v === null ? 'non raggiunta' : !Number.isFinite(v) ? '> 10 km' : v + ' m';
function fumiTesto(fu) {
  if (!fu) return '';
  let t = `\nFUMI TOSSICI DI COMBUSTIONE – ${fu.specie}: valutazione ${fu.esito}\n`;
  if (fu.testo) t += fu.testo + '\n';
  if (fu.righe) for (const r of fu.righe) t += `- ${r.meteo} con innalzamento: LC50 ${fmtF(r.con.LC50)}, IDLH ${fmtF(r.con.IDLH)}, LOC ${fmtF(r.con.LOC)}; senza innalzamento: LC50 ${fmtF(r.senza.LC50)}, IDLH ${fmtF(r.senza.IDLH)}, LOC ${fmtF(r.senza.LOC)}\n`;
  if (fu.ipotesi) t += fu.ipotesi.map(x => '  · ' + x).join('\n') + '\n';
  return t;
}

// ---------- gas infiammabili (V2, gruppo 2) ----------
function contenitoriGF(p) {
  const im = cur.im || 'G';
  return p.contenitori.filter(c => c[0] !== 'cist' || im.includes('T'));
}
const massaCompresso = (p, V_L, P_bar) => P_bar * 1e5 * (V_L / 1000) * (p.pm / 1000) / (interpLin(p.Z, P_bar) * 8.314462618 * 293.15);
function campiGF(p, m) {
  const op = contenitoriGF(p), def = p.compresso ? op[1] : (op.find(o => o[0] === 'ton') || op[0]);
  const sc = [m !== 'JF' && ['tot', 'Rilascio totale in 10 minuti (rottura del recipiente)'],
    !p.compresso && ['liq', 'Perdita da foro in fase liquida (foro sotto il pelo del liquido)'],
    ['gas', p.compresso ? 'Perdita da foro o da valvola' : 'Perdita da foro in fase gassosa (valvola o foro in alto)']].filter(Boolean);
  const q = p.disciolto
    ? `<div class="row">${f('massa', 'Acetilene contenuto (kg)', def[2])}${f('pbar', 'Pressione (bar)', p.Pdef)}</div><p class="small">Gas disciolto: la massa di acetilene è indicata sulla bombola o dal fornitore (circa 6–8 kg per una bombola da 40–50 L); la pressione serve per la portata dal foro.</p>`
    : p.compresso
    ? `<div class="row">${f('capL', 'Capacità del recipiente (L)', def[2])}${f('pbar', 'Pressione (bar)', p.Pdef)}</div><p class="small" id="gfmassa"></p>`
    : `<div class="row">${f('massa', 'Contenuto del recipiente (kg)', def[2])}</div>`;
  const nota = { JF: 'Soglie: irraggiamento stazionario 12,5 · 7 · 5 · 3 kW/m² (D.M. 9/5/2001). Del meteo si usa solo la temperatura.',
    FF: `Soglie: LFL ${String(p.LFL).replace('.', ',')}% (elevata letalità) e ½ LFL (inizio letalità), D.M. 9/5/2001.`,
    VCE: 'Soglie: sovrappressione 0,3 (0,6 in spazi aperti) · 0,14 · 0,07 · 0,03 bar (D.M. 9/5/2001).' }[m];
  return `<label>Recipiente</label><select id="glc">${op.map(([v, t]) => `<option value="${v}" ${v === def[0] ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <label>Scenario di rilascio</label><select id="gls">${sc.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
    ${q}<div class="row"><div id="glfw">${f('dforo', 'Diametro del foro (mm)', def[3])}</div>${m === 'VCE' ? `<div><label for="eta">Rendimento dell'esplosione</label><select id="eta"><option value="0.1">10% – scenario peggiore EPA, area congestionata</option><option value="0.03">3% – campo aperto, poca congestione</option></select></div>` : ''}</div>
    <p class="small">Sostanza di calcolo: ${p.nome}. ${nota} La temperatura del contenuto è quella dell'aria indicata nel meteo.</p>`;
}
function bindGF(p) {
  const c = $('glc'), s = $('gls'), w = $('glfw');
  const aggM = () => { if (p.compresso && !p.disciolto) { const V = num('capL'), P = num('pbar'); $('gfmassa').textContent = V > 0 && P > 0 ? `Massa di gas: ${massaCompresso(p, V, P).toFixed(1).replace('.', ',')} kg (a 20 °C, fattore di compressibilità da CoolProp)` : ''; } };
  const agg = () => { w.style.visibility = s.value === 'tot' ? 'hidden' : 'visible'; };
  c.addEventListener('change', () => { const o = contenitoriGF(p).find(x => x[0] === c.value); if (o) { $(p.compresso && !p.disciolto ? 'capL' : 'massa').value = o[2]; $('dforo').value = o[3]; aggM(); } });
  if (p.compresso && !p.disciolto) { $('capL').addEventListener('input', aggM); $('pbar').addEventListener('input', aggM); }
  s.addEventListener('change', () => { agg(); if ($('eta')) $('eta').value = s.value === 'tot' ? '0.1' : '0.03'; });
  agg(); aggM();
}

// ---------- linee di confidenza sulla direzione del vento (opzione stile ALOHA, scelta di Luca 19/11/2026) ----------
// ALOHA (Jones et al. 2013, NOAA TM NOS OR&R 43, § 4.5.3) ruota l'impronta di un angolo α basato sulla larghezza del pennacchio
// gaussiano a 5 minuti di trasporto; il coefficiente esatto della formula non è stato verificato sul testo originale.
// Finché ALOHA_VERIFICATO è false si usa l'angolo fisso del modello NATO ATP-45 (cerchio con vento ≤ 10 km/h, settore di semiampiezza 30° oltre)
const ALOHA_VERIFICATO = false;
function angoloConfidenza(u) {
  if (ALOHA_VERIFICATO) return { cerchio: false, gradi: null, fedele: true, testo: '' };
  if (u <= 10 / 3.6) return { cerchio: true, gradi: 180, fedele: false, testo: `Linee di confidenza: con vento di ${String(u).replace('.', ',')} m/s (≤ 10 km/h) la direzione è poco prevedibile e la zona è disegnata come cerchio di raggio pari alla distanza (modello NATO ATP-45). Metodo NON fedele ad ALOHA: il coefficiente della formula di ALOHA per l'angolo di confidenza non è stato verificato sul testo originale, quindi si usa un angolo fisso dichiarato.` };
  return { cerchio: false, gradi: 30, fedele: false, testo: `Linee di confidenza: impronta ruotata di ±30° attorno alla direzione del vento (semiampiezza del settore del modello NATO ATP-45 per vento oltre 10 km/h). Metodo NON fedele ad ALOHA: il coefficiente della formula di ALOHA per l'angolo di confidenza non è stato verificato sul testo originale, quindi si usa un angolo fisso dichiarato.` };
}
const ZONA_SOGLIA = { I: ['LC50', 'elevata_letalita'], II: ['IDLH', 'inizio_letalita'], III: ['LOC'] };

// ---------- geometria delle zone orientate con il vento ----------
// Zone che dipendono dal vento: dispersione tossica, flash fire, protezione sottovento ERG; per la VCE si sposta il centro.
function ventoDipendente(r) {
  if (r.soloERG) return !!(r.ergCaso && r.ergCaso.prot_km);
  return !!r.meteo && /Gas tossico|gaussiana|Flash fire|VCE/.test(r.scenario || '');
}
// forme da disegnare: { tipo: 'cerchio', r, cx, cy } oppure { tipo: 'quadrato', D } (coordinate in metri, x verso est, y verso nord)
function formeZone(r) {
  const dv = r.dirVento, orient = dv != null && ventoDipendente(r);
  const b = orient ? ((dv + 180) % 360) * Math.PI / 180 : 0, ux = Math.sin(b), uy = Math.cos(b);
  const z = [];
  const add = (d, col, key) => {
    if (!(Number.isFinite(d) && d)) return;
    if (!orient) return z.push({ tipo: 'cerchio', r: d, cx: 0, cy: 0, col, key });
    if (/VCE/.test(r.scenario)) { const off = r.dettagli.centro_esplosione_m || 0; return z.push({ tipo: 'cerchio', r: Math.max(d - off, 1), cx: ux * off, cy: uy * off, col, key }); }
    const imp = r.rappr === 'aloha' && r.impronta ? (ZONA_SOGLIA[key] || []).map(k => r.impronta[k]).find(Boolean) : null;
    if (imp) {
      // impronta calcolata: lato sinistro all'andata, lato destro al ritorno, poi ruotata nella direzione sottovento
      const loc = [...imp.map(([x, y]) => [x, y]), ...imp.slice().reverse().map(([x, y]) => [x, -y])];
      const rot = (a) => loc.map(([x, y]) => { const c = Math.cos(a), sn = Math.sin(a), X = x * c - y * sn, Y = x * sn + y * c; return [ux * X + uy * Y, uy * X - ux * Y]; });
      const a = angoloConfidenza(r.meteo.vento_ms);
      const conf = a.cerchio ? { cerchio: d } : { linee: [rot(a.gradi * Math.PI / 180), rot(-a.gradi * Math.PI / 180)] };
      return z.push({ tipo: 'quadrato', D: d, col, key, pts: rot(0), conf });
    }
    z.push({ tipo: 'quadrato', D: d, col, key, pts: [[-uy * d / 2, ux * d / 2], [uy * d / 2, -ux * d / 2], [uy * d / 2 + ux * d, -ux * d / 2 + uy * d], [-uy * d / 2 + ux * d, ux * d / 2 + uy * d]] });
  };
  return { add, z, orient, ux, uy };
}

// meteo reale con direzione del vento (richiesta di Luca, 19/11/2026)
const SETTORI16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
$('dirSet').insertAdjacentHTML('beforeend', SETTORI16.map((n, i) => `<option value="${i * 22.5}">${n} (${String(i * 22.5).replace('.', ',')}°)</option>`).join(''));
$('dirSet').addEventListener('change', () => { $('dirVento').value = $('dirSet').value; });
$('dirVento').addEventListener('input', () => { $('dirSet').value = ''; });
function dirVentoScelta() {
  if (!meteoUser) return null;
  const d = num('dirVento');
  if (d === null) return null;
  if (d < 0 || d > 360) throw 'Direzione del vento fuori campo (0–360°)';
  return d % 360;
}
const nomeSettore = d => SETTORI16[Math.round(d / 22.5) % 16];
function meteoScelto() { return meteoUser ? [{ stabilita: $('stab').value, u_ms: num('vento') || 1, T_C: num('temp') ?? 20 }] : M.METEO_PREDEFINITO; }

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
      const meteo = meteoScelto();
      risultati = M.gaussianoMeteo({ volume_m3: vol / 1000, densita_soluzione: p.dens, frazione_tossico: p.frazione || 1, pm: p.pm, Pv_kPa: pv, Pv_rif_T_C: pvU ? undefined : Trif, area_m2: num('area'),
        soglie_ppm: { LC50: p.LC50, IDLH: p.IDLH, LOC: p.LOC }, sostanza: `${sost} (${p.nome})`,
        nota_soglie: `Soglie: LC50 = ${p.LC50} ppm (ratto, ${p.LC50_t}, senza correzione temporale: cautelativo se la durata supera 30 min); IDLH ${p.IDLH} ppm (NIOSH); LOC = IDLH/10 = ${p.LOC} ppm. Tensione di vapore ${pv} kPa ${pvU ? '(inserita dall\'utente)' : '(banca dati, ' + Trif + ' °C)'}${p.frazione ? '; frazione di sostanza tossica ' + p.frazione : ''}. Fonti: ${p.fonte}` }, meteo);
      if (p.avviso) risultati.forEach(r => r.avvisi = [p.avviso, ...(r.avvisi || [])]);
    } else if (m === 'GA') {
      const vol = num('vol'); if (!vol || vol <= 0) throw 'Inserire il volume';
      const c = num('conc') || 33, pvU = num('pv');
      const pv = pvU ?? interpLog(p.pv, c), dens = interpLin(p.dens, c);
      const meteo = meteoScelto();
      risultati = M.gaussianoMeteo({ volume_m3: vol / 1000, densita_soluzione: dens, frazione_tossico: c / 100, pm: p.pm, Pv_kPa: +pv.toFixed(2), Pv_rif_T_C: pvU ? undefined : 20, area_m2: num('area'),
        soglie_ppm: { LC50: p.LC50, IDLH: p.IDLH, LOC: p.LOC }, sostanza: `${sost} ${c}%`,
        nota_soglie: `Soglie: LC50 30 min = ${p.LC50} ppm (LC50 ratto 1 h senza correzione temporale, scelta cautelativa); IDLH ${p.IDLH} ppm (NIOSH); LOC = IDLH/10 = ${p.LOC} ppm. Concentrazione ${c}%, densità ${dens.toFixed(3)}, tensione di vapore ${pv.toFixed(2)} kPa ${pvU ? '(inserita dall\'utente)' : '(International Critical Tables, 20 °C, tensione totale: cautelativo)'}` }, meteo);
    } else if (m === 'GL') {
      const ms = num('massa'); if (!ms || ms <= 0) throw 'Inserire il contenuto del recipiente';
      const sc = $('gls').value, dmm = num('dforo') || 10;
      if (sc !== 'tot' && (dmm <= 0 || dmm > 300)) throw 'Diametro del foro fuori campo (1–300 mm)';
      const nomeC = { bomb: 'bombola', ton: 'recipiente a pressione da 1 t', cist: CIST_SOLO_TERRA[cur.u] ? 'cisterna stradale o ferroviaria (trasporto terrestre ADR/RID; l\'IMDG non ammette cisterne mobili per questa voce)' : 'cisterna / tank-container', altro: 'recipiente a pressione' }[$('glc').value];
      const meteo = meteoScelto();
      risultati = M.gasLiquefattoMeteo({ massa_kg: ms, scenario: sc, d_mm: dmm, h_m: $('glc').value === 'cist' ? 2 : 1, prop: p,
        soglie_ppm: { LC50: p.LC50, IDLH: p.IDLH, LOC: p.LOC }, sostanza: `${sost} (${p.nome})`,
        contenitore: `Recipiente: ${nomeC}, contenuto ${ms} kg di ${p.nome} liquefatto sotto pressione alla temperatura dell'aria`,
        nota_soglie: `Soglie: LC50 = ${p.LC50} ppm (ratto, ${p.LC50_t}, senza correzione temporale); IDLH ${p.IDLH} ppm (NIOSH); LOC = IDLH/10 = ${p.LOC} ppm. Fonti: ${p.fonte}` }, meteo);
      if (p.avviso) risultati.forEach(r => r.avvisi = [p.avviso, ...(r.avvisi || [])]);
    } else if (m === 'JF' || m === 'FF' || m === 'VCE') {
      const sc = $('gls').value, dmm = num('dforo') || 10, c = $('glc').value;
      if (sc !== 'tot' && (dmm <= 0 || dmm > 300)) throw 'Diametro del foro fuori campo (1–300 mm)';
      let ms, Pb = null, cont;
      const nomeC = (contenitoriGF(p).find(x => x[0] === c) || [, 'recipiente'])[1].toLowerCase();
      if (p.disciolto) {
        ms = num('massa'); Pb = num('pbar');
        if (!ms || ms <= 0) throw 'Inserire la massa di acetilene';
        if (!Pb || Pb <= 1 || Pb > 30) throw 'Pressione fuori campo (1–30 bar)';
        cont = `Recipiente: ${nomeC}, ${String(ms).replace('.', ',')} kg di ${p.nome}, pressione ${Pb} bar; il gas esce come vapore dalla soluzione, con efflusso calcolato come per un gas compresso alla pressione indicata (cautelativo: la pressione cala man mano che il gas si libera)`;
      } else if (p.compresso) {
        const V = num('capL'); Pb = num('pbar');
        if (!V || V <= 0) throw 'Inserire la capacità del recipiente';
        if (!Pb || Pb <= 1 || Pb > 350) throw 'Pressione fuori campo (1–350 bar)';
        ms = +massaCompresso(p, V, Pb).toFixed(2);
        cont = `Recipiente: ${nomeC}, capacità ${V} L a ${Pb} bar, ${String(ms).replace('.', ',')} kg di ${p.nome} (fattore di compressibilità a 20 °C da CoolProp)`;
      } else {
        ms = num('massa'); if (!ms || ms <= 0) throw 'Inserire il contenuto del recipiente';
        cont = `Recipiente: ${nomeC}, contenuto ${ms} kg di ${p.nome} liquefatto sotto pressione alla temperatura dell'aria`;
      }
      const meteo = meteoScelto();
      const base = { massa_kg: ms, scenario: sc, d_mm: dmm, h_m: c === 'cist' ? 2 : 1, P_bar: Pb, prop: p, sostanza: `${sost} (${p.nome})`, contenitore: cont };
      if (m === 'JF') {
        const r = M.jetFire({ ...base, fase: sc, T_C: meteoUser ? (num('temp') ?? 20) : 20 });
        r.ipotesi.push(`Temperatura del contenuto ${meteoUser ? (num('temp') ?? 20) : 20} °C. Dati della sostanza: ${p.fonte}`);
        risultati = [r];
      } else if (m === 'FF') {
        risultati = M.flashFireMeteo(base, meteo);
        risultati.forEach(r => r.ipotesi.push('Dati della sostanza: ' + p.fonte));
      } else {
        risultati = M.vceMeteo({ ...base, eta: +$('eta').value }, meteo);
        risultati.forEach(r => r.ipotesi.push('Dati della sostanza: ' + p.fonte));
      }
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
        avvisiE.push(`Divisione ${cur.classe}: le distanze ERG sono fisse e NON variano con la massa netta esplosiva (qui ${nem} kg) né con l'imballaggio. Dipendono solo dalla situazione indicata (misura immediata, parte consistente del carico, incendio). Le distanze in funzione della NEM (DoD) sono nel riquadro dedicato.`);
        avvisiE.push(avvisoEsplosivi());
      }
      risultati = [{ scenario: 'Distanze ERG 2024', sostanza: sost, soloERG: true, ergCaso: caso, ipotesi: ipo, avvisi: avvisiE }];
    }
    { const dv = dirVentoScelta();
      if (dv !== null) risultati.forEach(r => { r.dirVento = dv; r.rappr = $('rappr').value === 'aloha' && r.impronta && !r.soloERG && !/VCE/.test(r.scenario) ? 'aloha' : 'erg';
        if (ventoDipendente(r) && r.rappr === 'aloha') { const a = angoloConfidenza(r.meteo.vento_ms); r.ipotesi.push(`Vento da ${String(Math.round(dv))}° (${nomeSettore(dv)}), la nube va verso ${String(Math.round((dv + 180) % 360))}° (${nomeSettore((dv + 180) % 360)}). Rappresentazione stile ALOHA: per ogni soglia è disegnata l'impronta calcolata della nube (isopleta con profilo laterale gaussiano: semilarghezza σy·√(2·ln(C/soglia)), con la larghezza della nube densa di Britter-McQuaid nel campo vicino). ${a.testo}`); }
        else if (ventoDipendente(r)) r.ipotesi.push(`Vento da ${String(Math.round(dv))}° (${nomeSettore(dv)}), la nube va verso ${String(Math.round((dv + 180) % 360))}° (${nomeSettore((dv + 180) % 360)}). Su mappa e schema le zone che dipendono dal vento sono disegnate sottovento con la forma della zona di azione protettiva ERG 2024: un quadrato lungo quanto la distanza e largo altrettanto, metà per lato rispetto alla direzione del vento, che copre anche le oscillazioni della direzione`); }); }
    if (cur.classe.startsWith('1.')) {
      const { nem } = leggiNEM(), na = num('nemart');
      const qd = M.qdDoD({ div: cur.classe, nem_kg: nem, nemArticolo_kg: na && na > 0 ? na : null, ferrovia: !!($('ferro') && $('ferro').checked), grossoCalibro: !!($('calibro') && $('calibro').checked) });
      if (qd.righe.length) risultati.forEach(r => r.qd = qd);
    }
    if (['PF', 'JF', 'BL', 'FF', 'VCE'].includes(m) && p.fumi)
      aggiungiFumi(m, p, risultati, meteoScelto());
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
const fmt = v => v === undefined ? 'non fissata (da definire nel piano di emergenza)' : v === null ? 'non raggiunta' : !Number.isFinite(v) ? `> ${((risultati[tabSel] && risultati[tabSel].oltre_m) || 50000) / 1000} km` : v + ' m';

function mostra() {
  $('out').style.display = 'block';
  $('tabs').innerHTML = risultati.length > 1 ? risultati.map((r, i) => `<button class="chip ${i === tabSel ? 'on' : ''}" data-i="${i}" type="button">${r.meteo.stabilita}${r.meteo.vento_ms}</button>`).join('') : '';
  $('tabs').querySelectorAll('button').forEach(b => b.onclick = () => { tabSel = +b.dataset.i; mostra(); });
  const r = risultati[tabSel];
  const g = DATA.guide[cur.guida];
  disegna(r, g);
  $('fumicard').classList.toggle('hide', !r.fumi);
  $('qdcard').classList.toggle('hide', !r.qd);
  $('qdbox').innerHTML = r.qd ? qdHTML(r.qd) : '';
  $('fumibox').innerHTML = r.fumi ? fumiHTML(r.fumi) : '';
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
  const F = formeZone(r);
  if (!r.soloERG) { F.add(r.zone_m.III, 'var(--z3)', 'III'); F.add(r.zone_m.II, 'var(--z2)', 'II'); F.add(r.zone_m.I, 'var(--z1)', 'I'); }
  const iso = isoNumero(g);
  if (r.soloERG && r.ergCaso && r.ergCaso.prot_km) F.add(r.ergCaso.prot_km * 1000, 'var(--z3)', 'PROT');
  if (r.soloERG && r.ergCaso && r.ergCaso.dist !== iso) F.z.push({ tipo: 'cerchio', r: r.ergCaso.dist, cx: 0, cy: 0, col: 'var(--z2)', key: 'ERG' });
  const ergApp = !r.soloERG && r.ergCaso ? r.ergCaso.dist : 0;
  const qdC = r.qd ? r.qd.righe.filter(x => x.k === 'IBD' || x.k === 'EWD') : [];
  // riquadro che contiene tutte le forme: lo schema si centra sulle zone, non sulla sorgente
  const bb = [[0, 0]], cerchio = (cx, cy, rr) => bb.push([cx - rr, cy - rr], [cx + rr, cy + rr]);
  cerchio(0, 0, Math.max(iso, ergApp, ...qdC.map(x => x.m)));
  for (const f of F.z) { f.tipo === 'cerchio' ? cerchio(f.cx, f.cy, f.r) : bb.push(...f.pts); if (f.conf) f.conf.cerchio ? cerchio(0, 0, f.conf.cerchio) : f.conf.linee.forEach(l => bb.push(...l)); }
  const x0 = Math.min(...bb.map(q => q[0])), x1 = Math.max(...bb.map(q => q[0])), y0 = Math.min(...bb.map(q => q[1])), y1 = Math.max(...bb.map(q => q[1]));
  const sc = (W - 40) / Math.max(x1 - x0, y1 - y0, 1), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const X = x => C + (x - mx) * sc, Y = y => C - (y - my) * sc;
  let s = `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Zone di danno in scala">`;
  for (const f of F.z) s += f.tipo === 'cerchio'
    ? `<circle cx="${X(f.cx)}" cy="${Y(f.cy)}" r="${f.r * sc}" fill="${f.col}" fill-opacity=".55" stroke="${f.col}"/>`
    : `<polygon points="${f.pts.map(([x, y]) => X(x).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}" fill="${f.col}" fill-opacity=".55" stroke="${f.col}"/>`;
  for (const f of F.z) if (f.conf) s += f.conf.cerchio
    ? `<circle cx="${X(0)}" cy="${Y(0)}" r="${f.conf.cerchio * sc}" fill="none" stroke="${f.col}" stroke-width="1.4" stroke-dasharray="4 3"/>`
    : f.conf.linee.map(l => `<polygon points="${l.map(([x, y]) => X(x).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}" fill="none" stroke="${f.col}" stroke-width="1.4" stroke-dasharray="4 3"/>`).join('');
  const S0 = X(0), T0 = Y(0);
  s += `<circle cx="${S0}" cy="${T0}" r="${iso * sc}" fill="none" stroke="var(--erg)" stroke-width="1.6" stroke-dasharray="5 4"/>`;
  if (ergApp) s += `<circle cx="${S0}" cy="${T0}" r="${ergApp * sc}" fill="none" stroke="var(--erg)" stroke-width="1.2" stroke-dasharray="2 4"/>`;
  for (const x of qdC) s += `<circle cx="${S0}" cy="${T0}" r="${x.m * sc}" fill="none" stroke="#7d3c98" stroke-width="${x.k === 'IBD' ? 1.8 : 1.2}" stroke-dasharray="${x.k === 'IBD' ? '8 3' : '1 3'}"/>`;
  s += `<circle cx="${S0}" cy="${T0}" r="3" fill="var(--ink)"/>`;
  // scala
  const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000].find(v => v * sc > 50) || 10000;
  s += `<line x1="12" y1="${W - 14}" x2="${12 + nice * sc}" y2="${W - 14}" stroke="var(--ink)" stroke-width="2"/><text x="12" y="${W - 20}" font-size="11" fill="var(--ink)">${nice >= 1000 ? nice / 1000 + ' km' : nice + ' m'}</text>`;
  // nord e vento
  s += `<text x="${W - 14}" y="16" font-size="12" text-anchor="middle" font-weight="bold" fill="var(--ink)">N</text><line x1="${W - 14}" y1="20" x2="${W - 14}" y2="34" stroke="var(--ink)" stroke-width="1.5"/>`;
  if (F.orient) {
    const ax = S0 + F.ux * 14, ay = T0 - F.uy * 14, bx = S0 + F.ux * 54, by = T0 - F.uy * 54;
    s += `<defs><marker id="frv" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--ink)"/></marker></defs><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="var(--ink)" stroke-width="2" marker-end="url(#frv)"/><text x="12" y="16" font-size="11" fill="var(--ink)">vento da ${Math.round(r.dirVento)}° (${nomeSettore(r.dirVento)})</text>`;
  } else if (r.meteo) s += `<text x="12" y="16" font-size="11" fill="var(--ink)">direzione del vento non indicata</text>`;
  $('graf').innerHTML = s + '</svg>';
  const nZone = F.z.filter(f => ['I', 'II', 'III'].includes(f.key)).length;
  $('grafnote').textContent = (F.orient
    ? (r.rappr === 'aloha' ? `Vento da ${Math.round(r.dirVento)}° (${nomeSettore(r.dirVento)}): aree colorate = impronta calcolata della nube per ogni soglia; tratteggio dello stesso colore = linee di confidenza sulla direzione del vento (${angoloConfidenza(r.meteo.vento_ms).cerchio ? 'cerchio: vento ≤ 10 km/h' : '±30°'}, angolo fisso NATO ATP-45, non fedele ad ALOHA). ` : /VCE/.test(r.scenario) ? `Vento da ${Math.round(r.dirVento)}° (${nomeSettore(r.dirVento)}): cerchi di sovrappressione centrati sul centro dell'esplosione, spostato sottovento a metà della distanza del LFL. ` : `Vento da ${Math.round(r.dirVento)}° (${nomeSettore(r.dirVento)}): zone che dipendono dal vento disegnate sottovento come quadrati lunghi e larghi quanto la distanza, metà per lato (forma della zona di azione protettiva ERG 2024). `)
    : (ventoDipendente(r) ? 'Direzione del vento non indicata: distanze sottovento rappresentate come cerchi (inviluppo cautelativo). ' : ''))
    + 'Tratteggio: isolamento iniziale ERG ' + iso + ' m. ' + (ergApp ? 'Puntinato: distanza ERG applicabile (' + r.ergCaso.etichetta + ') ' + ergApp + ' m. ' : '')
    + (r.soloERG ? 'Area colorata: distanza ERG da applicare' + (r.ergCaso && r.ergCaso.prot_km ? ` (arancio: isolamento ${r.ergCaso.dist} m; giallo: protezione sottovento ${String(r.ergCaso.prot_km).replace('.', ',')} km${F.orient ? '' : ', disegnata come cerchio'}). ` : '. ') : '')
    + (nZone < 3 && !r.soloERG ? 'Le zone non raggiunte non sono disegnate.' : '')
    + (qdC.length ? ' Viola: distanze DoD (' + qdC.map(x => (x.k === 'IBD' ? 'IBD tratteggio lungo ' : 'allontanamento in emergenza puntinato ') + x.m + ' m').join('; ') + ').' : '');
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
