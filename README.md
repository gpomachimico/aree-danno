# Aree di danno e di sicurezza – app v1.3-beta

Web app installabile (PWA) per telefono e tablet. Stime di supporto tecnico (parere tecnico), non atti amministrativi.

## Contenuto
- `index.html` – l'app
- `js/engine.js` – motore di calcolo (pool fire, BLEVE, dispersione gaussiana, TNT equivalente, gas tossici liquefatti con Britter-McQuaid)
- `js/data.js` – 40 voci verificate a mano, con i dati per i modelli di calcolo
- `js/onu.js` – banca dati estesa generata da `tools/`: tutte le 2347 voci ONU della Dangerous Goods List IMDG 42-24 (2860 righe) e l'ERG 2024 (62 guide, Tabelle 1, 2 e 3)
- `js/app.onu.js` – ricerca per numero o nome, Tabella 1 (TIH) e Tabella 3
- `js/props-3b.js` – proprietà con fonte per il calcolo di 30 sostanze aggiuntive (pool fire, BLEVE, dispersione tossica)
- `js/props-gl.js` – gas tossici liquefatti sotto pressione (cloro, ammoniaca anidra, acido fluoridrico anidro, anidride solforosa, acido cloridrico anidro): proprietà fisiche e soglie con fonte
- `js/app.base.js`, `js/app.extra.js` – interfaccia, mappa, GPS, report
- `vendor/` – Leaflet 1.9.4 (mappa), incluso per l'uso offline
- `sw.js`, `manifest.webmanifest`, `icons/` – installazione e funzionamento offline

## Perché serve un indirizzo https
Telefoni e tablet permettono GPS, installazione e uso offline solo a un'app aperta almeno una volta da un indirizzo https. Dopo la prima apertura e l'installazione, l'app funziona anche senza rete (calcoli completi; mappa solo per le zone già visualizzate).

## Dove pubblicarla (una delle tre)
1. **Un indirizzo che già usi** (sito personale o server dell'ufficio, purché in https): copiare l'intera cartella in una directory del sito, ad esempio `https://tuosito.it/aree-danno/`.
2. **Netlify Drop** (gratuito, senza competenze tecniche): aprire https://app.netlify.com/drop dal computer, trascinare la cartella; si ottiene un indirizzo `https://nome-a-scelta.netlify.app`.
3. **GitHub Pages** (gratuito): se l'account GitHub viene collegato a Claude, la pubblicazione e gli aggiornamenti li fa Claude.

## Installazione sul dispositivo
- **iPhone / iPad (Safari):** aprire l'indirizzo → pulsante Condividi → "Aggiungi alla schermata Home".
- **Android (Chrome):** aprire l'indirizzo → menu ⋮ → "Installa app" (o "Aggiungi a schermata Home").
- Al primo avvio: ⚙ in alto a destra per nome, qualifica e incarico del report; consentire la posizione per il pulsante 📍.

## Uso
1. Numero ONU → 2. dati del rilascio → 3. meteo (se richiesto) → luogo (GPS o tocco sulla mappa) → "Calcola le zone".
Risultati: zone sulla mappa e in schema, tabella delle distanze, ipotesi, confronto ERG, "Stampa / salva PDF", "Copia il report".

## Aggiornamenti
Sostituire i file nella stessa posizione. Il numero di versione in `sw.js` (costante VERSIONE) va cambiato a ogni aggiornamento perché i dispositivi scarichino i file nuovi.

## Note
- Mappa © contributori OpenStreetMap. Le tessere sono conservate solo se già visualizzate (massimo 600), nel rispetto delle condizioni d'uso di OpenStreetMap.
- Gas densi: correlazioni di Britter e McQuaid (HSE CRR 17/1988) come tabellate da AIChE/CCPS (1999); coefficienti confrontati con GasDispersion.jl (licenza MIT).
- Riferimenti: D.M. 9/5/2001 Tab. 2; Linee guida PEE (Direttiva 7/12/2022); IMDG Code 42-24; ERG 2024.
