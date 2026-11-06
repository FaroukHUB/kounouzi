// Événements (Ramadan, Aïd…) : vérification de ce que le tableau de bord envoie (fiche d'un événement, import de questions
// et de défis). Aucun accès à la base ici : ces fonctions sont pures, testées dans tests/evenements.test.mjs.
import { createHash } from 'node:crypto';

const txt = (v, max = 600) => (v == null ? '' : String(v)).trim().slice(0, max);
const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def; };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dateOk = (s) => DATE.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
export const ID_EV = /^[a-z0-9][a-z0-9-]{1,39}$/;
export const ID_MEDIA = /^[a-f0-9]{24}$/;

/** Fiche d'un événement → { evenement } ou { erreur }. */
export function verifierEvenement(b) {
  const id = txt(b.id, 40).toLowerCase();
  if (!ID_EV.test(id)) return { erreur: 'Identifiant invalide : lettres minuscules, chiffres et tirets (ex. ramadan-2027).' };
  const nom = txt(b.nom, 80); if (!nom) return { erreur: 'Le nom de l’événement est obligatoire.' };
  const debut = txt(b.debut, 10), fin = txt(b.fin, 10);
  if (!dateOk(debut) || !dateOk(fin)) return { erreur: 'Les dates de début et de fin sont obligatoires.' };
  if (fin < debut) return { erreur: 'La date de fin doit être après la date de début.' };
  const plateau = txt(b.plateau, 24); if (plateau && !ID_MEDIA.test(plateau)) return { erreur: 'Image du plateau inconnue.' };
  const deux = (o, max) => ({ fr: txt(o?.fr, max), en: txt(o?.en, max) });
  return { evenement: { id, nom, debut, fin, accueil: deux(b.accueil, 300), bandeau: deux(b.bandeau, 200), plateau: plateau || null, actif: b.actif !== false } };
}

/** Deux événements actifs qui se chevauchent : le jeu prendrait le premier ; on prévient dans le tableau de bord. */
export function chevauchements(liste) {
  const L = (liste || []).filter(e => e.actif).sort((a, b) => a.debut.localeCompare(b.debut)), out = [];
  for (let i = 1; i < L.length; i++) if (L[i].debut <= L[i - 1].fin) out.push([L[i - 1].id, L[i].id]);
  return out;
}

/** L'événement en cours à une date AAAA-MM-JJ (le premier par date de début s'il y en a plusieurs). */
export function evenementDuJour(liste, jour) {
  return (liste || []).filter(e => e.actif !== false && e.debut <= jour && jour <= e.fin).sort((a, b) => a.debut.localeCompare(b.debut))[0] || null;
}

// Noms de thème acceptés dans un fichier (libellé du tableau de bord ou code interne).
const THEME_NOMS = { religion: 'religion', invocations: 'invocations', 'maths & logique': 'maths', maths: 'maths', 'maths et logique': 'maths', logique: 'maths', logic: 'maths',
  'histoire des prophètes': 'geography', histoire: 'geography', geography: 'geography', sciences: 'sciences', science: 'sciences', gestion: 'management', management: 'management' };
export const themeDe = (v) => THEME_NOMS[txt(v, 40).toLowerCase()] || null;
const empreinte = (s, n = 8) => createHash('sha256').update(String(s)).digest('hex').slice(0, n).toUpperCase();

/**
 * Lignes d'un fichier de questions (format de l'export du tableau de bord) → questions prêtes à vérifier.
 * Une ligne sans id reçoit un id stable tiré de l'événement et du texte (réimporter le même fichier ne crée pas de doublon).
 */
export function lignesQuestions(lignes, { ev, statut = 'brouillon' } = {}) {
  return (Array.isArray(lignes) ? lignes : []).slice(0, 2000).map((l, i) => {
    const t = themeDe(l.theme ?? l.t);
    const q = { fr: txt(l.question ?? l.q?.fr, 600), en: txt(l.question_en ?? l.q?.en, 600), ar: txt(l.question_ar ?? l.q?.ar, 600) };
    const r = { fr: txt(l.reponse ?? l.r?.fr, 600), en: txt(l.reponse_en ?? l.r?.en, 600), ar: txt(l.reponse_ar ?? l.r?.ar, 600) };
    const e = { fr: txt(l.explication ?? l.e?.fr, 1200), en: txt(l.explication_en ?? l.e?.en, 1200), ar: txt(l.explication_ar ?? l.e?.ar, 1200) };
    const id = txt(l.id, 60) || `${(ev || 'IMP').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}-${empreinte((t || '') + '|' + q.fr)}`;
    return { ligne: i + 1, theme_lu: l.theme ?? l.t ?? '', question: { id, t, d: l.niveau ?? l.d, a: l.tranche_age ?? l.a ?? null, q, r, e, s: txt(l.source ?? l.s, 300), statut: l.statut || statut, poids: l.poids, prio: l.prio } };
  });
}

/** Un défi d'un fichier → { defi } ou { erreur }. Même forme que les défis du jeu. */
export function verifierDefi(l, { ev, index = 0 } = {}) {
  const ti = txt(l.ti ?? l.titre, 80), tx = txt(l.tx ?? l.texte, 600);
  if (!ti || !tx) return { erreur: 'Titre (ti) et texte (tx) obligatoires.' };
  const v = (Array.isArray(l.v ?? l.variantes) ? (l.v ?? l.variantes) : []).slice(0, 6)
    .map(x => ({ ageMin: num(x.ageMin, 3, 99, 5), ...(x.ageMax != null ? { ageMax: num(x.ageMax, 4, 120, 99) } : {}), text: txt(x.text ?? x.texte, 120) })).filter(x => x.text);
  const id = txt(l.id, 40) || `${ev}-d${String(index + 1).padStart(2, '0')}`;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/.test(id)) return { erreur: 'Identifiant de défi invalide.' };
  return { defi: { id, ev, defi: { ti, tx, cl: txt(l.cl ?? l.categorie, 30) || 'Événement', cat: 'evenement', min: num(l.min ?? l.age_min, 3, 99, 5), rw: num(l.rw ?? l.recompense, 0, 100, 5), v,
    boss: false, consent: !!l.consent, oh: false, on: null } } };
}
