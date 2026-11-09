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
rep('<title>Amir Rahm – Websites for law firms, clinics and event venues</title>', '<title>אמיר רם – אתרים למשרדי עורכי דין, קליניקות וגני אירועים</title>')
rep('<meta property="og:title" content="Amir Rahm – Websites for law firms, clinics and event venues">', '<meta property="og:title" content="אמיר רם – אתרים למשרדי עורכי דין, קליניקות וגני אירועים">')
rep('<meta name="description" content="Amir Rahm designs and builds websites for law firms, private clinics and event venues in Israel and Germany.">',
    '<meta name="description" content="אמיר רם מעצב ובונה אתרים, מערכות וכלי AI למשרדי עורכי דין, קליניקות פרטיות וגני אירועים בישראל ובגרמניה.">')
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
.b-frame,.frame .bar,.mock .bar{direction:ltr}
.b-caption{direction:rtl}
.b-dots{right:auto;left:0}
.site .logo{margin-right:0;margin-left:auto}
.site .art{right:auto;left:6%}
.case.rv li{transform:translateX(10px)}
.case-phone{right:auto;left:-2%}
@media (max-width:1240px){.case-phone{left:0}}
a.frame::after{content:"לאתר החי";right:auto;left:14px}
.msg.bot{border-bottom-left-radius:16px;border-bottom-right-radius:5px}
.msg.me{border-bottom-right-radius:16px;border-bottom-left-radius:5px}
.ask-ai{right:auto;left:20px}
@media (max-width:900px){.ask-ai{left:14px}}
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
rep("{ url: 'ebeker.co.il', img: '/img/eb.webp', name: 'Eran Beker Law Firm', kind: 'Live client site' }", "{ url: 'ebeker.co.il', img: '/img/eb.webp', name: 'משרד עורכי הדין ערן בקר', kind: 'אתר לקוח באוויר' }")
rep("{ url: 'sandrine-events.com', img: '/img/sd.webp', name: 'Achuzat Sandrine', kind: 'Live client site' }", "{ url: 'sandrine-events.com', img: '/img/sd.webp', name: 'אחוזת סנדרין', kind: 'אתר לקוח באוויר' }")
rep("{ url: 'clinic-demo.vercel.app', img: '/img/cl.webp', name: 'Private clinic, Munich', kind: 'Concept' }", "{ url: 'clinic-demo.vercel.app', img: '/img/cl.webp', name: 'קליניקה פרטית, מינכן', kind: 'קונספט' }")
i, j = s.index('  var COPY = {'), s.index('  };', s.index('  var COPY = {')) + 4
s = s[:i] + '''  var COPY = {
    law: { kick: 'משרד עורכי דין ב{city}', head: 'ליווי משפטי מנוסה, כשזה הכי חשוב.', sub: '{name} מייצג לקוחות פרטיים ועסקים ב{city} והסביבה. דברו עם עורך דין עוד היום.', n1: 'אודות', n2: 'תחומי עיסוק', pill: 'ייעוץ ראשוני', c1: 'קביעת פגישת ייעוץ', c2: 'התקשרו למשרד', fallback: 'כהן את לוי' },
    clinic: { kick: 'קליניקה פרטית ב{city}', head: 'טיפול של מומחים, בלי חדר המתנה.', sub: 'מצאו את הרופא המתאים ב{name} וקבעו תור אונליין בפחות מדקה.', n1: 'מחלקות', n2: 'הרופאים שלנו', pill: 'קביעת תור', c1: 'קביעת תור', c2: 'מצאו מומחה', fallback: 'מרכז רפואי כרמל' },
    venue: { kick: 'גן אירועים ב{city}', head: 'היום שתזכרו, במקום שתאהבו.', sub: 'חתונות ואירועים פרטיים ב{name}. בואו לראות את המקום מקרוב.', n1: 'המקום', n2: 'גלריה', pill: 'תיאום סיור', c1: 'תיאום סיור', c2: 'לגלריה', fallback: 'אחוזת עץ הזית' }
  };''' + s[j:]
rep("(sector === 'clinic' ? 'Munich' : 'Haifa')", "(sector === 'clinic' ? 'מינכן' : 'חיפה')")
rep("document.getElementById('fType').value = 'A free homepage concept';", "document.getElementById('fType').value = 'הדמיה חינמית לעמוד הבית';")
rep("var label = { law: 'law firm', clinic: 'private clinic', venue: 'event venue' }[sector];", "var label = { law: 'משרד עורכי דין', clinic: 'קליניקה פרטית', venue: 'גן אירועים' }[sector];")
rep("if (!msg.value) msg.value = 'Hi Amir, I run a ' + label + (cityIn.value.trim() ? ' in ' + cityIn.value.trim() : '') + ' and would like a free homepage concept.';",
    "if (!msg.value) msg.value = 'היי אמיר, יש לי ' + label + (cityIn.value.trim() ? ' ב' + cityIn.value.trim() : '') + ' ואשמח להדמיה חינמית של עמוד הבית.';")
rep("var problem = !data.name.trim() ? 'Please add your name.' : !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(data.email.trim()) ? 'Please add a valid email address so I can reply.' : !data.message.trim() ? 'Please write a short message.' : '';",
    "var problem = !data.name.trim() ? 'נא להוסיף שם.' : !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(data.email.trim()) ? 'נא להוסיף כתובת מייל תקינה כדי שאוכל לחזור אליכם.' : !data.message.trim() ? 'נא לכתוב הודעה קצרה.' : '';")
rep("sendBtn.textContent = 'Sending…';", "sendBtn.textContent = 'שולח…';")
rep("""form.innerHTML = '<div class="sent"><h3>Message sent.</h3><p class="muted" style="margin-top:12px">Thank you, ' + data.name.trim().split(' ')[0].replace(/[<>&]/g, '') + '. I will reply to ' + data.email.trim().replace(/[<>&]/g, '') + ' within one working day.</p></div>';""",
    """form.innerHTML = '<div class="sent"><h3>ההודעה נשלחה.</h3><p class="muted" style="margin-top:12px">תודה, ' + data.name.trim().split(' ')[0].replace(/[<>&]/g, '') + '. אחזור אליכם ל-' + data.email.trim().replace(/[<>&]/g, '') + ' תוך יום עבודה.</p></div>';""")
rep("err.textContent = 'The message could not be sent. Please email me at amirrahm135@gmail.com or message me on WhatsApp.';", "err.textContent = 'ההודעה לא נשלחה. אפשר לכתוב לי ל-amirrahm135@gmail.com או בוואטסאפ.';")
rep("err.hidden = false; sendBtn.disabled = false; sendBtn.textContent = 'Send message';", "err.hidden = false; sendBtn.disabled = false; sendBtn.textContent = 'שליחה';")

# chat
i, j = s.index('  const MODES = {'), s.index('  };', s.index('  const MODES = {')) + 4
s = s[:i] + '''  const MODES = {
    buildlab: { name: 'העוזר של אמיר', av: 'אר', url: 'amir-rahm.dev',
      hello: 'היי! אני העוזר של אמיר רם. אפשר לשאול אותי כל דבר על העבודה שלו, איך פרויקט מתנהל, או מה אתר או כלי AI יכולים לעשות לעסק שלכם.',
      chips: ['איך מתנהל פרויקט?', 'כמה עולה אתר?', 'אפשר עוזר כזה גם לעסק שלי?', 'אני עורך דין, יש לי המון מסמכים'] },
    law: { name: 'משרד עו״ד כהן את לוי', av: 'כל', url: 'cohen-levi.co.il',
      hello: 'שלום, הגעתם למשרד כהן את לוי. איך אפשר לעזור? אפשר לשאול על תחומי העיסוק שלנו או לקבוע שיחת היכרות חינמית של 20 דקות עם עורך דין.',
      chips: ['אני בהליך גירושים, מי יכול לעזור?', 'אתם מטפלים ברכישת דירה?', 'יש לי שאלה על ירושה', 'לקבוע שיחת היכרות'] },
    clinic: { name: 'מרפאת לינדנהוף', av: 'ל', url: 'lindenhof-praxis.de',
      hello: 'ברוכים הבאים למרפאת לינדנהוף. ספרו לי במה אתם צריכים עזרה ואמצא לכם את המחלקה המתאימה, או אקבע לכם תור.',
      chips: ['כואבת לי הברך אחרי ריצה', 'אתם מקבלים ביטוח ציבורי?', 'Sprechen Sie Englisch?', 'לקבוע תור'] },
    venue: { name: 'אחוזת עץ הזית', av: 'עז', url: 'olivegrove-estate.co.il',
      hello: 'ברוכים הבאים לאחוזת עץ הזית! מתכננים חתונה או אירוע? אשמח לספר על המקום או לתאם לכם סיור.',
      chips: ['כמה אורחים אפשר להושיב?', 'הקייטרינג כשר?', 'כמה עולה חתונה אצלכם?', 'לתאם סיור'] },
  };''' + s[j:]
rep("""const rows = [['Name', c.name], ['Phone', c.phone], ['About', c.service], ['Preferred time', c.time], c.notes && ['Notes', c.notes]].filter(Boolean);""",
    """const rows = [['שם', c.name], ['טלפון', c.phone], ['נושא', c.service], ['זמן מועדף', c.time], c.notes && ['הערות', c.notes]].filter(Boolean);""")
rep("""el.innerHTML = `<b>WHAT THE ${c.mode === 'venue' ? 'EVENTS TEAM' : c.mode === 'clinic' ? 'CLINIC' : 'OFFICE'} RECEIVES</b><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd dir="auto">${esc(v || '-')}</dd>`).join('')}</dl><p>Demo: nothing was sent. In a real setup this arrives on the team's WhatsApp or email right away.</p>`;""",
    """el.innerHTML = `<b>מה ${c.mode === 'venue' ? 'צוות האירועים' : c.mode === 'clinic' ? 'המרפאה' : 'המשרד'} מקבל</b><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd dir="auto">${esc(v || '-')}</dd>`).join('')}</dl><p>דמו: שום דבר לא נשלח. בהתקנה אמיתית זה מגיע מיד לוואטסאפ או למייל של הצוות.</p>`;""")
rep("""el.innerHTML = `<b>SENT TO AMIR</b><p style="margin-top:0;color:inherit">Your message is in Amir's inbox. He replies within one working day.</p>`;""",
    """el.innerHTML = `<b>נשלח לאמיר</b><p style="margin-top:0;color:inherit">ההודעה שלכם אצל אמיר במייל. הוא חוזר תוך יום עבודה.</p>`;""")
rep("if (!r.ok) throw new Error(data.error || 'Something went wrong.');", "if (!r.ok) throw new Error(data.error || 'משהו השתבש.');")
rep("c.items.push({ role: 'assistant', content: e.message || 'Something went wrong, please try again.', err: true });", "c.items.push({ role: 'assistant', content: e.message || 'משהו השתבש, נסו שוב.', err: true });")

# anything that still looks like an English sentence inside visible markup
body = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', '', s[s.index('<body>'):])
left = [t.strip() for t in re.findall(r'>([^<>]*[A-Za-z]{4,}[^<>]*)<', body) if re.search(r'[a-z]{3,} [a-z]{3,}', t)]
left = [t for t in left if not re.search(r'HoopAssist|demo@arikapp|Next\.js|Sprechen|NBA|Gemini|Claude|\.co\.il|\.com|GitHub', t)]

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
