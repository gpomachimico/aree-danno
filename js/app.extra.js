/* Estensioni dell'app installabile: mappa, GPS, impostazioni, report stampabile, offline */
'use strict';
const VERSIONE = '1.15-beta';

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

// ---------- meteo attuale da servizio (Open-Meteo) e classe di stabilità con il metodo di ALOHA (V2, 21/11/2026) ----------
// ALOHA 5.4.4 Technical Documentation (NOAA, fornita da Luca), § 4.2.1: Tabella 10 (vento a 10 m × insolazione o copertura notturna),
// insolazione da Raphael (1962) Fs = 1111·(1 − 0,0071·CI²)·(sin φ − 0,1), soglie 851 / 526 / 176 W/m²; notte da 1 h prima del tramonto
// a 1 h dopo l'alba; con più classi possibili la più stabile; D con cielo completamente coperto, di giorno e di notte.
function elevazioneSole(lat, lon, d) {           // gradi, formule di ALOHA § 4.2.1
  const rad = Math.PI / 180, J = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5), Z = d.getUTCHours() + d.getUTCMinutes() / 60;
  const decl = 23.45 * rad * Math.sin(0.986 * (J - 80) * rad), hs = 15 * (12 - Z - lon / 15) * rad;
  const s = Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(hs);
  return Math.asin(Math.max(-1, Math.min(1, s))) / rad;
}
const ALOHA_T10 = [ // righe: vento a 10 m < 2, 2–3, 3–5, 5–6, > 6 m/s; colonne: forte, moderata, lieve, notte > 50%, notte < 50%
  ['A', 'B', 'B', 'E', 'F'], ['B', 'B', 'C', 'E', 'F'], ['B', 'C', 'C', 'D', 'E'], ['C', 'D', 'D', 'D', 'D'], ['C', 'D', 'D', 'D', 'D']];
const ALOHA_T10_TXT = [['A', 'A–B', 'B', 'E', 'F'], ['A–B', 'B', 'C', 'E', 'F'], ['B', 'B–C', 'C', 'D', 'E'], ['C', 'C–D', 'D', 'D', 'D'], ['C', 'D', 'D', 'D', 'D']];
function classeAloha({ u_ms, lat, lon, t, cc }) {
  const CI = Math.round(cc / 10), el = elevazioneSole(lat, lon, t), h = 3600e3;
  const notte = el <= 0 || elevazioneSole(lat, lon, new Date(t - h)) <= 0 || elevazioneSole(lat, lon, new Date(+t + h)) <= 0;
  const riga = u_ms < 2 ? 0 : u_ms < 3 ? 1 : u_ms < 5 ? 2 : u_ms <= 6 ? 3 : 4;
  const f1 = v => String(+v.toFixed(1)).replace('.', ',');
  if (CI >= 10) return { classe: 'D', desc: `cielo completamente coperto (copertura ${Math.round(cc)}%, indice di nuvolosità 10/10): classe D, di giorno e di notte`, el };
  if (notte) { const c = cc > 50 ? 3 : 4; return { classe: ALOHA_T10[riga][c], desc: `notte (da 1 h prima del tramonto a 1 h dopo l'alba), copertura ${Math.round(cc)}% ${cc > 50 ? '> 50%' : '< 50%'}, vento ${f1(u_ms)} m/s`, el }; }
  const sf = Math.sin(el * Math.PI / 180), Fs = sf > 0.1 ? 1111 * (1 - 0.0071 * CI * CI) * (sf - 0.1) : 0;
  const c = Fs > 851 ? 0 : Fs > 526 ? 1 : 2;
  const txt = ALOHA_T10_TXT[riga][c];
  return { classe: ALOHA_T10[riga][c], desc: `giorno, elevazione del sole ${Math.round(el)}°, indice di nuvolosità ${CI}/10, insolazione Fs = ${Math.round(Fs)} W/m² (${['forte', 'moderata', 'lieve'][c]}${Fs <= 176 ? ', sotto 176 W/m²: si usa la colonna lieve, la più stabile del giorno' : ''}), vento ${f1(u_ms)} m/s → ${txt}${txt.includes('–') ? ' (si sceglie la più stabile)' : ''}`, el };
}
let meteoServizio = null;
$('btnMeteo').onclick = () => {
  const vai = (lat, lon) => {
    $('meteoInfo').textContent = 'Richiesta al servizio meteo…';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover&wind_speed_unit=ms&timezone=auto`;
    fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(j => {
      const c = j.current, u = Math.max(+c.wind_speed_10m, 0.5);
      const st = classeAloha({ u_ms: u, lat, lon, t: new Date(), cc: c.cloud_cover });
      $('vento').value = u.toFixed(1); $('temp').value = Math.round(c.temperature_2m); $('dirVento').value = Math.round(c.wind_direction_10m) % 360; $('dirSet').value = ''; $('stab').value = st.classe;
      meteoServizio = { u: +u.toFixed(1), T: Math.round(c.temperature_2m), dir: Math.round(c.wind_direction_10m) % 360, stab: st.classe, ora: c.time, lat, lon,
        testo: `Meteo dal servizio Open-Meteo (modelli di previsione, valori "attuali" del ${c.time.replace('T', ' ')} ora locale) nel punto ${lat.toFixed(4)}, ${lon.toFixed(4)}: vento a 10 m ${u.toFixed(1).replace('.', ',')} m/s da ${Math.round(c.wind_direction_10m)}°, temperatura ${Math.round(c.temperature_2m)} °C. Classe di stabilità ${st.classe} stimata con il metodo di ALOHA (ALOHA 5.4.4 Technical Documentation, § 4.2.1, Tabella 10): ${st.desc}. Valida per pennacchi sulla terraferma: per un rilascio sull'acqua ALOHA assume condizioni stabili. Dati di modello, non misure sul posto: verificare con l'osservazione locale` };
      $('meteoInfo').textContent = meteoServizio.testo + '.';
    }).catch(e => { meteoServizio = null; $('meteoInfo').textContent = 'Servizio meteo non raggiungibile (' + e.message + '): inserire i dati a mano.'; });
  };
  if (posizione) return vai(posizione[0], posizione[1]);
  if (!navigator.geolocation) { $('meteoInfo').textContent = 'Posizione non disponibile: toccare la mappa per indicare il luogo.'; return; }
  $('meteoInfo').textContent = 'Ricerca posizione GPS…';
  navigator.geolocation.getCurrentPosition(p => { impostaPosizione(p.coords.latitude, p.coords.longitude, 'GPS', p.coords.accuracy); vai(p.coords.latitude, p.coords.longitude); },
    () => { $('meteoInfo').textContent = 'Posizione non disponibile: toccare la mappa per indicare il luogo, poi riprovare.'; }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
};
// collega il meteo del servizio ai risultati, solo se i valori nei campi non sono stati cambiati
function applicaMeteoServizio(ris) {
  if (!meteoUser || !meteoServizio) return;
  const m = meteoServizio, uguali = +num('vento') === m.u && +num('temp') === m.T && $('stab').value === m.stab && num('dirVento') === m.dir;
  for (const r of ris) if (r.meteo) {
    if (uguali) { r.meteo.origine = 'dal servizio Open-Meteo'; r.ipotesi.push(m.testo); }
    else r.ipotesi.push('Meteo inserito dall\'utente: i valori proposti dal servizio Open-Meteo sono stati modificati a mano.');
  }
}

function cerchiDaRisultato(r, g) {
  const F = formeZone(r), nomi = { III: 'Zona III', II: 'Zona II', I: 'Zona I' }, col = { III: '#f1c40f', II: '#e67e22', I: '#c0392b', PROT: '#f1c40f', ERG: '#e67e22' };
  if (!r.soloERG) { F.add(r.zone_m.III, col.III, 'III'); F.add(r.zone_m.II, col.II, 'II'); F.add(r.zone_m.I, col.I, 'I'); }
  else if (r.ergCaso) {
    if (r.ergCaso.prot_km) F.add(r.ergCaso.prot_km * 1000, col.PROT, 'PROT');
    F.z.push({ tipo: 'cerchio', r: r.ergCaso.dist, cx: 0, cy: 0, col: col.ERG, key: 'ERG' });
  }
  for (const f of F.z) f.nome = f.key === 'PROT' ? `Protezione sottovento (${r.ergCaso.per}${F.orient ? '' : ', disegnata come cerchio'})` : f.key === 'ERG' ? 'ERG: ' + r.ergCaso.etichetta : nomi[f.key];
  const zone = F.z.map(f => ({ ...f, dist: f.tipo === 'cerchio' ? f.r : f.D }));
  for (const f of formeFumi(r).z) zone.push({ ...f, linea: true, dash: f.dash });
  if (r.bl) for (const x of r.bl.righe) if (BL_DISEGNO[x.k] && x.m) zone.push({ tipo: 'cerchio', r: x.m, cx: 0, cy: 0, dist: x.m, col: BL_DISEGNO[x.k][0], nome: 'BLEVE: ' + x.nome, linea: true });
  if (r.qd) for (const x of r.qd.righe) if (x.k === 'IBD' || x.k === 'EWD') zone.push({ tipo: 'cerchio', r: x.m, cx: 0, cy: 0, dist: x.m, col: '#7d3c98', nome: 'DoD: ' + x.nome, linea: true });
  const iso = isoNumero(g);
  return { zone, iso, orient: F.orient, ux: F.ux, uy: F.uy };
}
const spostaLL = (p, x, y) => [p[0] + y / 111320, p[1] + x / (111320 * Math.cos(p[0] * Math.PI / 180))];
function disegnaMappa() {
  if (!mappa) return;
  livelloZone.clearLayers();
  const r = risultati[tabSel], g = DATA.guide[cur.guida];
  if (!posizione) impostaPosizione(mappa.getCenter().lat, mappa.getCenter().lng, 'centro della mappa (posizione non indicata)');
  const { zone, iso, orient, ux, uy } = cerchiDaRisultato(r, g);
  const pts = [];
  for (const z of zone) {
    const tip = `${z.nome}: ${z.dist} m`;
    if (z.tipo === 'poligono') {
      const ll = z.pts.map(([x, y]) => spostaLL(posizione, x, y)); pts.push(...ll);
      L.polygon(ll, { color: z.col, weight: 2, dashArray: z.dash || '8 4', fill: false }).bindTooltip(tip + ' sottovento').addTo(livelloZone);
    } else if (z.tipo === 'quadrato') {
      const ll = z.pts.map(([x, y]) => spostaLL(posizione, x, y)); pts.push(...ll);
      L.polygon(ll, { color: z.col, weight: 2, fillColor: z.col, fillOpacity: 0.28 }).bindTooltip(tip + ' sottovento').addTo(livelloZone);
      if (z.conf) {
        if (z.conf.cerchio) { L.circle(posizione, { radius: z.conf.cerchio, color: z.col, weight: 1.5, dashArray: '5 4', fill: false }).bindTooltip(`${z.nome}: linea di confidenza (vento debole, direzione incerta)`).addTo(livelloZone); pts.push(spostaLL(posizione, z.conf.cerchio, z.conf.cerchio), spostaLL(posizione, -z.conf.cerchio, -z.conf.cerchio)); }
        else for (const l of z.conf.linee) { const lc = l.map(([x, y]) => spostaLL(posizione, x, y)); pts.push(...lc); L.polygon(lc, { color: z.col, weight: 1.5, dashArray: '5 4', fill: false }).bindTooltip(`${z.nome}: linea di confidenza ±${String(+angoloConfidenza(r.meteo.vento_ms, r.meteo.stabilita).gradi.toFixed(1)).replace('.', ',')}° (formula di ALOHA)`).addTo(livelloZone); }
      }
    } else {
      const c = spostaLL(posizione, z.cx, z.cy);
      pts.push(spostaLL(c, z.r, z.r), spostaLL(c, -z.r, -z.r));
      L.circle(c, z.linea ? { radius: z.r, color: z.col, weight: 2, dashArray: z.dash || '8 4', fill: false } : { radius: z.r, color: z.col, weight: 2, fillColor: z.col, fillOpacity: 0.28 }).bindTooltip(tip).addTo(livelloZone);
    }
  }
  L.circle(posizione, { radius: iso, color: '#2c3e50', weight: 2, dashArray: '6 5', fill: false }).bindTooltip(`Isolamento iniziale ERG: ${iso} m`).addTo(livelloZone);
  pts.push(spostaLL(posizione, iso, iso), spostaLL(posizione, -iso, -iso));
  if (r.ergCaso && !r.soloERG) { L.circle(posizione, { radius: r.ergCaso.dist, color: '#2c3e50', weight: 1.5, dashArray: '2 6', fill: false }).bindTooltip(`ERG: ${r.ergCaso.etichetta} ${r.ergCaso.dist} m`).addTo(livelloZone); pts.push(spostaLL(posizione, r.ergCaso.dist, r.ergCaso.dist), spostaLL(posizione, -r.ergCaso.dist, -r.ergCaso.dist)); }
  if (orient || (r.dirVento != null && formeFumi(r).z.length)) {
    const L0 = Math.max(iso, 30) * 1.5, wb = ((r.dirVento + 180) % 360) * Math.PI / 180, ux = Math.sin(wb), uy = Math.cos(wb);
    L.polyline([posizione, spostaLL(posizione, ux * L0, uy * L0)], { color: '#2c3e50', weight: 3 }).bindTooltip(`Vento da ${Math.round(r.dirVento)}°: la nube va verso ${Math.round((r.dirVento + 180) % 360)}°`).addTo(livelloZone);
  }
  mappa.fitBounds(L.latLngBounds(pts), { animate: false, padding: [10, 10] });
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
// Definizioni degli scenari per il report (richiesta di Luca, 19/11/2026)
const DEF_SCENARI = [
  [/Pool fire/, 'Pool fire (incendio di pozza)', 'Incendio di una pozza di liquido infiammabile formata da uno spandimento: brucia il vapore che si sviluppa dalla superficie del liquido. La fiamma è stabile e dura finché il liquido non si consuma; il danno è dato dall\'irraggiamento termico stazionario.'],
  [/Jet fire/, 'Jet fire (incendio a getto)', 'Incendio di un getto di gas o di liquido infiammabile in pressione che esce da un foro, da una valvola o da una rottura e si accende subito. Forma una fiamma lunga e stabile, orientata nella direzione del getto, che dura finché il recipiente non si svuota o la perdita non viene intercettata. Il danno è dato dall\'irraggiamento termico stazionario e dal contatto diretto con la fiamma, che può investire altri recipienti (effetto domino).'],
  [/Flash fire/, 'Flash fire (incendio di nube)', 'Combustione rapida, senza onda d\'urto significativa, di una nube di gas o vapori infiammabili che si è dispersa in aria e si accende in ritardo. La fiamma percorre in pochi secondi la parte della nube con concentrazione entro i limiti di infiammabilità: il danno riguarda soprattutto chi si trova dentro la nube, per questo le soglie sono il limite inferiore di infiammabilità (LFL) e la sua metà.'],
  [/VCE/, 'VCE (Vapour Cloud Explosion, esplosione di nube di vapore)', 'Combustione di una nube infiammabile in cui il fronte di fiamma accelera, soprattutto per la presenza di ostacoli, tubazioni e zone congestionate, fino a generare un\'onda di sovrappressione. Il danno è dato dalla sovrappressione: effetti diretti sulle persone e, soprattutto, effetti indiretti per crolli e proiezione di vetri e frammenti.'],
  [/Scoppio del recipiente/, 'Scoppio del recipiente (BLEVE senza fireball)', 'Cedimento improvviso di un recipiente che contiene un gas liquefatto non infiammabile (per esempio cloro o ammoniaca) a temperatura superiore a quella di ebollizione, di solito per esposizione al fuoco. Il liquido surriscaldato vaporizza di colpo: si producono un\'onda d\'urto e la proiezione di frammenti del recipiente, mentre l\'intero contenuto passa in aria in un istante e forma una nube tossica, valutata a parte. Non si forma la fireball perché il gas non brucia.'],
  [/BLEVE/, 'BLEVE (Boiling Liquid Expanding Vapour Explosion)', 'Cedimento improvviso di un recipiente che contiene un liquido in pressione a temperatura superiore a quella di ebollizione a pressione atmosferica, di solito perché un incendio lo investe e ne indebolisce le pareti. Il liquido vaporizza istantaneamente: se è infiammabile si forma una sfera di fuoco (fireball) che dura pochi secondi; si producono anche un\'onda di pressione e la proiezione di frammenti del recipiente. L\'app calcola l\'irraggiamento della fireball.'],
  [/Gas tossico|gaussiana/, 'Dispersione tossica', 'Rilascio di una sostanza tossica che forma in aria una nube o un pennacchio trasportato dal vento. Il danno è dato dall\'inalazione: dipende dalla concentrazione e dalla durata dell\'esposizione, per questo le soglie sono LC50, IDLH e LOC e le distanze dipendono dal meteo.']
];
const defScenario = r => DEF_SCENARI.find(([re]) => re.test(r.scenario || ''));

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
  if (/Pool fire|Jet fire/.test(r.scenario)) { grand = 'Irraggiamento termico stazionario'; val = { elevata_letalita: '12,5 kW/m²', inizio_letalita: '7 kW/m²', lesioni_irreversibili: '5 kW/m²', lesioni_reversibili: '3 kW/m²' }; }
  else if (/BLEVE/.test(r.scenario) && !/Scoppio del recipiente/.test(r.scenario)) { grand = 'Irraggiamento termico variabile (dose termica della fireball)'; val = { elevata_letalita: 'raggio della fireball', inizio_letalita: '350 kJ/m²', lesioni_irreversibili: '200 kJ/m²', lesioni_reversibili: '125 kJ/m²' }; }
  else if (/TNT|VCE|Scoppio del recipiente/.test(r.scenario)) { grand = 'Sovrappressione di picco'; val = { elevata_letalita: '0,3 bar', elevata_letalita_spazi_aperti: '0,6 bar', inizio_letalita: '0,14 bar', lesioni_irreversibili: '0,07 bar', lesioni_reversibili: '0,03 bar' }; }
  else if (/Flash fire/.test(r.scenario)) { grand = 'Concentrazione in aria del gas infiammabile'; val = { elevata_letalita: `LFL = ${String(p.LFL).replace('.', ',')}% in volume`, inizio_letalita: `½ LFL = ${String(p.LFL / 2).replace('.', ',')}% in volume` }; }
  else if (/gaussiana|Gas tossico/.test(r.scenario)) { grand = 'Concentrazione in aria della sostanza tossica'; val = r.soglieRif || { LC50: `${p.LC50} ppm`, IDLH: `${p.IDLH} ppm`, LOC: `${p.LOC} ppm` }; }
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
  { const d = defScenario(r); if (d) t += `\nDEFINIZIONE DELLO SCENARIO – ${d[1]}\n${d[2]}\n`; }
  t += fumiTesto(r.fumi);
  t += qdTesto(r.qd);
  t += blTesto(r.bl);
  t += `\nRAPPRESENTAZIONE GRAFICA E VENTO\n${notaVento(r).map(x => '- ' + x).join('\n')}\n`;
  t += `\nIPOTESI\n${r.ipotesi.map(x => '- ' + x).join('\n')}\n`;
  if (r.meteo) t += `- Meteo ${r.meteo.origine}: ${r.meteo.stabilita}, ${r.meteo.vento_ms} m/s, ${r.meteo.temperatura_C} °C${r.meteo.terreno ? ', terreno ' + r.meteo.terreno.toLowerCase() : ''}\n`;
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
  { const d = defScenario(r); if (d) h += `<p class="nota"><b>${esc(d[1])}</b>: ${esc(d[2])}</p>`; }
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
  h += `<div class="schema"><h2>Schema delle zone</h2>${$('graf').innerHTML}<div class="nota">${esc($('grafnote').textContent)} Barra: scala grafica.</div></div>`;
  h += `<h2>Rappresentazione grafica e vento</h2><ul>${notaVento(r).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  if (r.bl) h += `<h2>BLEVE – onda d'urto e frammenti</h2>${blHTML(r.bl, esc).replace(/class="small"/g, 'class="nota"').replace(/class="ip"/g, '').replace(/class="warn"/g, 'class="nota"')}`;
  if (r.qd) h += `<h2>Distanze in funzione della NEM (DoD)</h2>${qdHTML(r.qd, esc).replace(/class="small"/g, 'class="nota"').replace(/class="ip"/g, '').replace(/class="warn"/g, 'class="nota"')}`;
  if (r.fumi) h += `<h2>Fumi tossici di combustione</h2>${fumiHTML(r.fumi, esc).replace(/class="small"/g, 'class="nota"').replace(/class="ip"/g, '')}`;
  h += `<h2>Ipotesi di calcolo</h2><ul>${r.ipotesi.map(x => `<li>${esc(x)}</li>`).join('')}${r.meteo ? `<li>Meteo ${r.meteo.origine}: ${r.meteo.stabilita}, ${r.meteo.vento_ms} m/s, ${r.meteo.temperatura_C} °C${r.meteo.terreno ? ', terreno ' + esc(r.meteo.terreno.toLowerCase()) : ''}</li>` : ''}</ul>`;
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
