// Sostanze che reagiscono con l'acqua (Tabella 2 ERG 2024) e clorammine da ipoclorito + ammoniaca (V2, 20/11/2026)
// Gas prodotto: quello della Tabella 2 ERG; resa stechiometrica da formula (scelta di Claude, dichiarata nel report).
(function () {
  const IDLHDOC = 'NIOSH IDLH Documentation 1994';
  const PA = { C: 12.011, H: 1.008, O: 15.999, N: 14.007, Cl: 35.453, Br: 79.904, I: 126.904, F: 18.998, S: 32.06, P: 30.974, Si: 28.085,
    Ti: 47.867, Al: 26.982, B: 10.81, Sb: 121.76, Cr: 51.996, Ca: 40.078, Mg: 24.305, Na: 22.990, K: 39.098, Sr: 87.62, Li: 6.94, U: 238.029 };
  const pmFormula = f => { let m = 0; for (const [, el, n] of f.matchAll(/([A-Z][a-z]?)(\d*)/g)) { if (!PA[el]) throw 'elemento ' + el; m += PA[el] * (n ? +n : 1); } return m; };
  const P = DATA.props;
  // gas prodotti: soglie e fonti
  const GAS = {
    HCl: { nome: 'acido cloridrico (HCl)', pm: 36.461, LC50: P['1050'].LC50, LC50_t: P['1050'].LC50_t, IDLH: P['1050'].IDLH, LOC: P['1050'].LOC, fonte: 'soglie della voce UN 1050 (LC50 ratto 3124 ppm 1 h, MacEwen e Vernot 1974; IDLH 50 ppm NIOSH)' },
    HF: { nome: 'acido fluoridrico (HF)', pm: 20.006, LC50: P['1052'].LC50, LC50_t: P['1052'].LC50_t, IDLH: P['1052'].IDLH, LOC: P['1052'].LOC, fonte: 'soglie della voce UN 1052' },
    HBr: { nome: 'acido bromidrico (HBr)', pm: 80.912, LC50: 2858, LC50_t: '1 h', IDLH: 30, LOC: 3, fonte: `LC50 ratto 2858 ppm 1 h (${IDLHDOC}, Back et al. 1972); IDLH 30 ppm (NIOSH Pocket Guide; il profilo IDLH NIOSH 2025, pubbl. 2025-108, propone 35 ppm: si usa il valore minore)` },
    SO2: { nome: 'anidride solforosa (SO2)', pm: 64.064, LC50: P['1079'].LC50, LC50_t: P['1079'].LC50_t, IDLH: P['1079'].IDLH, LOC: P['1079'].LOC, fonte: 'soglie della voce UN 1079' },
    H2S: { nome: 'acido solfidrico (H2S)', pm: 34.08, LC50: 713, LC50_t: '1 h', IDLH: 100, LOC: 10, fonte: `LC50 ratto 713 ppm 1 h (${IDLHDOC}, Back et al. 1972); IDLH 100 ppm (NIOSH)` },
    PH3: { nome: 'fosfina (PH3)', pm: 33.998, LC50: 11, LC50_t: '4 h', IDLH: 50, LOC: 5, fonte: `LC50 ratto 11 ppm 4 h (${IDLHDOC}, Waritz e Brown 1975; unico dato LC50 sul ratto, per questo minore dell'IDLH); IDLH 50 ppm (NIOSH)` },
    NH3: { nome: 'ammoniaca (NH3)', pm: 17.031, LC50: P['1005'].LC50, LC50_t: P['1005'].LC50_t, IDLH: P['1005'].IDLH, LOC: P['1005'].LOC, fonte: 'soglie della voce UN 1005' },
    NO2: { nome: 'biossido di azoto (NO2)', pm: 46.006, LC50: 138, LC50_t: '30 min', IDLH: 13, LOC: 1.3, fonte: `LC50 ratto 138 ppm 30 min (${IDLHDOC}, Gray et al. 1954); IDLH 13 ppm (NIOSH IDLH Value Profile 2017-202 e Pocket Guide; il valore del 1994 era 20 ppm)` },
    HCN: { nome: 'acido cianidrico (HCN)', pm: 27.026, LC50: 160, LC50_t: '30 min', IDLH: 50, LOC: 5, fonte: `LC50 ratto 160 ppm 30 min (${IDLHDOC}, Levin et al. 1987); IDLH 50 ppm (NIOSH)` }
  };
  // UN: [formula di calcolo, nome, [[gas, moli di gas per mole]], nota]
  const T = {
    '1162': ['C2H6Cl2Si', 'dimetildiclorosilano', [['HCl', 2]]], '1183': ['C2H6Cl2Si', 'etildiclorosilano', [['HCl', 2]]],
    '1196': ['C2H5Cl3Si', 'etiltriclorosilano', [['HCl', 3]]], '1242': ['CH4Cl2Si', 'metildiclorosilano', [['HCl', 2]]],
    '1250': ['CH3Cl3Si', 'metiltriclorosilano', [['HCl', 3]]], '1295': ['HCl3Si', 'triclorosilano', [['HCl', 3]]],
    '1298': ['C3H9ClSi', 'trimetilclorosilano', [['HCl', 1]]], '1305': ['C2H3Cl3Si', 'viniltriclorosilano', [['HCl', 3]]],
    '1724': ['C3H5Cl3Si', 'alliltriclorosilano', [['HCl', 3]]], '1728': ['C5H11Cl3Si', 'amiltriclorosilano', [['HCl', 3]]],
    '1747': ['C4H9Cl3Si', 'butiltriclorosilano', [['HCl', 3]]], '1753': ['C6H4Cl4Si', 'clorofeniltriclorosilano', [['HCl', 3]]],
    '1762': ['C6H9Cl3Si', 'cicloeseniltriclorosilano', [['HCl', 3]]], '1763': ['C6H11Cl3Si', 'cicloesiltriclorosilano', [['HCl', 3]]],
    '1766': ['C6H3Cl5Si', 'diclorofeniltriclorosilano', [['HCl', 3]]], '1767': ['C4H10Cl2Si', 'dietildiclorosilano', [['HCl', 2]]],
    '1769': ['C12H10Cl2Si', 'difenildiclorosilano', [['HCl', 2]]], '1771': ['C12H25Cl3Si', 'dodeciltriclorosilano', [['HCl', 3]]],
    '1781': ['C16H33Cl3Si', 'esadeciltriclorosilano', [['HCl', 3]]], '1784': ['C6H13Cl3Si', 'esiltriclorosilano', [['HCl', 3]]],
    '1799': ['C9H19Cl3Si', 'noniltriclorosilano', [['HCl', 3]]], '1800': ['C18H37Cl3Si', 'ottadeciltriclorosilano', [['HCl', 3]]],
    '1801': ['C8H17Cl3Si', 'ottiltriclorosilano', [['HCl', 3]]], '1804': ['C6H5Cl3Si', 'feniltriclorosilano', [['HCl', 3]]],
    '1816': ['C3H7Cl3Si', 'propiltriclorosilano', [['HCl', 3]]], '2434': ['C14H14Cl2Si', 'dibenzildiclorosilano', [['HCl', 2]]],
    '2435': ['C8H10Cl2Si', 'etilfenildiclorosilano', [['HCl', 2]]], '2437': ['C7H8Cl2Si', 'metilfenildiclorosilano', [['HCl', 2]]],
    '1818': ['SiCl4', 'tetracloruro di silicio', [['HCl', 4]]],
    '1716': ['C2H3BrO', 'bromuro di acetile', [['HBr', 1]]], '1717': ['C2H3ClO', 'cloruro di acetile', [['HCl', 1]]],
    '1752': ['C2H2Cl2O', 'cloruro di cloroacetile (solo il cloro acilico si idrolizza)', [['HCl', 1]]],
    '1765': ['C2HCl3O', 'cloruro di dicloroacetile (solo il cloro acilico si idrolizza)', [['HCl', 1]]],
    '1815': ['C3H5ClO', 'cloruro di propionile', [['HCl', 1]]], '2353': ['C4H7ClO', 'cloruro di butirrile', [['HCl', 1]]],
    '2395': ['C4H7ClO', 'cloruro di isobutirrile', [['HCl', 1]]],
    '1725': ['AlBr3', 'bromuro di alluminio anidro', [['HBr', 3]]], '1726': ['AlCl3', 'cloruro di alluminio anidro', [['HCl', 3]]],
    '1732': ['SbF5', 'pentafluoruro di antimonio', [['HF', 5]]], '1741': ['BCl3', 'tricloruro di boro', [['HCl', 3]]],
    '1745': ['BrF5', 'pentafluoruro di bromo (BrF5 + 3 H2O → HBrO3 + 5 HF)', [['HF', 5]]],
    '1746': ['BrF3', 'trifluoruro di bromo (3 BrF3 + 5 H2O → HBrO3 + Br2 + O2 + 9 HF)', [['HF', 3]]],
    '1754': ['ClHO3S', 'acido clorosolfonico', [['HCl', 1]]], '1758': ['Cl2CrO2', 'cloruro di cromile', [['HCl', 2]]],
    '1777': ['FHO3S', 'acido fluorosolfonico', [['HF', 1]]], '1806': ['PCl5', 'pentacloruro di fosforo', [['HCl', 5]]],
    '1808': ['PBr3', 'tribromuro di fosforo', [['HBr', 3]]], '1809': ['PCl3', 'tricloruro di fosforo', [['HCl', 3]]],
    '1810': ['Cl3OP', 'ossicloruro di fosforo', [['HCl', 3]]], '1834': ['Cl2O2S', 'cloruro di solforile', [['HCl', 2]]],
    '1836': ['Cl2OS', 'cloruro di tionile (SOCl2 + H2O → SO2 + 2 HCl)', [['HCl', 2], ['SO2', 1]]],
    '1838': ['TiCl4', 'tetracloruro di titanio', [['HCl', 4]]],
    '1828': ['Cl2S2', 'cloruri di zolfo, calcolo come S2Cl2 (2 S2Cl2 + 2 H2O → SO2 + 3 S + 4 HCl)', [['HCl', 2], ['SO2', 0.5]]],
    '2495': ['IF5', 'pentafluoruro di iodio', [['HF', 5]]], '2691': ['PBr5', 'pentabromuro di fosforo', [['HBr', 5]]],
    '2692': ['BBr3', 'tribromuro di boro', [['HBr', 3]]],
    '1340': ['P4S10', 'pentasolfuro di fosforo (P4S10 + 16 H2O → 4 H3PO4 + 10 H2S)', [['H2S', 10]]],
    '1360': ['Ca3P2', 'fosfuro di calcio', [['PH3', 2]]], '1397': ['AlP', 'fosfuro di alluminio', [['PH3', 1]]],
    '3048': ['AlP', 'fosfuro di alluminio (antiparassitario: indicare il titolo del principio attivo)', [['PH3', 1]]],
    '1432': ['Na3P', 'fosfuro di sodio', [['PH3', 1]]], '2011': ['Mg3P2', 'fosfuro di magnesio', [['PH3', 2]]],
    '2012': ['K3P', 'fosfuro di potassio', [['PH3', 1]]], '2013': ['Sr3P2', 'fosfuro di stronzio', [['PH3', 2]]],
    '1390': ['NaNH2', 'ammidi di metalli alcalini, calcolo come sodio ammide', [['NH3', 1]]],
    // aggiunte del 21/11/2026 (V2, liquidi tossici)
    '2308': ['HNO5S', 'acido nitrosilsolforico (NOHSO4 + H2O → H2SO4 + HNO2; l\'acido nitroso si decompone in NO, NO2 e HNO3 e l\'NO si ossida a NO2 in aria: tutto l\'azoto contato come NO2, 1 mol per mole, limite superiore)', [['NO2', 1]], 'nitros'],
    '2004': ['MgN2H4', 'magnesio diammide', [['NH3', 2]]], '2806': ['Li3N', 'nitruro di litio', [['NH3', 1]]],
    '1680': ['KCN', 'cianuro di potassio', [['HCN', 1]], 'cian'], '1689': ['NaCN', 'cianuro di sodio', [['HCN', 1]], 'cian'],
    '2977': ['UF6', 'esafluoruro di uranio (UF6 + 2 H2O → UO2F2 + 4 HF)', [['HF', 4]], 'rad'],
    '2978': ['UF6', 'esafluoruro di uranio (UF6 + 2 H2O → UO2F2 + 4 HF)', [['HF', 4]], 'rad'],
    '3507': ['UF6', 'esafluoruro di uranio (UF6 + 2 H2O → UO2F2 + 4 HF)', [['HF', 4]], 'rad'],
    // aggiunta del 23/11/2026 (richiesta di Luca): forma solida dell'acido nitrosilsolforico, stessa reazione di UN 2308
    '3456': ['HNO5S', 'acido nitrosilsolforico solido (NOHSO4 + H2O → H2SO4 + HNO2; l\'acido nitroso si decompone in NO, NO2 e HNO3 e l\'NO si ossida a NO2 in aria: tutto l\'azoto contato come NO2, 1 mol per mole, limite superiore)', [['NO2', 1]], 'nitrosS']
  };
  const NOTE = {
    cian: 'Cianuri: in acqua neutra l\'idrolisi è lenta e solo una parte del cianuro si libera come HCN; con acidi il rilascio è rapido e completo. Il 100% proposto vale per il contatto con acidi ed è molto cautelativo per lo spandimento in acqua.',
    nitros: 'Acido nitrosilsolforico: il prodotto commerciale è di solito una soluzione in acido solforico; indicare nel campo "titolo" la percentuale di NOHSO4 della scheda di sicurezza. La resa di 1 mol di NO2 per mole è un limite superiore: una parte dell\'azoto resta in soluzione come acido nitrico o esce come NO, meno tossico (IDLH 100 ppm).',
    nitrosS: 'Acido nitrosilsolforico solido (UN 3456): cristalli di NOHSO4, titolo proposto 100%; se la scheda di sicurezza indica un titolo minore, inserirlo nel campo "titolo". La resa di 1 mol di NO2 per mole è un limite superiore: una parte dell\'azoto resta in soluzione come acido nitrico o esce come NO, meno tossico (IDLH 100 ppm).',
    rad: 'Esafluoruro di uranio: il calcolo riguarda solo l\'HF; la tossicità chimica dell\'uranio (UO2F2) e il rischio radiologico non sono valutati.'
  };
  for (const [u, [form, nome, gas, nota]] of Object.entries(T)) {
    const pm = pmFormula(form);
    const prodotti = gas.map(([g, n]) => ({ gas: g, n, resa: n * GAS[g].pm / pm }));
    P[u] = { modelli: ['W2', 'ERG'], nome, formula: form, pm, prodotti, avviso: nota ? NOTE[nota] : '' };
    const d = DATA.db[u];
    if (d) { d.modelli = P[u].modelli; d.modello = 'W2'; }
  }
  // clorosilani n.o.s. (21/11/2026): formula del nome tecnico inserita dall'utente, HCl = atomi di Cl legati al silicio
  // 23/11/2026 (richiesta di Luca): anche UN 3361 e 3362, clorosilani tossici (classe 6.1) n.o.s.
  for (const u of ['2985', '2986', '2987', '2988', '3361', '3362']) {
    const form = 'HCl3Si', pm = pmFormula(form), toss = u === '3361' || u === '3362';
    P[u] = { modelli: ['W2', 'ERG'], nos: true, nome: 'clorosilano n.o.s.', formula: form, pm, prodotti: [{ gas: 'HCl', n: 3, resa: 3 * GAS.HCl.pm / pm }],
      avviso: 'Clorosilani n.o.s.: il calcolo usa la formula del nome tecnico indicata (documento di trasporto o scheda di sicurezza). In mancanza del nome tecnico si propone il triclorosilano, fra i clorosilani più comuni quello con la resa in HCl per kg fra le più alte (cautelativo; solo il tetracloruro di silicio rende di più).'
        + (toss ? ` UN ${u} è un clorosilano tossico (classe 6.1): il calcolo riguarda solo l'HCl della Tabella 2 ERG; la tossicità propria del clorosilano e dei prodotti organici dell'idrolisi non è valutata${u === '3362' ? ', né l\'infiammabilità (rischio sussidiario 3)' : ''}.` : '') };
    const d = DATA.db[u];
    if (d) { d.modelli = P[u].modelli; d.modello = 'W2'; }
  }
  DATA.pmFormula = pmFormula;
  DATA.gasW2 = GAS;
  // clorammine dall'ipoclorito (UN 1791) a contatto con ammoniaca: valori PAC del DOE (in mancanza di IDLH NIOSH)
  const PAC = 'DOE PAC Database (Protective Action Criteria)';
  DATA.clorammine = {
    NH2Cl: { nome: 'monoclorammina (NH2Cl)', pm: 51.48, perCl2: 1, LC50: 8.5, IDLH: 1.5, LOC: 0.13,
      rif: { LC50: '8,5 ppm (PAC-3: nessuna LC50 per inalazione disponibile)', IDLH: '1,5 ppm (PAC-2, in mancanza di IDLH NIOSH)', LOC: '0,13 ppm (PAC-1)' },
      fonte: `${PAC}: monoclorammina CAS 10599-90-3, PAC-1 0,13 · PAC-2 1,5 · PAC-3 8,5 ppm (PAC-3 derivato da una LDLo orale nel coniglio)`,
      reazione: 'NH3 + NaOCl → NH2Cl + NaOH: forma prevalente con ammoniaca in eccesso e ambiente basico (pH sopra circa 8); 1 mole di NH2Cl per mole di cloro attivo' },
    NHCl2: { nome: 'diclorammina (NHCl2)', pm: 85.92, perCl2: 1 / 2, LC50: 3.1, IDLH: 0.52, LOC: 0.047,
      rif: { LC50: '3,1 ppm (PAC-3: nessuna LC50 disponibile)', IDLH: '0,52 ppm (PAC-2, in mancanza di IDLH NIOSH)', LOC: '0,047 ppm (PAC-1)' },
      fonte: `${PAC}: diclorammina CAS 3400-09-7, PAC-1 0,047 · PAC-2 0,52 · PAC-3 3,1 ppm`,
      reazione: 'NH2Cl + HOCl → NHCl2 + H2O: forma prevalente in ambiente debolmente acido (pH circa 4–7) con ipoclorito in eccesso; 1 mole di NHCl2 ogni 2 moli di cloro attivo' },
    NCl3: { nome: 'tricloruro di azoto (NCl3)', pm: 120.36, perCl2: 1 / 3, LC50: 112, LC50_t: '1 h', IDLH: 0.52, LOC: 0.043,
      rif: { LC50: '112 ppm (LC50 ratto 1 h, base del PAC-3)', IDLH: '0,52 ppm (PAC-2, in mancanza di IDLH NIOSH)', LOC: '0,043 ppm (PAC-1)' },
      fonte: `${PAC}: tricloruro di azoto CAS 10025-85-1, PAC-1 0,043 · PAC-2 0,52 · PAC-3 3,1 ppm; LC50 ratto 1 h 112 ppm (base del PAC-3)`,
      reazione: 'NHCl2 + HOCl → NCl3 + H2O: forma prevalente in ambiente acido (pH sotto circa 4,4) con forte eccesso di ipoclorito; 1 mole di NCl3 ogni 3 moli di cloro attivo. Poco solubile e molto volatile; instabile, può esplodere' }
  };
})();
