/* Estensioni dell'app installabile: mappa, GPS, impostazioni, report stampabile, offline */
'use strict';
const VERSIONE = '1.3-beta';

// ---------- impostazioni (solo su questo dispositivo) ----------
const FIRMATARIO_DEFAULT = { nome: 'Dott. Gianluca POMA', qualifica: 'Consulente Chimico di Porto' };
function leggiImpostazioni() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('impostazioni') || '{}'); } catch (e) { s = {}; }
  return { nome: s.nome || FIRMATARIO_DEFAULT.nome, qualifica: s.qualifica || FIRMATARIO_DEFAULT.qualifica, carta: s.carta !== false };
}
function salvaImpostazioni(o) { try { localStorage.setItem('impostazioni', JSON.stringify(o)); return true; } catch (e) { return false; } }
(function initImpostazioni() {
  const s = leggiImpostazioni();
  $('sNome').value = s.nome; $('sQual').value = s.qualifica; $('sCarta').checked = s.carta;
  $('btnSet').onclick = () => $('setbox').classList.toggle('hide');
  $('sSave').onclick = () => {
    const ok = salvaImpostazioni({ nome: $('sNome').value.trim(), qualifica: $('sQual').value.trim(), carta: $('sCarta').checked });
    $('setbox').classList.add('hide');
    if (!ok) alertBox('Impossibile salvare le impostazioni su questo dispositivo.');
  };
})();

// carta intestata dello Studio (dal modello Word fornito da Luca il 19/11/2026)
const STUDIO = {
  nome: 'Studio Professionale Associato Consulenti Chimici di Porto',
  soci: 'Dr. Poma Gianluca e Dr. Mameli Pier Luca',
  sede: 'Sede legale: Viale Diaz, 40 – 09125 Cagliari',
  fisc: 'Tel/fax +39 070303350 C.F./P. Iva 03231430921',
  sx: ['Dott. Gianluca POMA', 'Mobile: +39 333-5780697'],
  dx: ['Dott. Pier Luca MAMELI', 'Mobile: +39 393-9936321']
};
const cartaHTML = () => `<div class="carta"><img src="img/logo-scp.jpg" alt="Servizio Chimico di Porto – Cagliari"><div class="carta-t">
  <div class="c1">${STUDIO.nome}</div><div class="c2">${STUDIO.soci}</div><div class="c3">${STUDIO.sede}<br>${STUDIO.fisc}</div>
  <div class="c4"><span>${STUDIO.sx.join('<br>')}</span><span class="dx">${STUDIO.dx.join('<br>')}</span></div></div></div>`;
const cartaTesto = () => `${STUDIO.nome}\n${STUDIO.soci}\n${STUDIO.sede} – ${STUDIO.fisc}\n${STUDIO.sx.join(' – ')} | ${STUDIO.dx.join(' – ')}\n${'-'.repeat(60)}\n\n`;

// data e ora dell'evento: predefinite all'apertura, modificabili
(function initData() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  $('evData').value = d.toISOString().slice(0, 16);
})();

// ---------- stato rete ----------
function aggiornaRete() { $('netstato').textContent = navigator.onLine ? '' : ' · OFFLINE (mappa non disponibile, calcoli attivi)'; }
window.addEventListener('online', aggiornaRete); window.addEventListener('offline', aggiornaRete); aggiornaRete();

// ---------- mappa ----------
const CENTRO_DEFAULT = [39.205, 9.085];          // area portuale di Cagliari
let mappa = null, marker = null, livelloZone = null, posizione = null, fonteposizione = '';
function initMappa() {
  if (typeof L === 'undefined') { $('map').innerHTML = '<p class="small" style="padding:10px">Mappa non disponibile.</p>'; return; }
  mappa = L.map('map', { zoomControl: true }).setView(CENTRO_DEFAULT, 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mappa);
  livelloZone = L.layerGroup().addTo(mappa);
  mappa.on('click', e => impostaPosizione(e.latlng.lat, e.latlng.lng, 'selezionata sulla mappa'));
}
function impostaPosizione(lat, lng, fonte, acc) {
  posizione = [lat, lng]; fonteposizione = fonte + (acc ? ` (±${Math.round(acc)} m)` : '');
  $('coord').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)} – ${fonteposizione}`;
  if (!mappa) return;
  if (!marker) marker = L.marker(posizione, { draggable: true }).addTo(mappa).on('dragend', ev => { const p = ev.target.getLatLng(); impostaPosizione(p.lat, p.lng, 'spostata sulla mappa'); });
  else marker.setLatLng(posizione);
  if ($('out').style.display === 'block') disegnaMappa();
}
$('btnGPS').onclick = () => {
  if (!navigator.geolocation) { $('coord').textContent = 'GPS non disponibile su questo dispositivo'; return; }
  $('coord').textContent = 'Ricerca posizione…';
  navigator.geolocation.getCurrentPosition(
    p => { impostaPosizione(p.coords.latitude, p.coords.longitude, 'GPS', p.coords.accuracy); if (mappa) mappa.setView(posizione, 16); },
    err => { $('coord').textContent = 'Posizione non disponibile (' + (err.code === 1 ? 'permesso negato' : 'segnale assente') + '): tocca la mappa'; },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
};
initMappa();

function cerchiDaRisultato(r, g) {
  const c = [];
  if (!r.soloERG) {
    if (Number.isFinite(r.zone_m.III) && r.zone_m.III) c.push({ r: r.zone_m.III, col: '#f1c40f', nome: 'Zona III' });
    if (Number.isFinite(r.zone_m.II) && r.zone_m.II) c.push({ r: r.zone_m.II, col: '#e67e22', nome: 'Zona II' });
    if (Number.isFinite(r.zone_m.I) && r.zone_m.I) c.push({ r: r.zone_m.I, col: '#c0392b', nome: 'Zona I' });
  } else if (r.ergCaso) {
    if (r.ergCaso.prot_km) c.push({ r: r.ergCaso.prot_km * 1000, col: '#f1c40f', nome: `Protezione sottovento (${r.ergCaso.per}, disegnata come cerchio)` });
    c.push({ r: r.ergCaso.dist, col: '#e67e22', nome: 'ERG: ' + r.ergCaso.etichetta });
  }
  const iso = isoNumero(g);
  return { zone: c, iso };
}
function disegnaMappa() {
  if (!mappa) return;
  livelloZone.clearLayers();
  const r = risultati[tabSel], g = DATA.guide[cur.guida];
  if (!posizione) impostaPosizione(mappa.getCenter().lat, mappa.getCenter().lng, 'centro della mappa (posizione non indicata)');
  const { zone, iso } = cerchiDaRisultato(r, g);
  for (const z of zone) L.circle(posizione, { radius: z.r, color: z.col, weight: 2, fillColor: z.col, fillOpacity: 0.28 }).bindTooltip(`${z.nome}: ${z.r} m`).addTo(livelloZone);
  L.circle(posizione, { radius: iso, color: '#2c3e50', weight: 2, dashArray: '6 5', fill: false }).bindTooltip(`Isolamento iniziale ERG: ${iso} m`).addTo(livelloZone);
  if (r.ergCaso && !r.soloERG) L.circle(posizione, { radius: r.ergCaso.dist, color: '#2c3e50', weight: 1.5, dashArray: '2 6', fill: false }).bindTooltip(`ERG: ${r.ergCaso.etichetta} ${r.ergCaso.dist} m`).addTo(livelloZone);
  const rmax = Math.max(iso, ...zone.map(z => z.r), r.ergCaso ? r.ergCaso.dist : 0);
  mappa.fitBounds(L.latLng(posizione).toBounds(rmax * 2.2), { animate: false });
}
// la mappa si sposta nel riquadro "Zone" quando ci sono risultati, e torna su quando si cambia merce
function spostaMappa(dove) {
  const m = $('map'), dest = dove === 'zone' ? $('mapSlot') : $('mapHome');
  if (m.parentElement !== dest) { dest.appendChild(m); $('mapNota').classList.toggle('hide', dove !== 'zone'); if (mappa) setTimeout(() => { mappa.invalidateSize(); if (dove === 'zone' && risultati.length) disegnaMappa(); }, 60); }
}
$('onu').addEventListener('input', () => spostaMappa('home'));
// la vista Mappa/Schema
$('vMap').onclick = () => { $('vMap').classList.add('on'); $('vSch').classList.remove('on'); $('map').classList.remove('hide'); $('graf').classList.add('hide'); if (mappa) setTimeout(() => { mappa.invalidateSize(); disegnaMappa(); }, 50); };
$('vSch').onclick = () => { $('vSch').classList.add('on'); $('vMap').classList.remove('on'); $('graf').classList.remove('hide'); $('map').classList.add('hide'); };

// aggancio al calcolo: dopo ogni visualizzazione aggiorna la mappa
const _mostraBase = mostra;
mostra = function () {
  _mostraBase();
  spostaMappa('zone');
  if ($('vSch').classList.contains('on')) $('map').classList.add('hide');
  if (mappa) { mappa.invalidateSize(); disegnaMappa(); }
};

// ---------- report ----------
// Legenda delle zone (Linee guida PEE, Direttiva 7/12/2022)
const LEGENDA_ZONE = [
  ['Zona I – di sicuro impatto', 'Area in cui sono attesi effetti con elevata probabilità di letalità anche per persone mediamente sane. Corrisponde alla soglia di "elevata letalità".'],
  ['Zona II – di danno', 'Area esterna alla Zona I in cui sono possibili danni gravi e irreversibili per chi non adotta le misure di autoprotezione e, nelle parti più vicine, effetti letali per le persone più vulnerabili. Corrisponde alla soglia di "lesioni irreversibili".'],
  ['Zona III – di attenzione', 'Area più esterna in cui sono possibili danni generalmente non gravi, anche per le persone più vulnerabili, o reazioni di panico. Corrisponde alla soglia di "lesioni reversibili" (per i tossici: livello di attenzione LOC).']
];
// Significato e valore di ogni soglia, per tipo di scenario (D.M. 9/5/2001, Tab. 2)
function legendaSoglie(r) {
  const SIG = {
    elevata_letalita: 'Elevata letalità: oltre questa soglia è attesa un\'elevata probabilità di morte per le persone esposte.',
    elevata_letalita_spazi_aperti: 'Elevata letalità in spazi aperti: soglia più alta, per persone all\'aperto senza effetti indiretti (crolli, proiezione di vetri).',
    inizio_letalita: 'Inizio letalità: oltre questa soglia sono possibili decessi tra le persone esposte.',
    lesioni_irreversibili: 'Lesioni irreversibili: oltre questa soglia sono possibili danni gravi e permanenti alla salute.',
    lesioni_reversibili: 'Lesioni reversibili: oltre questa soglia sono possibili danni lievi e reversibili (ustioni lievi, ferite da vetri, irritazioni).',
    LC50: 'LC50 (30 min): concentrazione che, respirata per 30 minuti, è letale per il 50% degli esposti. Soglia di elevata letalità.',
    IDLH: 'IDLH: concentrazione immediatamente pericolosa per la vita o la salute; oltre questa soglia sono possibili danni irreversibili o l\'incapacità di mettersi in salvo. Soglia di lesioni irreversibili.',
    LOC: 'LOC (Level of Concern): livello di attenzione pari a 1/10 dell\'IDLH; oltre questa soglia sono possibili effetti reversibili. Soglia della Zona III.'
  };
  const S = M.SOGLIE, p = DATA.props[cur.u] || {};
  let val = {}, grand = '';
  if (/Pool fire/.test(r.scenario)) { grand = 'Irraggiamento termico stazionario'; val = { elevata_letalita: '12,5 kW/m²', inizio_letalita: '7 kW/m²', lesioni_irreversibili: '5 kW/m²', lesioni_reversibili: '3 kW/m²' }; }
  else if (/BLEVE/.test(r.scenario)) { grand = 'Irraggiamento termico variabile (dose termica della fireball)'; val = { elevata_letalita: 'raggio della fireball', inizio_letalita: '350 kJ/m²', lesioni_irreversibili: '200 kJ/m²', lesioni_reversibili: '125 kJ/m²' }; }
  else if (/TNT/.test(r.scenario)) { grand = 'Sovrappressione di picco'; val = { elevata_letalita: '0,3 bar', elevata_letalita_spazi_aperti: '0,6 bar', inizio_letalita: '0,14 bar', lesioni_irreversibili: '0,07 bar', lesioni_reversibili: '0,03 bar' }; }
  else if (/gaussiana|Gas tossico liquefatto/.test(r.scenario)) { grand = 'Concentrazione in aria della sostanza tossica'; val = { LC50: `${p.LC50} ppm`, IDLH: `${p.IDLH} ppm`, LOC: `${p.LOC} ppm` }; }
  const righe = Object.keys(r.distanze_m || {}).map(k => ({ chiave: k, nome: SIG[k] ? SIG[k].split(':')[0] : k, valore: val[k] || '', distanza: r.distanze_m[k], significato: SIG[k] ? (t => t.charAt(0).toUpperCase() + t.slice(1))(SIG[k].split(': ').slice(1).join(': ')) : '' }));
  return { grandezza: grand, righe };
}
function datiReport() {
  const r = risultati[tabSel], g = DATA.guide[cur.guida], s = leggiImpostazioni();
  const v = $('evData').value;
  const quando = v ? new Date(v).toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' }) : 'non indicata';
  const luogo = $('evLuogo').value.trim() || 'non indicato';
  const coord = posizione ? `${posizione[0].toFixed(5)} N, ${posizione[1].toFixed(5)} E (${fonteposizione})` : 'non indicate';
  return { r, g, s, quando, luogo, coord };
}
function testoReport() {
  const { r, g, s, quando, luogo, coord } = datiReport();
  let t = (s.carta ? cartaTesto() : '') + `PARERE TECNICO – STIMA DELLE AREE DI DANNO E DI SICUREZZA\nData: ${quando}\nLuogo: ${luogo}\nCoordinate: ${coord}\n\n${r.sostanza}\n${classif()} · ERG Guida ${cur.guida}\nScenario: ${r.scenario}\n\n`;
  if (!r.soloERG) {
    t += `ZONE\nZona I (sicuro impatto): ${fmt(r.zone_m.I)}\nZona II (danno): ${fmt(r.zone_m.II)}\nZona III (attenzione): ${fmt(r.zone_m.III)}\n`;
    const L = legendaSoglie(r);
    t += `\nDISTANZE PER SOGLIA (D.M. 9/5/2001 – ${L.grandezza})\n`;
    for (const x of L.righe) t += `- ${x.nome} (${x.valore}): ${fmt(x.distanza)}\n`;
  }
  if (r.ergCaso) t += `\nDistanza ERG da applicare: ${r.ergCaso.dist} m${r.ergCaso.dir ? ' ' + r.ergCaso.dir : ''} – ${r.ergCaso.etichetta} (${r.ergCaso.motivo})\n`;
  t += `\nIPOTESI\n${r.ipotesi.map(x => '- ' + x).join('\n')}\n`;
  if (r.meteo) t += `- Meteo ${r.meteo.origine}: ${r.meteo.stabilita}, ${r.meteo.vento_ms} m/s, ${r.meteo.temperatura_C} °C\n`;
  if (r.avvisi && r.avvisi.length) t += `\nAVVISI\n${r.avvisi.map(x => '- ' + x).join('\n')}\n`;
  t += `\nERG 2024 Guida ${cur.guida} (${g.titolo_it || g.titolo}):\n${ergRighe(g, cur.guida).map(([a, b]) => '- ' + a + ': ' + b).join('\n')}\n`;
  if (cur.tih) t += `${NOTA_T1}\n`;
  t += tabella3Testo();
  if (!r.soloERG) {
    t += `\nLEGENDA\n${LEGENDA_ZONE.map(([a, b]) => '- ' + a + ': ' + b).join('\n')}\n`;
    for (const x of legendaSoglie(r).righe) t += `- ${x.nome}: ${x.significato}\n`;
  }
  t += `\nRiferimenti: D.M. 9/5/2001 Tab. 2; Linee guida PEE (Direttiva 7/12/2022); IMDG Code 42-24; ERG 2024.\nStima di supporto tecnico: non costituisce atto amministrativo. App v${VERSIONE}.\n\n${s.nome}\n${s.qualifica}\n`;
  return t;
}
$('copy').onclick = async () => {
  const t = testoReport();
  try { await navigator.clipboard.writeText(t); $('copymsg').textContent = 'Report copiato negli appunti.'; }
  catch (e) { $('copymsg').innerHTML = 'Copia non consentita: seleziona il testo qui sotto.<textarea style="width:100%;height:220px;margin-top:6px;font-size:12px">' + t.replace(/</g, '&lt;') + '</textarea>'; }
};
const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
$('print').onclick = () => {
  const { r, g, s, quando, luogo, coord } = datiReport();
  let h = s.carta ? cartaHTML() : '';
  h += `<div class="intest"><h1>Parere tecnico – Stima delle aree di danno e di sicurezza</h1>
    <table class="dati"><tr><td>Data</td><td>${esc(quando)}</td></tr><tr><td>Luogo</td><td>${esc(luogo)}</td></tr><tr><td>Coordinate</td><td>${esc(coord)}</td></tr></table></div>`;
  h += `<h2>Merce e scenario</h2><table><tr><td>Merce</td><td>${esc(r.sostanza)}</td></tr><tr><td>Classificazione</td><td>${esc(classif())} · ERG Guida ${esc(cur.guida)}</td></tr><tr><td>Scenario</td><td>${esc(r.scenario)}</td></tr>${r.meteo ? `<tr><td>Meteo</td><td>${r.meteo.stabilita}, ${r.meteo.vento_ms} m/s, ${r.meteo.temperatura_C} °C (${r.meteo.origine})</td></tr>` : ''}</table>`;
  if (!r.soloERG) {
    const L = legendaSoglie(r);
    h += `<h2>Zone di pianificazione</h2><table><tr><th>Zona</th><th class="n">Distanza</th></tr>
      <tr><td><span class="sw z1"></span>Zona I – di sicuro impatto</td><td class="n">${fmt(r.zone_m.I)}</td></tr>
      <tr><td><span class="sw z2"></span>Zona II – di danno</td><td class="n">${fmt(r.zone_m.II)}</td></tr>
      <tr><td><span class="sw z3"></span>Zona III – di attenzione</td><td class="n">${fmt(r.zone_m.III)}</td></tr></table>
      <p class="nota">Distanze misurate dal punto di rilascio. Le zone sono definite nella legenda in fondo al documento.</p>`;
    h += `<h2>Distanze per soglia di danno (D.M. 9/5/2001, Tab. 2)</h2><p class="nota">Grandezza di riferimento: ${esc(L.grandezza)}.</p>
      <table><tr><th>Soglia</th><th>Valore</th><th class="n">Distanza</th></tr>${L.righe.map(x => `<tr><td>${esc(x.nome)}</td><td>${esc(x.valore)}</td><td class="n">${fmt(x.distanza)}</td></tr>`).join('')}</table>
      <p class="nota">"Non raggiunta": la soglia non è superata nemmeno in prossimità della sorgente.</p>`;
  }
  if (r.ergCaso) h += `<h2>Distanza ERG da applicare</h2><p>${r.ergCaso.dist} m${r.ergCaso.dir ? ' ' + esc(r.ergCaso.dir) : ''} – ${esc(r.ergCaso.etichetta)}. ${esc(r.ergCaso.motivo)}</p>`;
  h += `<div class="schema"><h2>Schema delle zone</h2>${$('graf').innerHTML}<div class="nota"> Cerchi colorati: ${r.soloERG ? (r.ergCaso && r.ergCaso.prot_km ? `isolamento ${r.ergCaso.dist} m (arancio) e protezione sottovento ${String(r.ergCaso.prot_km).replace('.', ',')} km (giallo, rappresentata come cerchio: inviluppo cautelativo per direzione del vento incerta)` : 'distanza ERG da applicare') : 'Zona I (rosso), Zona II (arancio), Zona III (giallo)'}. Tratteggio: isolamento iniziale ERG. Barra: scala grafica.${r.meteo ? ' Per la dispersione tossica le distanze sono sottovento e sono rappresentate come cerchi (inviluppo cautelativo per direzione del vento incerta).' : ''}</div></div>`;
  h += `<h2>Ipotesi di calcolo</h2><ul>${r.ipotesi.map(x => `<li>${esc(x)}</li>`).join('')}${r.meteo ? `<li>Meteo ${r.meteo.origine}: ${r.meteo.stabilita}, ${r.meteo.vento_ms} m/s, ${r.meteo.temperatura_C} °C</li>` : ''}</ul>`;
  if (r.avvisi && r.avvisi.length) h += `<h2>Avvisi</h2><ul>${r.avvisi.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  h += `<h2>ERG 2024 – Guida ${esc(cur.guida)}</h2><p class="nota">${esc(g.titolo_it || g.titolo)}</p><table>${ergRighe(g, cur.guida).map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>`;
  if (cur.tih) h += `<p class="nota">${esc(NOTA_T1)}</p>`;
  h += tabella3HTML(esc).replace(/class="small"/g, 'class="nota"');
  if (!r.soloERG) {
    h += `<div class="legenda"><h2>Legenda</h2><h3>Zone di pianificazione (Linee guida PEE, Direttiva 7/12/2022)</h3><table>${LEGENDA_ZONE.map(([a, b], i) => `<tr><td class="lz"><span class="sw z${i + 1}"></span>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>
      <h3>Soglie di danno (D.M. 9/5/2001, Tab. 2)</h3><table>${legendaSoglie(r).righe.map(x => `<tr><td class="lz">${esc(x.nome)}${x.valore ? `<br><b>${esc(x.valore)}</b>` : ''}</td><td>${esc(x.significato)}</td></tr>`).join('')}</table></div>`;
  }
  h += `<p class="nota">Riferimenti: D.M. 9/5/2001 Tab. 2; Linee guida PEE (Direttiva 7/12/2022); IMDG Code 42-24 (Ris. MSC.556(108)); ERG 2024. Stima di supporto tecnico: non costituisce atto amministrativo. App v${VERSIONE}.</p>`;
  h += `<div class="firma"><div>${esc(s.nome)}</div><div>${esc(s.qualifica)}</div><div class="linea">Firma ____________________________</div></div>`;
  $('report').innerHTML = h;
  window.print();
};

// ---------- service worker (uso offline) ----------
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
