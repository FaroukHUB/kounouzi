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
     ('Kounouzi', [('/contact/', 'Contact'), ('/sources-religion/', 'Nos sources'), ('/plan-du-site/', 'Plan du site')]),
     ('Informations légales', [('/mentions-legales/', 'Mentions légales'), ('/confidentialite/', 'Confidentialité'), ('/cgv/', 'Conditions de vente'), ('/retractation/', 'Se rétracter du contrat ici'), ('#', 'Gérer les cookies')]),
   ]),
 'en': dict(home='/en/', tag='Play together, learn differently, pass on what matters.',
   desc='The family board game played on a single screen: questions suited to every age, family challenges and good values.',
   other=('/en/', '/', 'Version française', 'fr'),
   cols=[
     ('The game', [('/en/#essayer', 'Free trial'), ('/en/#offre', 'Price and access'), ('/en/how-to-play/', 'How to play'), ('/en/#nouveautes', "What's new"), ('/en/#faq', 'FAQ'), ('/en/#acceder', 'I have a code')]),
     ('Guides', None),
     ('Kounouzi', [('/en/contact/', 'Contact'), ('/en/religion-sources/', 'Our sources'), ('/en/site-map/', 'Site map')]),
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
     ('Kounouzi', [('/contact/', 'Contact', 'Une question, un bug, un partenariat.'), ('/sources-religion/', 'Nos sources', "D'où viennent les questions de religion.")]),
     ('Informations légales', [('/mentions-legales/', 'Mentions légales', ''), ('/confidentialite/', 'Confidentialité', ''), ('/cgv/', 'Conditions de vente', ''), ('/retractation/', 'Se rétracter du contrat', '')])]),
 'en': dict(slug='site-map', autre='/plan-du-site/', kick='Site map', title='Kounouzi site map',
   desc='All the pages of the Kounouzi website: the game, guides for parents, our sources, contact and legal information.',
   h1='Site map', lead='All the pages of the Kounouzi website, sorted by section.',
   sections=[('The game', [('/en/', 'Home', 'The family board game played on a single screen.'), ('/en/#essayer', 'Free trial', 'Play for free before you choose.'), ('/en/#offre', 'Price and access', 'One-time payment, no subscription, updates included.'),
       ('/en/how-to-play/', 'How to play', 'How a game goes.'), ('/en/#nouveautes', "What's new", 'Questions, challenges and bonuses added regularly.'), ('/en/#faq', 'FAQ', 'Answers to families’ questions.'), ('/en/#acceder', 'I have a code', 'Open the game with your access code.')]),
     ('Guides for parents', None),
     ('Kounouzi', [('/en/contact/', 'Contact', 'A question, a bug, a partnership.'), ('/en/religion-sources/', 'Our sources', 'Where the religion questions come from.')]),
     ('Legal', [('/en/legal-notice/', 'Legal notice', ''), ('/en/privacy/', 'Privacy', ''), ('/en/terms/', 'Terms of sale', ''), ('/en/withdrawal/', 'Withdraw from the contract', '')])]),
}

def plan_corps(lang, guides_det):
    p = PLAN[lang]; out = ''
    for titre, liens in p['sections']:
        if liens is None: liens = [(h, k, l) for (gid, h, k, l) in guides_det if gid not in HORS_GUIDES]
        items = ''.join(f'<li><a href="{h}">{E(k)}</a>' + (f' — {E(d)}' if d else '') + '</li>' for h, k, d in liens)
        out += f'<h2>{E(titre)}</h2><ul>{items}</ul>'
    return f'<article class="prose">{out}</article>'
