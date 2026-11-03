# Utilisation : python3 outils/guides_build.py (après avoir modifié outils/guides_data.py).
# Génère les guides FR/EN de Kounouzi à partir de guides_data.py, avec la charte de la page d'accueil.
import re, json, html, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from guides_data import GUIDES

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public') + '/'
U = 'https://kounouzi.com'
INDEX = open(D + 'index.html').read()
CSS = re.search(r'<style>(.*?)</style>', INDEX, re.S).group(1)
GA = re.search(r'(<!-- Google tag.*?googletagmanager\.com/gtag/js\?id=G-QT8SX98GY7"></script>)', INDEX, re.S).group(1)
BAN = re.search(r'(<div id="kzCookies".*?</script>)\s*</body>', INDEX, re.S).group(1)

EXTRA = """
.ghero{padding:56px 0 30px}.ghero h1{font-size:clamp(32px,5vw,52px);max-width:900px}.ghero .lead{max-width:760px}
.crumb{font-size:13px;font-weight:800;color:var(--muted);margin-bottom:18px}.crumb a{color:var(--muted)}
.prose{max-width:780px}.prose h2{font-size:clamp(24px,3vw,32px);margin:42px 0 12px}.prose p,.prose li{color:var(--muted);font-size:17px;line-height:1.7}
.prose li{margin:8px 0}.prose b{color:var(--parchment)}.prose a{color:var(--gold)}
.gcta{margin:46px 0 10px;padding:26px;border-radius:24px;background:linear-gradient(160deg,#1c3050,#111f35);border:1.5px solid rgba(239,190,76,.4);display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
.gcta p{margin:0;font-weight:800;color:var(--parchment);font-size:18px;flex:1 1 320px}
.gfaq details{border-bottom:1px solid rgba(255,255,255,.08);padding:14px 0}.gfaq summary{font-weight:900;cursor:pointer}.gfaq p{margin:8px 0 0}
.glinks{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;margin-top:18px}
.glinks a{display:block;padding:18px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);text-decoration:none;color:var(--parchment);font-weight:900}
.glinks a span{display:block;font-weight:700;color:var(--muted);font-size:14px;margin-top:6px}.glinks a:hover{border-color:var(--gold)}
.fguides{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;margin-top:10px}.fguides a{color:var(--muted)}
"""

T = {
 'fr': dict(home='/', other='/en/', home_l='Accueil', guides_l='Guides', nav=[('/#halal', 'Jeu halal'), ('/#benefices', 'Bénéfices'), ('/#essayer', 'Essayer'), ('/#offre', 'Offre'), ('/#guides', 'Guides')],
   code="J'ai un code", cta='Obtenir mon accès', flag='gb', flag_l='English version', cta_box="Prêt à jouer en famille ? Accès à vie pour 6,99 €, paiement unique, sans abonnement.",
   cta_btn='Obtenir mon accès', try_btn='▶ Essayer gratuitement', faq_t='Questions fréquentes', more_t='À lire aussi', foot='Jouez ensemble, apprenez autrement, transmettez l\'essentiel', foot_g='Guides',
   loc='fr_FR', aria='Kounouzi, accueil'),
 'en': dict(home='/en/', other='/', home_l='Home', guides_l='Guides', nav=[('/en/#halal', 'Halal game'), ('/en/#benefices', 'Benefits'), ('/en/#essayer', 'Try it'), ('/en/#offre', 'Offer'), ('/en/#guides', 'Guides')],
   code='I have a code', cta='Get access', flag='fr', flag_l='Version française', cta_box="Ready to play as a family? Lifetime access for €6.99, one-time payment, no subscription.",
   cta_btn='Get my access', try_btn='▶ Try it for free', faq_t='Frequently asked questions', more_t='Read also', foot='Play together, learn differently, pass on what matters', foot_g='Guides',
   loc='en_GB', aria='Kounouzi, home'),
}

def url(lang, slug): return (U + '/' if lang == 'fr' else U + '/en/') + slug + '/'
def path(lang, slug): return ('/' if lang == 'fr' else '/en/') + slug + '/'

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
    corps = ''.join(f'<h2>{h}</h2>' + ''.join(bloc(b) for b in bs) for h, bs in c['sections'])
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
<link rel="icon" type="image/png" sizes="32x32" href="/img/logo/favicon-32.png"><link rel="icon" type="image/png" sizes="48x48" href="/img/logo/favicon-48.png"><link rel="icon" type="image/png" sizes="192x192" href="/img/logo/favicon-192.png">
<link rel="apple-touch-icon" href="/img/app/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@500;700;800;900&family=Noto+Naskh+Arabic:wght@500;700&display=swap">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False).replace('</', '<\\/')}</script>
<style>{CSS}{EXTRA}</style>
</head>
<body>
<div class="sky" aria-hidden="true"></div>
<header class="top">
  <div class="wrap">
    <a class="logo" href="{t['home']}" aria-label="{t['aria']}"><img class="brand" src="/img/logo/kounouzi.webp" alt="Kounouzi" width="81" height="62"></a>
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
  <div class="cta" style="margin-top:22px"><a class="btn btn-gold btn-lg" href="{t['home']}#offre">{t['cta_btn']}</a><a class="btn btn-ghost btn-lg" href="{t['home']}#essayer">{t['try_btn']}</a></div>
</div></section>
<section style="padding-top:10px"><div class="wrap"><article class="prose">
{corps}
<div class="gcta"><p>{t['cta_box']}</p><a class="btn btn-gold" href="{t['home']}#offre">{t['cta_btn']}</a></div>
<h2>{t['faq_t']}</h2><div class="gfaq">{faq}</div>
</article>
<h2 style="margin-top:56px">{t['more_t']}</h2>
<div class="glinks">{liens}</div>
</div></section>
</main>
<footer><div class="wrap">
  <a class="logo" href="{t['home']}" aria-label="Kounouzi"><img class="brand" src="/img/logo/kounouzi.webp" alt="Kounouzi" width="94" height="72" loading="lazy"></a>
  <span>{t['foot']} — © 2026 · <a href="{other_url}" style="color:inherit" data-lang="{'en' if lang == 'fr' else 'fr'}">{t['flag_l']}</a></span>
  {footer_guides(lang)}
</div></footer>
<script>document.querySelectorAll('[data-lang]').forEach(function(a){{a.addEventListener('click',function(){{try{{localStorage.setItem('kounouzi_lang',a.dataset.lang)}}catch(e){{}} document.cookie='kz_lang='+a.dataset.lang+'; path=/; max-age=31536000; samesite=lax';}});}});</script>
{BAN}
</body>
</html>
"""

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
