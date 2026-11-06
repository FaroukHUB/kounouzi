# Utilisation : python3 outils/guides_build.py (après avoir modifié outils/guides_data.py).
# Génère les guides FR/EN de Kounouzi à partir de guides_data.py, avec la charte de la page d'accueil.
import re, json, html, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from guides_data import GUIDES, LIVRES
from legal_data import LEGAL
import pages_site as PS

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public') + '/'
U = 'https://kounouzi.com'

def guides_pied(lang): return [(g['id'], ('/' if lang == 'fr' else '/en/') + g[lang]['slug'] + '/', g[lang]['kick']) for g in GUIDES]

# Pied de page et styles communs : d'abord sur les deux pages d'accueil (écrites à la main), d'où les autres pages reprennent les styles.
for _f, _l in (('index.html', 'fr'), ('en/index.html', 'en')):
    _s = open(D + _f).read()
    _s = re.sub(r'<footer[ >].*?</footer>', lambda m: PS.footer(_l, guides_pied(_l)), _s, count=1, flags=re.S)
    _s = re.sub(r'/\* pied:debut \*/.*?/\* pied:fin \*/', '', _s, flags=re.S).replace('</style>', '/* pied:debut */' + PS.FOOT_CSS + '/* pied:fin */</style>', 1)
    open(D + _f, 'w').write(_s)

INDEX = open(D + 'index.html').read()
CSS = re.search(r'<style>(.*?)</style>', INDEX, re.S).group(1)
GA = re.search(r'(<!-- Google tag.*?googletagmanager\.com/gtag/js\?id=G-QT8SX98GY7"></script>)', INDEX, re.S).group(1)
BAN = re.search(r'(<div id="kzCookies".*?</script>)\s*</body>', INDEX, re.S).group(1)

SRC_CSS = """
.src-pills{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:8px}
.src-pill{position:relative;padding:24px 22px;border-radius:24px;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);overflow:hidden}
.src-pill::after{content:"";position:absolute;inset-inline-end:-50px;top:-50px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--g) 40%,transparent),transparent 70%)}
.src-pill .ic{font-size:34px;line-height:1;margin-bottom:12px}.src-pill h3{font-size:22px;margin-bottom:6px}.src-pill p{margin:0;color:var(--muted);font-size:15.5px}
.src-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:26px 0 8px}
.src-stats div{text-align:center;padding:18px 10px;border-radius:20px;background:var(--night-2);border:1px solid rgba(255,255,255,.07)}
.src-stats b{display:block;font-family:var(--display);font-weight:400;font-size:clamp(30px,4vw,44px);color:var(--gold);line-height:1.05}.src-stats span{color:var(--muted);font-weight:800;font-size:14px}
.books{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:22px;counter-reset:bk}
.book{position:relative;display:flex;flex-direction:column;gap:12px;padding:26px 24px 22px;border-radius:26px;border:1.5px solid transparent;
 background:linear-gradient(165deg,#1a2e4c,#0f1c30) padding-box,linear-gradient(140deg,rgba(239,190,76,.85),rgba(139,61,255,.45) 45%,rgba(54,214,255,.5)) border-box;
 box-shadow:0 18px 44px rgba(0,0,0,.35);transition:transform .25s,box-shadow .25s}
.book:hover{transform:translateY(-4px);box-shadow:0 26px 60px rgba(0,0,0,.45),0 0 34px rgba(239,190,76,.18)}
.book .btop{display:flex;justify-content:space-between;align-items:center;gap:10px}
.book .num{counter-increment:bk;font-family:var(--display);font-size:15px;color:#3a2606;background:var(--gold);border-radius:999px;padding:5px 12px}
.book .num::before{content:"0" counter(bk)}
.book .em{font-size:28px}
.book .ar{font-family:var(--arabic);font-size:clamp(22px,2.6vw,28px);line-height:1.6;color:var(--gold-soft);text-align:right;direction:rtl}
.book h3{font-family:var(--body);font-weight:900;font-size:18px;line-height:1.35;color:var(--parchment)}
.book .tr{color:var(--muted);font-style:italic;font-size:14.5px;margin-top:-6px}
.book .who{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:14px;font-weight:800;color:var(--parchment)}
.book .who bdi{font-family:var(--arabic);font-weight:700;color:var(--muted)}
.book .theme{font-size:14.5px;color:var(--muted);padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
.book .theme b{color:var(--parchment)}
.book .bar{display:flex;align-items:center;gap:10px;margin-top:auto;font-weight:900;font-size:14px}
.book .bar i{flex:1;height:8px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}
.book .bar i::after{content:"";position:absolute;inset-block:0;inset-inline-start:0;width:var(--p);border-radius:9px;background:linear-gradient(90deg,var(--gold),var(--orange))}
.prep{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:20px;counter-reset:pr}
.prep div{padding:20px 18px;border-radius:20px;background:var(--night-2);border:1px solid rgba(255,255,255,.08);position:relative}
.prep div::before{counter-increment:pr;content:counter(pr);position:absolute;inset-inline-end:14px;top:6px;font-family:var(--display);font-size:44px;color:rgba(255,255,255,.06)}
.prep b{display:block;font-size:16px;margin:8px 0 4px}.prep p{margin:0;color:var(--muted);font-size:14.5px}.prep span{font-size:26px}
.src-sec h2{font-size:clamp(26px,3.4vw,38px);margin:54px 0 6px}
@media (max-width:980px){.books{grid-template-columns:1fr}.prep{grid-template-columns:repeat(2,1fr)}}
@media (max-width:720px){.src-pills,.src-stats{grid-template-columns:1fr}.src-stats{grid-template-columns:repeat(3,1fr)}.src-stats div{padding:12px 4px}.prep{grid-template-columns:1fr}.book{padding:22px 18px}}
"""

ST = {
 'fr': dict(p=[("📖", "#3ddc84", "Le Coran et la Sunnah", "Toutes les questions de religion suivent le Coran et la Sunnah."),
               ("📚", "#efbe4c", "Sept livres, rien d'autre", "Les questions de religion et d'invocations sont tirées uniquement des sept livres ci-dessous. Nous n'avons rien ajouté."),
               ("✅", "#36d6ff", "Relu avant publication", "Chaque question est relue. Sa source s'affiche sous la réponse, avec une explication en français et en arabe.")],
   stats=[("589", "questions de religion et d'invocations"), ("7", "livres de référence"), ("5", "tranches d'âge")],
   books_t="Les sept livres de référence", books_l="Chaque question de religion ou d'invocations du jeu vient de l'un de ces livres.",
   auteur="Auteur", theme="Thème", q="questions",
   prep_t="Comment une question est préparée", prep=[("📖", "Lecture du livre", "La question reprend un passage précis de l'un des sept livres."),
     ("🎂", "Adaptée à l'âge", "Elle est formulée pour une tranche d'âge : 5–8, 8–10, 10–12, 12–14 ou 14 ans et plus."),
     ("🗣️", "Explication et source", "La réponse est accompagnée d'une explication en français et en arabe, et de sa source."),
     ("✅", "Relecture", "Rien n'entre dans le jeu sans avoir été relu.")]),
 'en': dict(p=[("📖", "#3ddc84", "The Qur'an and the Sunnah", "All religion questions follow the Qur'an and the Sunnah."),
               ("📚", "#efbe4c", "Seven books, nothing else", "Religion and invocation questions are taken only from the seven books below. We added nothing."),
               ("✅", "#36d6ff", "Reviewed before publication", "Every question is reviewed. Its source is shown under the answer, with an explanation in French and Arabic.")],
   stats=[("589", "religion and invocation questions"), ("7", "reference books"), ("5", "age groups")],
   books_t="The seven reference books", books_l="Every religion or invocation question in the game comes from one of these books.",
   auteur="Author", theme="Topic", q="questions",
   prep_t="How a question is prepared", prep=[("📖", "Reading the book", "The question is based on a specific passage of one of the seven books."),
     ("🎂", "Suited to the age", "It is worded for an age group: 5–8, 8–10, 10–12, 12–14 or 14+."),
     ("🗣️", "Explanation and source", "The answer comes with an explanation in French and Arabic, and its source."),
     ("✅", "Review", "Nothing enters the game without being reviewed.")]),
}

def sources_corps(lang):
    t = ST[lang]; e = html.escape
    pills = ''.join(f'<div class="src-pill" style="--g:{g}"><div class="ic">{i}</div><h3>{e(h)}</h3><p>{e(p)}</p></div>' for i, g, h, p in t['p'])
    stats = ''.join(f'<div><b>{n}</b><span>{e(l)}</span></div>' for n, l in t['stats'])
    books = ''.join(f"""<article class="book"><div class="btop"><span class="num"></span><span class="em" aria-hidden="true">{b['ic']}</span></div>
<div class="ar" lang="ar" dir="rtl">{e(b['ar'])}</div><h3>{e(b[lang])}</h3><div class="tr">{e(b['tr'])}</div>
<div class="who">{t['auteur']} : {e(b['a'])} <bdi lang="ar" dir="rtl">{e(b['aar'])}</bdi></div>
<div class="theme"><b>{t['theme']} :</b> <bdi>{e(b['tfr'] if lang == 'fr' else b['ten'])}</bdi></div>
<div class="bar"><span>{b['n']} {t['q']}</span><i style="--p:{min(b['n'], 100)}%"></i></div></article>""" for b in LIVRES)
    prep = ''.join(f'<div><span>{i}</span><b>{e(h)}</b><p>{e(p)}</p></div>' for i, h, p in t['prep'])
    if lang == 'en': books = books.replace(f"{t['auteur']} : ", f"{t['auteur']}: ").replace(f"{t['theme']} :</b>", f"{t['theme']}:</b>")
    return f"""<div class="src-sec"><div class="src-pills">{pills}</div><div class="src-stats">{stats}</div>
<h2>{e(t['books_t'])}</h2><p class="lead">{e(t['books_l'])}</p><div class="books">{books}</div>
<h2>{e(t['prep_t'])}</h2><div class="prep">{prep}</div></div>"""

EXTRA = """
.ghero{padding:56px 0 30px}.ghero h1{font-size:clamp(32px,5vw,52px);max-width:900px}.ghero .lead{max-width:760px}
.crumb{font-size:13px;font-weight:800;color:var(--muted);margin-bottom:18px}.crumb a{color:var(--muted)}
.prose{max-width:780px}.prose h2{font-size:clamp(24px,3vw,32px);margin:42px 0 12px}.prose p,.prose li{color:var(--muted);font-size:17px;line-height:1.7}
.prose li{margin:8px 0}.prose b{color:var(--parchment)}.prose a{color:var(--gold)}
.prose a.btn{text-decoration:none}.prose a.btn-gold{color:#3a2606}.prose a.btn-ghost{color:var(--parchment)} /* les boutons gardent leurs couleurs dans le texte */
.gcta{margin:46px 0 10px;padding:26px;border-radius:24px;background:linear-gradient(160deg,#1c3050,#111f35);border:1.5px solid rgba(239,190,76,.4);display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
.gcta p{margin:0;font-weight:800;color:var(--parchment);font-size:18px;flex:1 1 320px}
.gfaq details{border-bottom:1px solid rgba(255,255,255,.08);padding:14px 0}.gfaq summary{font-weight:900;cursor:pointer}.gfaq p{margin:8px 0 0}
.glinks{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;margin-top:18px}
.glinks a{display:block;padding:18px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);text-decoration:none;color:var(--parchment);font-weight:900}
.glinks a span{display:block;font-weight:700;color:var(--muted);font-size:14px;margin-top:6px}.glinks a:hover{border-color:var(--gold)}
.fguides{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;margin-top:10px}.fguides a{color:var(--muted)}
.flegal{display:flex;flex-wrap:wrap;gap:6px 16px;width:100%;padding-top:14px;margin-top:6px;border-top:1px solid rgba(255,255,255,.07);font-size:13px}.flegal a{color:var(--faint)}.flegal a:hover{color:var(--parchment)}
"""

T = {
 'fr': dict(home='/', other='/en/', home_l='Accueil', guides_l='Guides', nav=[('/#valeurs', 'Nos valeurs'), ('/#benefices', 'Bénéfices'), ('/#essayer', 'Essayer'), ('/#offre', 'Offre'), ('/#guides', 'Guides')],
   code="J'ai un code", cta='Obtenir mon accès', flag='gb', flag_l='English version', cta_box="Prêt à jouer en famille ? Prix de lancement : 6,99 €. Paiement unique, sans abonnement, mises à jour incluses.",
   cta_btn='Obtenir mon accès', try_btn='<span>▶ Essai gratuit de <span data-essai>30</span> min</span>', faq_t='Questions fréquentes', more_t='À lire aussi', foot='Jouez ensemble, apprenez autrement, transmettez l\'essentiel', foot_g='Guides',
   loc='fr_FR', aria='Kounouzi, accueil'),
 'en': dict(home='/en/', other='/', home_l='Home', guides_l='Guides', nav=[('/en/#valeurs', 'Our values'), ('/en/#benefices', 'Benefits'), ('/en/#essayer', 'Try it'), ('/en/#offre', 'Offer'), ('/en/#guides', 'Guides')],
   code='I have a code', cta='Get access', flag='fr', flag_l='Version française', cta_box="Ready to play as a family? Launch price: €6.99. One-time payment, no subscription, updates included.",
   cta_btn='Get my access', try_btn='<span>▶ Free <span data-essai>30</span>-min trial</span>', faq_t='Frequently asked questions', more_t='Read also', foot='Play together, learn differently, pass on what matters', foot_g='Guides',
   loc='en_GB', aria='Kounouzi, home'),
}

def url(lang, slug): return (U + '/' if lang == 'fr' else U + '/en/') + slug + '/'
def path(lang, slug): return ('/' if lang == 'fr' else '/en/') + slug + '/'

LEGAL_NAV = {
 'fr': [('/mentions-legales/', 'Mentions légales'), ('/confidentialite/', 'Confidentialité'), ('/cgv/', 'Conditions de vente'), ('/retractation/', 'Se rétracter du contrat ici'), ('/sources-religion/', 'Nos sources')],
 'en': [('/en/legal-notice/', 'Legal notice'), ('/en/privacy/', 'Privacy'), ('/en/terms/', 'Terms of sale'), ('/en/withdrawal/', 'Withdraw from the contract here'), ('/en/religion-sources/', 'Our sources')]}
def legal_nav(lang):
    cookies = 'Gérer les cookies' if lang == 'fr' else 'Manage cookies'
    return ('<nav class="flegal" aria-label="' + ('Informations légales' if lang == 'fr' else 'Legal') + '">' + ''.join(f'<a href="{h}">{l}</a>' for h, l in LEGAL_NAV[lang])
            + f'<a href="#" data-cookies>{cookies}</a><a href="mailto:contact@kounouzi.com">Contact</a></nav>')

def footer_guides(lang):
    return '<nav class="fguides" aria-label="' + T[lang]['foot_g'] + '">' + ''.join(f'<a href="{path(lang, g[lang]["slug"])}">{html.escape(g[lang]["kick"])}</a>' for g in GUIDES) + '</nav>'

def bloc(b):
    if isinstance(b, tuple):
        tag, items = b
        return f'<{tag}>' + ''.join(f'<li>{i}</li>' for i in items) + f'</{tag}>'
    return f'<p>{b}</p>'

def page(g, lang):
    c, t = g[lang], T[lang]
    autre = g['en' if lang == 'fr' else 'fr']
    other_url = path('en' if lang == 'fr' else 'fr', autre['slug'])
    corps = ''.join(f'<h2>{h}</h2>' + ''.join(bloc(b) for b in bs) for h, bs in c.get('sections', []))
    faq = ''.join(f'<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>' for q, a in c['faq'])
    autres = [x for x in GUIDES if x['id'] != g['id']]
    liens = ''.join(f'<a href="{path(lang, x[lang]["slug"])}">{x[lang]["kick"]}<span>{html.escape(re.sub("<[^>]+>", "", x[lang]["lead"]))[:110]}…</span></a>' for x in autres)
    clean = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', s))).strip()
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": clean(c['h1']), "description": c['desc'], "inLanguage": lang, "mainEntityOfPage": url(lang, c['slug']),
         "image": U + '/img/site/og-' + lang + '.jpg', "author": {"@type": "Organization", "name": "Kounouzi", "url": U + '/'}, "publisher": {"@type": "Organization", "name": "Kounouzi", "logo": {"@type": "ImageObject", "url": U + '/img/logo/favicon-192.png'}}},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Kounouzi", "item": U + t['home']}, {"@type": "ListItem", "position": 2, "name": t['guides_l'], "item": U + t['home'] + '#guides'}, {"@type": "ListItem", "position": 3, "name": c['kick'], "item": url(lang, c['slug'])}]},
        {"@type": "FAQPage", "inLanguage": lang, "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in c['faq']]}]}
    nav = ''.join(f'<a href="{h}">{l}</a>' for h, l in t['nav'])
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
{GA}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(c['title'] if len(c['title'])<=62 else c['title'].replace(' | Kounouzi',''), quote=False)}</title>
<meta name="description" content="{html.escape(c['desc'])}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#0c1626">
<link rel="canonical" href="{url(lang, c['slug'])}">
<link rel="alternate" hreflang="fr" href="{url('fr', g['fr']['slug'])}">
<link rel="alternate" hreflang="en" href="{url('en', g['en']['slug'])}">
<link rel="alternate" hreflang="x-default" href="{url('fr', g['fr']['slug'])}">
<meta property="og:type" content="article">
<meta property="og:locale" content="{t['loc']}">
<meta property="og:site_name" content="Kounouzi">
<meta property="og:url" content="{url(lang, c['slug'])}">
<meta property="og:title" content="{html.escape(c['title'])}">
<meta property="og:description" content="{html.escape(c['desc'])}">
<meta property="og:image" content="{U}/img/site/og-{lang}.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/img/logo/favicon-32.png?v=2"><link rel="icon" type="image/png" sizes="48x48" href="/img/logo/favicon-48.png?v=2"><link rel="icon" type="image/png" sizes="192x192" href="/img/logo/favicon-192.png?v=2">
<link rel="apple-touch-icon" href="/img/app/apple-touch-icon.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@500;700;800;900&family=Noto+Naskh+Arabic:wght@500;700&display=swap">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False).replace('</', '<\\/')}</script>
<style>{CSS}{EXTRA}{SRC_CSS if g.get('custom') == 'sources' else ''}</style>
</head>
<body>
<div class="sky" aria-hidden="true"></div>
<header class="top">
  <div class="wrap">
    <a class="logo" href="{t['home']}" aria-label="{t['aria']}"><img class="brand" src="/img/logo/kounouzi.webp?v=2" alt="Kounouzi" width="79" height="62"></a>
    <nav aria-label="Sections">{nav}</nav>
    <div class="acts">
      <a class="langsw" href="{other_url}" hreflang="{'en' if lang == 'fr' else 'fr'}" lang="{'en' if lang == 'fr' else 'fr'}" data-lang="{'en' if lang == 'fr' else 'fr'}" title="{t['flag_l']}" aria-label="{t['flag_l']}"><img src="/img/flags/{t['flag']}.svg" alt="" width="24" height="16"></a>
      <a class="btn btn-ghost btn-sm" href="{t['home']}#acceder" data-hide-acces>{t['code']}</a>
      <a class="btn btn-gold btn-sm" href="{t['home']}#offre" data-cta>{t['cta']}</a>
    </div>
  </div>
</header>
<main>
<section class="ghero"><div class="wrap">
  <nav class="crumb" aria-label="Fil d'Ariane"><a href="{t['home']}">{t['home_l']}</a> › <a href="{t['home']}#guides">{t['guides_l']}</a> › {c['kick']}</nav>
  <span class="kick">{c['kick']}</span>
  <h1 style="margin-top:12px">{c['h1']}</h1>
  <p class="lead" style="margin-top:14px">{c['lead']}</p>
  <div class="cta" style="margin-top:22px"><a class="btn btn-gold btn-lg" href="{t['home']}#offre">{t['cta_btn']}</a><a class="btn btn-ghost btn-lg" href="{t['home']}#essai-gratuit">{t['try_btn']}</a></div>
</div></section>
<section style="padding-top:10px"><div class="wrap">{sources_corps(lang) if g.get('custom') == 'sources' else ''}<article class="prose">
{corps}
<div class="gcta"><p>{t['cta_box']}</p><a class="btn btn-gold" href="{t['home']}#offre">{t['cta_btn']}</a></div>
<h2>{t['faq_t']}</h2><div class="gfaq">{faq}</div>
</article>
<h2 style="margin-top:56px">{t['more_t']}</h2>
<div class="glinks">{liens}</div>
</div></section>
</main>
{PS.footer(lang, guides_pied(lang)).replace(f'href="{PS.FOOT[lang]["other"][1]}"', f'href="{other_url}"', 1)}
<script>document.querySelectorAll('[data-lang]').forEach(function(a){{a.addEventListener('click',function(){{try{{localStorage.setItem('kounouzi_lang',a.dataset.lang)}}catch(e){{}} document.cookie='kz_lang='+a.dataset.lang+'; path=/; max-age=31536000; samesite=lax';}});}});</script>
{BAN}
<script>fetch('/api/code').then(function(r){{return r.json()}}).then(function(d){{if(d.essaiMinutes)document.querySelectorAll('[data-essai]').forEach(function(e){{e.textContent=d.essaiMinutes}})}}).catch(function(){{}});</script>
<script src="/aide.js?v=2" defer></script>
</body>
</html>
"""

def page_legale(g, lang):
    h = page({**g, lang: {**g[lang], 'faq': []}}, lang)
    if g.get('custom') == 'retractation':
        h = h.replace('</article>', RETRACT_FORM[lang] + '</article>', 1).replace('</body>', RETRACT_JS[lang] + '\n</body>', 1).replace('</style>', RETRACT_CSS + '</style>', 1)
    h = h.replace('<meta name="robots" content="index,follow,max-image-preview:large">', '<meta name="robots" content="noindex,follow">')
    h = re.sub(r'<div class="cta" style="margin-top:22px">.*?</div>\n', '', h, count=1)
    h = re.sub(r'<div class="gcta">.*?</div>\n<h2>[^<]*</h2><div class="gfaq"></div>\n', '', h, count=1, flags=re.S)
    h = re.sub(r'<h2 style="margin-top:56px">[^<]*</h2>\n<div class="glinks">.*?</div>\n', '', h, count=1, flags=re.S)
    h = re.sub(r', \{"@type": "FAQPage", "inLanguage": "\w+", "mainEntity": \[\]\}', '', h)
    h = re.sub(r'› <a href="[^"]*#guides">[^<]*</a> › ', '› ', h, count=1)
    return h

RETRACT_CSS = """
.rform{display:grid;gap:12px;margin-top:22px;padding:24px;border-radius:24px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}
.rform label{font-weight:900}.rform small{color:var(--muted);font-weight:700}
.rform input[type=text],.rform input[type=email],.rform textarea{border-radius:14px;border:1.5px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);color:var(--parchment);font:700 16px var(--body);padding:13px 15px;width:100%}
.rform textarea{min-height:100px;resize:vertical}.rform .hp{position:absolute;inset-inline-start:-9999px;width:1px;height:1px;opacity:0}
.rform .etape2{display:grid;gap:12px;padding:16px;border-radius:16px;background:rgba(239,190,76,.08);border:1px solid rgba(239,190,76,.35)}
.rmsg{margin-top:12px;font-weight:800}.rmsg.ok{color:#3ddc84}.rmsg.err{color:#ff8a7a}
"""
def _rform(t):
    return f"""<h2>{t['h']}</h2>
<form class="rform" id="rForm" novalidate>
  <label for="rNom">{t['nom']}</label><input type="text" id="rNom" name="nom" maxlength="120" autocomplete="name" required>
  <label for="rMail">{t['mail']}</label><input type="email" id="rMail" name="email" maxlength="160" autocomplete="email" required>
  <label for="rRef">{t['ref']} <small>{t['refopt']}</small></label><input type="text" id="rRef" name="reference" maxlength="120" placeholder="KZ-XXXX-XXXX">
  <label for="rMotif">{t['motif']} <small>{t['opt']}</small></label><textarea id="rMotif" name="motif" maxlength="2000"></textarea>
  <input class="hp" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button class="btn btn-gold btn-lg" type="button" id="rEtape">{t['b1']}</button>
  <div class="etape2" id="rConf" hidden><p style="margin:0">{t['conf']}</p><button class="btn btn-gold btn-lg" type="submit" id="rBtn">{t['b2']}</button></div>
</form>
<div class="rmsg" id="rMsg" role="status"></div>
"""
RETRACT_FORM = {
 'fr': _rform(dict(h="Votre demande", nom="Nom et prénom", mail="Adresse e-mail utilisée pour l'achat", ref="Code d'accès ou référence de paiement", refopt="(si vous l'avez)", motif="Précisions", opt="(facultatif)",
   b1="Se rétracter du contrat", conf="Vous allez envoyer une demande de rétractation de votre achat Kounouzi. Confirmez-vous ?", b2="Confirmer la rétractation")),
 'en': _rform(dict(h="Your request", nom="Full name", mail="E-mail address used for the purchase", ref="Access code or payment reference", refopt="(if you have it)", motif="Details", opt="(optional)",
   b1="Withdraw from the contract", conf="You are about to send a request to withdraw from your Kounouzi purchase. Do you confirm?", b2="Confirm the withdrawal")),
}
def _rjs(t, lang):
    return """<script>(function(){ var f=document.getElementById('rForm'), m=document.getElementById('rMsg');
document.getElementById('rEtape').onclick=function(){ if(f.nom.value.trim().length<2||!/^\\S+@\\S+\\.\\S+$/.test(f.email.value.trim())){ m.className='rmsg err'; m.textContent='""" + t['manque'] + """'; return; } m.textContent=''; document.getElementById('rConf').hidden=false; document.getElementById('rBtn').focus(); };
f.addEventListener('submit',function(e){ e.preventDefault(); var b=document.getElementById('rBtn'); b.disabled=true; m.className='rmsg'; m.textContent='""" + t['envoi'] + """';
 fetch('/api/retractation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nom:f.nom.value,email:f.email.value,reference:f.reference.value,motif:f.motif.value,site:f.site.value,confirme:true,lang:'""" + lang + """'})}).then(function(r){return r.json()}).then(function(d){
  if(d.ok){ m.className='rmsg ok'; m.textContent='""" + t['ok'] + """'+(d.accuse?'""" + t['okmail'] + """':''); f.hidden=true; } else { m.className='rmsg err'; m.textContent=d.erreur||'""" + t['err'] + """'; b.disabled=false; } }).catch(function(){ m.className='rmsg err'; m.textContent='""" + t['err'] + """'; b.disabled=false; }); });
})();</script>"""
RETRACT_JS = {
 'fr': _rjs(dict(manque="Indiquez votre nom et l\\'adresse e-mail utilisée pour l\\'achat.", envoi="Envoi…", ok="Votre demande de rétractation a bien été enregistrée.", okmail=" Un accusé de réception vient de vous être envoyé par e-mail.", err="Envoi impossible pour le moment. Écrivez-nous à contact@kounouzi.com."), 'fr'),
 'en': _rjs(dict(manque="Please give your name and the e-mail address used for the purchase.", envoi="Sending…", ok="Your withdrawal request has been recorded.", okmail=" An acknowledgement has just been sent to you by e-mail.", err="Cannot send right now. Please write to contact@kounouzi.com."), 'en'),
}

for g in LEGAL:
    for lang in ('fr', 'en'):
        p = D + ('' if lang == 'fr' else 'en/') + g[lang]['slug'] + '/index.html'
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w').write(page_legale(g, lang))
        print(p.replace(D, ''), 'légal')

for g in GUIDES:
    for lang in ('fr', 'en'):
        p = D + ('' if lang == 'fr' else 'en/') + g[lang]['slug'] + '/index.html'
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w').write(page(g, lang))
        print(p.replace(D, ''), len(g[lang]['title']), len(g[lang]['desc']))

def premiere_phrase(t):
    t = re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', '', t))).strip()
    m = re.match(r'(.{20,}?[.!?])(\s|$)', t)
    return m.group(1) if m else t

def page_site(kind, lang):
    DD = {'contact': PS.CONTACT, 'plan': PS.PLAN, 'apropos': PS.APROPOS}[kind]
    d = DD[lang]
    autre_lang = 'en' if lang == 'fr' else 'fr'
    autre = DD[autre_lang]
    if kind == 'apropos': d = {**d, 'h1': PS.apropos_md(lang)[0]}; autre = {**autre, 'h1': ''}
    g = {'id': kind, lang: {**d, 'sections': [], 'faq': d.get('faq', [])}, autre_lang: {**autre, 'sections': [], 'faq': []}}
    h = page(g, lang)
    corps = PS.contact_corps(lang) if kind == 'contact' else PS.apropos_corps(lang) if kind == 'apropos' else PS.plan_corps(lang, [(gid, hr, k, premiere_phrase(next(x for x in GUIDES if x['id'] == gid)[lang]['lead'])) for gid, hr, k in guides_pied(lang)])
    h = h.replace('<article class="prose">\n', corps + '\n<article class="prose">\n', 1)
    h = re.sub(r'<div class="cta" style="margin-top:22px">.*?</div>\n', '', h, count=1)
    h = re.sub(r'› <a href="[^"]*#guides">[^<]*</a> › ', '› ', h, count=1)
    h = re.sub(r'\{"@type": "ListItem", "position": 2, "name": "[^"]*", "item": "[^"]*#guides"\}, \{"@type": "ListItem", "position": 3,', '{"@type": "ListItem", "position": 2,', h, count=1)
    h = h.replace('"@type": "Article", "headline"', '"@type": "' + {'contact': 'ContactPage', 'apropos': 'AboutPage'}.get(kind, 'WebPage') + '", "headline"', 1).replace('<meta property="og:type" content="article">', '<meta property="og:type" content="website">')
    if kind == 'apropos':
        h = h.replace('</style>', PS.STORY_CSS + '</style>', 1)
        h = re.sub(r'(<div class="gcta">.*?</div>\n)<h2>[^<]*</h2><div class="gfaq"></div>\n', r'\1', h, count=1, flags=re.S)
        h = re.sub(r', \{"@type": "FAQPage", "inLanguage": "\w+", "mainEntity": \[\]\}', '', h)
        h = h.replace('"author": {"@type": "Organization", "name": "Kounouzi", "url": "' + U + '/"}', '"author": {"@type": "Person", "name": "Abou Salmaan", "jobTitle": "' + ('Créateur de Kounouzi' if lang == 'fr' else 'Creator of Kounouzi') + '"}', 1)
    if kind == 'plan':
        h = re.sub(r'<div class="gcta">.*?</div>\n<h2>[^<]*</h2><div class="gfaq"></div>\n', '', h, count=1, flags=re.S)
        h = re.sub(r'<h2 style="margin-top:56px">[^<]*</h2>\n<div class="glinks">.*?</div>\n', '', h, count=1, flags=re.S)
        h = re.sub(r', \{"@type": "FAQPage", "inLanguage": "\w+", "mainEntity": \[\]\}', '', h)
        h = h.replace('<article class="prose">\n\n</article>\n', '').replace('<article class="prose">\n</article>\n', '')
    elif kind == 'contact':
        h = h.replace('</body>', PS.contact_js(lang) + '\n</body>', 1)
        h = h.replace('"publisher": {"@type": "Organization", "name": "Kounouzi"', '"publisher": {"@type": "Organization", "name": "Kounouzi", "email": "' + PS.MAIL + '", "contactPoint": {"@type": "ContactPoint", "contactType": "customer support", "email": "' + PS.MAIL + '", "availableLanguage": ["French", "English"]}', 1)
    return h

PAGES_SITE = [('apropos', PS.APROPOS), ('contact', PS.CONTACT), ('plan', PS.PLAN)]
for kind, dd in PAGES_SITE:
    for lang in ('fr', 'en'):
        p = D + ('' if lang == 'fr' else 'en/') + dd[lang]['slug'] + '/index.html'
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w').write(page_site(kind, lang))
        print(p.replace(D, ''), kind)

# Plan du site : accueil + guides, avec leurs versions FR/EN
def entree(fr, en):
    alt = f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="{en}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="{fr}"/>\n'
    return f'  <url>\n    <loc>{fr}</loc>\n{alt}  </url>\n  <url>\n    <loc>{en}</loc>\n{alt}  </url>\n'
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
sm += entree(U + '/', U + '/en/') + ''.join(entree(url('fr', g['fr']['slug']), url('en', g['en']['slug'])) for g in GUIDES)
sm += ''.join(entree(url('fr', dd['fr']['slug']), url('en', dd['en']['slug'])) for _, dd in PAGES_SITE) + '</urlset>\n'
open(D + 'sitemap.xml', 'w').write(sm)
print('sitemap', sm.count('<loc>'))

# Liens des guides pour la page d'accueil (section #guides et pied de page)
json.dump({lang: [{'href': path(lang, g[lang]['slug']), 'kick': g[lang]['kick'], 'lead': re.sub('<[^>]+>', '', g[lang]['lead'])} for g in GUIDES] for lang in ('fr', 'en')},
          open(os.path.dirname(__file__) + '/guides_liens.json', 'w'), ensure_ascii=False)
