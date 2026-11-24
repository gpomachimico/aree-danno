from playwright.sync_api import sync_playwright
import re
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome'); ctx=b.new_context(viewport={'width':430,'height':900}); ctx.route(re.compile('tile'),lambda r:r.abort()); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(800); pg.evaluate("window.print=()=>{}")
    print('carico vis (aree)', pg.is_visible('#caricocard'))
    pg.click('#mScheda'); pg.wait_for_timeout(500); print('carico vis (scheda)', pg.is_visible('#caricocard'))
    pg.fill('#onu','1950'); pg.wait_for_timeout(700); print('1950 scheda', len(pg.inner_text('#schedabox')))
    pg.click('#cgDaScheda'); pg.wait_for_timeout(300)
    for u in ['1017','1005','1203','1789','1824']:
        pg.fill('#cgU',u); pg.click('#cgAdd'); pg.wait_for_timeout(200)
    pg.fill('#cgU','9999'); pg.click('#cgAdd'); pg.wait_for_timeout(200); print('msg', pg.inner_text('#cgMsg'))
    t=pg.inner_text('#cgRis'); print(len(t), 'BAD' if ('undefined' in t or 'NaN' in t) else 'ok'); print(t[:900])
    pg.locator('#cgLista input[data-k=lq]').nth(3).check(); pg.wait_for_timeout(200)
    pg.screenshot(path='/tmp/carico.png',full_page=True)
    pg.click('#cgPrint'); rep=pg.inner_text('#report'); print('REP',len(rep),'BAD' if 'undefined' in rep else '')
    pg.reload(); pg.wait_for_timeout(800); pg.click('#mScheda'); pg.wait_for_timeout(700); print('persist', pg.locator('.cgv').count())
    print('ERR',errs); b.close()
