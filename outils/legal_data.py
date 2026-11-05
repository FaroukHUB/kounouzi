# Pages légales de Kounouzi (FR / EN) : mentions légales, confidentialité, conditions de vente.
# Générées par outils/guides_build.py. L'identité de l'éditeur se complète dans EDITEUR (rien n'est inventé :
# un champ vide n'est simplement pas affiché).

EDITEUR = {
    'nom': "Kounouzi",            # raison sociale exacte à compléter
    'forme': "",                  # ex. « EURL », « SARL », « entreprise individuelle »
    'adresse': "",                # adresse du siège
    'pays_fr': "Algérie", 'pays_en': "Algeria",
    'rc': "",                     # numéro du registre du commerce
    'nif': "",                    # numéro d'identification fiscale
    'directeur': "",              # directeur de la publication
    'email': "contact@kounouzi.com",
}

def _id(lang):
    e = EDITEUR
    L = []
    L.append(f"<b>{e['nom']}</b>" + (f", {e['forme']}" if e['forme'] else ''))
    L.append((e['adresse'] + ', ' if e['adresse'] else '') + (e['pays_fr'] if lang == 'fr' else e['pays_en']))
    if e['rc']: L.append(('Registre du commerce : ' if lang == 'fr' else 'Trade register: ') + e['rc'])
    if e['nif']: L.append(('NIF : ' if lang == 'fr' else 'Tax ID (NIF): ') + e['nif'])
    if e['directeur']: L.append(('Directeur de la publication : ' if lang == 'fr' else 'Publication director: ') + e['directeur'])
    L.append(('Contact : ' if lang == 'fr' else 'Contact: ') + f"<a href='mailto:{e['email']}'>{e['email']}</a>")
    return '<br>'.join(L)

M = "<a href='mailto:contact@kounouzi.com'>contact@kounouzi.com</a>"

LEGAL = [
 {'id': 'mentions', 'legal': True,
  'fr': {'slug': 'mentions-legales', 'title': "Mentions légales | Kounouzi", 'desc': "Mentions légales du site kounouzi.com : éditeur, hébergement et contact.",
   'kick': "Mentions légales", 'h1': "Mentions légales", 'lead': "Informations sur l'éditeur et l'hébergement du site kounouzi.com.",
   'sections': [
    ("Éditeur du site", [_id('fr')]),
    ("Hébergement", ["Le site et le jeu sont hébergés par <b>Vercel Inc.</b>, 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com). Les données du jeu (codes, statistiques, contacts) sont stockées chez <b>Supabase</b> (supabase.com)."]),
    ("Propriété intellectuelle", ["Le jeu Kounouzi, ses textes, ses illustrations, son plateau, ses cartes et son logo sont protégés. Toute reproduction, même partielle, sans autorisation écrite est interdite. Les questions de religion sont tirées des livres présentés sur la page <a href='/sources-religion/'>Nos sources</a>."]),
    ("Contact", [f"Pour toute question : {M}."]),
    ("Voir aussi", ["<a href='/confidentialite/'>Politique de confidentialité</a> · <a href='/cgv/'>Conditions générales de vente</a>"])]},
  'en': {'slug': 'legal-notice', 'title': "Legal notice | Kounouzi", 'desc': "Legal notice for kounouzi.com: publisher, hosting and contact.",
   'kick': "Legal notice", 'h1': "Legal notice", 'lead': "Information about the publisher and hosting of kounouzi.com.",
   'sections': [
    ("Publisher", [_id('en')]),
    ("Hosting", ["The site and the game are hosted by <b>Vercel Inc.</b>, 440 N Barranca Ave #4133, Covina, CA 91723, United States (vercel.com). Game data (codes, statistics, contacts) is stored with <b>Supabase</b> (supabase.com)."]),
    ("Intellectual property", ["The Kounouzi game, its texts, illustrations, board, cards and logo are protected. Any reproduction, even partial, without written permission is prohibited. Religion questions are taken from the books presented on the <a href='/en/religion-sources/'>Our sources</a> page."]),
    ("Contact", [f"For any question: {M}."]),
    ("See also", ["<a href='/en/privacy/'>Privacy policy</a> · <a href='/en/terms/'>Terms of sale</a>"])]}},

 {'id': 'confidentialite', 'legal': True,
  'fr': {'slug': 'confidentialite', 'title': "Politique de confidentialité | Kounouzi", 'desc': "Quelles données Kounouzi garde, pourquoi, combien de temps, et comment exercer vos droits.",
   'kick': "Confidentialité", 'h1': "Politique de confidentialité", 'lead': "Nous gardons le moins de données possible, uniquement pour faire fonctionner le jeu et vous répondre. Voici le détail.",
   'sections': [
    ("Qui est responsable ?", [_id('fr')]),
    ("Les données que nous gardons", [("ul", [
      "<b>Lors d'un achat</b> : votre adresse e-mail, le montant, la date et la référence du paiement, et votre code d'accès. Vos données bancaires sont saisies chez Stripe : nous ne les voyons jamais.",
      "<b>Lors d'une demande d'essai</b> : votre adresse e-mail et votre code d'essai.",
      "<b>Quand vous nous écrivez avec le formulaire « Votre avis »</b> : votre message, et votre prénom et votre adresse e-mail si vous les donnez, ainsi que le type d'appareil (pour comprendre un éventuel bug).",
      "<b>Si vous acceptez de recevoir nos nouveautés</b> : votre accord et sa date. Vous pouvez le retirer à tout moment (lien de désinscription dans chaque e-mail, ou par simple message).",
      "<b>Pendant le jeu</b> : un identifiant d'appareil tiré au hasard, votre code d'accès, le pays et la ville approximatifs déduits de l'adresse IP, et des statistiques de parties (nombre de joueurs, tranches d'âge, durée, réponses aux questions). Les prénoms saisis dans le jeu restent sur votre appareil et ne sont pas enregistrés chez nous.",
      "<b>La voix du jeu</b> : les phrases lues à voix haute, y compris les prénoms des joueurs, sont envoyées à notre prestataire de synthèse vocale pour créer l'audio.",
      "<b>Mesure d'audience du site</b> : Google Analytics, uniquement si vous l'acceptez dans le bandeau cookies. Il n'y en a pas dans le jeu."])]),
    ("Pourquoi ?", [("ul", [
      "Vous donner accès au jeu et vous envoyer votre code (exécution de l'achat ou de l'essai).",
      "Répondre à vos demandes, par exemple renvoyer un code perdu.",
      "Améliorer le jeu à partir de statistiques globales.",
      "Vous envoyer nos nouveautés, seulement si vous l'avez accepté."])]),
    ("Nos prestataires", [("ul", [
      "<b>Vercel</b> : hébergement du site et du jeu.", "<b>Supabase</b> : base de données (codes, statistiques, contacts, messages).",
      "<b>Stripe</b> : paiement par carte.", "<b>Brevo</b> : envoi des e-mails (codes, nouveautés).",
      "<b>ElevenLabs</b> : voix du jeu.", "<b>Google Analytics</b> : mesure d'audience du site, avec votre accord."]),
      "Certains de ces prestataires sont situés hors de l'Union européenne, notamment aux États-Unis ; ils s'engagent contractuellement à protéger les données."]),
    ("Combien de temps ?", [("ul", [
      "Données d'achat : le temps nécessaire à nos obligations comptables et légales.",
      "Codes d'accès et d'essai : tant que le code peut être utilisé.",
      "Messages du formulaire « Votre avis » : 2 ans au plus.",
      "Contacts pour les nouveautés : jusqu'à votre désinscription, ou 3 ans sans échange avec nous.",
      "Statistiques de jeu : sous forme globale, sans lien avec votre identité."])]),
    ("Cookies et stockage sur l'appareil", ["Le jeu utilise des cookies indispensables : votre code d'accès (<i>kz</i>), un identifiant d'appareil (<i>kz_dev</i>), la langue choisie (<i>kz_lang</i>) et, après une demande d'essai, un repère qui évite plusieurs essais sur le même appareil (<i>kz_essai</i>). Le site utilise Google Analytics seulement avec votre accord, que vous pouvez changer avec le lien « Gérer les cookies » en bas de page."]),
    ("Vos droits", [f"Vous pouvez demander l'accès à vos données, leur correction, leur suppression, leur portabilité, ou vous opposer à leur utilisation, en écrivant à {M}. Si vous résidez dans l'Union européenne, vous pouvez aussi saisir l'autorité de protection des données de votre pays (en France : la CNIL, cnil.fr)."]),
    ("Enfants", ["Kounouzi se joue en famille, sous la responsabilité des parents. Aucun compte n'est créé pour les enfants, et aucune adresse e-mail d'enfant ne doit être utilisée pour un achat ou un essai."])]},
  'en': {'slug': 'privacy', 'title': "Privacy policy | Kounouzi", 'desc': "What data Kounouzi keeps, why, for how long, and how to exercise your rights.",
   'kick': "Privacy", 'h1': "Privacy policy", 'lead': "We keep as little data as possible, only to run the game and answer you. Here are the details.",
   'sections': [
    ("Who is responsible?", [_id('en')]),
    ("The data we keep", [("ul", [
      "<b>When you buy</b>: your e-mail address, the amount, date and payment reference, and your access code. Your card details are entered with Stripe: we never see them.",
      "<b>When you request a trial</b>: your e-mail address and your trial code.",
      "<b>When you write to us with the feedback form</b>: your message, your first name and e-mail address if you give them, and the type of device (to understand a possible bug).",
      "<b>If you agree to receive our news</b>: your consent and its date. You can withdraw it at any time (unsubscribe link in every e-mail, or simply by message).",
      "<b>While playing</b>: a random device identifier, your access code, the approximate country and city derived from the IP address, and game statistics (number of players, age groups, length, answers to questions). The first names entered in the game stay on your device and are not stored by us.",
      "<b>The game's voice</b>: the sentences read aloud, including players' first names, are sent to our speech provider to create the audio.",
      "<b>Site analytics</b>: Google Analytics, only if you accept it in the cookie banner. There is none in the game."])]),
    ("Why?", [("ul", [
      "To give you access to the game and send you your code (performance of the purchase or trial).",
      "To answer your requests, for example resending a lost code.",
      "To improve the game using overall statistics.",
      "To send you our news, only if you agreed."])]),
    ("Our providers", [("ul", [
      "<b>Vercel</b>: hosting of the site and the game.", "<b>Supabase</b>: database (codes, statistics, contacts, messages).",
      "<b>Stripe</b>: card payment.", "<b>Brevo</b>: sending e-mails (codes, news).",
      "<b>ElevenLabs</b>: the game's voice.", "<b>Google Analytics</b>: site analytics, with your consent."]),
      "Some of these providers are located outside the European Union, in particular in the United States; they are contractually committed to protecting data."]),
    ("For how long?", [("ul", [
      "Purchase data: as long as needed for our accounting and legal obligations.",
      "Access and trial codes: as long as the code can be used.",
      "Feedback form messages: 2 years at most.",
      "News contacts: until you unsubscribe, or 3 years without contact with us.",
      "Game statistics: in aggregate form, not linked to your identity."])]),
    ("Cookies and on-device storage", ["The game uses essential cookies: your access code (<i>kz</i>), a device identifier (<i>kz_dev</i>), the chosen language (<i>kz_lang</i>) and, after a trial request, a marker that prevents several trials on the same device (<i>kz_essai</i>). The site uses Google Analytics only with your consent, which you can change with the “Manage cookies” link at the bottom of the page."]),
    ("Your rights", [f"You can ask to access, correct, delete or port your data, or object to its use, by writing to {M}. If you live in the European Union, you can also contact your country's data protection authority (in France: the CNIL, cnil.fr)."]),
    ("Children", ["Kounouzi is played as a family, under the parents' responsibility. No account is created for children, and no child's e-mail address should be used for a purchase or a trial."])]}},

 {'id': 'cgv', 'legal': True,
  'fr': {'slug': 'cgv', 'title': "Conditions générales de vente | Kounouzi", 'desc': "Conditions de vente de l'accès au jeu Kounouzi : prix, paiement, accès, mises à jour.",
   'kick': "Conditions de vente", 'h1': "Conditions générales de vente", 'lead': "Les conditions qui s'appliquent quand vous achetez l'accès au jeu Kounouzi sur kounouzi.com.",
   'sections': [
    ("Vendeur", [_id('fr')]),
    ("Ce que vous achetez", ["Un accès numérique au jeu Kounouzi, joué dans le navigateur (téléphone, tablette ou ordinateur) pour toute la famille, au moyen d'un code d'accès. Une connexion Internet est nécessaire pour ouvrir le jeu et pour la voix."]),
    ("Prix", ["Le prix est indiqué toutes taxes comprises sur la page d'accueil, avant le paiement. Il s'agit d'un <b>paiement unique, sans abonnement</b>. Un prix de lancement peut s'appliquer pendant une période limitée."]),
    ("Paiement", ["Le paiement se fait par carte bancaire, de façon sécurisée, chez notre prestataire Stripe. Nous ne recevons jamais vos données bancaires."]),
    ("Accès au jeu", ["Votre code d'accès s'affiche juste après le paiement et vous est aussi envoyé par e-mail. Il ouvre le jeu sur les appareils de votre famille. Gardez-le précieusement : en cas de perte, écrivez-nous avec l'adresse utilisée pour le paiement."]),
    ("Mises à jour incluses", ["Les mises à jour du jeu (nouvelles questions, nouveaux défis, améliorations) sont incluses, sans rien payer de plus."]),
    ("Droit de rétractation", ["Le jeu est un contenu numérique fourni immédiatement après le paiement. Conformément à la loi, le droit de rétractation de 14 jours ne s'applique plus une fois l'exécution commencée avec votre accord. Si un problème vous empêche de jouer, écrivez-nous : nous chercherons une solution avec vous."]),
    ("Disponibilité", ["Nous faisons le maximum pour que le jeu reste disponible, mais des interruptions peuvent survenir (maintenance, panne d'un prestataire, connexion Internet)."]),
    ("Contact et réclamations", [f"Pour toute question ou réclamation : {M}. Nous répondons dans les meilleurs délais. Si vous êtes un consommateur, vous gardez les protections que vous accorde la loi de votre pays de résidence."])]},
  'en': {'slug': 'terms', 'title': "Terms of sale | Kounouzi", 'desc': "Terms of sale for access to the Kounouzi game: price, payment, access, updates.",
   'kick': "Terms of sale", 'h1': "Terms of sale", 'lead': "The terms that apply when you buy access to the Kounouzi game on kounouzi.com.",
   'sections': [
    ("Seller", [_id('en')]),
    ("What you buy", ["Digital access to the Kounouzi game, played in the browser (phone, tablet or computer) for the whole family, with an access code. An Internet connection is needed to open the game and for the voice."]),
    ("Price", ["The price is shown including all taxes on the home page, before payment. It is a <b>one-time payment, with no subscription</b>. A launch price may apply for a limited period."]),
    ("Payment", ["Payment is made by card, securely, with our provider Stripe. We never receive your card details."]),
    ("Access to the game", ["Your access code appears right after payment and is also sent to you by e-mail. It opens the game on your family's devices. Keep it safe: if you lose it, write to us with the address used for the payment."]),
    ("Updates included", ["Game updates (new questions, new challenges, improvements) are included, at no extra cost."]),
    ("Right of withdrawal", ["The game is digital content supplied immediately after payment. As provided by law, the 14-day right of withdrawal no longer applies once performance has begun with your agreement. If a problem prevents you from playing, write to us: we will look for a solution with you."]),
    ("Availability", ["We do our best to keep the game available, but interruptions may occur (maintenance, provider outage, Internet connection)."]),
    ("Contact and complaints", [f"For any question or complaint: {M}. We answer as quickly as possible. If you are a consumer, you keep the protections granted by the law of your country of residence."])]}},
]
