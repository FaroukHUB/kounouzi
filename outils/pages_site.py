# Pages du site hors guides : pied de page commun, Contact et Plan du site (FR/EN).
# Utilisé par outils/guides_build.py, qui génère les pages et remplace aussi le pied de page de l'accueil.
import html

E = html.escape
MAIL = 'contact@kounouzi.com'

# ---------- Pied de page (toutes les pages)
FOOT = {
 'fr': dict(home='/', tag="Jouez ensemble, apprenez autrement, transmettez l'essentiel.",
   desc="Le jeu de société familial à jouer sur un seul écran : questions adaptées à chaque âge, défis en famille et bonnes valeurs.",
   other=('/', '/en/', 'English version', 'en'),
   cols=[
     ('Le jeu', [('/#essayer', 'Essai gratuit'), ('/#offre', 'Prix et accès'), ('/regles-du-jeu/', 'Règles du jeu'), ('/#nouveautes', 'Nouveautés'), ('/#faq', 'Questions fréquentes'), ('/#acceder', "J'ai un code")]),
     ('Guides', None),
     ('Kounouzi', [('/a-propos/', 'À propos'), ('/contact/', 'Contact'), ('/sources-religion/', 'Nos sources'), ('/plan-du-site/', 'Plan du site')]),
     ('Informations légales', [('/mentions-legales/', 'Mentions légales'), ('/confidentialite/', 'Confidentialité'), ('/cgv/', 'Conditions de vente'), ('/retractation/', 'Se rétracter du contrat ici'), ('#', 'Gérer les cookies')]),
   ]),
 'en': dict(home='/en/', tag='Play together, learn differently, pass on what matters.',
   desc='The family board game played on a single screen: questions suited to every age, family challenges and good values.',
   other=('/en/', '/', 'Version française', 'fr'),
   cols=[
     ('The game', [('/en/#essayer', 'Free trial'), ('/en/#offre', 'Price and access'), ('/en/how-to-play/', 'How to play'), ('/en/#nouveautes', "What's new"), ('/en/#faq', 'FAQ'), ('/en/#acceder', 'I have a code')]),
     ('Guides', None),
     ('Kounouzi', [('/en/about/', 'About'), ('/en/contact/', 'Contact'), ('/en/religion-sources/', 'Our sources'), ('/en/site-map/', 'Site map')]),
     ('Legal', [('/en/legal-notice/', 'Legal notice'), ('/en/privacy/', 'Privacy'), ('/en/terms/', 'Terms of sale'), ('/en/withdrawal/', 'Withdraw from the contract here'), ('#', 'Manage cookies')]),
   ]),
}
# Les guides « Règles » et « Sources » ont déjà leur place dans une autre colonne.
HORS_GUIDES = {'regles', 'sources'}

FOOT_CSS = """
footer.sfoot{padding:54px 0 calc(30px + var(--sab));margin-top:30px;border-top:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.22));color:var(--muted);font-size:14.5px}
footer.sfoot .wrap{display:block}
.fgrid{display:grid;grid-template-columns:1.5fr repeat(4,1fr);gap:30px 26px}
.fbrand p{margin:12px 0 0;color:var(--muted);font-size:14.5px;line-height:1.6;max-width:300px}.fbrand .ftag{color:var(--parchment);font-weight:800}
.fbrand .fmail{display:inline-block;margin-top:12px;color:var(--gold);font-weight:800}
.fcol .fh{margin:0 0 12px;color:var(--parchment);font-weight:900;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.fcol ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}.fcol a{color:var(--muted);text-decoration:none}.fcol a:hover,.fbas a:hover{color:var(--parchment)}
.fbas{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:space-between;align-items:center;margin-top:36px;padding-top:18px;border-top:1px solid rgba(255,255,255,.07);font-size:13px;color:var(--faint)}
.fbas a{color:var(--muted);display:inline-flex;align-items:center;gap:8px;text-decoration:none}
@media (max-width:980px){.fgrid{grid-template-columns:repeat(2,1fr)}.fbrand{grid-column:1/-1}}
@media (max-width:720px){footer.sfoot{padding-bottom:calc(110px + var(--sab))}.fgrid{gap:26px 18px}.fcol a{display:inline-block;padding:3px 0}}
"""

def footer(lang, guides):
    f = FOOT[lang]
    cols = ''
    for titre, liens in f['cols']:
        if liens is None:
            liens = [(h, k) for (gid, h, k) in guides if gid not in HORS_GUIDES]
        items = ''.join(f'<li><a href="{h}"{" data-cookies" if h == "#" else ""}>{E(l)}</a></li>' for h, l in liens)
        cols += f'<nav class="fcol" aria-label="{E(titre)}"><p class="fh">{E(titre)}</p><ul>{items}</ul></nav>'
    o_moi, o_href, o_lab, o_lang = f['other']
    return f"""<footer class="sfoot"><div class="wrap">
  <div class="fgrid">
    <div class="fbrand"><a class="logo" href="{f['home']}" aria-label="Kounouzi"><img class="brand" src="/img/logo/kounouzi.webp?v=2" alt="Kounouzi" width="92" height="72" loading="lazy"></a>
      <p class="ftag">{E(f['tag'])}</p><p>{E(f['desc'])}</p><a class="fmail" href="mailto:{MAIL}">{MAIL}</a></div>
    {cols}
  </div>
  <div class="fbas"><span>© <span id="yr">2026</span> Kounouzi</span><a href="{o_href}" hreflang="{o_lang}" lang="{o_lang}" data-lang="{o_lang}"><img src="/img/flags/{'gb' if o_lang == 'en' else 'fr'}.svg" alt="" width="20" height="14" loading="lazy">{E(o_lab)}</a></div>
</div></footer>"""

# ---------- Contact
CONTACT = {
 'fr': dict(slug='contact', autre='/en/contact/', kick='Contact',
   title='Contacter Kounouzi : question, bug ou partenariat',
   desc="Une question sur Kounouzi, un bug à signaler, une idée ou un partenariat (école, association, créateur) ? Écrivez-nous : chaque message est lu.",
   h1='Contactez-nous', lead="Une question sur le jeu, un souci à signaler, une idée, ou envie de travailler ensemble ? Écrivez-nous ici : chaque message est lu.",
   intro_h='Écrivez-nous', types=[('🐞', 'Un bug', "Quelque chose ne marche pas comme prévu ? Dites-nous ce qui s'est passé et sur quel appareil."),
     ('💡', 'Une suggestion', 'Une question, un défi, une idée à ajouter au jeu.'), ('🤝', 'Un partenariat', 'École, association, créateur de contenu : parlons-en.')],
   legend="C'est à propos de…", choix=[('bug', '🐞 Un bug'), ('avis', '💬 Un avis'), ('suggestion', '💡 Une suggestion'), ('partenariat', '🤝 Un partenariat'), ('autre', '✉️ Autre')],
   msg='Votre message', ph='Racontez-nous…', nom='Prénom', opt='(facultatif)', mail='E-mail', mailph='vous@exemple.com', envoyer='Envoyer mon message',
   note="Laissez votre e-mail si vous souhaitez une réponse : il ne sert qu'à vous répondre.", conf=('/confidentialite/', 'Confidentialité'),
   phs=dict(bug="Que s'est-il passé ? Sur quel appareil (téléphone, tablette, ordinateur) ?", avis='Racontez-nous…', suggestion='Votre idée pour Kounouzi…', partenariat='Présentez-vous en quelques mots : qui vous êtes, ce que vous proposez…', autre='Votre message…'),
   repondre='(pour vous répondre)', envoi='Envoi…', ok='Merci ! Votre message nous est bien parvenu', okmail=" ; nous vous répondrons à l'adresse indiquée.", err='Envoi impossible pour le moment.', errnet='Connexion impossible. Réessayez dans un instant.',
   autres_h='Autres façons de nous joindre',
   autres=[f"Par e-mail : <a href='mailto:{MAIL}'>{MAIL}</a>.",
     "Vous avez acheté Kounouzi et ne retrouvez pas votre code d'accès ? Écrivez-nous avec <b>l'adresse e-mail utilisée pour le paiement</b>.",
     "Vous souhaitez annuler votre achat ? Utilisez la page <a href='/retractation/'>Se rétracter du contrat</a>.",
     "Une question sur l'origine des questions de religion ? Voyez <a href='/sources-religion/'>nos sources</a>."],
   faq=[("J'ai perdu mon code d'accès, que faire ?", "Écrivez-nous avec l'adresse e-mail utilisée pour le paiement : nous vous renverrons votre code."),
        ("Comment signaler un bug ?", "Choisissez « Un bug » dans le formulaire, décrivez ce qui s'est passé et indiquez votre appareil (téléphone, tablette ou ordinateur)."),
        ("Je représente une école ou une association, peut-on travailler ensemble ?", "Oui, choisissez « Un partenariat » et laissez votre e-mail pour qu'on puisse vous répondre."),
        ("Puis-je proposer une question ou un défi ?", "Oui, choisissez « Une suggestion ». Chaque proposition est lue ; les questions de religion ne sont ajoutées qu'à partir de nos sources et après relecture.")]),
 'en': dict(slug='contact', autre='/contact/', kick='Contact',
   title='Contact Kounouzi: question, bug or partnership',
   desc='A question about Kounouzi, a bug to report, an idea or a partnership (school, association, creator)? Write to us: every message is read.',
   h1='Contact us', lead='A question about the game, a problem to report, an idea, or keen to work together? Write to us here: every message is read.',
   intro_h='Write to us', types=[('🐞', 'A bug', 'Something not working as expected? Tell us what happened and on which device.'),
     ('💡', 'A suggestion', 'A question, a challenge, an idea to add to the game.'), ('🤝', 'A partnership', "School, association, content creator: let's talk.")],
   legend="It's about…", choix=[('bug', '🐞 A bug'), ('avis', '💬 Feedback'), ('suggestion', '💡 A suggestion'), ('partenariat', '🤝 A partnership'), ('autre', '✉️ Other')],
   msg='Your message', ph='Tell us…', nom='First name', opt='(optional)', mail='E-mail', mailph='you@example.com', envoyer='Send my message',
   note='Leave your e-mail if you would like a reply: it is only used to answer you.', conf=('/en/privacy/', 'Privacy'),
   phs=dict(bug='What happened? On which device (phone, tablet, computer)?', avis='Tell us…', suggestion='Your idea for Kounouzi…', partenariat='Introduce yourself in a few words: who you are, what you suggest…', autre='Your message…'),
   repondre='(so we can reply)', envoi='Sending…', ok='Thank you! Your message has reached us', okmail='; we will reply to the address you gave.', err='Cannot send right now.', errnet='Connection failed. Please try again in a moment.',
   autres_h='Other ways to reach us',
   autres=[f"By e-mail: <a href='mailto:{MAIL}'>{MAIL}</a>.",
     "Bought Kounouzi and can't find your access code? Write to us with <b>the e-mail address used for the payment</b>.",
     "Want to cancel your purchase? Use the <a href='/en/withdrawal/'>Withdraw from the contract</a> page.",
     "A question about where the religion questions come from? See <a href='/en/religion-sources/'>our sources</a>."],
   faq=[("I lost my access code, what should I do?", "Write to us with the e-mail address used for the payment: we will send your code again."),
        ("How do I report a bug?", "Choose “A bug” in the form, describe what happened and tell us your device (phone, tablet or computer)."),
        ("I represent a school or an association, can we work together?", "Yes, choose “A partnership” and leave your e-mail so we can reply."),
        ("Can I suggest a question or a challenge?", "Yes, choose “A suggestion”. Every idea is read; religion questions are only added from our sources and after review.")]),
}

def contact_corps(lang):
    c = CONTACT[lang]
    types = ''.join(f'<div><span>{i}</span><p><b>{E(b)}</b>{E(p)}</p></div>' for i, b, p in c['types'])
    choix = ''.join(f'<label class="ch"><input type="radio" name="type" value="{v}"{" checked" if v == "avis" else ""}><span>{E(l)}</span></label>' for v, l in c['choix'])
    autres = ''.join(f'<li>{x}</li>' for x in c['autres'])
    return f"""<div class="avisw" id="formulaire">
  <div><h2>{E(c['intro_h'])}</h2><div class="avtypes">{types}</div></div>
  <div>
    <form id="avisForm" novalidate>
      <fieldset><legend>{E(c['legend'])}</legend>{choix}</fieldset>
      <label class="l" for="avisMsg">{E(c['msg'])}</label>
      <textarea id="avisMsg" name="message" maxlength="4000" required placeholder="{E(c['ph'])}"></textarea>
      <div class="row2">
        <div><label class="l" for="avisNom">{E(c['nom'])} <small>{E(c['opt'])}</small></label><input type="text" id="avisNom" name="nom" maxlength="80" autocomplete="given-name"></div>
        <div><label class="l" for="avisMail">{E(c['mail'])} <small id="avisMailOpt">{E(c['opt'])}</small></label><input type="email" id="avisMail" name="email" maxlength="160" autocomplete="email" placeholder="{E(c['mailph'])}"></div>
      </div>
      <input class="hp" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-gold btn-lg" type="submit" id="avisBtn">{E(c['envoyer'])}</button>
      <small>{E(c['note'])} <a href="{c['conf'][0]}">{E(c['conf'][1])}</a></small>
    </form>
    <div class="msg" id="avisMsgEtat" role="status" style="margin-top:10px"></div>
  </div>
</div>
<article class="prose"><h2>{E(c['autres_h'])}</h2><ul>{autres}</ul></article>"""

def contact_js(lang):
    import json
    c = CONTACT[lang]; J = lambda v: json.dumps(v, ensure_ascii=False)
    return f"""<script>(function(){{ var f=document.getElementById('avisForm'), m=document.getElementById('avisMsgEtat'), b=document.getElementById('avisBtn'), PH={J(c['phs'])}, OPT={J(c['opt'])}, REP={J(c['repondre'])};
function maj(t){{ document.getElementById('avisMsg').placeholder=PH[t]||''; document.getElementById('avisMailOpt').textContent= t==='partenariat'?REP:OPT; }}
f.addEventListener('change',function(e){{ if(e.target.name==='type') maj(e.target.value); }});
var t=new URLSearchParams(location.search).get('type'), r=t&&f.querySelector('input[name=type][value="'+t.replace(/[^a-z]/g,'')+'"]'); if(r){{ r.checked=true; maj(r.value); }}
f.addEventListener('submit',function(e){{ e.preventDefault(); m.className='msg'; m.textContent={J(c['envoi'])}; b.disabled=true;
 fetch('/api/avis',{{method:'POST',headers:{{'content-type':'application/json'}},body:JSON.stringify({{type:f.type.value,message:f.message.value,nom:f.nom.value,email:f.email.value,site:f.site.value,lang:'{lang}',page:location.pathname,ecran:innerWidth+'x'+innerHeight}})}})
 .then(function(r){{return r.json().catch(function(){{return {{}}}})}}).then(function(d){{
  if(d.ok){{ m.className='msg ok'; m.textContent={J(c['ok'])}+(f.email.value?{J(c['okmail'])}:'.'); f.reset(); maj('avis'); }} else {{ m.className='msg err'; m.textContent=d.erreur||{J(c['err'])}; }} b.disabled=false; }})
 .catch(function(){{ m.className='msg err'; m.textContent={J(c['errnet'])}; b.disabled=false; }}); }});
}})();</script>"""

# ---------- Plan du site
PLAN = {
 'fr': dict(slug='plan-du-site', autre='/en/site-map/', kick='Plan du site', title='Plan du site Kounouzi',
   desc='Toutes les pages du site Kounouzi : le jeu, les guides pour les parents, nos sources, le contact et les informations légales.',
   h1='Plan du site', lead='Toutes les pages du site Kounouzi, classées par rubrique.',
   sections=[('Le jeu', [('/', 'Accueil', 'Le jeu de société familial à jouer sur un seul écran.'), ('/#essayer', 'Essai gratuit', 'Jouer gratuitement avant de choisir.'), ('/#offre', 'Prix et accès', 'Paiement unique, sans abonnement, mises à jour incluses.'),
       ('/regles-du-jeu/', 'Règles du jeu', 'Comment se déroule une partie.'), ('/#nouveautes', 'Nouveautés', 'Questions, défis et bonus ajoutés régulièrement.'), ('/#faq', 'Questions fréquentes', 'Les réponses aux questions des familles.'), ('/#acceder', "J'ai un code", "Ouvrir le jeu avec son code d'accès.")]),
     ('Guides pour les parents', None),
     ('Kounouzi', [('/a-propos/', 'À propos', "L'histoire de Kounouzi, racontée par son créateur."), ('/contact/', 'Contact', 'Une question, un bug, un partenariat.'), ('/sources-religion/', 'Nos sources', "D'où viennent les questions de religion.")]),
     ('Informations légales', [('/mentions-legales/', 'Mentions légales', ''), ('/confidentialite/', 'Confidentialité', ''), ('/cgv/', 'Conditions de vente', ''), ('/retractation/', 'Se rétracter du contrat', '')])]),
 'en': dict(slug='site-map', autre='/plan-du-site/', kick='Site map', title='Kounouzi site map',
   desc='All the pages of the Kounouzi website: the game, guides for parents, our sources, contact and legal information.',
   h1='Site map', lead='All the pages of the Kounouzi website, sorted by section.',
   sections=[('The game', [('/en/', 'Home', 'The family board game played on a single screen.'), ('/en/#essayer', 'Free trial', 'Play for free before you choose.'), ('/en/#offre', 'Price and access', 'One-time payment, no subscription, updates included.'),
       ('/en/how-to-play/', 'How to play', 'How a game goes.'), ('/en/#nouveautes', "What's new", 'Questions, challenges and bonuses added regularly.'), ('/en/#faq', 'FAQ', 'Answers to families’ questions.'), ('/en/#acceder', 'I have a code', 'Open the game with your access code.')]),
     ('Guides for parents', None),
     ('Kounouzi', [('/en/about/', 'About', 'The story of Kounouzi, told by its creator.'), ('/en/contact/', 'Contact', 'A question, a bug, a partnership.'), ('/en/religion-sources/', 'Our sources', 'Where the religion questions come from.')]),
     ('Legal', [('/en/legal-notice/', 'Legal notice', ''), ('/en/privacy/', 'Privacy', ''), ('/en/terms/', 'Terms of sale', ''), ('/en/withdrawal/', 'Withdraw from the contract', '')])]),
}

def plan_corps(lang, guides_det):
    p = PLAN[lang]; out = ''
    for titre, liens in p['sections']:
        if liens is None: liens = [(h, k, l) for (gid, h, k, l) in guides_det if gid not in HORS_GUIDES]
        items = ''.join(f'<li><a href="{h}">{E(k)}</a>' + (f' — {E(d)}' if d else '') + '</li>' for h, k, d in liens)
        out += f'<h2>{E(titre)}</h2><ul>{items}</ul>'
    return f'<article class="prose">{out}</article>'

# ---------- À propos : l'histoire racontée par Abou Salmaan (texte dans apropos_fr.md / apropos_en.md, écrit par lui)
import os, re
ICI = os.path.dirname(os.path.abspath(__file__))
APROPOS = {
 'fr': dict(slug='a-propos', autre='/en/about/', kick='À propos', md='apropos_fr.md',
   title="À propos de Kounouzi : l'histoire d'un papa et de ses enfants",
   desc="Kounouzi est né d'un après-midi de vacances en famille. Abou Salmaan, papa de quatre enfants et développeur web, raconte comment il a créé ce jeu pour ses enfants.",
   lead="L'histoire de Kounouzi, racontée par son créateur, Abou Salmaan, papa de quatre enfants.",
   ecouter="Écouter l'histoire", ecouter_s="Racontée par Abou Salmaan", audio_l="Lecture audio de l'histoire de Kounouzi"),
 'en': dict(slug='about', autre='/a-propos/', kick='About', md='apropos_en.md',
   title='About Kounouzi: the story of a dad and his children',
   desc='Kounouzi was born on a family holiday afternoon. Abou Salmaan, dad of four and web developer, tells how he created this game for his children.',
   lead='The story of Kounouzi, told by its creator, Abou Salmaan, dad of four.',
   ecouter='Listen to the story', ecouter_s='Told by Abou Salmaan (in French)', audio_l='Audio of the Kounouzi story'),
}
STORY_CSS = """
.story{max-width:760px}.story h2{font-size:clamp(24px,3vw,32px);margin:46px 0 14px;color:var(--gold-soft,var(--gold))}
.story p{color:var(--muted);font-size:18px;line-height:1.75;margin:0 0 14px}.story p b{color:var(--parchment)}
.story p.salam{font-family:var(--display);font-size:clamp(26px,3.4vw,34px);color:var(--parchment);margin-top:6px}
.story p.fort{color:var(--parchment);font-size:19.5px;font-weight:800}
.story blockquote{margin:20px 0;padding:16px 22px;border-inline-start:4px solid var(--gold);border-radius:6px 18px 18px 6px;background:rgba(239,190,76,.08);color:var(--parchment);font-size:19px;font-style:italic;line-height:1.6}
.story .sign{margin-top:36px;padding-top:22px;border-top:1px solid rgba(255,255,255,.1)}.story .sign b{display:block;font-family:var(--display);font-weight:400;font-size:28px;color:var(--gold)}.story .sign i{color:var(--muted)}
.ecoute{display:flex;flex-wrap:wrap;align-items:center;gap:14px 20px;max-width:760px;margin:0 0 10px;padding:18px 20px;border-radius:22px;background:linear-gradient(160deg,#1c3050,#111f35);border:1.5px solid rgba(239,190,76,.4)}
.ecoute .t{flex:1 1 220px}.ecoute .t b{display:block;color:var(--parchment);font-size:18px}.ecoute .t span{color:var(--muted);font-size:14px;font-weight:700}.ecoute audio{flex:1 1 300px;width:100%}
@media (max-width:720px){.story p{font-size:17px}.story blockquote{padding:14px 16px;font-size:17.5px}}
"""
def _inline(t):
    t = E(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'\*(.+?)\*', r'<em>\1</em>', t)

def apropos_md(lang):
    """Le texte en Markdown simple → (h1, corps HTML). Titres ###, gras, italique ; une ligne entièrement en italique devient une citation."""
    lignes = [l.strip() for l in open(os.path.join(ICI, APROPOS[lang]['md'])).read().split('\n') if l.strip()]
    h1 = lignes[0].lstrip('# ').strip(); corps = ''; sign = []
    reste = lignes[1:]
    # Signature : les deux dernières lignes (nom en gras, puis rôle en italique)
    if len(reste) >= 2 and reste[-2].startswith('**') and reste[-1].startswith('*') and not reste[-1].startswith('**'):
        sign, reste = reste[-2:], reste[:-2]
    for i, l in enumerate(reste):
        if l.startswith('### '): corps += f'<h2>{_inline(l[4:])}</h2>'
        elif re.fullmatch(r'\*[^*].*[^*]\*', l): corps += f'<blockquote>{_inline(l[1:-1])}</blockquote>'
        elif re.fullmatch(r'\*\*.+\*\*', l): corps += f'<p class="{"salam" if i <= 2 else "fort"}">{_inline(l[2:-2])}</p>'
        else: corps += f'<p>{_inline(l)}</p>'
    if sign: corps += f'<div class="sign"><b>{_inline(sign[0][2:-2])}</b><i>{_inline(sign[1][1:-1])}</i></div>'
    return h1, corps

def apropos_audio(lang):
    """Le lecteur n'apparaît que si le fichier public/audio/a-propos-<lang>.mp3 existe (sinon, celui en français)."""
    for l in (lang, 'fr'):
        if os.path.exists(os.path.join(ICI, '..', 'public', 'audio', f'a-propos-{l}.mp3')): return f'/audio/a-propos-{l}.mp3'
    return None

def apropos_timing(lang):
    """Début de chaque paragraphe lu (en secondes), calculé en alignant l'audio sur le texte. Seulement pour la langue de l'audio."""
    f = os.path.join(ICI, f'apropos_{lang}_timing.json')
    if not os.path.exists(f) or not os.path.exists(os.path.join(ICI, '..', 'public', 'audio', f'a-propos-{lang}.mp3')): return None
    import json
    return json.load(open(f))

def apropos_corps(lang):
    a = APROPOS[lang]; h1, corps = apropos_md(lang); src = apropos_audio(lang); tm = apropos_timing(lang)
    liseuse = False
    if tm:
        blocs = re.findall(r'<(?:p|blockquote)[ >]', corps)
        if len(blocs) == len(tm['t']):  # le texte n'a pas changé depuis l'alignement
            it = iter(tm['t'])
            corps = re.sub(r'<(p|blockquote)([ >])', lambda m: f'<{m.group(1)} data-t="{next(it)}"{m.group(2)}', corps)
            liseuse = True
    lecteur = (f'<div class="ecoute" id="ecoute"><div class="t"><b>🎧 {E(a["ecouter"])}</b><span>{E(a["ecouter_s"])}</span></div>'
               f'<audio id="histoire" controls preload="metadata" src="{src}?v=1" aria-label="{E(a["audio_l"])}"></audio></div>') if src else ''
    fin = f' data-fin="{tm["fin"]}"' if liseuse else ''
    return lecteur + f'<article class="story{" liseuse" if liseuse else ""}" id="histoireTexte"{fin}>{corps}</article>'

# Effet liseuse : pendant l'écoute, le paragraphe lu est mis en avant et ses mots s'éclairent au fil de la voix ;
# un clic sur un paragraphe reprend l'écoute à cet endroit. Le texte reste du HTML normal (référencement) : les mots sont découpés à l'affichage.
LISEUSE_CSS = """
.ecoute{position:sticky;top:72px;z-index:20;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.story.liseuse.joue [data-t]{opacity:.42;transition:opacity .35s,background-color .35s,box-shadow .35s;cursor:pointer;border-radius:12px}
.story.liseuse.joue [data-t]:hover{opacity:.7}
.story.liseuse.joue [data-t].lu{opacity:.75}
.story.liseuse.joue p[data-t].on{opacity:1;background:rgba(239,190,76,.07);box-shadow:0 0 0 10px rgba(239,190,76,.07)}
.story.liseuse.joue blockquote[data-t].on{opacity:1}
.story.liseuse.joue .on .w{color:var(--muted);transition:color .18s}
.story.liseuse.joue .on .w.dit{color:var(--parchment)}
.story.liseuse.joue .on .w.ici{color:var(--gold)}
@media (max-width:720px){.ecoute{top:62px;padding:12px 14px;gap:8px}.ecoute .t span{display:none}}
@media (prefers-reduced-motion:reduce){.story.liseuse.joue [data-t]{transition:none}}
"""
LISEUSE_JS = """<script>(function(){
var A=document.getElementById('histoire'), S=document.getElementById('histoireTexte'); if(!A||!S||!S.classList.contains('liseuse')) return;
var P=[].slice.call(S.querySelectorAll('[data-t]')), T=P.map(function(e){return parseFloat(e.dataset.t)}), FIN=parseFloat(S.dataset.fin)||0, W=[];
// Découpe des mots (sans toucher au HTML d'origine pour les moteurs de recherche)
P.forEach(function(el){ var mots=[], total=0, tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT), n, noeuds=[];
  while(n=tw.nextNode()) noeuds.push(n);
  noeuds.forEach(function(t){ var f=document.createDocumentFragment(); t.nodeValue.split(/(\\s+)/).forEach(function(m){
    if(!m) return; if(/^\\s+$/.test(m)){ f.appendChild(document.createTextNode(m)); return; }
    var s=document.createElement('span'); s.className='w'; s.textContent=m; f.appendChild(s); mots.push([s,total]); total+=m.length+1; });
    t.parentNode.replaceChild(f,t); });
  W.push({m:mots,n:total}); });
var cur=-1, dernierDefil=0, manuel=0;
window.addEventListener('wheel',function(){manuel=Date.now()},{passive:true}); window.addEventListener('touchmove',function(){manuel=Date.now()},{passive:true});
function indice(t){ var i=0; while(i+1<T.length&&T[i+1]<=t+0.05) i++; return i; }
function maj(){ var t=A.currentTime, i=indice(t);
  if(i!==cur){ P.forEach(function(e,k){ e.classList.toggle('on',k===i); e.classList.toggle('lu',k<i); });
    if(cur>=0) W[cur].m.forEach(function(x){x[0].classList.remove('dit','ici')});
    cur=i; if(!A.paused&&Date.now()-manuel>4000){ var r=P[i].getBoundingClientRect(); if(r.top<130||r.bottom>innerHeight-40) P[i].scrollIntoView({behavior:'smooth',block:'center'}); } }
  var debut=T[i], fin=i+1<T.length?T[i+1]:(FIN||A.duration||debut+5), part=Math.max(0,Math.min(1,(t-debut)/Math.max(0.3,fin-debut-0.25))), pos=part*W[i].n;
  W[i].m.forEach(function(x,k){ var suivant=k+1<W[i].m.length?W[i].m[k+1][1]:W[i].n; x[0].classList.toggle('dit',x[1]<pos); x[0].classList.toggle('ici',x[1]<pos&&suivant>=pos); });
}
var raf=0; function boucle(){ maj(); if(!A.paused) raf=requestAnimationFrame(boucle); }
A.addEventListener('play',function(){ S.classList.add('joue'); cancelAnimationFrame(raf); boucle(); });
A.addEventListener('pause',function(){ cancelAnimationFrame(raf); maj(); });
A.addEventListener('seeked',maj);
A.addEventListener('ended',function(){ S.classList.remove('joue'); P.forEach(function(e){e.classList.remove('on','lu')}); cur=-1; });
P.forEach(function(e,k){ e.addEventListener('click',function(){ if(!S.classList.contains('joue')) return; A.currentTime=T[k]+0.01; manuel=0; A.play(); }); });
})();</script>"""

# ---------- Menu du site (toutes les pages) : jetons dans l'en-tête + grand menu en cartes de jeu
MENU = {
 'fr': dict(home='/', bouton='Menu', fermer='Fermer le menu', titre='Où voulez-vous aller ?', sous='Choisissez votre carte !',
   jetons=[('/#valeurs', '🌙', 'Nos valeurs'), ('/#essayer', '🎮', 'Essayer'), ('/#offre', '💎', 'Offre'), ('/#guides', '📚', 'Guides')],
   cartes=[('/', '🏠', 'Accueil', 'Découvrir le jeu', 'c1'), ('/#essayer', '🎮', 'Essai gratuit', 'Jouer tout de suite', 'c2'),
     ('/#offre', '💎', 'Offre', 'Prix de lancement', 'c3'), ('/regles-du-jeu/', '🧭', 'Règles du jeu', 'Comment on joue', 'c4'),
     ('/#guides', '📚', 'Guides', 'Pour les parents', 'c5'), ('/sources-religion/', '📖', 'Nos sources', "D'où viennent les questions", 'c6'),
     ('/a-propos/', '👨‍👩‍👧‍👦', 'À propos', "L'histoire de Kounouzi", 'c7'), ('/contact/', '✉️', 'Contact', 'Question, bug, partenariat', 'c8')],
   bas=[('/#acceder', "🔑 J'ai un code"), ('/#faq', '❓ Questions fréquentes')], langue=('/en/', 'gb', 'English')),
 'en': dict(home='/en/', bouton='Menu', fermer='Close the menu', titre='Where do you want to go?', sous='Pick your card!',
   jetons=[('/en/#valeurs', '🌙', 'Our values'), ('/en/#essayer', '🎮', 'Try it'), ('/en/#offre', '💎', 'Offer'), ('/en/#guides', '📚', 'Guides')],
   cartes=[('/en/', '🏠', 'Home', 'Discover the game', 'c1'), ('/en/#essayer', '🎮', 'Free trial', 'Play right now', 'c2'),
     ('/en/#offre', '💎', 'Offer', 'Launch price', 'c3'), ('/en/how-to-play/', '🧭', 'How to play', 'The rules', 'c4'),
     ('/en/#guides', '📚', 'Guides', 'For parents', 'c5'), ('/en/religion-sources/', '📖', 'Our sources', 'Where questions come from', 'c6'),
     ('/en/about/', '👨‍👩‍👧‍👦', 'About', 'The Kounouzi story', 'c7'), ('/en/contact/', '✉️', 'Contact', 'Question, bug, partnership', 'c8')],
   bas=[('/en/#acceder', '🔑 I have a code'), ('/en/#faq', '❓ FAQ')], langue=('/', 'fr', 'Français')),
}

def menu_jetons(lang):
    return '<nav class="kznav" aria-label="Sections">' + ''.join(
        f'<a href="{h}"><span aria-hidden="true">{i}</span>{E(l)}</a>' for h, i, l in MENU[lang]['jetons']) + '</nav>'

def menu_bouton(lang):
    return (f'<button class="kzmbtn" type="button" aria-expanded="false" aria-controls="kzmenu">'
            f'<span class="kzburger" aria-hidden="true"><i></i><i></i><i></i></span><span class="kzmlab">{E(MENU[lang]["bouton"])}</span></button>')

def menu_panneau(lang, langue_url=None):
    m = MENU[lang]
    cartes = ''.join(f'<a class="kzcarte {c}" href="{h}" style="--i:{k}"><span class="em" aria-hidden="true">{i}</span><b>{E(t)}</b><small>{E(s)}</small></a>'
                     for k, (h, i, t, s, c) in enumerate(m['cartes']))
    bas = ''.join(f'<a href="{h}">{E(l)}</a>' for h, l in m['bas'])
    lu, drap, lab = m['langue']; lu = langue_url or lu
    autre = 'en' if lang == 'fr' else 'fr'
    return f"""<div class="kzmenu" id="kzmenu" role="dialog" aria-modal="true" aria-label="{E(m['bouton'])}" hidden>
  <div class="kzfond" data-fermer></div>
  <div class="kzboite">
    <div class="kzhaut"><div><p class="kzt">{E(m['titre'])}</p><p class="kzs">{E(m['sous'])}</p></div>
      <button class="kzx" type="button" data-fermer aria-label="{E(m['fermer'])}">✕</button></div>
    <div class="kzcartes">{cartes}</div>
    <div class="kzbas">{bas}<a class="kzlang" href="{lu}" hreflang="{autre}" lang="{autre}" data-lang="{autre}"><img src="/img/flags/{drap}.svg" alt="" width="22" height="15">{E(lab)}</a></div>
  </div>
</div>"""

MENU_CSS = """
.top nav.kznav{display:flex;gap:8px;margin-inline-start:auto;font-size:14.5px}
.top nav.kznav a{display:inline-flex;align-items:center;gap:7px;padding:8px 13px 8px 10px;border-radius:999px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);color:var(--parchment);font-weight:800;box-shadow:0 3px 0 rgba(0,0,0,.35);transition:transform .18s cubic-bezier(.3,1.6,.5,1),border-color .18s,background .18s}
.top nav.kznav a span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.25);font-size:14px;transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.top nav.kznav a:hover{transform:translateY(-2px) rotate(-1.5deg);border-color:var(--gold);background:rgba(239,190,76,.12)}
.top nav.kznav a:hover span{transform:rotate(-14deg) scale(1.15)}
.top nav.kznav a:active{transform:translateY(1px);box-shadow:0 1px 0 rgba(0,0,0,.35)}
.top nav.kznav a[aria-current]{border-color:var(--gold);background:rgba(239,190,76,.14)}
.kzmbtn{display:inline-flex;align-items:center;gap:9px;height:42px;padding:0 15px 0 12px;border-radius:999px;border:1.5px solid rgba(239,190,76,.55);background:linear-gradient(180deg,rgba(239,190,76,.2),rgba(239,190,76,.06));color:var(--parchment);font:inherit;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.35);transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.kzmbtn:hover{transform:translateY(-2px)}.kzmbtn:active{transform:translateY(1px)}
.kzburger{position:relative;width:18px;height:14px}.kzburger i{position:absolute;inset-inline:0;height:2.5px;border-radius:2px;background:var(--gold);transition:transform .3s,opacity .2s,top .3s}
.kzburger i:nth-child(1){top:0}.kzburger i:nth-child(2){top:6px;inset-inline-end:5px}.kzburger i:nth-child(3){top:12px}
.kzmbtn[aria-expanded=true] .kzburger i:nth-child(1){top:6px;transform:rotate(45deg)}.kzmbtn[aria-expanded=true] .kzburger i:nth-child(2){opacity:0}.kzmbtn[aria-expanded=true] .kzburger i:nth-child(3){top:6px;transform:rotate(-45deg)}
.kzmenu{position:fixed;inset:0;z-index:90;display:grid;place-items:start center;padding:calc(84px + var(--sat,0px)) 16px 24px;overflow-y:auto}
.kzmenu[hidden]{display:none}
.kzfond{position:fixed;inset:0;background:rgba(6,12,22,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:kzf .25s ease both}
.kzboite{position:relative;width:min(920px,100%);padding:22px;border-radius:30px;background:radial-gradient(600px 300px at 0 0,rgba(54,214,255,.12),transparent 70%),radial-gradient(500px 300px at 100% 100%,rgba(239,190,76,.14),transparent 70%),#13233b;border:1.5px solid rgba(255,255,255,.12);box-shadow:0 30px 80px rgba(0,0,0,.6);animation:kzb .35s cubic-bezier(.2,1.3,.4,1) both}
.kzhaut{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 4px 16px}
.kzt{margin:0;font-family:var(--display);font-size:clamp(24px,3vw,32px);color:var(--parchment)}.kzs{margin:2px 0 0;color:var(--gold);font-weight:800;font-size:14px}
.kzx{width:44px;height:44px;flex:0 0 44px;border-radius:50%;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:var(--parchment);font-size:18px;cursor:pointer;transition:transform .2s}.kzx:hover{transform:rotate(90deg);border-color:var(--gold)}
.kzcartes{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.kzcarte{--c1:#2d8cff;--c2:#1a4fa8;position:relative;display:flex;flex-direction:column;gap:4px;min-height:132px;padding:16px 14px 14px;border-radius:20px;color:#fff;text-decoration:none;background:linear-gradient(160deg,var(--c1),var(--c2));border:2px solid rgba(255,255,255,.22);box-shadow:0 6px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.3);overflow:hidden;animation:kzc .45s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(var(--i) * 45ms);transition:transform .2s cubic-bezier(.3,1.6,.5,1),box-shadow .2s}
.kzcarte::after{content:"";position:absolute;inset-inline-end:-26px;top:-26px;width:86px;height:86px;border-radius:50%;background:rgba(255,255,255,.12)}
.kzcarte .em{display:grid;place-items:center;width:46px;height:46px;margin-bottom:6px;border-radius:14px;background:rgba(255,255,255,.2);font-size:25px;transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.kzcarte b{font-size:17px;line-height:1.2}.kzcarte small{font-size:13px;font-weight:700;opacity:.88;line-height:1.3}
.kzcarte:hover,.kzcarte:focus-visible{transform:translateY(-5px) rotate(-1.5deg);box-shadow:0 11px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.3)}
.kzcarte:nth-child(even):hover,.kzcarte:nth-child(even):focus-visible{transform:translateY(-5px) rotate(1.5deg)}
.kzcarte:hover .em{transform:scale(1.15) rotate(-10deg)}.kzcarte:active{transform:translateY(2px);box-shadow:0 3px 0 rgba(0,0,0,.35)}
.kzcarte[aria-current]{outline:3px solid var(--gold);outline-offset:3px}
.kzcarte.c1{--c1:#2f7df6;--c2:#1c4aa6}.kzcarte.c2{--c1:#21b573;--c2:#127049}.kzcarte.c3{--c1:#f2b532;--c2:#c27a0e}.kzcarte.c4{--c1:#9b5cf6;--c2:#5d2fb0}
.kzcarte.c5{--c1:#17b8c9;--c2:#0c6f86}.kzcarte.c6{--c1:#e5634d;--c2:#a63426}.kzcarte.c7{--c1:#ec5fa0;--c2:#a62d68}.kzcarte.c8{--c1:#4f6bed;--c2:#2b3aa3}
.kzcarte.c3{color:#2a1a00}.kzcarte.c3 small{opacity:.8}
.kzbas{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.kzbas a{display:inline-flex;align-items:center;gap:8px;padding:10px 15px;border-radius:999px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);color:var(--parchment);font-weight:800;font-size:14.5px;text-decoration:none}
.kzbas a:hover{border-color:var(--gold)}.kzbas .kzlang{margin-inline-start:auto}
body.kzouvert{overflow:hidden}body.kzouvert .kza-b,body.kzouvert .kza-p,body.kzouvert .dock{visibility:hidden}
@keyframes kzf{from{opacity:0}}@keyframes kzb{from{opacity:0;transform:translateY(-14px) scale(.97)}}
@keyframes kzc{from{opacity:0;transform:translateY(22px) rotate(-6deg) scale(.85)}}
@media (max-width:1240px){.top nav.kznav{display:none}.kzmbtn{margin-inline-start:auto}.top .acts{margin-inline-start:0}}
@media (max-width:860px){.kzcartes{grid-template-columns:repeat(2,1fr);gap:12px}.kzcarte{min-height:118px}}
@media (max-width:720px){.kzmenu{padding:calc(70px + var(--sat,0px)) 12px 20px}.kzboite{padding:16px;border-radius:24px}.kzcarte{padding:13px 12px 12px;min-height:112px}.kzcarte b{font-size:15.5px}.kzcarte small{font-size:12px}.kzcarte .em{width:40px;height:40px;font-size:22px}.kzbas .kzlang{margin-inline-start:0}.kzbas{gap:8px}.kzbas a{padding:9px 13px;font-size:13.5px}.kzmbtn{height:40px;padding:0 13px 0 11px}}
@media (max-width:380px){.kzmlab{display:none}.kzmbtn{padding:0 11px}}
@media (prefers-reduced-motion:reduce){.kzboite,.kzcarte,.kzfond{animation:none}.kzcarte,.top nav.kznav a{transition:none}}
"""

MENU_JS = """<script>(function(){
var b=document.querySelector('.kzmbtn'), m=document.getElementById('kzmenu'); if(!b||!m) return;
var ici=location.pathname, h=location.hash;
document.querySelectorAll('.kzcarte,.top nav.kznav a').forEach(function(a){ var u=new URL(a.href,location.href); if(u.pathname===ici&&(!u.hash||u.hash===h)&&!(u.hash===''&&a.classList.contains('kzcarte')&&h)) a.setAttribute('aria-current','page'); });
function ouvrir(){ m.hidden=false; b.setAttribute('aria-expanded','true'); document.body.classList.add('kzouvert'); var c=m.querySelector('.kzcarte'); if(c) c.focus({preventScroll:true}); }
function fermer(){ m.hidden=true; b.setAttribute('aria-expanded','false'); document.body.classList.remove('kzouvert'); }
b.addEventListener('click',function(){ m.hidden?ouvrir():fermer(); });
m.addEventListener('click',function(e){ if(e.target.closest('[data-fermer]')||e.target.closest('a')) fermer(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!m.hidden){ fermer(); b.focus(); } });
})();</script>"""

def brancher_menu(h, lang, langue_url=None):
    """Remplace la navigation de l'en-tête par les jetons, ajoute le bouton Menu et le grand menu. Ré-exécutable sans doublon."""
    h = re.sub(r'<nav (?:class="kznav" )?aria-label="Sections">.*?</nav>', lambda _: menu_jetons(lang), h, count=1, flags=re.S)
    h = re.sub(r'<button class="kzmbtn".*?</button>', '', h, flags=re.S)
    h = h.replace('<div class="acts">', menu_bouton(lang) + '<div class="acts">', 1)
    h = re.sub(r'<div class="kzmenu".*?\n</div>\n?', '', h, flags=re.S)
    h = h.replace('</header>', '</header>\n' + menu_panneau(lang, langue_url) + '\n', 1)
    h = re.sub(r'<script>\(function\(\)\{\nvar b=document\.querySelector\(\'\.kzmbtn\'\).*?\}\)\(\);</script>\n?', '', h, flags=re.S)
    return h.replace('</body>', MENU_JS + '\n</body>', 1)
