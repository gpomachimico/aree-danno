# Strumenti di estrazione

Script usati per generare `js/onu.js` dai PDF (non distribuiti nel repository):

- `dgl_pdf.py` – IMDG Code 42-24, Dangerous Goods List (pagine PDF 594–765): ogni parola viene assegnata alla colonna (1)–(18) in base alle linee verticali della tabella.
- `erg_t1.py` – ERG 2024, Tabella 1 (testo estratto con `pdftotext -layout`).
- `erg_guide.py` – ERG 2024, sezione EVACUATION delle 62 guide arancioni.
- `build_onu.py` – unisce i dati e scrive `js/onu.js`. Le Tabelle 2 e 3 e la mappa ONU → guida (pagine gialle) sono state lette con brevi script a parte; i risultati (`erg_t2.json`, `erg_t3.json`, `erg_onu.json`) sono input di `build_onu.py`.

I percorsi dei file sono quelli dell'ambiente di lavoro e vanno adattati.
