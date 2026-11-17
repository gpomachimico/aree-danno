/*
 * Motore di calcolo – App aree di danno e di sicurezza (MVP v0.1)
 * Soglie: D.M. 9 maggio 2001, Tab. 2. Zone: Linee guida PEE (Direttiva 7/12/2022).
 * I risultati sono stime di supporto tecnico (parere tecnico), non atti amministrativi.
 * Ogni funzione restituisce { distanze, zone, ipotesi, dettagli }.
 */
'use strict';

// ---------- utilità ----------
function bisect(f, lo, hi, it = 200) {
  // trova x in [lo,hi] con f(x)=0, f(lo)>0>f(hi)
  for (let i = 0; i < it; i++) {
    const m = 0.5 * (lo + hi);
    if (f(m) > 0) lo = m; else hi = m;
  }
  return 0.5 * (lo + hi);
}
// distanza alla quale una grandezza decrescente g(x) scende al valore soglia s
function distanzaSoglia(g, s, xmin, xmax) {
  if (g(xmin) < s) return null;          // soglia non raggiunta (oltre il bordo sorgente)
  if (g(xmax) >= s) return Infinity;     // oltre il dominio di calcolo
  return bisect(x => g(x) - s, xmin, xmax);
}
const r1 = x => (x === null ? null : Number.isFinite(x) ? Math.round(x) : x);

// ---------- soglie ----------
const SOGLIE = {
  irraggiamento_kWm2: { elevata_letalita: 12.5, inizio_letalita: 7, lesioni_irreversibili: 5, lesioni_reversibili: 3, strutture: 12.5 },
  fireball_kJm2: { inizio_letalita: 350, lesioni_irreversibili: 200, lesioni_reversibili: 125 },
  sovrappressione_bar: { elevata_letalita: 0.3, elevata_letalita_spazi_aperti: 0.6, inizio_letalita: 0.14, lesioni_irreversibili: 0.07, lesioni_reversibili: 0.03, strutture: 0.3 },
  fonte: 'D.M. 9 maggio 2001, Tabella 2 (verificata su G.U.)'
};

// ============ 1. POOL FIRE – modello solid flame NISTIR 6546 ============
// Fattore di vista massimo cilindro verticale (raggio R, altezza H) verso bersaglio a distanza L dall'asse
function fattoreVistaCilindro(R, H, L) {
  const S = L / R, h = H / R;
  if (S <= 1) return 1;
  const A = (h * h + S * S + 1) / (2 * S), B = (1 + S * S) / (2 * S);
  const Fv = (1 / (Math.PI * S)) * Math.atan(h / Math.sqrt(S * S - 1))
    - (h / (Math.PI * S)) * Math.atan(Math.sqrt((S - 1) / (S + 1)))
    + (A * h / (Math.PI * S * Math.sqrt(A * A - 1))) * Math.atan(Math.sqrt((A + 1) * (S - 1) / ((A - 1) * (S + 1))));
  const Fh = ((B - 1 / S) / (Math.PI * Math.sqrt(B * B - 1))) * Math.atan(Math.sqrt((B + 1) * (S - 1) / ((B - 1) * (S + 1))))
    - ((A - 1 / S) / (Math.PI * Math.sqrt(A * A - 1))) * Math.atan(Math.sqrt((A + 1) * (S - 1) / ((A - 1) * (S + 1))));
  return Math.sqrt(Fv * Fv + Fh * Fh);
}

function poolFire({ volume_m3, densita_rel, mburn, dHc_kJkg, area_m2 = null, spessore_m = 0.01, Ef = 100, sostanza = '' }) {
  const confinata = area_m2 !== null;
  const A = confinata ? area_m2 : volume_m3 / spessore_m;
  const D = Math.sqrt(4 * A / Math.PI), R = D / 2;
  const qf = mburn * dHc_kJkg;                                  // HRR per unità di area, kW/m²
  const H = D >= 20 ? 6.4e-3 * qf : 0.35 * Math.exp(-0.05 * D) * D * qf / (4 * Ef);
  const massa = volume_m3 * densita_rel * 1000;
  const durata_s = massa / (mburn * A);
  const q = L => Ef * fattoreVistaCilindro(R, H, L);             // tau = 1, eps = 1
  const s = SOGLIE.irraggiamento_kWm2;
  const d = {};
  for (const k of ['elevata_letalita', 'inizio_letalita', 'lesioni_irreversibili', 'lesioni_reversibili'])
    d[k] = r1(distanzaSoglia(q, s[k], R * 1.0001, 5000));
  return {
    scenario: 'Pool fire', sostanza,
    distanze_m: d,
    zone_m: { I: d.elevata_letalita, II: d.lesioni_irreversibili, III: d.lesioni_reversibili },
    dettagli: { area_pozza_m2: +A.toFixed(1), diametro_m: +D.toFixed(1), HRR_unitaria_kWm2: r1(qf), altezza_fiamma_luminosa_m: +H.toFixed(1), HRR_MW: +(qf * A / 1000).toFixed(1), durata_incendio_min: +(durata_s / 60).toFixed(1), flusso_al_bordo_kWm2: +q(R * 1.05).toFixed(1) },
    ipotesi: [
      confinata ? `Pozza confinata, area ${A} m²` : `Spandimento non confinato su superficie piana, spessore ${spessore_m * 100} cm (EPA OCA 1999)`,
      'Modello a fiamma solida cilindrica verticale, NISTIR 6546 (McGrattan, Baum, Hamins 2000)',
      `Potere emissivo Ef = ${Ef} kW/m², emissività e trasmissività atmosferica = 1 (cautelativo)`,
      `Velocità di combustione ${mburn} kg/m²s, calore di combustione ${dHc_kJkg} kJ/kg (NISTIR 6546, Tab. 1)`,
      'Assenza di vento (fiamma verticale); bersaglio a livello del suolo orientato verso la fiamma',
      'Distanze misurate dal centro della pozza; soglie D.M. 9/5/2001 (irraggiamento stazionario)'
    ]
  };
}

// ============ 2. BLEVE / FIREBALL – correlazioni di Roberts / CCPS ============
function bleve({ massa_kg, dHc_kJkg = 46000, P_MPa = 1.7, sostanza = '' }) {
  const M = massa_kg;
  const D = 5.8 * Math.cbrt(M);
  const t = M < 30000 ? 0.45 * Math.cbrt(M) : 2.6 * Math.pow(M, 1 / 6);
  const Hc = 0.75 * D;
  const f = 0.27 * Math.pow(P_MPa, 0.32);
  const SEP = f * M * dHc_kJkg / (Math.PI * D * D * t);         // kW/m²
  const Rf = D / 2;
  const q = x => SEP * (Rf * Rf) / (x * x + Hc * Hc);           // tau = 1, bersaglio orientato
  const dose = x => q(x) * t;                                   // kJ/m²
  const s = SOGLIE.fireball_kJm2;
  const d = { elevata_letalita: r1(Rf) };
  for (const k of ['inizio_letalita', 'lesioni_irreversibili', 'lesioni_reversibili'])
    d[k] = r1(distanzaSoglia(dose, s[k], 0, 20000));
  return {
    scenario: 'BLEVE / fireball', sostanza,
    distanze_m: d,
    // le zone non possono essere più piccole del raggio della fireball
    zone_m: { I: d.elevata_letalita, II: Math.max(d.lesioni_irreversibili ?? 0, d.elevata_letalita), III: Math.max(d.lesioni_reversibili ?? 0, d.elevata_letalita) },
    dettagli: { diametro_fireball_m: r1(D), raggio_fireball_m: r1(Rf), durata_s: +t.toFixed(1), altezza_centro_m: r1(Hc), frazione_irraggiata: +f.toFixed(3), potere_emissivo_kWm2: r1(SEP), dose_a_terra_sotto_fireball_kJm2: r1(dose(0)) },
    ipotesi: [
      `Massa coinvolta nella fireball = intero contenuto (${M} kg)`,
      'Diametro D = 5,8·M^(1/3); durata t = 0,45·M^(1/3) (M < 30 t) o 2,6·M^(1/6); centro a 0,75·D (Roberts / CCPS)',
      `Frazione irraggiata f = 0,27·P^0,32 con P = ${P_MPa} MPa al cedimento (Roberts)`,
      'Fireball statica a diametro massimo per tutta la durata; trasmissività atmosferica = 1 (cautelativo)',
      'Soglie D.M. 9/5/2001 per irraggiamento variabile (dose termica kJ/m²); elevata letalità = raggio della fireball',
      'Frammenti e onda d\'urto non calcolati: vedere distanze ERG/tabella BLEVE'
    ]
  };
}

// ============ 3. DISPERSIONE GAUSSIANA – evaporazione da pozza ============
const BRIGGS_RURALE = {
  A: x => [0.22 * x / Math.sqrt(1 + 1e-4 * x), 0.20 * x],
  B: x => [0.16 * x / Math.sqrt(1 + 1e-4 * x), 0.12 * x],
  C: x => [0.11 * x / Math.sqrt(1 + 1e-4 * x), 0.08 * x / Math.sqrt(1 + 2e-4 * x)],
  D: x => [0.08 * x / Math.sqrt(1 + 1e-4 * x), 0.06 * x / Math.sqrt(1 + 1.5e-3 * x)],
  E: x => [0.06 * x / Math.sqrt(1 + 1e-4 * x), 0.03 * x / (1 + 3e-4 * x)],
  F: x => [0.04 * x / Math.sqrt(1 + 1e-4 * x), 0.016 * x / (1 + 3e-4 * x)]
};

function evaporazioneEPA({ area_m2, u_ms, pm, Pv_kPa, T_K }) {
  // EPA OCA 1999, eq. 3-3: QR[lb/min] = 0.284 U^0.78 MW^(2/3) A[ft²] VP[mmHg] / (82.05 T)
  const A_ft2 = area_m2 * 10.7639, VP_mmHg = Pv_kPa * 7.50062;
  const QR_lbmin = 0.284 * Math.pow(u_ms, 0.78) * Math.pow(pm, 2 / 3) * A_ft2 * VP_mmHg / (82.05 * T_K);
  return QR_lbmin * 0.45359237 / 60;                            // kg/s
}

function gaussiano({ volume_m3, densita_soluzione, frazione_tossico = 1, pm, Pv_kPa, T_K = 293.15,
                     soglie_ppm, stabilita = 'D', u_ms = 5, area_m2 = null, spessore_m = 0.01, sostanza = '', nota_soglie = '' }) {
  const A = area_m2 ?? volume_m3 / spessore_m;
  const Dp = Math.sqrt(4 * A / Math.PI);
  const Q = evaporazioneEPA({ area_m2: A, u_ms, pm, Pv_kPa, T_K });     // kg/s
  const massaTossico = volume_m3 * densita_soluzione * 1000 * frazione_tossico;
  const durata_min = massaTossico / Q / 60;
  const sig = BRIGGS_RURALE[stabilita];
  // sorgente virtuale: sigma_y(xv) = Dp / 4,3
  const xv = bisect(x => Dp / 4.3 - sig(x)[0], 1e-3, 1e5);
  const C_mgm3 = x => { const [sy, sz] = sig(x + xv); return Q * 1e6 / (Math.PI * sy * sz * u_ms); };
  const ppm2mg = ppm => ppm * pm / (22.414 * T_K / 273.15);
  const d = {};
  for (const [k, ppm] of Object.entries(soglie_ppm)) d[k] = r1(distanzaSoglia(C_mgm3, ppm2mg(ppm), 1, 50000));
  return {
    scenario: `Dispersione gaussiana – meteo ${stabilita}${u_ms}`, sostanza,
    distanze_m: d,
    zone_m: { I: d.LC50, II: d.IDLH, III: d.LOC },
    dettagli: { area_pozza_m2: +A.toFixed(1), portata_evaporazione_kg_s: +Q.toFixed(4), portata_kg_min: +(Q * 60).toFixed(2), durata_rilascio_min: +durata_min.toFixed(0), sorgente_virtuale_m: +xv.toFixed(1), conc_100m_ppm: r1(C_mgm3(100) / ppm2mg(1)) },
    ipotesi: [
      area_m2 ? `Pozza confinata ${A} m²` : `Spandimento non confinato, spessore ${spessore_m * 100} cm (EPA OCA 1999)`,
      `Evaporazione EPA OCA 1999 eq. 3-3, tensione di vapore ${Pv_kPa} kPa a ${(T_K - 273.15).toFixed(0)} °C`,
      `Meteo: classe di stabilità ${stabilita}, vento ${u_ms} m/s; coefficienti di dispersione di Briggs, terreno aperto (rurale)`,
      'Rilascio continuo a livello del suolo, concentrazione sull\'asse del pennacchio a livello del suolo, stato stazionario',
      'Gas trattato come passivo: per gas più pesanti dell\'aria il modello è indicativo nel campo vicino',
      nota_soglie
    ].filter(Boolean)
  };
}

// ============ 4. TNT EQUIVALENTE – Kingery-Bulmash semplificato (Swisdak 1994) ============
// Esplosione emisferica di TNT al suolo; sovrappressione incidente in kPa, Z in m/kg^(1/3)
const KB_SUPERFICIE = [
  { zmin: 0.2,  zmax: 2.9,   c: [7.2106, -2.1069, -0.3229, 0.1117, 0.0685] },
  { zmin: 2.9,  zmax: 23.8,  c: [7.5938, -3.0523, 0.40977, 0.0261, -0.01267] },
  { zmin: 23.8, zmax: 198.5, c: [6.0536, -1.4066, 0, 0, 0] }
];
function kingeryBulmash_bar(Z) {
  const z = Math.min(Math.max(Z, 0.2), 198.5);
  const seg = KB_SUPERFICIE.find(r => z >= r.zmin && z <= r.zmax) || KB_SUPERFICIE[2];
  const L = Math.log(z);
  const lnP = seg.c.reduce((acc, ci, i) => acc + ci * L ** i, 0);
  return Math.exp(lnP) / 100;                                    // kPa -> bar
}
// mantenuta per confronto
function kinneyGraham_bar(Z) {
  const r = 808 * (1 + (Z / 4.5) ** 2) / (Math.sqrt(1 + (Z / 0.048) ** 2) * Math.sqrt(1 + (Z / 0.32) ** 2) * Math.sqrt(1 + (Z / 1.35) ** 2));
  return r * 1.01325;
}

function tnt({ neq_kg, fattore_tnt, fonte_fattore = '', sostanza = '' }) {
  const W = neq_kg * fattore_tnt;
  const k = Math.cbrt(W);
  const p = R => kingeryBulmash_bar(R / k);
  const s = SOGLIE.sovrappressione_bar;
  const d = {};
  for (const key of ['elevata_letalita', 'elevata_letalita_spazi_aperti', 'inizio_letalita', 'lesioni_irreversibili', 'lesioni_reversibili'])
    d[key] = r1(distanzaSoglia(p, s[key], 0.2 * k, 198.5 * k));
  return {
    scenario: 'Esplosione – TNT equivalente', sostanza,
    distanze_m: d,
    zone_m: { I: d.elevata_letalita, II: d.lesioni_irreversibili, III: d.lesioni_reversibili },
    dettagli: { massa_TNT_kg: +W.toFixed(1) },
    ipotesi: [
      `NEQ ${neq_kg} kg × fattore TNT ${fattore_tnt} (${fonte_fattore}) = ${W.toFixed(1)} kg TNT`,
      'Esplosione emisferica al suolo; sovrappressione di picco incidente con le curve Kingery-Bulmash (1984) nella forma semplificata di Swisdak (1994)',
      'Campo libero, terreno piano, atmosfera standard; nessun effetto di schermo o canalizzazione tra container',
      'Soglie D.M. 9/5/2001 (sovrappressione di picco); frammenti e proiezioni non calcolati'
    ]
  };
}

// ============ 5. METEO ============
// Valori predefiniti: D5 e F2; l'utente può inserire vento, temperatura e stabilità reali.
const METEO_PREDEFINITO = [ { stabilita: 'D', u_ms: 5, T_C: 20 }, { stabilita: 'F', u_ms: 2, T_C: 20 } ];
function controllaMeteo({ stabilita, u_ms }) {
  const avvisi = [];
  if (u_ms < 1) avvisi.push('Vento < 1 m/s: il modello gaussiano non è affidabile in calma di vento');
  if ((stabilita === 'E' || stabilita === 'F') && u_ms > 5) avvisi.push(`Classe ${stabilita} con vento > 5 m/s: combinazione poco realistica (Pasquill)`);
  if (stabilita === 'A' && u_ms > 3) avvisi.push('Classe A con vento > 3 m/s: combinazione poco realistica (Pasquill)');
  return avvisi;
}
function gaussianoMeteo(param, meteo = METEO_PREDEFINITO) {
  return meteo.map(m => {
    const r = gaussiano({ ...param, stabilita: m.stabilita, u_ms: m.u_ms, T_K: (m.T_C ?? 20) + 273.15 });
    const avvisi = controllaMeteo(m);
    if (param.Pv_rif_T_C !== undefined && Math.abs((m.T_C ?? 20) - param.Pv_rif_T_C) > 2)
      avvisi.push(`Tensione di vapore riferita a ${param.Pv_rif_T_C} °C: a ${m.T_C} °C inserire il valore reale (es. da SDS del carico)`);
    r.avvisi = avvisi;
    r.meteo = { stabilita: m.stabilita, vento_ms: m.u_ms, temperatura_C: m.T_C ?? 20, origine: meteo === METEO_PREDEFINITO ? 'predefinito' : 'inserito dall\'utente' };
    return r;
  });
}

const api = { SOGLIE, METEO_PREDEFINITO, poolFire, bleve, gaussiano, gaussianoMeteo, controllaMeteo, tnt, kingeryBulmash_bar, kinneyGraham_bar, fattoreVistaCilindro, evaporazioneEPA };
if (typeof module !== 'undefined') module.exports = api;
if (typeof window !== 'undefined') window.MotoreAree = api;
