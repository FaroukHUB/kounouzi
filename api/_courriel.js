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
    etapes: 'Sur un nouvel appareil : va sur kounouzi.com, touche « J\'ai un code » et entre ce code. C\'est tout.',
    garde: 'Garde cet e-mail précieusement : il te permettra de retrouver ton code à tout moment.',
    fin: 'Belles parties en famille,\nL\'équipe Kounouzi',
    lien: (b, c) => `${b}/?code=${encodeURIComponent(c)}#acceder`,
  },
  en: {
    sujet: 'Your Kounouzi access code',
    titre: 'Thank you and welcome to Kounouzi!',
    intro: 'Here is your access code. It opens the game on all your family\'s devices: phone, tablet or computer.',
    bouton: 'Open Kounouzi',
    etapes: 'On a new device: go to kounouzi.com/en, tap "I have a code" and enter this code. That\'s all.',
    garde: 'Keep this e-mail safe: it lets you find your code at any time.',
    fin: 'Happy family game nights,\nThe Kounouzi team',
    lien: (b, c) => `${b}/en/?code=${encodeURIComponent(c)}#acceder`,
  },
};

// Variante pour une partie d'essai demandée sur le site.
const ESSAI = {
  fr: { sujet: 'Ta partie d\'essai Kounouzi', titre: 'Ta partie d\'essai est prête !', intro: 'Voici ton code d\'essai : il ouvre une partie de 10 minutes, à jouer en famille sur un seul écran. Réunissez-vous autour de la table !', bouton: 'Lancer ma partie d\'essai', garde: 'Ta partie te plaît ? L\'accès complet est sur kounouzi.com : paiement unique, sans abonnement, mises à jour incluses.' },
  en: { sujet: 'Your Kounouzi trial game', titre: 'Your trial game is ready!', intro: 'Here is your trial code: it opens a 10-minute game, to play as a family on a single screen. Gather around the table!', bouton: 'Start my trial game', garde: 'Enjoying it? Full access is on kounouzi.com: one-time payment, no subscription, updates included.' },
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
<tr><td style="font-size:14px;line-height:1.5;color:#d9cfb8;white-space:pre-line">${esc(t.fin)}</td></tr>
</table></td></tr></table></body></html>`;
  const texte = `${t.titre}\n\n${t.intro}\n\n${code}\n\n${t.bouton} : ${lien}\n\n${t.etapes}\n${t.garde}\n\n${t.fin}`;
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
