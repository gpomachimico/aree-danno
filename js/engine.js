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

// ============ 6. GAS TOSSICI LIQUEFATTI – termine sorgente + Britter-McQuaid ============
// Correlazioni Britter-McQuaid (Workbook HSE CRR 17/1988) nella forma tabellata da AIChE/CCPS,
// Guidelines for Consequence Analysis of Chemical Releases (1999); coefficienti come in GasDispersion.jl (MIT)
function bmPlumeBeta(a) {
  const pw = (tr, v) => { for (const [lim, f] of tr) if (a <= lim) return f(a); return tr[tr.length - 1][1](a); };
  return [
    [0.10, pw([[-0.55, () => 1.75], [-0.14, x => 0.24 * x + 1.88], [Infinity, x => -0.50 * x + 1.78]])],
    [0.05, pw([[-0.68, () => 1.92], [-0.29, x => 0.36 * x + 2.16], [-0.18, () => 2.06], [Infinity, x => -0.56 * x + 1.96]])],
    [0.02, pw([[-0.69, () => 2.08], [-0.31, x => 0.45 * x + 2.39], [-0.16, () => 2.25], [Infinity, x => -0.54 * x + 2.16]])],
    [0.01, pw([[-0.70, () => 2.25], [-0.29, x => 0.49 * x + 2.59], [-0.20, () => 2.45], [Infinity, x => -0.52 * x + 2.35]])],
    [0.005, pw([[-0.67, () => 2.40], [-0.28, x => 0.59 * x + 2.80], [-0.15, () => 2.63], [Infinity, x => -0.48 * x + 2.56]])],
    [0.002, pw([[-0.69, () => 2.60], [-0.25, x => 0.39 * x + 2.87], [-0.13, () => 2.77], [Infinity, x => -0.50 * x + 2.71]])]
  ];
}
function bmPuffBeta(a) {
  const pw = (tr) => { for (const [lim, f] of tr) if (a <= lim) return f(a); return tr[tr.length - 1][1](a); };
  return [
    [0.10, pw([[-0.44, () => 0.70], [0.43, x => 0.26 * x + 0.81], [Infinity, () => 0.93]])],
    [0.05, pw([[-0.56, () => 0.85], [0.31, x => 0.26 * x + 1.00], [Infinity, x => -0.12 * x + 1.12]])],
    [0.02, pw([[-0.66, () => 0.95], [0.32, x => 0.36 * x + 1.19], [Infinity, x => -0.26 * x + 1.38]])],
    [0.01, pw([[-0.71, () => 1.15], [0.37, x => 0.34 * x + 1.39], [Infinity, x => -0.38 * x + 1.66]])],
    [0.005, pw([[-0.52, () => 1.48], [0.24, x => 0.26 * x + 1.62], [Infinity, x => -0.30 * x + 1.75]])],
    [0.002, pw([[0.27, () => 1.83], [Infinity, x => -0.32 * x + 1.92]])],
    [0.001, pw([[-0.10, () => 2.075], [Infinity, x => -0.27 * x + 2.05]])]
  ];
}
// interpolazione lineare della concentrazione in funzione di beta = log10(x')
function bmCurva(punti) {
  const p = punti.slice().sort((a, b) => a[1] - b[1]);
  const xff = Math.pow(10, p[p.length - 1][1]), A = p[p.length - 1][0] * xff * xff;
  return { p, xff, A, c: b => { for (let i = 0; i < p.length - 1; i++) if (b <= p[i + 1][1]) { const [c0, b0] = p[i], [c1, b1] = p[i + 1]; return c0 + (c1 - c0) * (b - b0) / (b1 - b0); } return p[p.length - 1][0]; } };
}
const G0 = 9.80665, R_GAS = 8.314462618, P_ATM = 101325;
// pennacchio continuo: q0 m3/s di gas puro alla densità rho_s, vento u10; restituisce c_m(x) (frazione in volume a T ambiente)
function bmPennacchio({ q0, rho_s, rho_a, u, Tp = 1 }) {
  const g0 = G0 * (rho_s - rho_a) / rho_a, D = Math.sqrt(q0 / u);
  const alfa = 0.2 * Math.log10(g0 * g0 * q0 / Math.pow(u, 5));
  let pt = bmPlumeBeta(alfa).map(([c, b]) => [c, b]);
  let xnf = 30; const xmin = Math.pow(10, Math.min(...pt.map(q => q[1])));
  if (xnf < xmin) pt = [[306 / (306 + xnf * xnf), Math.log10(xnf)], ...pt]; else xnf = xmin;
  const cv = bmCurva(pt);
  const cIso = x => { const xp = x / D; if (xp <= xnf) return xp > 0 ? 306 / (306 + xp * xp) : 1; if (xp < cv.xff) return cv.c(Math.log10(xp)); return cv.A / (xp * xp); };
  const cm = x => { const c = cIso(x); return c / (c + (1 - c) * Tp); };
  const criterio = Math.cbrt(g0 * q0 / D) / u;            // >= 0,15: comportamento da gas denso
  // semilarghezza della nube (Britter-McQuaid): L_H = D + 8 l_b + 2,5 (l_b x²)^(1/3), l_b = g0' q0 / u³
  const lb = g0 * q0 / Math.pow(u, 3), LH = x => D + 8 * lb + 2.5 * Math.cbrt(lb * x * x);
  return { cm, D, alfa, g0, criterio, denso: g0 > 0 && criterio >= 0.15, xLontano: cv.xff * D, fuoriCampo: alfa > 1 || alfa < -1, LH };
}
// nube istantanea: volume V0 m3 di gas puro
function bmNube({ V0, rho_s, rho_a, u, Tp = 1 }) {
  const g0 = G0 * (rho_s - rho_a) / rho_a, L = Math.cbrt(V0);
  const alfa = 0.5 * Math.log10(Math.max(g0, 1e-9) * L / (u * u));
  const cv = bmCurva(bmPuffBeta(alfa)), xnf = Math.pow(10, cv.p[0][1]);
  const cIso = x => { const xp = x / L; if (xp <= xnf) return Math.max(xp > 0 ? 3.24 / (3.24 + xp * xp) : 1, 0.1); if (xp < cv.xff) return cv.c(Math.log10(xp)); return cv.A / (xp * xp); };
  const cm = x => { const c = cIso(x); return c / (c + (1 - c) * Tp); };
  const criterio = Math.sqrt(Math.max(g0, 0) * L) / u;      // >= 0,2: comportamento da gas denso
  // raggio della nube: R² = R0² + 1,2 (g0' V0)^(1/2) t, con t = x / u
  const R0 = Math.cbrt(3 * V0 / (4 * Math.PI)), Rn = x => Math.sqrt(R0 * R0 + 1.2 * Math.sqrt(Math.max(g0, 0) * V0) * x / u);
  return { cm, L, alfa, g0, criterio, denso: g0 > 0 && criterio >= 0.2, xLontano: cv.xff * L, fuoriCampo: alfa > 1 || alfa < -1, Rn };
}
// coefficienti di dispersione per nubi istantanee (AIChE/CCPS 1999): sigma_x = sigma_y
const PUFF_CCPS = {
  A: x => [0.18 * Math.pow(x, 0.92), 0.60 * Math.pow(x, 0.75)],
  B: x => [0.14 * Math.pow(x, 0.92), 0.53 * Math.pow(x, 0.73)],
  C: x => [0.10 * Math.pow(x, 0.92), 0.34 * Math.pow(x, 0.71)],
  D: x => [0.06 * Math.pow(x, 0.92), 0.15 * Math.pow(x, 0.70)],
  E: x => [0.04 * Math.pow(x, 0.92), 0.10 * Math.pow(x, 0.65)],
  F: x => [0.02 * Math.pow(x, 0.89), 0.05 * Math.pow(x, 0.61)]
};
function psatBar(tab, T_C) {
  const k = Object.keys(tab).map(Number).sort((a, b) => a - b);
  const t = Math.min(Math.max(T_C, k[0]), k[k.length - 1]);
  for (let i = 0; i < k.length - 1; i++) if (t <= k[i + 1]) {
    const a = k[i], b = k[i + 1], ia = 1 / (a + 273.15), ib = 1 / (b + 273.15), it = 1 / (t + 273.15);
    return Math.exp(Math.log(tab[a]) + (Math.log(tab[b]) - Math.log(tab[a])) * (it - ia) / (ib - ia));
  }
  return tab[k[k.length - 1]];
}
// portata da foro: fase liquida (Bernoulli, Cd 0,61) o fase gassosa (efflusso isoentropico, Cd 1)
function portataForo({ fase, d_mm, P_Pa, T_K, prop, h_m = 1 }) {
  const A = Math.PI * Math.pow(d_mm / 1000, 2) / 4;
  if (fase === 'liq') {
    const dP = Math.max(P_Pa - P_ATM, 0) + prop.rhol * G0 * h_m;
    return { Q: 0.61 * A * Math.sqrt(2 * prop.rhol * dP), dP, Cd: 0.61 };
  }
  const g = prop.gam, M = prop.pm / 1000, rc = Math.pow(2 / (g + 1), g / (g - 1));
  if (P_Pa <= P_ATM) return { Q: 0, Cd: 1, critico: false };
  if (P_ATM / P_Pa <= rc)
    return { Q: A * P_Pa * Math.sqrt(g * M / (R_GAS * T_K) * Math.pow(2 / (g + 1), (g + 1) / (g - 1))), Cd: 1, critico: true };
  const r = P_ATM / P_Pa, rho = P_Pa * M / (R_GAS * T_K);
  return { Q: A * Math.sqrt(2 * rho * P_Pa * g / (g - 1) * (Math.pow(r, 2 / g) - Math.pow(r, (g + 1) / g))), Cd: 1, critico: false };
}
const X_MAX_GL = 10000;   // limite di calcolo: validità dei coefficienti di Briggs (fino a 10 km)
const itn = (v, n) => v.toFixed(n).replace('.', ',');
function gasLiquefatto({ massa_kg, scenario = 'tot', d_mm = 10, h_m = 1, P_bar = null, prop, soglie_ppm, stabilita = 'D', u_ms = 5, T_C = 20, sostanza = '', nota_soglie = '', contenitore = '' }) {
  const Ta = T_C + 273.15, M = prop.pm / 1000;
  const comp = !!prop.compresso;                               // gas compresso (non liquefatto)
  if (comp && scenario === 'liq') throw 'Gas compresso: non esiste una fase liquida, scegliere il foro in fase gassosa o il rilascio totale';
  const Psat = comp ? P_bar * 1e5 : psatBar(prop.ps, T_C) * 1e5;
  const rho_a = P_ATM * 0.028964 / (R_GAS * Ta);
  // frazione di flash adiabatica (CCPS 1999): f = 1 - exp(-cp (T - Tb) / hv)
  const flash = comp ? 0 : Ta > prop.Tb ? 1 - Math.exp(-prop.cpl * (Ta - prop.Tb) / (prop.hv * 1000)) : 0;
  let Q, T_s, Ts_K, ipoSorg, fo = null;
  if (scenario === 'tot') {
    Q = massa_kg / 600; T_s = 600; Ts_K = comp ? Ta : Math.min(prop.Tb, Ta);
    ipoSorg = `Rilascio dell'intero contenuto (${massa_kg} kg) come gas in 10 minuti: criterio dello scenario peggiore di 40 CFR 68.25 (EPA, Risk Management Program) per i gas ${comp ? 'compressi' : 'liquefatti sotto pressione'}`;
  } else {
    fo = portataForo({ fase: scenario, d_mm, P_Pa: Psat, T_K: Ta, prop, h_m });
    Q = fo.Q; if (!(Q > 0)) throw 'Con questa temperatura la pressione nel recipiente non supera quella atmosferica: rilascio in fase gassosa non calcolabile';
    T_s = massa_kg / Q; Ts_K = scenario === 'liq' ? Math.min(prop.Tb, Ta) : Ta;
    ipoSorg = scenario === 'liq'
      ? `Foro di ${d_mm} mm in fase liquida: portata di Bernoulli con Cd 0,61 (CCPS 1999), Δp = pressione di vapore a ${T_C} °C meno la pressione atmosferica, più un battente di ${h_m} m; portata costante, cautelativa per il liquido saturo che vaporizza nel foro`
      : comp ? `Foro di ${d_mm} mm: efflusso isoentropico ${fo.critico ? 'critico (sonico)' : 'subcritico'} con Cd 1 (cautelativo), pressione ${itn(P_bar, 0)} bar tenuta costante (la pressione reale cala durante lo svuotamento: portata e durata sono una stima cautelativa della portata iniziale)`
      : `Foro di ${d_mm} mm in fase gassosa: efflusso isoentropico ${fo.critico ? 'critico (sonico)' : 'subcritico'} con Cd 1 (cautelativo), pressione iniziale = tensione di vapore a ${T_C} °C, costante (la pressione reale cala per il raffreddamento del liquido)`;
  }
  const durata = T_s;
  // nube sorgente: vapore puro alla temperatura di ebollizione (fase liquida) o ambiente (fase gas)
  const rho_s = P_ATM * M / (R_GAS * Ts_K), Tp = Ts_K / Ta;
  const q0 = Q / rho_s, mNube = Math.min(massa_kg, Q * T_s);
  const pl = bmPennacchio({ q0, rho_s, rho_a, u: u_ms, Tp });
  const nu = bmNube({ V0: mNube / rho_s, rho_s, rho_a, u: u_ms, Tp });
  // gaussiano passivo, sorgente puntiforme al suolo (Briggs rurale)
  const sig = BRIGGS_RURALE[stabilita];
  const ppmG = x => { const [sy, sz] = sig(x); return Q / (Math.PI * sy * sz * u_ms) / (P_ATM * M / (R_GAS * Ta)) * 1e6; };
  // nube istantanea passiva (CCPS 1999, coefficienti puff): picco al suolo al centro della nube
  const sigP = PUFF_CCPS[stabilita];
  const ppmGi = x => { const [sy, sz] = sigP(x); return 2 * mNube / (Math.pow(2 * Math.PI, 1.5) * sy * sy * sz) / (P_ATM * M / (R_GAS * Ta)) * 1e6; };
  const d = {}, gov = {}, avvisi = [];
  // accoppiamento: Britter-McQuaid fino alla fine delle sue curve (rapporto 0,002), poi gaussiano passivo
  // con sorgenti virtuali distinte per sigma_y (stessa larghezza della nube densa) e sigma_z (stessa massa e concentrazione)
  const kgm3 = ppm => ppm * 1e-6 * P_ATM * M / (R_GAS * Ta);
  const inv = (f, v) => bisect(x => v - f(x), 1e-3, 1e6);     // x tale che f(x) = v (f crescente)
  const accPenn = () => {
    const xt = pl.xLontano, C = kgm3(pl.cm(xt) * 1e6);
    const sy0 = pl.LH(xt) * 2 / Math.sqrt(2 * Math.PI), sz0 = Q / (Math.PI * sy0 * C * u_ms);
    const xy = inv(x => sig(x)[0], sy0), xz = inv(x => sig(x)[1], sz0);
    const f = x => { if (x <= xt) return pl.cm(x) * 1e6; const sy = sig(x - xt + xy)[0], sz = sig(x - xt + xz)[1]; return Q / (Math.PI * sy * sz * u_ms) / kgm3(1); };
    return { f, xt };
  };
  const accNube = () => {
    const xt = nu.xLontano, C = kgm3(nu.cm(xt) * 1e6);
    const sy0 = nu.Rn(xt) / Math.SQRT2, sz0 = 2 * mNube / (Math.pow(2 * Math.PI, 1.5) * sy0 * sy0 * C);
    const xy = inv(x => sigP(x)[0], sy0), xz = inv(x => sigP(x)[1], sz0);
    const f = x => { if (x <= xt) return nu.cm(x) * 1e6; const sy = sigP(x - xt + xy)[0], sz = sigP(x - xt + xz)[1]; return 2 * mNube / (Math.pow(2 * Math.PI, 1.5) * sy * sy * sz) / kgm3(1); };
    return { f, xt };
  };
  const curve = [
    ['pennacchio continuo', pl.denso ? accPenn() : { f: ppmG, xt: 0 }, pl.denso],
    ['nube istantanea', nu.denso ? accNube() : { f: ppmGi, xt: 0 }, nu.denso]
  ];
  for (const [k, ppm] of Object.entries(soglie_ppm)) {
    // un rilascio di durata finita non supera né il pennacchio stazionario né la nube istantanea: si prende il minore
    const cs = curve.map(([n, c, den]) => [distanzaSoglia(c.f, ppm, 0.01, X_MAX_GL), n, den, c.xt]).filter(c => c[0] !== null);
    if (!cs.length) { d[k] = null; gov[k] = '–'; continue; }
    cs.sort((a, b) => a[0] - b[0]);
    const [x, n, den, xt] = cs[0];
    d[k] = r1(x);
    if (!Number.isFinite(x)) { gov[k] = 'oltre 10 km'; continue; }
    gov[k] = `${n}: ${den ? (x <= xt ? 'gas denso (Britter-McQuaid)' : 'gas denso, poi passivo oltre ' + Math.round(xt) + ' m') : 'gas passivo (gaussiano)'}`;
  }
  if (!pl.denso && !nu.denso) avvisi.push(rho_s < rho_a ? `Il vapore puro (${itn(rho_s, 2)} kg/m³) è più leggero dell'aria (${itn(rho_a, 2)} kg/m³): calcolo con il solo modello gaussiano passivo. Un rilascio bifase con aerosol (tipico dell'ammoniaca) può però formare una nube fredda più pesante dell'aria che resta al suolo.` : 'Criterio di Britter-McQuaid non soddisfatto: nube a comportamento passivo, calcolo con il modello gaussiano');
  if (pl.fuoriCampo || nu.fuoriCampo) avvisi.push('Parametro α di Britter-McQuaid fuori dal campo −1…1 delle correlazioni: risultato del modello di gas denso indicativo');
  if (Object.values(d).some(v => v !== null && !Number.isFinite(v))) avvisi.push('Una o più soglie sono superate oltre 10 km: oltre questa distanza i coefficienti di dispersione di Briggs non sono validati e l\'ipotesi di meteo costante per ore di trasporto non è realistica. Il valore è riportato come "> 10 km": valutare l\'estensione con la Tabella 3 ERG o con modelli specifici.');
  if (!comp && scenario !== 'gas' && flash < 0.01) avvisi.push(`Alla temperatura di ${itn(T_C, 0)} °C il liquido è sotto o vicino alla temperatura di ebollizione (${itn(prop.Tb - 273.15, 1)} °C): non vaporizza per flash ma forma una pozza che evapora. Considerare tutto il rilascio in aria, come fa il calcolo, è molto cautelativo.`);
  if (durata > 3600) avvisi.push(`Durata del rilascio stimata ${Math.round(durata / 60)} min: le soglie LC50 riferite a 30–60 min sono superate in durata, la zona I è sottostimata per esposizioni lunghe`);
  return {
    scenario: `Gas tossico liquefatto – meteo ${stabilita}${u_ms}`, sostanza,
    distanze_m: d, oltre_m: X_MAX_GL,
    zone_m: { I: d.LC50, II: d.IDLH, III: d.LOC },
    interno: { Q, T_s, mNube },
    dettagli: {
      portata_kg_s: +Q.toFixed(3), durata_rilascio_min: +(durata / 60).toFixed(1), massa_kg: massa_kg,
      [comp ? 'pressione_bar' : 'tensione_vapore_bar']: +(Psat / 1e5).toFixed(2), ...(comp ? {} : { frazione_flash: +flash.toFixed(3) }),
      densita_nube_kg_m3: +rho_s.toFixed(2), densita_aria_kg_m3: +rho_a.toFixed(2),
      criterio_BM_continuo: +pl.criterio.toFixed(3), criterio_BM_istantaneo: +nu.criterio.toFixed(3),
      ...Object.fromEntries(Object.keys(soglie_ppm).map(k => ['modello_' + k, gov[k]]))
    },
    ipotesi: [
      contenitore,
      ipoSorg,
      comp ? '' : `Frazione di flash ${itn(flash * 100, 1)}% (bilancio adiabatico CCPS 1999); si assume tutto il rilasciato in aria come vapore e aerosol, senza ricaduta di liquido al suolo (cautelativo)`,
      `Nube alla sorgente: vapore puro a ${itn(Ts_K - 273.15, 1)} °C, densità ${itn(rho_s, 2)} kg/m³ contro ${itn(rho_a, 2)} kg/m³ dell'aria; correzione non isoterma di Britter-McQuaid`,
      'Gas denso: correlazioni di Britter e McQuaid (Workbook on the Dispersion of Dense Gases, HSE 1988) nella forma di AIChE/CCPS (1999), terreno piano senza ostacoli, concentrazioni medie su 10 min, vento a 10 m; il modello non dipende dalla classe di stabilità',
      `Durata finita del rilascio (${itn(durata / 60, 1)} min): la concentrazione non supera né quella del pennacchio stazionario con la stessa portata né quella della nube istantanea con la stessa massa; per ciascun modello si adotta il minore dei due risultati`,
      `Oltre la fine delle curve di Britter-McQuaid (rapporto di concentrazione 0,002) la nube è trattata come passiva: modello gaussiano con sorgenti virtuali scelte in modo che, nel punto di passaggio, larghezza della nube e concentrazione siano quelle del modello di gas denso, classe ${stabilita}, vento ${u_ms} m/s; pennacchio con coefficienti di Briggs (rurale), nube istantanea con coefficienti CCPS 1999 (concentrazione di picco). Se il criterio di gas denso non è soddisfatto si usa solo il modello gaussiano con sorgente puntiforme al suolo`,
      nota_soglie
    ].filter(Boolean),
    avvisi
  };
}
function gasLiquefattoMeteo(param, meteo = METEO_PREDEFINITO) {
  return meteo.map(m => {
    const r = gasLiquefatto({ ...param, stabilita: m.stabilita, u_ms: m.u_ms, T_C: m.T_C ?? 20 });
    r.avvisi = [...controllaMeteo(m), ...r.avvisi];
    r.meteo = { stabilita: m.stabilita, vento_ms: m.u_ms, temperatura_C: m.T_C ?? 20, origine: meteo === METEO_PREDEFINITO ? 'predefinito' : 'inserito dall\'utente' };
    return r;
  });
}

// ============ 7. GAS INFIAMMABILI – jet fire, flash fire, esplosione da nube (VCE) ============
// Jet fire: lunghezza di fiamma da API 521 (forma di Beychok, L = 0,00326 Q^0,478 con Q in W, potere calorifico inferiore),
// sorgente puntiforme a metà fiamma (API 521), frazione irraggiata di Chamberlain (1987): F = 0,21 e^(−0,00323 u_eq) + 0,11
function jetFire({ massa_kg, fase = 'gas', d_mm = 10, h_m = 1, P_bar = null, prop, T_C = 20, sostanza = '', contenitore = '' }) {
  const comp = !!prop.compresso, Ta = T_C + 273.15, M = prop.pm / 1000;
  if (comp && fase === 'liq') throw 'Gas compresso: scegliere il foro in fase gassosa';
  const P = comp ? P_bar * 1e5 : psatBar(prop.ps, T_C) * 1e5;
  const fo = portataForo({ fase, d_mm, P_Pa: P, T_K: Ta, prop, h_m });
  const Q = fo.Q; if (!(Q > 0)) throw 'Con questa temperatura la pressione nel recipiente non supera quella atmosferica: il getto non si forma';
  let F, ueq = null, uj = null;
  if (fase === 'gas') {
    const g = prop.gam, A = Math.PI * Math.pow(d_mm / 1000, 2) / 4;
    let pj, Tj;
    if (fo.critico) { Tj = Ta * 2 / (g + 1); pj = P * Math.pow(2 / (g + 1), g / (g - 1)); }
    else { pj = P_ATM; Tj = Ta * Math.pow(P_ATM / P, (g - 1) / g); }
    const rhoj = pj * M / (R_GAS * Tj); uj = Q / (rhoj * A);
    ueq = uj + (pj - P_ATM) / (rhoj * uj);                           // Birch et al.: velocità equivalente del getto espanso
    F = 0.21 * Math.exp(-0.00323 * ueq) + 0.11;
  } else F = 0.32;                                                   // getto bifase: valore massimo della correlazione (cautelativo)
  const QkW = Q * prop.dHc, L = 0.00326 * Math.pow(QkW * 1000, 0.478);
  const s = SOGLIE.irraggiamento_kWm2, d = {};
  for (const k of ['elevata_letalita', 'inizio_letalita', 'lesioni_irreversibili', 'lesioni_reversibili'])
    d[k] = r1(Math.max(L, L / 2 + Math.sqrt(F * QkW / (4 * Math.PI * s[k]))));
  const durata = massa_kg / Q, avvisi = [];
  if (durata < 120) avvisi.push(`Il getto dura circa ${Math.max(1, Math.round(durata))} s: le soglie di irraggiamento stazionario presuppongono esposizioni prolungate, quindi le distanze sono cautelative`);
  if (prop.avvisoJF) avvisi.push(prop.avvisoJF);
  return {
    scenario: 'Jet fire', sostanza,
    distanze_m: d,
    zone_m: { I: d.elevata_letalita, II: d.lesioni_irreversibili, III: d.lesioni_reversibili },
    dettagli: { portata_kg_s: +Q.toFixed(3), durata_getto_min: +(durata / 60).toFixed(1), potenza_MW: +(QkW / 1000).toFixed(1), lunghezza_fiamma_m: +L.toFixed(1), frazione_irraggiata: +F.toFixed(3), ...(ueq ? { velocita_equivalente_ms: Math.round(ueq) } : {}) },
    ipotesi: [
      contenitore,
      fase === 'liq'
        ? `Foro di ${d_mm} mm in fase liquida: portata di Bernoulli con Cd 0,61 (CCPS 1999), Δp = tensione di vapore a ${T_C} °C meno la pressione atmosferica più un battente di ${h_m} m, portata costante (cautelativa)`
        : `Foro di ${d_mm} mm in fase gassosa: efflusso isoentropico ${fo.critico ? 'critico (sonico)' : 'subcritico'} con Cd 1, pressione ${itn(P / 1e5, 1)} bar tenuta costante (cautelativo)`,
      `Lunghezza di fiamma ${itn(L, 1)} m da API 521 nella forma di Beychok (L = 0,00326·Q^0,478, Q = portata × potere calorifico inferiore ${prop.dHc} kJ/kg, in W): correlazione per fiamme di torcia, cautelativa per i getti ad alta velocità`,
      fase === 'liq'
        ? 'Frazione di calore irraggiata 0,32 (valore massimo della correlazione di Chamberlain 1987, cautelativo per il getto bifase)'
        : `Frazione di calore irraggiata ${itn(F, 2)} (Chamberlain 1987, F = 0,21·e^(−0,00323·u_eq) + 0,11, con velocità equivalente del getto espanso ${Math.round(ueq)} m/s secondo Birch et al.)`,
      'Modello a sorgente puntiforme (API 521): emittente a metà fiamma, getto orizzontale diretto verso il bersaglio, trasmissività atmosferica 1 (cautelativo); entro la lunghezza della fiamma si assume sempre la zona di sicuro impatto',
      'Distanze misurate dal punto di rilascio; soglie D.M. 9/5/2001 (irraggiamento stazionario); vento non considerato'
    ].filter(Boolean),
    avvisi
  };
}
// Flash fire: dispersione (Britter-McQuaid + gaussiano, come per i gas tossici) fino a LFL e ½ LFL (D.M. 9/5/2001)
function flashFire(param) {
  const p = param.prop, lfl = p.LFL * 1e4;
  const r = gasLiquefatto({ ...param, soglie_ppm: { LFL: lfl, mezzo_LFL: lfl / 2 } });
  r.scenario = `Flash fire – meteo ${param.stabilita}${param.u_ms}`;
  r.distanze_m = { elevata_letalita: r.distanze_m.LFL, inizio_letalita: r.distanze_m.mezzo_LFL };
  r.zone_m = { I: r.distanze_m.elevata_letalita, II: r.distanze_m.inizio_letalita, III: undefined };
  r.dettagli.modello_elevata_letalita = r.dettagli.modello_LFL; r.dettagli.modello_inizio_letalita = r.dettagli.modello_mezzo_LFL;
  delete r.dettagli.modello_LFL; delete r.dettagli.modello_mezzo_LFL;
  r.avvisi = r.avvisi.filter(a => !/LC50/.test(a)).map(a => /più leggero dell'aria/.test(a)
    ? `Il gas (${itn(r.dettagli.densita_nube_kg_m3, 2)} kg/m³) è più leggero dell'aria: all'aperto tende a salire e a diluirsi. Il modello gaussiano al suolo usato qui non tiene conto del galleggiamento e sovrastima l'estensione al suolo della nube (cautelativo).`
    : a);
  r.ipotesi.push(`Soglie D.M. 9/5/2001 per il flash fire: elevata letalità al limite inferiore di infiammabilità (LFL ${itn(p.LFL, 1)}% in volume), inizio letalità a ½ LFL (${itn(p.LFL / 2, 2)}%). La soglia ½ LFL copre anche le fluttuazioni di concentrazione, perché i modelli danno valori medi. Fonte LFL: ${p.fonteLFL}`);
  r.ipotesi.push('Per il flash fire le Linee guida PEE non fissano una soglia per la Zona III (da definire in sede di pianificazione)');
  r.ipotesi.push('Innesco ritardato: la nube brucia quando ha raggiunto la massima estensione; distanze misurate dal punto di rilascio, sottovento');
  return r;
}
function flashFireMeteo(param, meteo = METEO_PREDEFINITO) {
  return meteo.map(m => {
    const r = flashFire({ ...param, stabilita: m.stabilita, u_ms: m.u_ms, T_C: m.T_C ?? 20 });
    r.avvisi = [...controllaMeteo(m), ...r.avvisi];
    r.meteo = { stabilita: m.stabilita, vento_ms: m.u_ms, temperatura_C: m.T_C ?? 20, origine: meteo === METEO_PREDEFINITO ? 'predefinito' : 'inserito dall\'utente' };
    return r;
  });
}
// VCE: massa infiammabile dalla dispersione, metodo del TNT equivalente con rendimento η (EPA 40 CFR 68.25(e): 10% scenario peggiore)
const E_TNT_kJkg = 4680;
function vce(param) {
  const p = param.prop, eta = param.eta ?? 0.1;
  const ff = flashFire(param), xL = ff.distanze_m.elevata_letalita;
  const { Q, mNube } = ff.interno;
  let Mf, ipoM;
  if (param.scenario === 'tot') { Mf = param.massa_kg; ipoM = `Massa nella nube: tutto il contenuto (${param.massa_kg} kg), come nello scenario peggiore di 40 CFR 68.25(e)`; }
  else {
    const xl = Number.isFinite(xL) && xL ? xL : 0;
    Mf = Math.min(mNube, Q * xl / param.u_ms);
    ipoM = `Massa nella nube infiammabile: portata × tempo di transito fino alla distanza del LFL (${Q.toFixed(2).replace('.', ',')} kg/s × ${Math.round(xl)} m / ${param.u_ms} m/s = ${itn(Mf, 1)} kg), al massimo la massa rilasciata`;
  }
  const W = eta * Mf * p.dHc / E_TNT_kJkg, k = Math.cbrt(Math.max(W, 1e-9));
  const off = Number.isFinite(xL) && xL ? xL / 2 : 0;
  const pr = R => kingeryBulmash_bar(R / k), s = SOGLIE.sovrappressione_bar, d = {};
  for (const key of ['elevata_letalita', 'elevata_letalita_spazi_aperti', 'inizio_letalita', 'lesioni_irreversibili', 'lesioni_reversibili']) {
    const R = W > 0 ? distanzaSoglia(pr, s[key], 0.2 * k, 198.5 * k) : null;
    d[key] = R === null ? null : r1(R + off);
  }
  const avvisi = [...ff.avvisi.filter(a => !/10 km/.test(a))];
  if (!(Mf > 0)) avvisi.push('La concentrazione non raggiunge il limite inferiore di infiammabilità: nessuna nube infiammabile, esplosione non possibile in queste condizioni');
  return {
    scenario: `Esplosione da nube (VCE) – meteo ${param.stabilita}${param.u_ms}`, sostanza: param.sostanza,
    distanze_m: d,
    zone_m: { I: d.elevata_letalita, II: d.lesioni_irreversibili, III: d.lesioni_reversibili },
    dettagli: { massa_infiammabile_kg: +Mf.toFixed(1), rendimento: eta, massa_TNT_kg: +W.toFixed(1), distanza_LFL_m: Number.isFinite(xL) ? xL : null, centro_esplosione_m: Math.round(off) },
    ipotesi: [
      param.contenitore,
      ff.ipotesi[1],
      ipoM,
      `Metodo del TNT equivalente: W = η × massa × potere calorifico (${p.dHc} kJ/kg) / ${E_TNT_kJkg} kJ/kg, con rendimento η = ${Math.round(eta * 100)}% (${eta >= 0.1 ? 'valore di 40 CFR 68.25(e) per lo scenario peggiore EPA' : 'valore tipico per nubi in campo aperto con poca congestione, CCPS'}) = ${itn(W, 1)} kg di TNT`,
      'Sovrappressione di picco con le curve Kingery-Bulmash (1984) per esplosione emisferica al suolo, forma di Swisdak (1994). Nel campo vicino il metodo del TNT sovrastima le sovrappressioni di una deflagrazione',
      `Centro dell'esplosione a metà della distanza del LFL (${Math.round(off)} m sottovento): le distanze sono misurate dal punto di rilascio (cautelativo sottovento)`,
      `Dispersione per la nube infiammabile come per il flash fire (Britter-McQuaid e gaussiano, classe ${param.stabilita}, vento ${param.u_ms} m/s)`,
      'Soglie D.M. 9/5/2001 (sovrappressione di picco); frammenti e proiezioni non calcolati'
    ].filter(Boolean),
    avvisi
  };
}
function vceMeteo(param, meteo = METEO_PREDEFINITO) {
  return meteo.map(m => {
    const r = vce({ ...param, stabilita: m.stabilita, u_ms: m.u_ms, T_C: m.T_C ?? 20 });
    r.avvisi = [...controllaMeteo(m), ...r.avvisi];
    r.meteo = { stabilita: m.stabilita, vento_ms: m.u_ms, temperatura_C: m.T_C ?? 20, origine: meteo === METEO_PREDEFINITO ? 'predefinito' : 'inserito dall\'utente' };
    return r;
  });
}

// ============ 8. FUMI TOSSICI DI COMBUSTIONE (incendi stazionari: pool fire, jet fire) ============
// Gaussiano (Briggs rurale) con innalzamento del pennacchio caldo di Briggs (formule ISC3, EPA 1995):
// F = g·Qc / (π·cp·ρ·Ta); neutro/instabile Δh = 1,6·F^(1/3)·x^(2/3)/u fino a x_f = 49·F^(5/8) (F < 55) o 119·F^(2/5);
// stabile Δh = 2,6·(F/(u·s))^(1/3), s = (g/Ta)·dθ/dz con dθ/dz 0,020 K/m (E) e 0,035 K/m (F)
const DTHETA = { E: 0.020, F: 0.035 };
function innalzamento(F, u, stab, Ta, x) {
  const xf = F < 55 ? 49 * Math.pow(F, 5 / 8) : 119 * Math.pow(F, 2 / 5);
  let dh = 1.6 * Math.cbrt(F) * Math.pow(Math.min(x, xf), 2 / 3) / u;
  if (DTHETA[stab]) { const s = G0 / Ta * DTHETA[stab]; dh = Math.min(dh, 2.6 * Math.cbrt(F / (u * s))); }
  return dh;
}
// distanza massima alla quale g(x) >= s, per funzioni non monotone (picco a distanza)
function distanzaMaxSoglia(g, s, xmin, xmax) {
  const N = 400, lx = Math.log(xmin), dl = (Math.log(xmax) - lx) / N;
  let ultimo = -1;
  for (let i = 0; i <= N; i++) if (g(Math.exp(lx + i * dl)) >= s) ultimo = i;
  if (ultimo < 0) return null;
  if (ultimo === N) return Infinity;
  return bisect(x => g(x) - s, Math.exp(lx + ultimo * dl), Math.exp(lx + (ultimo + 1) * dl));
}
function fumiIncendio({ portata_kgs, Qc_kW, pm, soglie_ppm, meteo = METEO_PREDEFINITO }) {
  const M = pm / 1000;
  return meteo.map(m => {
    const Ta = (m.T_C ?? 20) + 273.15, u = m.u_ms, sig = BRIGGS_RURALE[m.stabilita];
    const rho = P_ATM * 0.028964 / (R_GAS * Ta), F = G0 * Qc_kW * 1000 / (Math.PI * 1005 * rho * Ta);
    const kgppm = P_ATM * M / (R_GAS * Ta) * 1e-6;
    const C = (x, H) => { const [sy, sz] = sig(x); return portata_kgs / (Math.PI * sy * sz * u) * Math.exp(-H * H / (2 * sz * sz)) / kgppm; };
    const con = {}, senza = {};
    for (const [k, ppm] of Object.entries(soglie_ppm)) {
      con[k] = r1(distanzaMaxSoglia(x => C(x, innalzamento(F, u, m.stabilita, Ta, x)), ppm, 1, 10000));
      senza[k] = r1(distanzaSoglia(x => C(x, 0), ppm, 1, 10000));
    }
    return { meteo: `${m.stabilita}${u}`, con, senza, dh_finale_m: Math.round(innalzamento(F, u, m.stabilita, Ta, 1e9)), F_m4s3: +F.toFixed(1) };
  });
}

// ============ 9. ESPLOSIVI – distanze DoD in funzione della NEM ============
// DoD 6055.09-M Vol. 3 (2012, ripreso dal DESR 6055.09): Tabelle V3.E3.T10 (HD 1.2.1), T12 (HD 1.2.2), T14 (HD 1.3);
// Vol. 1 Tabella V1.E10.T4: distanze di allontanamento in emergenza del personale non indispensabile
const LB = 2.204623, FT = 0.3048;
function qdDoD({ div, nem_kg, nemArticolo_kg = null, ferrovia = false, grossoCalibro = false }) {
  const W = nem_kg * LB, lnW = Math.log(Math.max(W, 1e-9)), righe = [], ipotesi = [], avvisi = [];
  const m = ft => Math.round(ft * FT);
  const dv = div.slice(0, 3);
  const DEF = { '1.2': 'Divisione 1.2 (IMDG 2.1.1.4): materie e oggetti che presentano un pericolo di proiezione ma non di esplosione in massa', '1.3': 'Divisione 1.3 (IMDG 2.1.1.4): materie e oggetti che presentano un pericolo di incendio con un leggero pericolo di spostamento d\'aria o di proiezione, o di entrambi, ma senza pericolo di esplosione in massa' };
  if (DEF[dv]) ipotesi.push(DEF[dv]);
  if (dv === '1.2') {
    const sub = nemArticolo_kg === null ? '1.2.1' : nemArticolo_kg > 0.73 ? '1.2.1' : '1.2.2';
    const Wc = Math.min(W, 500000);
    const l = Math.log(Wc);
    let ibd = sub === '1.2.1' ? -735.186 + 237.559 * l - 4.274 * l * l : 101.649 - 15.934 * l + 5.173 * l * l;
    const min = sub === '1.2.1' ? 200 : 100;
    ibd = Math.max(ibd, min);
    const ptrd = Math.max(0.6 * ibd, min);
    righe.push({ k: 'IBD', nome: 'Distanza dagli edifici abitati (IBD)', m: m(ibd), descr: `HD ${sub}: protezione dai frammenti pericolosi per le persone negli edifici e all'aperto` });
    righe.push({ k: 'PTRD', nome: 'Distanza dalle vie di traffico pubblico (PTRD)', m: m(ptrd), descr: '60% della IBD' });
    righe.push({ k: 'EWD', nome: 'Allontanamento in emergenza del personale non indispensabile', m: 762, descr: 'HD 1.2: 2500 ft' });
    ipotesi.push(`Sottodivisione DoD HD ${sub}: ${nemArticolo_kg === null ? 'NEM del singolo articolo non indicata, si assume HD 1.2.1 (distanze maggiori, cautelativo)' : `NEM del singolo articolo ${String(nemArticolo_kg).replace('.', ',')} kg ${sub === '1.2.1' ? '> 0,73 kg' : '≤ 0,73 kg'} (criterio DoD sulla NEM; la classificazione DoD considera anche la frammentazione)`}`);
    ipotesi.push(sub === '1.2.1' ? 'IBD = −735,186 + 237,559·ln W − 4,274·(ln W)² ft, minimo 200 ft (EQN V3.E3.T10-1), W = NEM totale in libbre' : 'IBD = 101,649 − 15,934·ln W + 5,173·(ln W)² ft, minimo 100 ft (EQN V3.E3.T12-1), W = NEM totale in libbre');
    if (W > 500000) avvisi.push('NEM oltre 500 000 lb (227 t): le tabelle DoD per HD 1.2 rimandano a criteri specifici; il valore è calcolato a 500 000 lb e va considerato un minimo');
    avvisi.push('L\'IMDG non distingue HD 1.2.1, 1.2.2 e 1.2.3 (sottodivisioni DoD). Per gli articoli HD 1.2.3 il DoD applica le distanze HD 1.3 con un minimo legato ai frammenti dell\'articolo, non calcolato qui.');
  } else if (dv === '1.3') {
    let d;
    if (W < 1000) d = 75;
    else if (W < 96000) d = Math.exp(2.47 + 0.2368 * lnW + 0.00384 * lnW * lnW);
    else if (W < 1000000) d = Math.exp(7.2297 - 0.5984 * lnW + 0.04046 * lnW * lnW);
    else d = 8 * Math.cbrt(W);
    d = Math.max(d, 75);
    const Dfb = 3.97 * Math.cbrt(1.2 * nem_kg);
    righe.push({ k: 'IBD', nome: 'Distanza dagli edifici abitati e dalle vie di traffico pubblico (IBD = PTRD)', m: m(d), descr: 'HD 1.3: protezione dall\'irraggiamento e dai frammenti dell\'incendio di massa' });
    righe.push({ k: 'FB', nome: 'Raggio della palla di fuoco (fireball)', m: Math.round(Dfb / 2), descr: `diametro ${Math.round(Dfb)} m = 3,97·(1,2·NEM)^(1/3)` });
    righe.push({ k: 'EWD', nome: 'Allontanamento in emergenza del personale non indispensabile', m: Math.max(2 * m(d), 183), descr: 'HD 1.3: doppio della IBD, minimo 600 ft (183 m)' });
    ipotesi.push('IBD = PTRD (Tabella V3.E3.T14): 75 ft sotto 1000 lb; exp[2,47 + 0,2368·ln W + 0,00384·(ln W)²] ft fino a 96 000 lb; exp[7,2297 − 0,5984·ln W + 0,04046·(ln W)²] ft fino a 1 000 000 lb; 8·W^(1/3) ft oltre; minimo 75 ft');
    ipotesi.push('Diametro della fireball D = 3,97·(1,2·Q)^(1/3) m, con Q = NEM in kg e il 20% di margine di sicurezza previsto dal DoD');
  } else if (dv === '1.1' || dv === '1.5') {
    const v = grossoCalibro ? 1219 : nem_kg <= 226.8 ? 762 : ferrovia ? 1524 : 1219;
    righe.push({ k: 'EWD', nome: 'Allontanamento in emergenza del personale non indispensabile (trasporto)', m: v, descr: grossoCalibro ? 'bombe e proiettili di calibro ≥ 127 mm: 4000 ft' : nem_kg <= 226.8 ? 'NEM ≤ 226,8 kg (500 lb): 2500 ft' : ferrovia ? 'NEM > 226,8 kg su carro ferroviario: 5000 ft' : 'NEM > 226,8 kg, trasporto non ferroviario: 4000 ft' });
  } else if (dv === '1.4') {
    righe.push({ k: 'EWD', nome: 'Allontanamento in emergenza del personale non indispensabile', m: 92, descr: 'HD 1.4: 300 ft (91,5 m)' });
  } else if (dv === '1.6') {
    righe.push({ k: 'EWD', nome: 'Allontanamento in emergenza del personale non indispensabile', m: 762, descr: 'HD 1.6: 2500 ft' });
  }
  if (righe.length) {
    ipotesi.push('Distanze di allontanamento in emergenza: DoD 6055.09-M Vol. 1, Tabella V1.E10.T4 ("Emergency Withdrawal Distances for Nonessential Personnel"); non considerano la gittata dei propulsori');
    if (dv === '1.2' || dv === '1.3') ipotesi.push('IBD e PTRD: DoD 6055.09-M Vol. 3 (2012), ripreso dal DESR 6055.09 (2019–2024). Sono distanze di sicurezza per la pianificazione dei depositi, usate qui come riferimento per l\'evento in transito');
  }
  return { righe, ipotesi, avvisi, nem_kg };
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

const api = { SOGLIE, METEO_PREDEFINITO, poolFire, bleve, gaussiano, gaussianoMeteo, controllaMeteo, tnt, kingeryBulmash_bar, kinneyGraham_bar, fattoreVistaCilindro, evaporazioneEPA, gasLiquefatto, gasLiquefattoMeteo, jetFire, flashFire, flashFireMeteo, vce, vceMeteo, fumiIncendio, innalzamento, qdDoD, bmPennacchio, bmNube, portataForo, psatBar };
if (typeof module !== 'undefined') module.exports = api;
if (typeof window !== 'undefined') window.MotoreAree = api;
