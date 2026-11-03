// Kounouzi — langues de l'interface : un seul moteur pour le jeu, le site et le tableau de bord.
// Le français est la langue de référence : toute clé absente d'une autre langue retombe sur le français
// (et la clé manquante est signalée une fois dans la console). Ajouter une langue = ajouter un dictionnaire.
// Aucun accès réseau ici ; le DOM et le stockage sont utilisés seulement s'ils existent (testable avec node).

export const LANGUES = ['fr', 'en'];
export const LANGUE_DEFAUT = 'fr';
export const NOM_LANGUE = { fr: 'Français', en: 'English' };
const CLE = 'kounouzi_lang';

export const langueValide = (l) => LANGUES.includes(l) ? l : null;

/** Langue choisie : préférence gardée, sinon la langue du navigateur (anglais si le navigateur est en anglais), sinon français. */
export function detecterLangue({ stockee, navigateur } = {}) {
  const s = langueValide(stockee);
  if (s) return s;
  for (const n of navigateur || []) {
    const base = String(n || '').toLowerCase().slice(0, 2);
    if (base === 'fr') return 'fr';
    if (base === 'en') return 'en';
  }
  return LANGUE_DEFAUT;
}
export function lireLangue() {
  let stockee = null;
  try { stockee = localStorage.getItem(CLE); } catch {}
  if (!stockee && typeof document !== 'undefined') { const m = document.cookie.match(/(?:^|;\s*)kz_lang=([a-z]{2})/); if (m) stockee = m[1]; }
  const nav = typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language]) : [];
  return detecterLangue({ stockee, navigateur: nav });
}
/** Garde la langue sur l'appareil (et dans un cookie, pour que le serveur réponde dans la même langue). */
export function ecrireLangue(l) {
  l = langueValide(l) || LANGUE_DEFAUT;
  try { localStorage.setItem(CLE, l); } catch {}
  try { document.cookie = `kz_lang=${l}; path=/; max-age=31536000; samesite=lax`; } catch {}
  return l;
}

const manquantes = new Set();
export const clesManquantes = () => [...manquantes];

function choisirPluriel(val, lang, n) {
  let cat = 'other';
  try { cat = new Intl.PluralRules(lang).select(Number(n)); } catch {}
  if (Number(n) === 0 && val.zero !== undefined) return val.zero;
  return val[cat] ?? val.other ?? val.one;
}
const remplir = (s, p) => String(s).replace(/\{(\w+)\}/g, (m, k) => (p && p[k] !== undefined ? p[k] : m));

/**
 * Crée la fonction de traduction t(cle, paramètres).
 * Une valeur peut être : un texte avec {paramètres} ; un objet de pluriel {one, other, zero?} choisi avec params.n ;
 * une liste de variantes (choisie avec params.i) ; une fonction (params) → texte.
 */
export function creerT(dicos, getLang) {
  return function t(cle, p = {}) {
    const lang = getLang();
    let val = dicos[lang]?.[cle];
    if (val === undefined) {
      val = dicos[LANGUE_DEFAUT]?.[cle];
      const id = lang + ':' + cle;
      if (lang !== LANGUE_DEFAUT && !manquantes.has(id)) { manquantes.add(id); try { console.warn('[i18n] traduction manquante', id); } catch {} }
      if (val === undefined) return cle;
    }
    if (typeof val === 'function') return val(p, lang);
    if (Array.isArray(val)) val = val[(((p.i || 0) % val.length) + val.length) % val.length];
    if (val && typeof val === 'object') val = choisirPluriel(val, lang, p.n);
    return remplir(val, p);
  };
}

/** Contrôle des dictionnaires : clés présentes en français mais absentes ailleurs, et l'inverse. */
export function comparerDictionnaires(dicos) {
  const ref = Object.keys(dicos[LANGUE_DEFAUT] || {});
  const out = {};
  for (const l of Object.keys(dicos)) {
    if (l === LANGUE_DEFAUT) continue;
    const ks = Object.keys(dicos[l]);
    out[l] = { manquantes: ref.filter(k => !ks.includes(k)), enTrop: ks.filter(k => !ref.includes(k)) };
  }
  return out;
}

export const localeDe = (l) => (l === 'en' ? 'en-GB' : 'fr-FR');
export const formatNombre = (n, l) => Math.round(Number(n) || 0).toLocaleString(localeDe(l));

/** Texte d'un champ multilingue {fr, en, ar} dans la langue demandée, sinon en français. Renvoie aussi la langue réellement utilisée. */
export function champ(obj, lang) {
  const o = obj || {};
  if (lang && o[lang]) return { texte: o[lang], langue: lang };
  return { texte: o.fr || '', langue: 'fr' };
}

/** Applique les traductions aux éléments marqués data-i18n (texte), data-i18n-aria, data-i18n-title, data-i18n-ph. */
export function traduirePage(t, racine = document) {
  racine.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  racine.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  racine.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  racine.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('title', t(el.dataset.i18nTitle)); });
  racine.querySelectorAll('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.dataset.i18nPh)); });
}
