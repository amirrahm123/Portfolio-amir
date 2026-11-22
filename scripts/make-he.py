#!/usr/bin/env python3
"""Builds site/he/index.html (Hebrew, RTL) from site/index.html.
Run after changing the English page:  python3 scripts/make-he.py
Texts live in scripts/he-texts.py; a text with no translation is reported, not silently left in English."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ns = {}
exec((ROOT / 'scripts' / 'he-texts.py').read_text(encoding='utf8'), ns)
TEXT, ATTR = ns['TEXT'], ns['ATTR']
s = (ROOT / 'site' / 'index.html').read_text(encoding='utf8')
missing = []

def rep(a, b, count=1):
    global s
    n = s.count(a)
    if n != count:
        missing.append(f'expected {count}x, found {n}x: {a[:70]}')
    s = s.replace(a, b)

# ---- document ----
rep('<html lang="en">', '<html lang="he" dir="rtl">')
rep('<title>Amir Rahm – AI solutions developer</title>', '<title>אמיר רם – מפתח פתרונות AI</title>')
rep('<meta property="og:title" content="Amir Rahm – AI solutions developer">', '<meta property="og:title" content="אמיר רם – מפתח פתרונות AI">')
rep('<meta name="description" content="Amir Rahm builds AI agents, automations and full-stack web products. Live demos, client work and code.">',
    '<meta name="description" content="אמיר רם בונה סוכני AI, אוטומציות ומוצרי ווב מקצה לקצה. דמואים חיים, עבודות ללקוחות וקוד.">')
rep('family=Heebo:wght@400;500;700', 'family=Heebo:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@400;500')
rep('<a class="lang-sw" href="/he/" lang="he" hreflang="he">עברית</a>', '<a class="lang-sw" href="/" lang="en" hreflang="en">English</a>')

RTL = r'''
/* ---- Hebrew / RTL ---- */
:root{--serif:"Frank Ruhl Libre",Georgia,serif;--sans:"Heebo",system-ui,sans-serif}
body{font-size:17px}
h1,h2,h3{letter-spacing:0}
.brand{margin-right:0;margin-left:auto}
.hero .builder{margin-right:0;margin-left:-40px}
@media (max-width:1300px){.hero .builder{margin-left:0}}
.b-frame,.frame .bar{direction:ltr}
.b-caption{direction:rtl}
.b-dots{right:auto;left:0}
.case.rv li{transform:translateX(10px)}
.case-phone{right:auto;left:-2%}
@media (max-width:1240px){.case-phone{left:0}}
a.frame::after{content:"לאתר החי";right:auto;left:14px}
.just{text-align:right}
'''
rep('</style>', RTL + '</style>')

# ---- visible texts and attributes ----
for en, he in sorted(TEXT.items(), key=lambda kv: -len(kv[0])):
    s, n = re.subn(r'>(\s*)' + re.escape(en) + r'(\s*)<', lambda m: '>' + m.group(1) + he + m.group(2) + '<', s)
    if not n:
        missing.append('text not found: ' + en[:70])
for en, he in ATTR.items():
    n = s.count(f'="{en}"')
    if not n:
        missing.append('attr not found: ' + en[:70])
    s = s.replace(f'="{en}"', f'="{he}"')

# ---- scripts ----
rep("'Amir Rahm'.split('')", "'אמיר רם'.split('')")
rep("{ url: 'deal-file-checker/demo', img: '/img/legal.webp', name: 'Deal File Checker', kind: 'Document AI, live demo' }", "{ url: 'deal-file-checker/demo', img: '/img/legal.webp', name: 'בודק תיק עסקה', kind: 'AI למסמכים, דמו חי' }")
rep("{ url: 'ebeker.co.il', img: '/img/eb.webp', name: 'Eran Beker Law Firm', kind: 'Live client site' }", "{ url: 'ebeker.co.il', img: '/img/eb.webp', name: 'משרד עורכי הדין ערן בקר', kind: 'אתר לקוח באוויר' }")
rep("{ url: 'sandrine-events.com', img: '/img/sd.webp', name: 'Achuzat Sandrine', kind: 'Live client site' }", "{ url: 'sandrine-events.com', img: '/img/sd.webp', name: 'אחוזת סנדרין', kind: 'אתר לקוח באוויר' }")

# anything that still looks like an English sentence inside visible markup
body = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', '', s[s.index('<body>'):])
left = [t.strip() for t in re.findall(r'>([^<>]*[A-Za-z]{4,}[^<>]*)<', body) if re.search(r'[a-z]{3,} [a-z]{3,}', t)]
left = [t for t in left if not re.search(r'HoopAssist|demo@arikapp|Next\.js|NBA|Gemini|Claude|\.co\.il|\.com|GitHub', t)]

out = ROOT / 'site' / 'he' / 'index.html'
if '--check' in sys.argv:
    # CI: fail if the committed Hebrew page is out of date with the English one
    if not out.exists() or out.read_text(encoding='utf8') != s:
        print('site/he/index.html is out of date: run python3 scripts/make-he.py and commit it')
        sys.exit(1)
    print('site/he/index.html is up to date')
else:
    out.parent.mkdir(exist_ok=True)
    out.write_text(s, encoding='utf8')
    print(f'wrote {out.relative_to(ROOT)}')
for m in missing + ['still English: ' + t[:80] for t in left]:
    print('  !', m)
sys.exit(1 if missing or left else 0)
