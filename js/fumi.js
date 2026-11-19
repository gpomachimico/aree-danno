// Fumi tossici di combustione (richiesta di Luca, 19/11/2026).
// Tre casi:
//  - 'calc'  : il prodotto tossico si forma con resa stechiometrica nota (alogeni → acido alogenidrico): calcolo quantitativo;
//  - 'zolfo' : SO2 dallo zolfo del prodotto, calcolabile solo se l'utente inserisce il tenore di zolfo;
//  - 'qual'  : la resa dipende dalle condizioni di combustione e non è prevedibile: solo indicazione qualitativa.
// La dispersione quantitativa si fa solo per gli incendi stazionari (pool fire, jet fire); per BLEVE, flash fire e VCE
// la combustione dura pochi secondi e i prodotti salgono con la nube calda: si indica solo la massa formata.
(function () {
  const F = {
    '1086': { tipo: 'calc', specie: 'acido cloridrico (HCl)', rif: '1050', pm: 36.461, resa: 36.461 / 62.498,
      reazione: 'C2H3Cl + 2,5 O2 → 2 CO2 + H2O + HCl: tutto il cloro del cloruro di vinile diventa HCl, 0,583 kg di HCl per kg bruciato (resa stechiometrica, cautelativa)' },
    '1093': { tipo: 'qual', specie: 'acido cianidrico (HCN) e ossidi di azoto',
      motivo: 'L\'azoto dell\'acrilonitrile forma HCN e ossidi di azoto, ma la quantità dipende dall\'apporto d\'aria, dalla temperatura e dalla dimensione dell\'incendio e non si può stimare in modo affidabile con una resa fissa. Valutazione solo qualitativa: considerare i fumi come tossici e mantenere le persone fuori dal pennacchio.' },
    '1267': { tipo: 'zolfo', specie: 'anidride solforosa (SO2)', rif: '1079', pm: 64.064, nomeProd: 'petrolio greggio', tipico: 'da circa 0,1% a oltre 3% secondo l\'origine' },
    '1202': { tipo: 'zolfo', specie: 'anidride solforosa (SO2)', rif: '1079', pm: 64.064, nomeProd: 'gasolio', tipico: 'gasolio per autotrazione UE ≤ 10 mg/kg (0,001%); gasolio marino fino a 0,1% nelle aree ECA e 0,5% fuori' },
    '1223': { tipo: 'zolfo', specie: 'anidride solforosa (SO2)', rif: '1079', pm: 64.064, nomeProd: 'cherosene', tipico: 'variabile secondo il prodotto (per il carboturbo la specifica ammette fino a 0,3%)' },
    '1863': { tipo: 'zolfo', specie: 'anidride solforosa (SO2)', rif: '1079', pm: 64.064, nomeProd: 'carboturbo', tipico: 'fino a 0,3% secondo specifica, in genere molto meno' },
    '1268': { tipo: 'zolfo', specie: 'anidride solforosa (SO2)', rif: '1079', pm: 64.064, nomeProd: 'distillato di petrolio', tipico: 'variabile secondo il prodotto' }
  };
  for (const [u, f] of Object.entries(F)) if (DATA.props[u]) DATA.props[u].fumi = f;
})();
