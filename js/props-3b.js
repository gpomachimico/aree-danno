// Punto 3b (18/11/2026): proprietà per i modelli di calcolo di altre sostanze frequenti in porto.
// Ogni valore ha la sua fonte nel campo "fonte". Elenco concordato con Luca.
// Fonti:
//  NISTIR 6546 (McGrattan, Baum, Hamins 2000), Tab. 1: velocità di combustione e calore di combustione (da Babrauskas, SFPE Handbook, e NFPA Fire Protection Handbook)
//  NIOSH Pocket Guide to Chemical Hazards (NPG): peso molecolare, tensione di vapore a 20 °C (68 °F), densità relativa, IDLH
//  NIOSH IDLH Documentation (1994, e IDLH Value Profile 2016 per l'acrilonitrile): LC50
//  EN 590 (gasolio), CAMEO/CHRIS (petrolio greggio, GPL), NIST WebBook (entalpie di formazione), scheda Merck 105432 (ammoniaca 25%)
(function () {
  const NIST = 'NISTIR 6546, Tab. 1';
  const NPG = 'NIOSH Pocket Guide';
  const P = {
    // ---------- POOL FIRE ----------
    '1203': { modelli: ['PF'], nome: 'benzina', dens: 0.74, mburn: 0.055, dHc: 43700, fonte: `${NIST} (Gasoline); densità 0,72–0,76 ${NPG}, valore medio 0,74` },
    '1202': { modelli: ['PF'], nome: 'gasolio (No. 2 Diesel Fuel)', dens: 0.83, mburn: 0.035, dHc: 39700, fonte: `${NIST} (No. 2 Diesel Fuel); densità EN 590 0,820–0,845 a 15 °C, valore 0,83` },
    '1223': { modelli: ['PF'], nome: 'cherosene', dens: 0.81, mburn: 0.039, dHc: 43200, fonte: `${NIST} (Kerosene); densità ${NPG}` },
    '3475': { modelli: ['PF'], nome: 'benzina (riferimento cautelativo per miscele etanolo-benzina)', dens: 0.74, mburn: 0.055, dHc: 43700, fonte: `${NIST} (Gasoline): la benzina ha flusso termico superiore all'etanolo, scelta cautelativa` },
    '1267': { modelli: ['PF'], nome: 'petrolio greggio', dens: 0.85, mburn: 0.045, dHc: 42600, fonte: `${NIST} (Crude Oil); densità 0,70–0,98 a 15 °C (CAMEO/CHRIS), valore 0,85` },
    '1268': { modelli: ['PF'], nome: 'benzina (riferimento cautelativo per distillati n.o.s.)', dens: 0.74, mburn: 0.055, dHc: 43700, fonte: `${NIST} (Gasoline): flusso termico più alto tra i distillati in tabella, scelta cautelativa` },
    '1170': { modelli: ['PF'], nome: 'etanolo', dens: 0.79, mburn: 0.015, dHc: 26800, fonte: `${NIST} (Ethyl Alcohol); densità ${NPG}` },
    '1219': { modelli: ['PF'], nome: 'isopropanolo', dens: 0.79, mburn: 0.046, dHc: 30500, fonte: `${NIST} (Isopropyl Alcohol); densità ${NPG}` },
    '1090': { modelli: ['PF'], nome: 'acetone', dens: 0.79, mburn: 0.041, dHc: 25800, fonte: `${NIST} (Acetone); densità ${NPG}` },
    '1114': { modelli: ['PF'], nome: 'benzene', dens: 0.88, mburn: 0.048, dHc: 44700, fonte: `${NIST} (Benzene); densità ${NPG}` },
    '1294': { modelli: ['PF'], nome: 'toluene', dens: 0.87, mburn: 0.112, dHc: 40500, fonte: `${NIST} (Toluene); densità ${NPG}` },
    '1307': { modelli: ['PF'], nome: 'xileni', dens: 0.86, mburn: 0.090, dHc: 40800, fonte: `${NIST} (Xylene); densità 0,86 m-xilene, 0,88 o-xilene ${NPG}, valore 0,86` },
    '1173': { modelli: ['PF'], nome: 'acetato di etile', dens: 0.90, mburn: 0.064, dHc: 23400, fonte: `${NIST} (Ethyl Acetate); densità ${NPG}` },

    // ---------- BLEVE ----------
    '1978': { modelli: ['BL'], nome: 'propano', dHc: 46300, rho_liq: 0.50, fonte: 'calore di combustione inferiore da entalpie di formazione NIST WebBook (propano −104,7 kJ/mol): 46,3 MJ/kg; densità del liquido circa 0,50 kg/L a 20 °C (0,504 a 15,6 °C, 0,493 a 25 °C)' },
    '1011': { modelli: ['BL'], nome: 'butano', dHc: 45700, rho_liq: 0.58, fonte: 'calore di combustione inferiore da entalpie di formazione NIST WebBook (n-butano −125,6 kJ/mol): 45,7 MJ/kg; densità del liquido 0,58 kg/L a 20 °C (in saturazione)' },
    '1075': { modelli: ['BL'], nome: 'GPL (propano-butano)', dHc: 46000, rho_liq: 0.50, fonte: 'calore di combustione 46,0 MJ/kg (CAMEO/CHRIS, scheda LPG); densità del liquido 0,50 kg/L (propano, cautelativo per la massa)' },
    '1086': { modelli: ['BL'], nome: 'cloruro di vinile', dHc: 18300, rho_liq: 0.91, fonte: 'calore di combustione inferiore da entalpie di formazione NIST WebBook (ΔfH° gas 22 kJ/mol, Manion 2002; prodotti CO2, H2O e HCl gassosi): 18,3 MJ/kg; densità del liquido 0,912 a 20 °C (scheda tecnica produttore)' },

    // ---------- DISPERSIONE TOSSICA (evaporazione da pozza) ----------
    // pv in kPa a 20 °C; LC50 = ratto, durata più vicina a 30 min, senza correzione temporale (cautelativo se > 30 min)
    '1230': { modelli: ['PF', 'GA'], nome: 'metanolo', dens: 0.79, mburn: 0.017, dHc: 20000, pm: 32.1, pv: 12.8, LC50: 64000, LC50_t: '4 h', IDLH: 6000, LOC: 600, fonte: `${NIST} (Methyl Alcohol); ${NPG}: PM 32,1, Pv 96 mmHg, densità 0,79, IDLH 6000 ppm; LC50 ratto 64 000 ppm 4 h (NIOSH IDLH Doc., NPIRI 1974)` },
    '1593': { modelli: ['GA'], nome: 'diclorometano', dens: 1.33, pm: 84.9, pv: 46.7, LC50: 24929, LC50_t: '30 min', IDLH: 2300, LOC: 230, fonte: `${NPG}: PM 84,9, Pv 350 mmHg, densità 1,33, IDLH 2300 ppm; LC50 ratto 24 929 ppm 30 min (NIOSH IDLH Doc., Fiz Akt Vesh 1975)` },
    '1888': { modelli: ['GA'], nome: 'cloroformio', dens: 1.48, pm: 119.4, pv: 21.3, LC50: 9617, LC50_t: '4 h', IDLH: 500, LOC: 50, fonte: `${NPG}: PM 119,4, Pv 160 mmHg, densità 1,48, IDLH 500 ppm; LC50 ratto 9617 ppm 4 h (NIOSH IDLH Doc., Lehmann e Flury 1943)` },
    '1710': { modelli: ['GA'], nome: 'tricloroetilene', dens: 1.46, pm: 131.4, pv: 7.73, LC50: 26300, LC50_t: '1 h', IDLH: 1000, LOC: 100, fonte: `${NPG}: PM 131,4, Pv 58 mmHg, densità 1,46, IDLH 1000 ppm; LC50 ratto 26 300 ppm 1 h (NIOSH IDLH Doc., Vernot et al. 1977)` },
    '1897': { modelli: ['GA'], nome: 'tetracloroetilene', dens: 1.62, pm: 165.8, pv: 1.87, LC50: 4000, LC50_t: '4 h', IDLH: 150, LOC: 15, fonte: `${NPG}: PM 165,8, Pv 14 mmHg, densità 1,62, IDLH 150 ppm; LC50 ratto 4000 ppm 4 h (NIOSH IDLH Doc., Carpenter et al. 1949)` },
    '1093': { modelli: ['PF', 'GA'], nome: 'acrilonitrile', dens: 0.81, mburn: 0.052, dHc: 31900, pm: 53.1, pv: 11.1, LC50: 425, LC50_t: '4 h', IDLH: 60, LOC: 6, fonte: `${NIST} (Acrylonitrile); ${NPG}: PM 53,1, Pv 83 mmHg, densità 0,81; IDLH 60 ppm (NIOSH IDLH Value Profile 2016, sostituisce 85 ppm); LC50 ratto 425 ppm 4 h (NIOSH IDLH Doc., Jaeger et al. 1974)` },
    '1131': { modelli: ['GA'], nome: 'solfuro di carbonio', dens: 1.26, pm: 76.1, pv: 39.6, LC50: 15500, LC50_t: '1 h', IDLH: 500, LOC: 50, fonte: `${NPG}: PM 76,1, Pv 297 mmHg, densità 1,26, IDLH 500 ppm; LC50 ratto 15 500 ppm 1 h (NIOSH IDLH Doc., AIHA 1992)` },
    '1092': { modelli: ['GA'], nome: 'acroleina', dens: 0.84, pm: 56.1, pv: 28.0, LC50: 131, LC50_t: '30 min', IDLH: 2, LOC: 0.2, fonte: `${NPG}: PM 56,1, Pv 210 mmHg, densità 0,84, IDLH 2 ppm; LC50 ratto 131 ppm 30 min (NIOSH IDLH Doc., Skog 1950)` },
    '1198': { modelli: ['GA'], nome: 'formaldeide in soluzione (formalina 37%)', dens: 1.08, frazione: 0.37, pm: 30.0, pv: 0.133, LC50: 815, LC50_t: '30 min', IDLH: 20, LOC: 2, fonte: `${NPG} Formalin: Pv 1 mmHg, densità 1,08 (25 °C), soluzione al 37%; formaldeide PM 30,0, IDLH 20 ppm; LC50 ratto 815 ppm 30 min (NIOSH IDLH Doc., Skog 1950)` },
    '2209': { modelli: ['GA'], nome: 'formaldeide in soluzione (formalina 37%)', dens: 1.08, frazione: 0.37, pm: 30.0, pv: 0.133, LC50: 815, LC50_t: '30 min', IDLH: 20, LOC: 2, fonte: `${NPG} Formalin: Pv 1 mmHg, densità 1,08 (25 °C), soluzione al 37%; formaldeide PM 30,0, IDLH 20 ppm; LC50 ratto 815 ppm 30 min (NIOSH IDLH Doc., Skog 1950)` },
    '2078': { modelli: ['GA'], nome: 'toluene diisocianato (2,4-TDI)', dens: 1.22, pm: 174.2, pv: 0.0013, pv_T: 25, LC50: 14, LC50_t: '4 h', IDLH: 2.5, LOC: 0.25, fonte: `${NPG}: PM 174,2, Pv 0,01 mmHg a 25 °C, densità 1,22, IDLH 2,5 ppm; LC50 ratto 14 ppm 4 h (NIOSH IDLH Doc., Duncan et al. 1962)` },
    '2031': { modelli: ['GA'], nome: 'acido nitrico (valori dell\'acido puro, cautelativi)', dens: 1.50, pm: 63.0, pv: 6.40, LC50: 138, LC50_t: '30 min', IDLH: 25, LOC: 2.5, fonte: `${NPG}: PM 63,0, Pv 48 mmHg, densità 1,50 (acido puro), IDLH 25 ppm; LC50 ratto 138 ppm 30 min (NIOSH IDLH Doc., Gray et al. 1954). Per le soluzioni la pressione parziale di HNO3 è minore: inserire il valore della scheda di sicurezza` },
    // acetone cianidrina: soglie dell'acido cianidrico (scelta di Luca 18/11/2026); ipotesi: ogni mole di vapore evaporato libera una mole di HCN (stesse ppm)
    '1541': { modelli: ['GA'], nome: 'acetone cianidrina, con soglie dell\'acido cianidrico (HCN)', dens: 0.93, pm: 85.1, pv: 0.107, LC50: 160, LC50_t: '30 min, HCN', IDLH: 50, LOC: 5, avviso: 'Acetone cianidrina: il vapore è trattato come se si decomponesse interamente in acido cianidrico (1 mole di HCN per mole, stesse ppm). In acqua, con pH alto o con il calore la decomposizione è più rapida e il rilascio di HCN può superare quello calcolato dalla sola evaporazione: per lo spandimento in acqua vale la Tabella 1 ERG.', fonte: `${NPG} acetone cianidrina: PM 85,1, Pv 0,8 mmHg, densità 0,93 (25 °C), IDLH non determinato; soglie dell'acido cianidrico (scelta del consulente): IDLH 50 ppm (${NPG}), LC50 ratto 160 ppm 30 min (NIOSH IDLH Doc. HCN, Levin et al. 1987)` },
    '2672': { modelli: ['GA'], nome: 'ammoniaca in soluzione 25%', dens: 0.903, frazione: 0.25, pm: 17.03, pv: 48.3, LC50: 20300, LC50_t: '40 min', IDLH: 300, LOC: 30, fonte: `Scheda Merck 105432 (ammoniaca 25%): tensione di vapore 483 hPa a 20 °C (totale, cautelativa come pressione parziale di NH3), densità 0,903; IDLH 300 ppm (${NPG}); LC50 ratto 20 300 ppm 40 min (NIOSH IDLH Doc., Alarie 1981)` },
    // ---------- liquidi tossici per inalazione aggiunti il 20/11/2026 (V2, gruppo "Liquidi tossici") ----------
    // stesso criterio: Pv del NIOSH Pocket Guide (temperatura ambiente), LC50 ratto con durata più vicina a 30 min, IDLH NIOSH, LOC = IDLH/10
    '1744': { modelli: ['GA'], nome: 'bromo', dens: 3.12, pm: 159.8, pv: 22.93, LC50: 407, LC50_t: 'durata non indicata', IDLH: 3, LOC: 0.3, fonte: `${NPG}: PM 159,8, Pv 172 mmHg, densità 3,12, IDLH 3 ppm; LC50 ratto 407 ppm, durata non indicata (NIOSH IDLH Doc., Ivanov et al. 1976)` },
    '2480': { modelli: ['GA'], nome: 'metile isocianato', dens: 0.96, pm: 57.1, pv: 46.40, LC50: 21, LC50_t: '2 h', IDLH: 0.12, LOC: 0.012, fonte: `${NPG}: PM 57,1, Pv 348 mmHg, densità 0,96; IDLH 0,12 ppm (NIOSH IDLH Value Profile 2016, pubbl. 2017-105, che sostituisce i 3 ppm del 1994); LC50 ratto 21 ppm 2 h (NIOSH IDLH Doc., Kimmerle e Eben 1964)`, avviso: 'Metile isocianato: reagisce con l\'acqua liberando calore e anidride carbonica; lo spandimento su superficie bagnata aumenta l\'evaporazione rispetto al calcolo.' },
    '1580': { modelli: ['GA'], nome: 'cloropicrina', dens: 1.66, pm: 164.4, pv: 2.40, LC50: 117, LC50_t: '20 min', IDLH: 2, LOC: 0.2, fonte: `${NPG}: PM 164,4, Pv 18 mmHg, densità 1,66, IDLH 2 ppm; LC50 ratto 117 ppm 20 min (NIOSH IDLH Doc., Sine 1993)` },
    '1595': { modelli: ['GA'], nome: 'dimetil solfato', dens: 1.33, pm: 126.1, pv: 0.0133, LC50: 8.6, LC50_t: '4 h', IDLH: 7, LOC: 0.7, fonte: `${NPG}: PM 126,1, Pv 0,1 mmHg, densità 1,33, IDLH 7 ppm; LC50 ratto 8,6 ppm 4 h (NIOSH IDLH Doc., Batzura et al. 1980; unico dato sul ratto, per questo la LC50 è minore dell'IDLH)` },
    '1098': { modelli: ['GA'], nome: 'alcole allilico', dens: 0.85, pm: 58.1, pv: 2.27, LC50: 1060, LC50_t: '1 h', IDLH: 20, LOC: 2, fonte: `${NPG}: PM 58,1, Pv 17 mmHg, densità 0,85, IDLH 20 ppm; LC50 ratto 1060 ppm 1 h (NIOSH IDLH Doc., Smyth e Carpenter 1948)` },
    '1135': { modelli: ['GA'], nome: 'etilene cloridrina (2-cloroetanolo)', dens: 1.20, pm: 80.5, pv: 0.667, LC50: 7.5, LC50_t: '1 h', IDLH: 7, LOC: 0.7, fonte: `${NPG}: PM 80,5, Pv 5 mmHg, densità 1,20, IDLH 7 ppm; LC50 ratto 7,5 ppm 1 h (NIOSH IDLH Doc., Ambrose 1950)` },
    '1143': { modelli: ['GA'], nome: 'aldeide crotonica', dens: 0.87, pm: 70.1, pv: 2.53, LC50: 600, LC50_t: '30 min', IDLH: 50, LOC: 5, fonte: `${NPG}: PM 70,1, Pv 19 mmHg, densità 0,87, IDLH 50 ppm; LC50 ratto 600 ppm 30 min (NIOSH IDLH Doc., Rinehart 1967)` },
    '2644': { modelli: ['GA'], nome: 'ioduro di metile', dens: 2.28, pm: 141.9, pv: 53.33, LC50: 1550, LC50_t: '30 min', IDLH: 100, LOC: 10, fonte: `${NPG}: PM 141,9, Pv 400 mmHg, densità 2,28, IDLH 100 ppm; LC50 ratto 1550 ppm 30 min (NIOSH IDLH Doc., Bakhishev 1975)` },
    '1259': { modelli: ['GA'], nome: 'nichel tetracarbonile', dens: 1.32, pm: 170.7, pv: 42.0, LC50: 34, LC50_t: '30 min', IDLH: 2, LOC: 0.2, fonte: `${NPG}: PM 170,7, Pv 315 mmHg, densità 1,32, IDLH 2 ppm; LC50 ratto 235 mg/m³ = 34 ppm 30 min (RIVM, documento tecnico probit nichel tetracarbonile, 2017)`, avviso: 'Nichel tetracarbonile: bolle a 43 °C e può esplodere se riscaldato oltre 60 °C; con temperature elevate l\'evaporazione supera quella calcolata.' },
    '1163': { modelli: ['GA'], nome: '1,1-dimetilidrazina (UDMH)', dens: 0.79, pm: 60.1, pv: 13.73, LC50: 1410, LC50_t: '1 h', IDLH: 15, LOC: 1.5, fonte: `${NPG}: PM 60,1, Pv 103 mmHg, densità 0,79, IDLH 15 ppm; LC50 ratto 1410 ppm 1 h (NIOSH IDLH Doc., Weeks et al. 1963)` },
    '1244': { modelli: ['GA'], nome: 'metilidrazina', dens: 0.87, pm: 46.1, pv: 5.07, LC50: 427, LC50_t: '30 min', IDLH: 20, LOC: 2, fonte: `${NPG}: PM 46,1, Pv 38 mmHg, densità 0,87, IDLH 20 ppm; LC50 ratto 427 ppm 30 min (NIOSH IDLH Doc., Haun et al. 1970)` },
    '1185': { modelli: ['GA'], nome: 'etilenimmina stabilizzata', dens: 0.83, pm: 43.1, pv: 21.33, LC50: 250, LC50_t: '1 h', IDLH: 100, LOC: 10, fonte: `${NPG}: PM 43,1, Pv 160 mmHg, densità 0,83, IDLH 100 ppm; LC50 ratto 250 ppm 1 h (NIOSH IDLH Doc., Carpenter et al. 1948; abbinamento valore-durata controllato con la colonna della LC corretta a 0,5 h: 250 × 1,88 = 470 ppm)`, avviso: 'Etilenimmina: polimerizza in modo esplosivo a contatto con acidi; cancerogena (NIOSH).' },
    '1051': { modelli: ['GA'], nome: 'acido cianidrico (cianuro di idrogeno) stabilizzato', dens: 0.69, pm: 27.0, pv: 84.0, LC50: 160, LC50_t: '30 min', IDLH: 50, LOC: 5, fonte: `${NPG}: PM 27,0, Pv 630 mmHg, densità 0,69, IDLH 50 ppm; LC50 ratto 160 ppm 30 min (NIOSH IDLH Doc., Levin et al. 1987)`, avviso: 'Acido cianidrico: bolle a 26 °C. Vicino a questa temperatura e sopra il liquido bolle e il modello di evaporazione EPA sottostima il rilascio; il vapore è più leggero dell\'aria. Con temperature dell\'aria oltre 20 °C usare con molta cautela, oppure trattare il rilascio come istantaneo con la Tabella 1 ERG.' }
  };
  for (const [u, p] of Object.entries(P)) {
    DATA.props[u] = p;
    const d = DATA.db[u];
    if (!d) continue;
    d.modelli = p.modelli;
    d.modello = p.modelli[0];
    d.props3b = true;
  }
})();
