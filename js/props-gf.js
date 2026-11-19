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
  const GESTIS = 'banca dati GESTIS (IFA), limiti di esplosione in aria a 20 °C (EN 1839)';
  const PROPANO = { pm: 44.096, Tb: 231.04, hv: 425.6, cpl: 2456, rhol: 500, gam: 1.13,
    ps: { '-20': 2.445, '-10': 3.453, 0: 4.745, 10: 6.366, 20: 8.365, 30: 10.79, 40: 13.694, 50: 17.133 } };
  const CONT_LIQ = [['bomb', 'Bombola', 15, 6], ['ton', 'Serbatoio o recipiente a pressione da 1 t', 1000, 10], ['cist', 'Cisterna / tank-container', 20000, 25]];
  const CONT_COMP = [['bomb', 'Bombola da 50 L', 50, 6], ['pacco', 'Pacco bombole (12 × 50 L)', 600, 10], ['altro', 'Altro recipiente (capacità da inserire)', 1000, 10]];
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
  };
  for (const [u, p] of Object.entries(P)) {
    p.fonteLFL = GESTIS;
    p.contenitori = p.compresso ? CONT_COMP : CONT_LIQ;
    const old = DATA.props[u] || {};
    DATA.props[u] = { ...old, ...p };
    const d = DATA.db[u];
    if (!d) continue;
    const ha = (old.modelli || []).includes('BL') || p.rho_liq;
    d.modelli = ['JF', 'FF', 'VCE', ...(ha && !p.compresso ? ['BL'] : []), 'ERG'];
    d.modello = d.modelli[0];
  }
})();
