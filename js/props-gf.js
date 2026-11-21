// V2, gruppo 2 (19/11/2026): gas infiammabili – jet fire (JF), flash fire (FF), esplosione da nube (VCE).
// Fonti:
//  - Proprietà fisiche dei gas liquefatti: CoolProp (equazioni di stato di riferimento) tramite la libreria thermo di C. Bell;
//    ps = tensione di vapore in bar assoluti da −20 a 50 °C.
//  - Gas compressi: fattore di compressibilità Z a 20 °C da CoolProp (massa = P·V·M / (Z·R·T)).
//  - Potere calorifico inferiore: entalpie di formazione NIST WebBook (valori già usati per il BLEVE, props-3b.js),
//    propilene +20,0 kJ/mol, metano −74,87 kJ/mol, acqua gas −241,83 kJ/mol, CO2 −393,51 kJ/mol.
//  - LFL: banca dati GESTIS (IFA), limiti di esplosione in aria a 20 °C e 1013 mbar (metodo EN 1839).
(function () {
  const HEOS = 'CoolProp (equazioni di stato di riferimento) tramite la libreria thermo';
  const LHV = 'potere calorifico inferiore dalla libreria chemicals di C. Bell (entalpie di formazione standard; controllo: propano 46,3 MJ/kg come dal NIST)';
  const GESTIS = 'banca dati GESTIS (IFA), limiti di esplosione in aria a 20 °C (EN 1839)';
  const PROPANO = { pm: 44.096, Tb: 231.04, hv: 425.6, cpl: 2456, rhol: 500, gam: 1.13,
    ps: { '-20': 2.445, '-10': 3.453, 0: 4.745, 10: 6.366, 20: 8.365, 30: 10.79, 40: 13.694, 50: 17.133 } };
  const CONT_LIQ = [['bomb', 'Bombola', 15, 6], ['ton', 'Serbatoio o recipiente a pressione da 1 t', 1000, 10], ['cist', 'Cisterna / tank-container', 20000, 25]];
  const CONT_COMP = [['bomb', 'Bombola da 50 L', 50, 6], ['pacco', 'Pacco bombole (12 × 50 L)', 600, 10], ['altro', 'Altro recipiente (capacità da inserire)', 1000, 10]];
  const CONT_DISC = [['bomb', 'Bombola (circa 40–50 L)', 7, 6], ['pacco', 'Pacco bombole (12 bombole)', 84, 10], ['altro', 'Altro recipiente', 7, 6]];
  const P = {
    '1978': { ...PROPANO, nome: 'propano', dHc: 46300, LFL: 1.7,
      fonte: `proprietà fisiche ${HEOS}; potere calorifico inferiore 46,3 MJ/kg (NIST WebBook); LFL 1,7% (${GESTIS})` },
    '1011': { nome: 'butano', pm: 58.122, Tb: 272.66, hv: 385.7, cpl: 2361, rhol: 579, gam: 1.094, dHc: 45700, LFL: 1.4,
      ps: { '-20': 0.452, '-10': 0.696, 0: 1.032, 10: 1.485, 20: 2.076, 30: 2.834, 40: 3.785, 50: 4.958 },
      fonte: `proprietà fisiche ${HEOS} (n-butano); potere calorifico inferiore 45,7 MJ/kg (NIST WebBook); LFL 1,4% (${GESTIS})` },
    '1075': { ...PROPANO, nome: 'GPL (calcolo come propano)', dHc: 46000, LFL: 1.4,
      fonte: `proprietà fisiche del propano, ${HEOS} (tensione di vapore più alta della miscela, cautelativa per la portata); potere calorifico 46,0 MJ/kg (CAMEO/CHRIS, scheda LPG); LFL 1,4% del n-butano, il più basso fra i componenti (${GESTIS})` },
    '1965': { ...PROPANO, nome: 'miscela di idrocarburi gassosi liquefatti (calcolo come propano)', dHc: 46000, LFL: 1.4, rho_liq: 0.50,
      fonte: `proprietà fisiche del propano, ${HEOS} (cautelativo per la portata); potere calorifico 46,0 MJ/kg come per il GPL; LFL 1,4% del n-butano (${GESTIS})` },
    '1077': { nome: 'propilene', pm: 42.08, Tb: 225.53, hv: 438.9, cpl: 2402, rhol: 515, gam: 1.15, dHc: 45770, LFL: 1.8, rho_liq: 0.515,
      ps: { '-20': 3.056, '-10': 4.281, 0: 5.841, 10: 7.786, 20: 10.17, 30: 13.05, 40: 16.484, 50: 20.538 },
      fonte: `proprietà fisiche ${HEOS}; potere calorifico inferiore 45,8 MJ/kg da entalpie di formazione NIST WebBook (propilene +20,0 kJ/mol); LFL 1,8% (${GESTIS})` },
    '1086': { nome: 'cloruro di vinile', pm: 62.498, Tb: 259.44, hv: 357.0, cpl: 1462, rhol: 911, gam: 1.186, dHc: 18300, LFL: 3.8,
      ps: { '-20': 0.777, '-10': 1.177, 0: 1.722, 10: 2.443, 20: 3.377, 30: 4.557, 40: 6.023, 50: 7.814 },
      fonte: `proprietà fisiche dalla libreria thermo; potere calorifico inferiore 18,3 MJ/kg (NIST WebBook); LFL 3,8% (${GESTIS})` },
    '1971': { nome: 'metano (gas naturale compresso)', compresso: true, pm: 16.043, gam: 1.306, dHc: 50010, LFL: 4.4,
      Z: { 1: 0.998, 50: 0.912, 100: 0.84, 150: 0.804, 200: 0.811, 250: 0.85, 300: 0.906, 350: 0.971 }, Pdef: 200,
      fonte: `fattore di compressibilità ${HEOS.replace('tramite la libreria thermo', '')}; potere calorifico inferiore 50,0 MJ/kg da entalpie di formazione NIST WebBook (metano −74,87 kJ/mol); LFL 4,4% (${GESTIS})` },
    '1049': { nome: 'idrogeno compresso', compresso: true, pm: 2.016, gam: 1.406, dHc: 119960, LFL: 4.0,
      Z: { 1: 1.001, 50: 1.03, 100: 1.061, 150: 1.092, 200: 1.125, 250: 1.158, 300: 1.191, 350: 1.224 }, Pdef: 200,
      fonte: `fattore di compressibilità ${HEOS.replace('tramite la libreria thermo', '')}; potere calorifico inferiore 120,0 MJ/kg (NIST WebBook, acqua gas −241,83 kJ/mol); LFL 4,0% (${GESTIS})`,
      avvisoJF: 'Idrogeno: la fiamma è quasi invisibile di giorno e irraggia poco; il rischio principale è il contatto diretto con la fiamma, che può essere lunga.' }
,
    '1001': { nome: 'acetilene disciolto (in acetone, bombola con massa porosa)', compresso: true, disciolto: true, pm: 26.037, gam: 1.226, dHc: 48210, LFL: 2.3, Pdef: 15, massaDef: 7,
      fonte: `potere calorifico inferiore 48,2 MJ/kg da entalpie di formazione NIST WebBook (acetilene +226,7 kJ/mol); LFL 2,3% (IEC 80079-20-1, metodo EN 1839, scheda Air Liquide); gamma 1,23 dalla libreria thermo`,
      avviso: 'Acetilene: una bombola esposta al fuoco o a un urto può innescare la decomposizione esplosiva dell\'acetilene all\'interno, anche senza aria; la bombola può scoppiare ore dopo l\'incendio. Questo effetto non è calcolato: seguire la Guida ERG 116 e le procedure del fornitore (raffreddamento prolungato, distanza di sicurezza).' },
    // ---- aggiunte del 19/11/2026 (richiesta di Luca): altri gas infiammabili di classe 2.1 ----
    '1010': { nome: '1,3-butadiene (butadieni stabilizzati, calcolo come 1,3-butadiene)', pm: 54.09, Tb: 268.66, hv: 415.6, cpl: 2205, rhol: 621, rho_liq: 0.621, gam: 1.119, dHc: 44543, LFL: 1.4,
      ps: { '-20': 0.531, '-10': 0.813, 0: 1.203, 10: 1.724, 20: 2.404, 30: 3.272, 40: 4.358, 50: 5.694 },
      fonte: `proprietà fisiche ${HEOS}; ${LHV}; LFL 1,4% (${GESTIS})` },
    '1012': { nome: 'butilene (calcolo come 1-butene)', pm: 56.106, Tb: 266.84, hv: 392.2, cpl: 2225, rhol: 594, rho_liq: 0.594, gam: 1.11, dHc: 45291, LFL: 1.2,
      ps: { '-20': 0.575, '-10': 0.875, 0: 1.287, 10: 1.835, 20: 2.546, 30: 3.449, 40: 4.574, 50: 5.953 },
      fonte: `proprietà fisiche ${HEOS} (1-butene, LFL più basso fra gli isomeri riportati); ${LHV}; LFL 1,2% (${GESTIS})` },
    '1033': { nome: 'dimetiletere', pm: 46.068, Tb: 248.37, hv: 465.2, cpl: 2324, rhol: 669, rho_liq: 0.669, gam: 1.146, dHc: 28835, LFL: 2.7,
      ps: { '-20': 1.242, '-10': 1.85, 0: 2.667, 10: 3.733, 20: 5.096, 30: 6.8, 40: 8.897, 50: 11.438 },
      fonte: `proprietà fisiche ${HEOS}; ${LHV}; LFL 2,7% (${GESTIS})` },
    '1035': { nome: 'etano', pm: 30.069, Tb: 184.57, hv: 489.4, cpl: 3505, rhol: 340, rho_liq: 0.340, gam: 1.191, dHc: 47511, LFL: 2.4,
      ps: { '-20': 14.215, '-10': 18.588, 0: 23.867, 10: 30.172, 20: 37.655, 30: 46.551 },
      fonte: `proprietà fisiche ${HEOS}; ${LHV}; LFL 2,4% (${GESTIS}, valore che differisce da CHEMSAFE)`,
      avviso: 'Etano: temperatura critica 32,2 °C. Oltre circa 30 °C il recipiente contiene un fluido supercritico e il modello del liquido saturo perde validità (la tensione di vapore è presa a 30 °C).' },
    '1969': { nome: 'isobutano', pm: 58.122, Tb: 261.4, hv: 365.1, cpl: 2310, rhol: 557, rho_liq: 0.557, gam: 1.096, dHc: 45552, LFL: 1.5,
      ps: { '-20': 0.725, '-10': 1.084, 0: 1.57, 10: 2.206, 20: 3.022, 30: 4.047, 40: 5.312, 50: 6.849 },
      fonte: `proprietà fisiche ${HEOS}; ${LHV}; LFL 1,5% (${GESTIS}, valore che differisce da CHEMSAFE)` },
    '1063': { nome: 'cloruro di metile', pm: 50.488, Tb: 249.17, hv: 428.1, cpl: 1598, rhol: 922, rho_liq: 0.922, gam: 1.26, dHc: 12772, LFL: 7.6,
      ps: { '-20': 1.201, '-10': 1.794, 0: 2.593, 10: 3.639, 20: 4.979, 30: 6.659, 40: 8.731, 50: 11.245 },
      fonte: `proprietà fisiche ${HEOS}; ${LHV} (prodotti CO2, H2O e HCl gassosi); LFL 7,6% (${GESTIS})`,
      avviso: 'Cloruro di metile: è anche tossico (IDLH NIOSH 2000 ppm); la dispersione tossica del gas non incendiato non è calcolata in questo scenario.' },
    '1030': { nome: '1,1-difluoroetano (R152a)', pm: 66.05, Tb: 249.13, hv: 329.9, cpl: 1701, rhol: 912, rho_liq: 0.912, gam: 1.142, dHc: 16256, LFL: 4.0,
      ps: { '-20': 1.207, '-10': 1.815, 0: 2.64, 10: 3.728, 20: 5.129, 30: 6.898, 40: 9.093, 50: 11.774 },
      fonte: `proprietà fisiche ${HEOS}; ${LHV} (prodotti CO2, H2O e HF gassosi); LFL 4,0% (${GESTIS})` },
    '1040': { nome: 'ossido di etilene', pm: 44.053, Tb: 283.66, hv: 578.1, cpl: 1992, rhol: 870, rho_liq: 0.870, gam: 1.214, dHc: 27650, LFL: 3.0,
      ps: { '-20': 0.257, '-10': 0.42, 0: 0.657, 10: 0.993, 20: 1.453, 30: 2.066, 40: 2.866, 50: 3.886 },
      LC50: 4439, LC50_t: '1 h', IDLH: 800, LOC: 80, tossico: true, fonteLFLx: 'NIOSH Pocket Guide 2005-149',
      fonte: `proprietà fisiche ${HEOS} (controllo NIOSH Pocket Guide 2005-149: PM 44,1, ebollizione 51 °F = 10,6 °C, tensione di vapore 1,46 atm, densità del liquido 0,82 a 10 °C); potere calorifico inferiore 27,65 MJ/kg dalle entalpie di formazione NIST (C2H4O gas −52,6 kJ/mol, prodotti CO2 e H2O gassosi); LFL 3,0% (NIOSH Pocket Guide 2005-149; UEL 100%); LC50 ratto 1 h 4439 ppm (femmine, il valore più basso fra i sessi; maschi 5748 ppm: studio di tossicità acuta per inalazione pubblicato su PMC3139202; la documentazione IDLH NIOSH riporta la LC50 ratto 4 h di 1460 ppm, Jacobson et al. 1956); IDLH 800 ppm (NIOSH, cancerogeno "Ca")`,
      avviso: 'Ossido di etilene: è insieme infiammabile (UEL 100%: il vapore puro può decomporsi e bruciare anche senza aria) e tossico, cancerogeno per NIOSH. Bolle a 10,6 °C: a temperatura ambiente il recipiente è a bassa pressione (circa 1,5 bar a 20 °C). Riscaldato o contaminato (acidi, basi, ossidi metallici) può polimerizzare in modo violento con rottura del recipiente. I frammenti di ossido di etilene vanno più lontano di quelli del GPL (Holden e Reeves 1985). Valutare lo scenario tossico (gas tossico liquefatto) e quelli di incendio ed esplosione.' },
    '1972': { nome: 'gas naturale liquefatto refrigerato (GNL, calcolo come metano puro)', criogenico: true, pm: 16.043, Tb: 111.67, hv: 510.8, rhol: 422, dHc: 50010, LFL: 4.4,
      contCrio: [['cist', 'Cisterna criogenica / tank-container (circa 40 m³)', 16000], ['altro', 'Altro recipiente criogenico', 1000]],
      mburnTerra: 0.078, mburnAcqua: 0.147, dHcPF: 50000, EfPF: 286,
      fontePF: 'velocità di combustione sul terreno 0,078 kg/m²s e calore di combustione 50 000 kJ/kg (Babrauskas, SFPE Handbook 2002, riportato in NUREG-1805 Tab. 3-2, "LNG mostly CH4"); sull\'acqua 0,147 kg/m²s (Sandia, prove Phoenix 2009 su acqua, Blanchat et al., SAND2010-8676); potere emissivo 286 kW/m², il valore massimo misurato nella prova Sandia con pozza di 56 m sull\'acqua',
      fonte: `proprietà fisiche del metano ${HEOS} (ebollizione −161,5 °C a 1 atm, entalpia di vaporizzazione 510,8 kJ/kg, densità del liquido 422 kg/m³ all'ebollizione); il metano non è nel NIOSH Pocket Guide; potere calorifico inferiore 50,0 MJ/kg da entalpie di formazione NIST WebBook; LFL 4,4% (${GESTIS})`,
      avviso: 'GNL: il gas naturale reale contiene anche etano, propano e azoto; il calcolo come metano puro è un\'approssimazione (la nube del GNL reale è un po\' più pesante e più infiammabile). Sull\'acqua il contatto violento può dare una transizione rapida di fase (RPT): un\'esplosione fisica locale senza combustione, non calcolata. Il vapore freddo è più pesante dell\'aria finché non si riscalda oltre circa −110 °C, poi diventa più leggero.' },
    '1962': { nome: 'etilene compresso', compresso: true, pm: 28.053, gam: 1.244, dHc: 47165, LFL: 2.4,
      Z: { 1: 0.994, 10: 0.938, 25: 0.833, 40: 0.703, 50: 0.588, 55: 0.512, 60: 0.406, 65: 0.308, 70: 0.286, 75: 0.286, 80: 0.292, 90: 0.31, 100: 0.331, 125: 0.387, 150: 0.446, 200: 0.561 }, Pdef: 60,
      fonte: `fattore di compressibilità a 20 °C da CoolProp; ${LHV}; LFL 2,4% (${GESTIS}, valore che differisce da CHEMSAFE)`,
      avviso: 'Etilene: temperatura critica 9,2 °C, a temperatura ambiente il gas è supercritico; vicino alla pressione di 60–80 bar la densità varia molto con la pressione. Il calcolo dell\'efflusso come gas ideale è indicativo.' }
  };
  for (const [u, p] of Object.entries(P)) {
    p.fonteLFL = p.fonteLFLx || GESTIS;
    p.contenitori = p.disciolto ? CONT_DISC : p.compresso ? CONT_COMP : CONT_LIQ;
    const old = DATA.props[u] || {};
    DATA.props[u] = { ...old, ...p };
    const d = DATA.db[u];
    if (!d) continue;
    const ha = (old.modelli || []).includes('BL') || p.rho_liq;
    d.modelli = p.criogenico ? ['FF', 'VCE', 'PF', 'ERG'] : [...(p.tossico ? ['GL'] : []), 'JF', 'FF', 'VCE', ...(ha && !p.compresso ? ['BL'] : []), 'ERG'];
    d.modello = d.modelli[0];
  }
})();
