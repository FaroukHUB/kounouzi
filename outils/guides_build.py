# Utilisation : python3 outils/guides_build.py (après avoir modifié outils/guides_data.py).
# Génère les guides FR/EN de Kounouzi à partir de guides_data.py, avec la charte de la page d'accueil.
import re, json, html, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from guides_data import GUIDES, LIVRES
from legal_data import LEGAL

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public') + '/'
U = 'https://kounouzi.com'
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
               ("📚", "#efbe4c", "Six livres, rien d'autre", "Les questions sont tirées uniquement des six livres ci-dessous. Nous n'avons rien ajouté."),
               ("✅", "#36d6ff", "Relu avant publication", "Chaque question est relue. Sa source s'affiche sous la réponse, avec une explication en français et en arabe.")],
   stats=[("375", "questions de religion"), ("6", "livres de référence"), ("5", "tranches d'âge")],
   books_t="Les six livres de référence", books_l="Chaque question de religion du jeu vient de l'un de ces livres.",
   auteur="Auteur", theme="Thème", q="questions",
   prep_t="Comment une question est préparée", prep=[("📖", "Lecture du livre", "La question reprend un passage précis de l'un des six livres."),
     ("🎂", "Adaptée à l'âge", "Elle est formulée pour une tranche d'âge : 5–8, 8–10, 10–12, 12–14 ou 14 ans et plus."),
     ("🗣️", "Explication et source", "La réponse est accompagnée d'une explication en français et en arabe, et de sa source."),
     ("✅", "Relecture", "Rien n'entre dans le jeu sans avoir été relu.")]),
 'en': dict(p=[("📖", "#3ddc84", "The Qur'an and the Sunnah", "All religion questions follow the Qur'an and the Sunnah."),
               ("📚", "#efbe4c", "Six books, nothing else", "The questions are taken only from the six books below. We added nothing."),
               ("✅", "#36d6ff", "Reviewed before publication", "Every question is reviewed. Its source is shown under the answer, with an explanation in French and Arabic.")],
   stats=[("375", "religion questions"), ("6", "reference books"), ("5", "age groups")],
   books_t="The six reference books", books_l="Every religion question in the game comes from one of these books.",
   auteur="Author", theme="Topic", q="questions",
   prep_t="How a question is prepared", prep=[("📖", "Reading the book", "The question is based on a specific passage of one of the six books."),
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
<div class="bar"><span>{b['n']} {t['q']}</span><i style="--p:{b['n']}%"></i></div></article>""" for b in LIVRES)
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
   cta_btn='Obtenir mon accès', try_btn='▶ Essai gratuit de 10 min', faq_t='Questions fréquentes', more_t='À lire aussi', foot='Jouez ensemble, apprenez autrement, transmettez l\'essentiel', foot_g='Guides',
   loc='fr_FR', aria='Kounouzi, accueil'),
 'en': dict(home='/en/', other='/', home_l='Home', guides_l='Guides', nav=[('/en/#valeurs', 'Our values'), ('/en/#benefices', 'Benefits'), ('/en/#essayer', 'Try it'), ('/en/#offre', 'Offer'), ('/en/#guides', 'Guides')],
   code='I have a code', cta='Get access', flag='fr', flag_l='Version française', cta_box="Ready to play as a family? Launch price: €6.99. One-time payment, no subscription, updates included.",
   cta_btn='Get my access', try_btn='▶ Free 10-min trial', faq_t='Frequently asked questions', more_t='Read also', foot='Play together, learn differently, pass on what matters', foot_g='Guides',
   loc='en_GB', aria='Kounouzi, home'),
}

def url(lang, slug): return (U + '/' if lang == 'fr' else U + '/en/') + slug + '/'
def path(lang, slug): return ('/' if lang == 'fr' else '/en/') + slug + '/'

LEGAL_NAV = {
 'fr': [('/mentions-legales/', 'Mentions légales'), ('/confidentialite/', 'Confidentialité'), ('/cgv/', 'Conditions de vente'), ('/sources-religion/', 'Nos sources')],
 'en': [('/en/legal-notice/', 'Legal notice'), ('/en/privacy/', 'Privacy'), ('/en/terms/', 'Terms of sale'), ('/en/religion-sources/', 'Our sources')]}
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
<footer><div class="wrap">
  <a class="logo" href="{t['home']}" aria-label="Kounouzi"><img class="brand" src="/img/logo/kounouzi.webp?v=2" alt="Kounouzi" width="92" height="72" loading="lazy"></a>
  <span>{t['foot']} — © 2026 · <a href="{other_url}" style="color:inherit" data-lang="{'en' if lang == 'fr' else 'fr'}">{t['flag_l']}</a></span>
  {footer_guides(lang)}
  {legal_nav(lang)}
</div></footer>
<script>document.querySelectorAll('[data-lang]').forEach(function(a){{a.addEventListener('click',function(){{try{{localStorage.setItem('kounouzi_lang',a.dataset.lang)}}catch(e){{}} document.cookie='kz_lang='+a.dataset.lang+'; path=/; max-age=31536000; samesite=lax';}});}});</script>
{BAN}
</body>
</html>
"""

def page_legale(g, lang):
    h = page({**g, lang: {**g[lang], 'faq': []}}, lang)
    h = h.replace('<meta name="robots" content="index,follow,max-image-preview:large">', '<meta name="robots" content="noindex,follow">')
    h = re.sub(r'<div class="cta" style="margin-top:22px">.*?</div>\n', '', h, count=1)
    h = re.sub(r'<div class="gcta">.*?</div>\n<h2>[^<]*</h2><div class="gfaq"></div>\n', '', h, count=1, flags=re.S)
    h = re.sub(r'<h2 style="margin-top:56px">[^<]*</h2>\n<div class="glinks">.*?</div>\n', '', h, count=1, flags=re.S)
    h = re.sub(r', \{"@type": "FAQPage", "inLanguage": "\w+", "mainEntity": \[\]\}', '', h)
    h = re.sub(r'› <a href="[^"]*#guides">[^<]*</a> › ', '› ', h, count=1)
    return h

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

# Plan du site : accueil + guides, avec leurs versions FR/EN
def entree(fr, en):
    alt = f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="{en}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="{fr}"/>\n'
    return f'  <url>\n    <loc>{fr}</loc>\n{alt}  </url>\n  <url>\n    <loc>{en}</loc>\n{alt}  </url>\n'
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
sm += entree(U + '/', U + '/en/') + ''.join(entree(url('fr', g['fr']['slug']), url('en', g['en']['slug'])) for g in GUIDES) + '</urlset>\n'
open(D + 'sitemap.xml', 'w').write(sm)
print('sitemap', sm.count('<loc>'))

# Liens des guides pour la page d'accueil (section #guides et pied de page)
json.dump({lang: [{'href': path(lang, g[lang]['slug']), 'kick': g[lang]['kick'], 'lead': re.sub('<[^>]+>', '', g[lang]['lead'])} for g in GUIDES] for lang in ('fr', 'en')},
          open(os.path.dirname(__file__) + '/guides_liens.json', 'w'), ensure_ascii=False)
