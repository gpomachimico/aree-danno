// V2, gruppo 1 (18/11/2026): gas tossici liquefatti sotto pressione (bombola, recipiente da 1 t, cisterna).
// Modello: termine sorgente (rilascio totale in 10 min, foro in fase liquida o gassosa) + dispersione
// Britter-McQuaid per gas densi, confrontata con il gaussiano passivo (vedi engine.js, sezione 6).
// Fonti dei dati fisici:
//  - CoolProp, equazioni di stato di riferimento (HEOS), lette con la libreria thermo/chemicals di C. Bell (v. 0.6.1 / 1.5.2):
//    cloro, ammoniaca, anidride solforosa, acido cloridrico. ps = tensione di vapore in bar assoluti da −20 a 50 °C.
//  - Acido fluoridrico (non presente in CoolProp): DIPPR / Perry 8a ed. (entalpia di vaporizzazione), VDI Heat Atlas
//    (calore specifico del liquido), TRC (gas ideale, gamma); temperatura di ebollizione, densità e tensione di vapore
//    a 20 °C allineate al NIOSH Pocket Guide (BP 67 °F, Sp.Gr. 1,00, VP 783 mmHg).
//  - Controllo a 20 °C con il NIOSH Pocket Guide: cloro VP 6,8 atm, ammoniaca 8,5 atm, SO2 3,2 atm, HCl 40,5 atm.
// Soglie: LC50 ratto con la durata più vicina a 30 min (NIOSH IDLH Documentation 1994), IDLH NIOSH, LOC = IDLH/10.
(function () {
  const HEOS = 'CoolProp (equazioni di stato di riferimento) tramite la libreria thermo';
  const IDLHDOC = 'NIOSH IDLH Documentation 1994';
  const P = {
    '1017': { modelli: ['GL', 'ERG'], nome: 'cloro', pm: 70.906, Tb: 239.20, hv: 287.0, cpl: 963, rhol: 1408, gam: 1.326,
      ps: { '-20': 1.804, '-10': 2.616, 0: 3.681, 10: 5.046, 20: 6.757, 30: 8.863, 40: 11.413, 50: 14.456 },
      LC50: 293, LC50_t: '1 h', IDLH: 10, LOC: 1,
      fonte: `proprietà fisiche ${HEOS}; LC50 ratto 293 ppm 1 h (${IDLHDOC}, Back et al. 1972); IDLH 10 ppm (NIOSH)` },
    '1005': { modelli: ['GL', 'ERG'], nome: 'ammoniaca anidra', pm: 17.031, Tb: 239.83, hv: 1369.7, cpl: 4602, rhol: 610, gam: 1.307,
      ps: { '-20': 1.900, '-10': 2.906, 0: 4.292, 10: 6.148, 20: 8.570, 30: 11.665, 40: 15.545, 50: 20.330 },
      LC50: 20300, LC50_t: '40 min', IDLH: 300, LOC: 30,
      fonte: `proprietà fisiche ${HEOS}; LC50 ratto 20 300 ppm 40 min (${IDLHDOC}, Alarie 1981: a pari distanza da 30 min fra 20 e 40 min si prende il valore più basso); IDLH 300 ppm (NIOSH)`,
      avviso: 'Ammoniaca: il vapore puro è più leggero dell\'aria, ma il getto bifase da recipiente in pressione forma una nube fredda con aerosol che può restare al suolo come un gas denso. Il modello gaussiano usato qui non rappresenta questo comportamento nel campo vicino: considerare anche le distanze della Tabella 3 ERG.' },
    '1052': { modelli: ['GL', 'ERG'], nome: 'acido fluoridrico anidro', pm: 20.006, Tb: 292.6, hv: 376.8, cpl: 3043, rhol: 1000, gam: 1.399,
      ps: { '-20': 0.268, '-10': 0.391, 0: 0.556, 10: 0.770, 20: 1.044, 30: 1.406, 40: 1.898, 50: 2.555 },
      LC50: 1276, LC50_t: '1 h', IDLH: 30, LOC: 3,
      fonte: `entalpia di vaporizzazione DIPPR/Perry 8a ed., calore specifico VDI, gamma TRC (libreria thermo); ebollizione 19,4 °C, densità 1,00 e tensione di vapore 783 mmHg a 20 °C dal NIOSH Pocket Guide (tabella delle tensioni di vapore riscalata su questo valore); LC50 ratto 1276 ppm 1 h (${IDLHDOC}, Darmer et al. 1972); IDLH 30 ppm (NIOSH)`,
      avviso: 'Acido fluoridrico: bolle a 19,4 °C, quindi a temperatura ambiente il liquido rilasciato forma soprattutto una pozza che evapora. Il vapore si associa in oligomeri (HF)n e forma con l\'umidità un aerosol acido più pesante dell\'aria: il comportamento reale non è rappresentato dai modelli usati, che trattano il vapore come gas ideale monomero.' },
    '1079': { modelli: ['GL', 'ERG'], nome: 'anidride solforosa', pm: 64.064, Tb: 263.14, hv: 389.6, cpl: 1373, rhol: 1381, gam: 1.265,
      ps: { '-20': 0.635, '-10': 1.014, 0: 1.555, 10: 2.303, 20: 3.307, 30: 4.621, 40: 6.303, 50: 8.415 },
      LC50: 2520, LC50_t: '1 h', IDLH: 100, LOC: 10,
      fonte: `proprietà fisiche ${HEOS}; LC50 ratto 2520 ppm 1 h (${IDLHDOC}, Kinkead ed Einhaus 1984); IDLH 100 ppm (NIOSH)` },
    '1050': { modelli: ['GL', 'ERG'], nome: 'acido cloridrico anidro (cloruro di idrogeno)', pm: 36.461, Tb: 188.17, hv: 443.8, cpl: 2066, rhol: 837, gam: 1.399,
      ps: { '-20': 14.771, '-10': 19.759, 0: 25.893, 10: 33.336, 20: 42.273, 30: 52.922, 40: 65.564, 50: 80.586 },
      LC50: 3124, LC50_t: '1 h', IDLH: 50, LOC: 5,
      fonte: `proprietà fisiche ${HEOS}; LC50 ratto 3124 ppm 1 h (${IDLHDOC}, MacEwen e Vernot 1974); IDLH 50 ppm (NIOSH 1994; nel 2023 NIOSH ha posto in consultazione una revisione)`,
      avviso: 'Acido cloridrico anidro: temperatura critica 51,5 °C; oltre circa 45 °C il recipiente contiene un fluido quasi critico e il modello del liquido saturo perde validità.' }
  };
  for (const [u, p] of Object.entries(P)) {
    DATA.props[u] = p;
    const d = DATA.db[u];
    if (!d) continue;
    d.modelli = p.modelli;
    d.modello = p.modelli[0];
    d.propsGL = true;
    if (DATA.bleveTab && DATA.bleveTab[u]) { d.modelli = ['GL', 'BT', 'ERG']; }
  }
  // UN 1791 soluzione di ipoclorito: sviluppo di cloro a contatto con acidi (V2, 20/11/2026)
  // stesse proprietà e soglie del cloro UN 1017; massa di cloro dal cloro attivo (g/L) della soluzione
  const d1791 = DATA.db['1791'];
  DATA.props['1791'] = { ...P['1017'], modelli: ['CL', 'ERG'], nome: 'cloro sviluppato dalla soluzione di ipoclorito a contatto con acidi',
    gplDef: 150,
    fonteCl: 'cloro attivo = massa di Cl2 che l\'ipoclorito libera con un acido (NaOCl + 2 HCl → NaCl + H2O + Cl2: stesso potere ossidante); in g/L = % "commerciale" × 10, % in peso = g/L / (10 × densità) (documento tecnico "Bleach Information" sulle unità del cloro attivo; scheda tecnica Hypo 150: soluzione al 12,5–15% di NaOCl, cloro attivo 142,7–177,4 g/L, tipico 155 g/L, densità 1,20–1,24 a 20 °C)' };
  if (d1791) { d1791.modelli = ['CL', 'ERG']; d1791.modello = 'CL'; }
})();
