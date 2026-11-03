# Kounouzi V2

Site de présentation + jeu 3D, sans build (voir `vercel.json`).

- `public/` : servi tel quel — page de présentation (`index.html`), page après paiement (`merci.html`), espace admin (`admin.html`), illustrations (`img/`).
- `private/` : le jeu (`jeu.html`) et ses questions (`data.json`). Jamais servis directement : `/jouer` et `/data.json` passent par `api/jeu.js`, qui vérifie le code d'accès (cookie `kz`).
- `api/` : accès et paiement (`code`, `achat`, `merci`, `admin`, `_lib`), voix et sons ElevenLabs (`voix`, `son`, réservés aux appareils qui ont accès).

## Variables Vercel
| Variable | Rôle |
|---|---|
| `KZ_SECRET` | Signe les codes d'accès. Ne jamais la changer : tous les codes deviendraient invalides. |
| `KZ_ADMIN` | Mot de passe de `/admin.html`. |
| `STRIPE_SECRET_KEY` | Paiement par carte (clé secrète Stripe, `sk_live_…` ou `sk_test_…`). |
| `CHARGILY_SECRET_KEY` | Paiement CIB / Edahabia (`live_sk_…` ou `test_sk_…`). |
| `KZ_PRIX_EUR_CENTIMES` | Prix en centimes (défaut 990). |
| `KZ_PRIX_DZD` | Prix en dinars (défaut 1000). |
| `KZ_CONTACT` | E-mail de contact affiché sur la page. |
| `KZ_REVOQUES` | Codes désactivés, séparés par des virgules. |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Voix. |

## Langues (français / anglais)

Une seule appli, une seule base, une seule banque de questions. Le français est la langue de référence : tout texte absent dans une autre langue s'affiche en français.

- **Moteur** : `public/i18n.js` (t() avec paramètres, pluriels, variantes, repli sur le français, clés manquantes signalées dans la console). Ajouter une langue = ajouter un dictionnaire.
- **Textes du jeu** : `public/i18n/jeu.js` (FR et EN, mêmes clés — vérifié par les tests).
- **Défis, cartes Hassanāt, noms des établissements en anglais** : `private/contenu-en.json` (servi avec /data.json, protégé par le code d'accès).
- **Cartes anglaises** : `public/img/en/*-face.webp` et `kounouzi-dos.webp` (générées avec le même modèle que les cartes françaises).
- **Choix de la langue** : sélecteur sur l'écran de préparation, dans les réglages du jeu et sur le site (FR/EN). Gardé sur l'appareil (`kounouzi_lang` + cookie `kz_lang`) ; sinon la langue du navigateur. Changer de langue en pleine partie ne modifie rien d'autre que les textes.
- **Arabe** : montré seulement pour la Religion (bouton ع, explications arabes). L'arabe des autres thèmes reste en base mais n'est plus envoyé au jeu (`public/trad.js`, `questionsPourJeu`).
- **Site** : `/` en français, `/en/` en anglais (hreflang, canonical, og:locale, `sitemap.xml`). Paiement Stripe dans la langue du visiteur (`/api/achat?moyen=stripe&lang=en`), même prix, même produit.
- **Voix** : la langue fait partie de l'adresse (donc du cache). Variable facultative `ELEVENLABS_VOICE_ID_EN` pour une voix anglaise dédiée ; sans elle, la voix multilingue actuelle lit l'anglais.

### Traductions des questions

- Colonne `trad` (jsonb) dans `kounouzi.questions` : `{"en": "a_faire" | "a_relire" | "validee"}`, indépendante du statut de publication.
- Dans le jeu, seules les traductions **validées** apparaissent (réglage « Montrer aussi les traductions à relire » dans le tableau de bord).
- **Importer** : tableau de bord → onglet **Traductions** → choisir le fichier JSON (format `kounouzi-traductions`, version 1, langue `en`) → **Simuler** (rien n'est écrit, rapport : nouvelles, remplacées, déjà à jour, vides, identifiants inconnus, doublons, français différent) → **Importer** (lots de 100, revérifiés par le serveur). Seul l'anglais est écrit ; les lignes importées passent « à relire ». Un import interrompu se relance : les lignes déjà importées sont reconnues.
- **Relire et valider** : onglet Questions → filtre « À relire » → corriger dans l'éditeur si besoin → bouton « Valider les traductions affichées ».
- **Exporter** les questions encore à traduire : onglet Traductions → « Télécharger le fichier ».

### Retour arrière

- Code : redéployer l'ancien déploiement de production dans Vercel (« Promote » / « Instant Rollback »), ou revenir au commit `529de04`.
- Base : la migration est uniquement additive (colonne `trad`, actions `trad_import` et `trad_statut`). Copie des questions avant la mission : `kounouzi.questions_sauvegarde_20261103`. L'ancien code ignore la colonne `trad`.

## E-mail du code après achat (Brevo)

Après un paiement Stripe, `api/merci.js` envoie le code d'accès à l'adresse saisie chez Stripe, **une seule fois par paiement**
(repère `kz_mail` dans les métadonnées du paiement Stripe). Inactif tant que ces variables ne sont pas définies dans Vercel :

- `BREVO_API_KEY` : clé API Brevo (SMTP & API → Clés API), jamais dans le code ;
- `KZ_MAIL_FROM` : expéditeur validé dans Brevo (ex. `bonjour@kounouzi.com`, domaine authentifié) ;
- `KZ_MAIL_NOM` (facultatif, défaut « Kounouzi ») ; `KZ_CONTACT` sert d'adresse de réponse.

Un échec d'envoi ne bloque jamais l'accès : la page Merci affiche toujours le code.
