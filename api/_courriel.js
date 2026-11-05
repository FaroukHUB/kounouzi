// Envoi du code d'accès par e-mail après un achat (Brevo, e-mails transactionnels).
// Inactif tant que BREVO_API_KEY et KZ_MAIL_FROM ne sont pas définis : le reste du paiement fonctionne sans.
// La clé reste côté serveur. Aucune donnée n'est envoyée à Brevo en dehors de l'adresse de l'acheteur et de son code.

export const courrielActif = () => !!(process.env.BREVO_API_KEY && process.env.KZ_MAIL_FROM);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TXT = {
  fr: {
    sujet: 'Ton code d\'accès Kounouzi',
    titre: 'Merci et bienvenue dans Kounouzi !',
    intro: 'Voici ton code d\'accès. Il ouvre le jeu sur tous les appareils de la famille : téléphone, tablette ou ordinateur.',
    bouton: 'Ouvrir Kounouzi',
    etapes: 'Le bouton ci-dessus est ton lien personnel : il ouvre directement le jeu, sur n\'importe quel appareil de la famille. Astuce : une fois le jeu ouvert, touche « Installer » pour ajouter Kounouzi à l\'écran d\'accueil, comme une application.',
    garde: 'Garde cet e-mail précieusement : il te permettra de retrouver ton code à tout moment.',
    renonce: 'Confirmation : avant le paiement, tu as demandé l’accès immédiat au jeu et reconnu perdre ton droit de rétractation de 14 jours (contenu numérique fourni tout de suite, article L221-28 13° du Code de la consommation).',
    fin: 'Belles parties en famille,\nL\'équipe Kounouzi',
    lien: (b, c) => `${b}/j/${encodeURIComponent(c)}`,
  },
  en: {
    sujet: 'Your Kounouzi access code',
    titre: 'Thank you and welcome to Kounouzi!',
    intro: 'Here is your access code. It opens the game on all your family\'s devices: phone, tablet or computer.',
    bouton: 'Open Kounouzi',
    etapes: 'The button above is your personal link: it opens the game directly, on any of your family\'s devices. Tip: once the game is open, tap "Install" to add Kounouzi to your home screen, like an app.',
    garde: 'Keep this e-mail safe: it lets you find your code at any time.',
    renonce: 'Confirmation: before paying, you asked for immediate access to the game and acknowledged losing your 14-day right of withdrawal (digital content supplied right away).',
    fin: 'Happy family game nights,\nThe Kounouzi team',
    lien: (b, c) => `${b}/j/${encodeURIComponent(c)}?lang=en`,
  },
};

// Variante pour une partie d'essai demandée sur le site.
const ESSAI = {
  fr: { sujet: 'Ta partie d\'essai Kounouzi', titre: 'Ta partie d\'essai est prête !', intro: 'Voici ton code d\'essai : il ouvre une partie de 10 minutes, à jouer en famille sur un seul écran. Réunissez-vous autour de la table !', bouton: 'Lancer ma partie d\'essai', etapes: 'Le bouton ci-dessus ouvre directement ta partie d\'essai, sans rien retaper.', garde: 'Ta partie te plaît ? L\'accès complet est sur kounouzi.com : paiement unique, sans abonnement, mises à jour incluses.' },
  en: { sujet: 'Your Kounouzi trial game', titre: 'Your trial game is ready!', intro: 'Here is your trial code: it opens a 10-minute game, to play as a family on a single screen. Gather around the table!', bouton: 'Start my trial game', etapes: 'The button above opens your trial game directly, without typing anything.', garde: 'Enjoying it? Full access is on kounouzi.com: one-time payment, no subscription, updates included.' },
};

export function messageCode({ code, lang, base, essai = false }) {
  const t0 = TXT[lang === 'en' ? 'en' : 'fr'], t = essai ? { ...t0, ...ESSAI[lang === 'en' ? 'en' : 'fr'] } : t0, lien = t.lien(base, code);
  const html = `<!doctype html><html lang="${lang === 'en' ? 'en' : 'fr'}"><body style="margin:0;background:#0c1626;font-family:Arial,Helvetica,sans-serif;color:#f7ecd4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c1626;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#14243b;border:1px solid #6b5420;border-radius:18px;padding:28px 24px">
<tr><td align="center"><img src="${base}/img/logo/favicon-192.png" alt="Kounouzi" width="72" height="72" style="display:block;margin:0 auto 14px"></td></tr>
<tr><td align="center" style="font-size:22px;font-weight:bold;color:#efbe4c;padding-bottom:10px">${esc(t.titre)}</td></tr>
<tr><td align="center" style="font-size:15px;line-height:1.5;color:#d9cfb8;padding-bottom:18px">${esc(t.intro)}</td></tr>
<tr><td align="center" style="padding-bottom:18px"><div style="display:inline-block;font:bold 24px/1 'Courier New',monospace;letter-spacing:2px;padding:16px 18px;border:2px dashed #efbe4c;border-radius:12px;color:#fff">${esc(code)}</div></td></tr>
<tr><td align="center" style="padding-bottom:18px"><a href="${esc(lien)}" style="display:inline-block;background:#efbe4c;color:#3a2606;font-weight:bold;font-size:16px;text-decoration:none;padding:14px 26px;border-radius:999px">${esc(t.bouton)}</a></td></tr>
<tr><td style="font-size:14px;line-height:1.5;color:#a4b4ca;padding-bottom:10px">${esc(t.etapes)}</td></tr>
<tr><td style="font-size:14px;line-height:1.5;color:#a4b4ca;padding-bottom:16px">${esc(t.garde)}</td></tr>
${essai ? '' : `<tr><td style="font-size:12px;line-height:1.5;color:#8796ab;padding-bottom:16px">${esc(t.renonce)}</td></tr>`}
<tr><td style="font-size:14px;line-height:1.5;color:#d9cfb8;white-space:pre-line">${esc(t.fin)}</td></tr>
</table></td></tr></table></body></html>`;
  const texte = `${t.titre}\n\n${t.intro}\n\n${code}\n\n${t.bouton} : ${lien}\n\n${t.etapes}\n${t.garde}${essai ? '' : '\n\n' + t.renonce}\n\n${t.fin}`;
  return { sujet: t.sujet, html, texte };
}

/** Envoie le code. Renvoie true si Brevo a accepté l'e-mail. Ne lève jamais d'erreur (le paiement ne doit pas en dépendre). */
export async function envoyerCode({ email, code, lang, base, essai = false }) {
  if (!courrielActif() || !email || !code) return false;
  try {
    const m = messageCode({ code, lang, base, essai });
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.KZ_MAIL_NOM || 'Kounouzi', email: process.env.KZ_MAIL_FROM },
        to: [{ email }],
        ...(process.env.KZ_CONTACT ? { replyTo: { email: process.env.KZ_CONTACT } } : {}),
        subject: m.sujet, htmlContent: m.html, textContent: m.texte,
        tags: [essai ? 'code-essai' : 'code-acces'],
      }),
    });
    if (!r.ok) { console.error('brevo', r.status, (await r.text()).slice(0, 300)); return false; }
    return true;
  } catch (e) { console.error('brevo', e?.message); return false; }
}

// Ajoute à la liste Brevo des nouveautés une personne qui l'a accepté (BREVO_LIST_ID). Ne lève jamais d'erreur.
export const listeActive = () => !!(process.env.BREVO_API_KEY && Number(process.env.BREVO_LIST_ID));
export async function ajouterListe(email) {
  if (!listeActive() || !email) return false;
  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email, listIds: [Number(process.env.BREVO_LIST_ID)], updateEnabled: true }),
    });
    if (!r.ok && r.status !== 204) { console.error('brevo liste', r.status, (await r.text()).slice(0, 200)); return false; }
    return true;
  } catch (e) { console.error('brevo liste', e?.message); return false; }
}

// Alerte envoyée à l'équipe quand un message arrive par le formulaire « Votre avis » (KZ_CONTACT, sinon l'expéditeur).
const LIBELLE_AVIS = { retractation: '↩️ Rétractation', bug: '🐞 Bug', avis: '💬 Avis', suggestion: '💡 Suggestion', partenariat: '🤝 Partenariat', autre: '✉️ Autre' };
export async function envoyerAvis({ type, message, nom, email, page, appareil }) {
  const dest = process.env.KZ_CONTACT || process.env.KZ_MAIL_FROM;
  if (!courrielActif() || !dest) return false;
  try {
    const titre = `${LIBELLE_AVIS[type] || 'Message'} — nouveau message sur kounouzi.com`;
    const lignes = [['Type', LIBELLE_AVIS[type] || type], ['Nom', nom || '—'], ['E-mail', email || '—'], ['Page', page || '—'], ['Appareil', appareil || '—']];
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222"><h2 style="margin:0 0 12px">${esc(titre)}</h2>
<table cellpadding="4">${lignes.map(([k, v]) => `<tr><td style="color:#777">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table>
<p style="white-space:pre-wrap;background:#f5f2ea;border-radius:10px;padding:14px">${esc(message)}</p>
<p style="color:#777;font-size:13px">Tous les messages sont aussi dans le tableau de bord, onglet Avis.</p></div>`;
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: process.env.KZ_MAIL_NOM || 'Kounouzi', email: process.env.KZ_MAIL_FROM }, to: [{ email: dest }],
        ...(email ? { replyTo: { email } } : {}), subject: titre, htmlContent: html,
        textContent: `${titre}\n\n${lignes.map(([k, v]) => `${k} : ${v}`).join('\n')}\n\n${message}`, tags: ['avis-site'] }),
    });
    if (!r.ok) { console.error('brevo avis', r.status, (await r.text()).slice(0, 200)); return false; }
    return true;
  } catch (e) { console.error('brevo avis', e?.message); return false; }
}

// Accusé de réception d'une rétractation, envoyé au client (support durable), avec la date et l'heure de la demande.
export async function envoyerAccuseRetractation({ email, nom, reference, quand, lang }) {
  if (!courrielActif() || !email) return false;
  const en = lang === 'en';
  const date = quand.toLocaleString(en ? 'en-GB' : 'fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }) + (en ? ' (Paris time)' : ' (heure de Paris)');
  const sujet = en ? 'Kounouzi: acknowledgement of your withdrawal request' : 'Kounouzi : accusé de réception de votre rétractation';
  const corps = en
    ? [`Hello ${nom},`, `We have received your request to withdraw from your Kounouzi purchase on ${date}.`, `Purchase reference given: ${reference || 'not given'}.`, 'We will check your purchase and reply to you by e-mail as soon as possible. If the withdrawal applies, you will be refunded with the payment method used, within 14 days.', 'The Kounouzi team']
    : [`Bonjour ${nom},`, `Nous avons bien reçu votre demande de rétractation de votre achat Kounouzi, le ${date}.`, `Référence d’achat indiquée : ${reference || 'non indiquée'}.`, 'Nous vérifions votre achat et vous répondons par e-mail au plus vite. Si la rétractation s’applique, vous serez remboursé avec le moyen de paiement utilisé, sous 14 jours.', 'L’équipe Kounouzi'];
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: process.env.KZ_MAIL_NOM || 'Kounouzi', email: process.env.KZ_MAIL_FROM }, to: [{ email }],
        ...(process.env.KZ_CONTACT ? { replyTo: { email: process.env.KZ_CONTACT } } : {}), subject: sujet,
        htmlContent: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">${corps.map(l => `<p>${esc(l)}</p>`).join('')}</div>`,
        textContent: corps.join('\n\n'), tags: ['retractation'] }),
    });
    if (!r.ok) { console.error('brevo retractation', r.status, (await r.text()).slice(0, 200)); return false; }
    return true;
  } catch (e) { console.error('brevo retractation', e?.message); return false; }
}
