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
