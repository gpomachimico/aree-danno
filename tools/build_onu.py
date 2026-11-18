import json,re
W='/home/claude/work/'
dgl=json.load(open(W+'dgl_pdf.json')); G=json.load(open(W+'erg_guide.json'))
mp=json.load(open(W+'erg_onu.json')); T1=json.load(open(W+'erg_t1.json'))
T2=json.load(open(W+'erg_t2.json')); T3=json.load(open(W+'erg_t3.json'))
T3['1050']['righe']=T3['2186']['righe']; T3['1050']['nota']='tabella comune con UN2186'
T3['2186']['nota']='tabella comune con UN1050'
IT={'111':'Carico misto/non identificato','112':'Esplosivi – Divisione 1.1, 1.2, 1.3 o 1.5','113':'Materiali infiammabili (esplosivi umidificati/desensibilizzati)','114':'Esplosivi – Divisione 1.4 o 1.6','115':'Gas infiammabili (compresi liquidi refrigerati)','116':'Gas infiammabili (instabili)','117':'Gas tossici – infiammabili (pericolo estremo)','118':'Gas infiammabili – corrosivi','119':'Gas tossici – infiammabili','120':'Gas inerti (compresi liquidi refrigerati)','122':'Gas comburenti (compresi liquidi refrigerati)','123':'Gas tossici','124':'Gas tossici e/o corrosivi – comburenti','125':'Gas tossici e/o corrosivi','126':'Gas compressi o liquefatti (compresi gas refrigeranti)','127':'Liquidi infiammabili (miscibili con acqua)','128':'Liquidi infiammabili (non miscibili con acqua)','129':'Liquidi infiammabili (miscibili con acqua/nocivi)','130':'Liquidi infiammabili (non miscibili con acqua/nocivi)','131':'Liquidi infiammabili – tossici','132':'Liquidi infiammabili – corrosivi','133':'Solidi infiammabili','134':'Solidi infiammabili – tossici e/o corrosivi','135':'Sostanze spontaneamente combustibili','136':'Sostanze spontaneamente combustibili – tossiche e/o corrosive (reattive con l\'aria)','137':'Sostanze reattive con l\'acqua – corrosive','138':'Sostanze reattive con l\'acqua (sviluppano gas infiammabili)','139':'Sostanze reattive con l\'acqua (sviluppano gas infiammabili e tossici)','140':'Comburenti','141':'Comburenti – tossici','142':'Comburenti – tossici (liquidi)','143':'Comburenti (instabili)','144':'Comburenti (reattivi con l\'acqua)','145':'Perossidi organici (sensibili a calore e contaminazione)','146':'Perossidi organici (sensibili a calore, contaminazione e attrito)','147':'Batterie agli ioni di litio e di sodio','148':'Perossidi organici (sensibili a calore e contaminazione/a temperatura controllata)','149':'Sostanze autoreattive','150':'Sostanze autoreattive/a temperatura controllata','151':'Sostanze tossiche (non combustibili)','152':'Sostanze tossiche (combustibili)','153':'Sostanze tossiche e/o corrosive (combustibili)','154':'Sostanze tossiche e/o corrosive (non combustibili)','155':'Sostanze tossiche e/o corrosive (infiammabili/sensibili all\'acqua)','156':'Sostanze tossiche e/o corrosive (combustibili/sensibili all\'acqua)','157':'Sostanze tossiche e/o corrosive (non combustibili/sensibili all\'acqua)','158':'Sostanze infettive','159':'Sostanze irritanti','160':'Solventi alogenati','161':'Materiali radioattivi (basso livello di radiazione)','162':'Materiali radioattivi (livello di radiazione da basso a moderato)','163':'Materiali radioattivi (livello di radiazione da basso ad alto)','164':'Materiali radioattivi (forma speciale/radiazione esterna da bassa ad alta)','165':'Materiali radioattivi (fissili/radiazione da bassa ad alta)','166':'Materiali radioattivi – corrosivi (esafluoruro di uranio/reattivo con l\'acqua)','168':'Monossido di carbonio (liquido refrigerato)','169':'Alluminio (fuso)','170':'Metalli (polveri, trucioli, limature ecc.)','171':'Sostanze (pericolo da basso a moderato)','172':'Gallio e mercurio','173':'Gas adsorbiti – tossici','174':'Gas adsorbiti – infiammabili o comburenti'}
def num(s): return int(s.replace(',',''))
guide={}
for k,g in G.items():
    t=g['evacuazione_en']
    o={'t':IT[k],'t_en':g['titolo'].replace('*',''),'en':t}
    m=re.search(r'at least (\d[\d,]*) meters \([^)]*\) for liquids and at least (\d[\d,]*) meters',t)
    if m: o['iso_liq']=num(m.group(1)); o['iso_sol']=num(m.group(2))
    else: o['iso']=g['isolamento_m']
    ls=re.search(r'Large Spill\s*•\s*(.*?)(?=Fire\s*•|$)',t)
    if ls and g['evac_grande_m']:
        o['grande']=g['evac_grande_m']; o['grande_dir']='sottovento' if 'downwind' in ls.group(1) else 'in tutte le direzioni'
    if 'Table 1' in t: o['t1']=1
    fi=re.search(r'Fire\s*•\s*(.*)$',t)
    if fi and g['incendio_m']: o['fuoco']=g['incendio_m']
    guide[k]=o
def clean_psn(s):
    s=re.sub(r'\(including C –C homologues\) 2 12','(including C2–C12 homologues)',s)
    s=re.sub(r'([A-Za-z]{3})- (?=[A-Z])',r'\1',s)
    return re.sub(r'\s+',' ',s).strip()
def sub(s):
    s=(s or '').strip(); p=bool(re.search(r'(^|\s)P$',s))
    nota=''
    m=re.search(r'See (SP\s?\d+|2\.0\.6\.6)',s)
    if m: nota='vedi '+m.group(1).replace(' ','')
    toks=[x for x in re.split(r'[\s/]+',re.sub(r'See (SP\s?\d+|2\.0\.6\.6)','',s)) if re.fullmatch(r'\d(\.\d)?',x)]
    return '/'.join(toks),p,nota
onu={}
for e in dgl:
    c=e['c']; s,p,nota=sub(c.get('4'))
    v={'n':clean_psn(c.get('2','')),'c':c.get('3','').strip(),'pg':c.get('5','–').strip()}
    if s: v['s']=s
    if p: v['p']=1
    if nota: v['sn']=nota
    em=c.get('15','').strip()
    if em and em!='–': v['e']=em
    onu.setdefault(e['un'],{'v':[]})['v'].append(v)
for u,o in onu.items():
    # dedup identical variants
    seen=[]; [seen.append(x) for x in o['v'] if x not in seen]; o['v']=seen
    cl=o['v'][0]['c']
    if u in mp: o['g']=mp[u]
    elif cl.startswith('1'):
        div=cl[:3]; o['g']=['114'] if div in('1.4','1.6') else ['112']; o['gx']=1
t1={}
for b in T1:
    t1.setdefault(b['un'],[]).append({'n':b['nome'],'g':b['guida'],'d':b['d']})
for u in t1:
    if u in onu: onu[u]['tih']=1
for u in T2:
    if u in onu: onu[u]['t2']=T2[u]['gas']
for u in T3:
    if u in onu: onu[u]['t3']=1
extra=sorted(set(mp)-set(onu))
meta={'fonte_imdg':'IMDG Code ed. 42-24 (MSC.556(108)), Parte 3, Dangerous Goods List, colonne 1-5 e 15',
 'fonte_erg':'Emergency Response Guidebook 2024 (pagine gialle, guide arancioni, Tabelle 1, 2 e 3)',
 'estrazione':'2026-11-18, estrazione automatica dalle coordinate del testo dei PDF; controlli in roadmap',
 'esplosivi':'ERG non elenca gli esplosivi per numero ONU: guida 112 per div. 1.1, 1.2, 1.3, 1.5; guida 114 per 1.4 e 1.6',
 'n_onu':len(onu),'n_righe':sum(len(o['v']) for o in onu.values()),'erg_non_imdg':extra}
out={'meta':meta,'onu':onu,'guide':guide,'t1':t1,'t2':T2,'t3':T3}
js='// Generato automaticamente da build_onu.py - non modificare a mano\nconst ONU = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open('/home/claude/aree-danno/js/onu.js','w').write(js)
print(meta['n_onu'],meta['n_righe'],len(js)//1024,'kB', 'tih',len(t1),'t2',len(T2),'t3',len(T3))
