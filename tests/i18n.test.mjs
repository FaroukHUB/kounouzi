// Tests des langues : moteur de traduction, dictionnaires, contenu envoyé au jeu, import des traductions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { creerT, comparerDictionnaires, detecterLangue, clesManquantes, formatNombre, champ } from '../public/i18n.js';
import { DICOS } from '../public/i18n/jeu.js';
import { questionsPourJeu, analyserImport, lots, progression, statutTrad, normaliser } from '../public/trad.js';

const lire = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const DATA = JSON.parse(lire('../private/data.json'));
const EN = JSON.parse(lire('../private/contenu-en.json'));
const JEU = lire('../private/jeu.html');

// ---------- Moteur
test('t() : paramètres, pluriels, variantes, fonctions', () => {
  const D = { fr: { a: 'Bonjour {n}', p: { one: '{n} case', other: '{n} cases' }, v: ['x', 'y'], f: (p) => 'f' + p.k }, en: { a: 'Hello {n}', p: { one: '{n} square', other: '{n} squares' }, v: ['X', 'Y'], f: (p) => 'F' + p.k } };
  let L = 'fr'; const t = creerT(D, () => L);
  assert.equal(t('a', { n: 'Ali' }), 'Bonjour Ali');
  assert.equal(t('p', { n: 1 }), '1 case'); assert.equal(t('p', { n: 3 }), '3 cases');
  assert.equal(t('v', { i: 3 }), 'y'); assert.equal(t('f', { k: 2 }), 'f2');
  L = 'en';
  assert.equal(t('a', { n: 'Ali' }), 'Hello Ali');
  assert.equal(t('p', { n: 1 }), '1 square'); assert.equal(t('p', { n: 2 }), '2 squares');
});
test('t() : clé absente en anglais → français, et la clé est signalée', () => {
  const t = creerT({ fr: { seule: 'Texte français' }, en: {} }, () => 'en');
  assert.equal(t('seule'), 'Texte français');
  assert.ok(clesManquantes().includes('en:seule'));
  assert.equal(t('inconnue'), 'inconnue');
});
test('dictionnaires du jeu : mêmes clés en français et en anglais', () => {
  const c = comparerDictionnaires(DICOS);
  assert.deepEqual(c.en.manquantes, []); assert.deepEqual(c.en.enTrop, []);
});
test('toutes les clés utilisées par le jeu existent dans les deux langues', () => {
  const cles = new Set([...JEU.matchAll(/\bt\('([a-zA-Z.]+)'/g)].map(m => m[1]).filter(k => !k.endsWith('.')));
  const dyn = [...JEU.matchAll(/\bt\('([a-zA-Z]+\.)'\+/g)].map(m => m[1]);
  assert.ok(cles.size > 150, 'le jeu utilise bien le dictionnaire');
  for (const k of cles) { assert.ok(k in DICOS.fr, 'fr ' + k); assert.ok(k in DICOS.en, 'en ' + k); }
  for (const pre of dyn) assert.ok(Object.keys(DICOS.en).some(k => k.startsWith(pre)), pre);
  for (const th of ['religion', 'maths', 'geography', 'logic', 'management', 'sciences']) { assert.ok(DICOS.en['theme.' + th]); assert.ok(DICOS.en['themeDit.' + th]); }
  for (const c of ['start', 'question', 'challenge', 'halt', 'treasure', 'donation', 'hassanat']) assert.ok(DICOS.en['case.' + c]);
});
test('le français du jeu est inchangé (phrases témoins)', () => {
  const t = creerT(DICOS, () => 'fr');
  assert.equal(t('intro.savoir', { theme: 'histoire et géographie' }), "Case Savoir ! Une question d'histoire et géographie.");
  assert.equal(t('intro.savoir', { theme: 'logique' }), 'Case Savoir ! Une question de logique.');
  assert.equal(t('ph.turn', { n: 'Yacine', i: 0 }), "Allez Yacine, c'est à toi !");
  assert.equal(t('ph.start', { noms: ['A', 'B', 'C'] }).includes('A, B et C'), true);
  assert.equal(t('chemin.cases', { n: 1 }), '1 case'); assert.equal(t('chemin.cases', { n: 4 }), '4 cases');
  const en = creerT(DICOS, () => 'en');
  assert.equal(en('intro.savoir', { theme: 'logic' }), 'Knowledge square! A logic question.');
  assert.equal(en('ph.start', { noms: ['A', 'B'] }).includes('A and B'), true);
});
test('langue : préférence gardée, sinon navigateur, sinon français', () => {
  assert.equal(detecterLangue({ stockee: 'en', navigateur: ['fr-FR'] }), 'en');
  assert.equal(detecterLangue({ stockee: 'de', navigateur: ['en-GB', 'fr'] }), 'en');
  assert.equal(detecterLangue({ navigateur: ['ar-DZ', 'fr-FR'] }), 'fr');
  assert.equal(detecterLangue({ navigateur: ['es'] }), 'fr');
  assert.equal(detecterLangue({}), 'fr');
});
test('nombres et champs multilingues', () => {
  assert.equal(formatNombre(1250, 'en'), '1,250');
  assert.match(formatNombre(1250, 'fr'), /^1\s250$/);
  assert.deepEqual(champ({ fr: 'Bonjour' }, 'en'), { texte: 'Bonjour', langue: 'fr' });
  assert.deepEqual(champ({ fr: 'Bonjour', en: 'Hello' }, 'en'), { texte: 'Hello', langue: 'en' });
});

// ---------- Contenu envoyé au jeu
const Q = [
  { id: 'R1', t: 'religion', q: { fr: 'Qr', ar: 'سؤال' }, r: { fr: 'Rr' }, e: { fr: 'Er', ar: 'شرح' } },
  { id: 'L1', t: 'logic', q: { fr: 'Ql', ar: 'منطق', en: 'Ql en' }, r: { fr: 'Rl', ar: 'ج', en: 'Rl en' }, e: { fr: 'El', ar: 'ش', en: 'El en' }, tr: { en: 'validee' } },
  { id: 'L2', t: 'logic', q: { fr: 'Q2', en: 'Q2 en' }, r: { fr: 'R2', en: 'R2 en' }, e: {}, tr: { en: 'a_relire' } },
];
test('jeu : l’arabe n’est envoyé que pour la Religion (il reste en base pour les autres thèmes)', () => {
  const [r1, l1] = questionsPourJeu(Q);
  assert.equal(r1.q.ar, 'سؤال'); assert.equal(r1.e.ar, 'شرح');
  assert.equal(l1.q.ar, undefined); assert.equal(l1.r.ar, undefined); assert.equal(l1.e.ar, undefined);
  assert.equal(Q[1].q.ar, 'منطق', 'la donnée d’origine n’est pas modifiée');
});
test('jeu : seules les traductions validées sont montrées (option « à relire » visible)', () => {
  const [, l1, l2] = questionsPourJeu(Q);
  assert.equal(l1.q.en, 'Ql en'); assert.equal(l2.q.en, undefined); assert.equal(l2.q.fr, 'Q2');
  assert.equal(questionsPourJeu(Q, { relire: true })[2].q.en, 'Q2 en');
  assert.ok(!('tr' in l1));
});
test('vraie banque : aucune question non-religion n’arrive au jeu avec de l’arabe', () => {
  const out = questionsPourJeu(DATA.questions);
  assert.equal(out.length, DATA.questions.length);
  assert.ok(out.every(q => q.t === 'religion' || (!q.q.ar && !q.r.ar && !q.e.ar)));
  assert.ok(out.filter(q => q.t === 'religion').every(q => q.q.fr && q.r.fr));
  const avant = DATA.questions.filter(q => q.t === 'religion' && q.e.ar).length;
  assert.equal(out.filter(q => q.t === 'religion' && q.e.ar).length, avant, 'explications arabes de religion conservées');
});

// ---------- Contenu anglais (défis, Hassanāt, établissements) et cartes
test('défis, cartes Hassanāt et établissements : tous traduits, mêmes variantes', () => {
  for (const d of DATA.defis) {
    const e = EN.defis[d.id]; assert.ok(e, d.id);
    assert.ok(e.ti && e.tx && e.cl, d.id); assert.equal(e.v.length, d.v.length, d.id + ' variantes');
  }
  for (const h of DATA.hassanat) assert.ok(EN.hassanat[h.id]?.title && EN.hassanat[h.id]?.text, h.id);
  for (const c of DATA.cells.filter(c => c.type === 'heritage')) assert.ok(EN.cells[String(c.p)]?.nom, String(c.p));
});
test('cartes anglaises : une image par carte annoncée, et le dos', () => {
  const liste = JEU.match(/const CARTES_EN = new Set\(\[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(x => x.slice(1, -1));
  assert.ok(liste.length >= 23);
  for (const f of liste) assert.ok(existsSync(new URL(`../public/img/en/${f}-face.webp`, import.meta.url)), f);
  assert.ok(existsSync(new URL('../public/img/en/kounouzi-dos.webp', import.meta.url)));
  for (const c of DATA.cells.filter(c => c.card)) assert.ok(liste.includes(c.card.replace('-face.webp', '')), c.card);
});

// ---------- Import des traductions
const base = [
  { id: 'A', t: 'logic', q: { fr: 'L’eau bout à 100 °C ?' }, r: { fr: 'Oui' }, e: { fr: 'Au niveau de la mer.' } },
  { id: 'B', t: 'logic', q: { fr: 'Deux' }, r: { fr: '2' }, e: {} },
  { id: 'C', t: 'religion', q: { fr: 'Trois', en: 'Three' }, r: { fr: '3', en: '3' }, e: { fr: 'x', ar: 'س', en: 'x en' }, trad: { en: 'validee' } },
  { id: 'D', t: 'maths', q: { fr: 'Quatre' }, r: { fr: '4' }, e: {} },
];
const fichier = (questions, extra = {}) => ({ format: 'kounouzi-traductions', version: 1, langue: 'en', questions, ...extra });
test('import : format refusé (mauvais format, langue fr/ar)', () => {
  assert.equal(analyserImport({ format: 'autre', version: 1, langue: 'en', questions: [] }, base).ok, false);
  assert.equal(analyserImport(fichier([], { langue: 'fr' }), base).ok, false);
  assert.equal(analyserImport(fichier([], { langue: 'ar' }), base).ok, false);
  assert.equal(analyserImport(fichier([], { version: 2 }), base).ok, false);
});
test('import simulé : rapport détaillé, rien d’écrit pour les lignes douteuses', () => {
  const r = analyserImport(fichier([
    { id: 'A', theme: 'logic', fr: { q: "L'eau bout à 100 °C ?", r: 'Oui', e: 'Au niveau de la mer.' }, en: { q: 'Does water boil at 100 °C?', r: 'Yes', e: 'At sea level.' } },
    { id: 'A', fr: {}, en: { q: 'dup', r: 'dup' } },
    { id: 'Z', fr: {}, en: { q: 'x', r: 'y' } },
    { id: 'B', fr: { q: 'Deux (modifié)', r: '2' }, en: { q: 'Two', r: '2' } },
    { id: 'D', fr: { q: 'Quatre', r: '4' }, en: { q: '', r: '' } },
    { id: 'C', fr: { q: 'Trois', r: '3' }, en: { q: 'Three', r: '3', e: 'x en' } },
  ]), base);
  assert.equal(r.ok, true);
  assert.deepEqual(r.aEcrire.map(x => x.id), ['A']);
  assert.equal(r.stats.doublons, 1); assert.equal(r.stats.inconnues, 1); assert.equal(r.stats.frDifferent, 1);
  assert.equal(r.stats.incompletes, 1); assert.equal(r.stats.identiques, 1); assert.equal(r.stats.nouvelles, 1);
  assert.equal(r.manquantesApres, 2);
});
test('import : remplacement signalé, français différent accepté seulement sur demande, HTML retiré', () => {
  const l = [{ id: 'C', fr: { q: 'Trois', r: '3' }, en: { q: '<b>Three</b> (new)', r: '3' } }, { id: 'B', fr: { q: 'Autre', r: '2' }, en: { q: 'Two', r: '2' } }];
  const r = analyserImport(fichier(l), base);
  assert.equal(r.stats.remplacees, 1); assert.ok(r.avertissements.some(a => a.type === 'remplace' && /validée/.test(a.message)));
  assert.equal(r.aEcrire[0].q, 'Three (new)');
  assert.equal(analyserImport(fichier(l), base, { ignorerFr: true }).aEcrire.length, 2);
});
test('import : reprenable par lots (une ligne déjà importée revient « identique »)', () => {
  const lignes = base.map(q => ({ id: q.id, fr: { q: q.q.fr, r: q.r.fr }, en: { q: q.q.fr + ' EN', r: q.r.fr } }));
  assert.deepEqual(lots(lignes, 3).map(x => x.length), [3, 1]);
  const apres = base.map(q => ({ ...q, q: { ...q.q, en: q.q.fr + ' EN' }, r: { ...q.r, en: q.r.fr } }));
  const r = analyserImport(fichier(lignes), apres);
  assert.equal(r.aEcrire.length, 0); assert.equal(r.stats.identiques, 4);
});
test('import du vrai format (squelette exporté) : valide, tout est « à traduire »', () => {
  const sq = fichier(DATA.questions.slice(0, 50).map(q => ({ id: q.id, theme: q.t, age: q.a, fr: { q: q.q.fr, r: q.r.fr, e: q.e.fr || '' }, en: { q: '', r: '', e: '' } })));
  const r = analyserImport(sq, DATA.questions);
  assert.equal(r.ok, true); assert.equal(r.stats.incompletes, 50); assert.equal(r.aEcrire.length, 0); assert.equal(r.erreurs.length, 0);
});
test('statuts et progression', () => {
  assert.equal(statutTrad(base[0]), 'a_faire'); assert.equal(statutTrad(base[2]), 'validee');
  assert.equal(statutTrad({ q: { en: 'x' } }), 'a_relire');
  const p = progression(base);
  assert.deepEqual(p.total, { n: 4, a_faire: 3, a_relire: 0, validee: 1 });
  assert.equal(normaliser(' L’eau  «x» '), 'L\'eau "x"');
});

test('langue selon le pays de connexion (seulement si aucun choix n’a été fait)', () => {
  assert.equal(detecterLangue({ pays: 'GB', navigateur: ['fr-FR'] }), 'en', 'Royaume-Uni → anglais');
  assert.equal(detecterLangue({ pays: 'US' }), 'en');
  assert.equal(detecterLangue({ pays: 'FR', navigateur: ['en-US'] }), 'fr', 'France → français');
  assert.equal(detecterLangue({ pays: 'DZ', navigateur: ['ar'] }), 'fr', 'Algérie → français');
  assert.equal(detecterLangue({ pays: 'MA' }), 'fr'); assert.equal(detecterLangue({ pays: 'BE' }), 'fr');
  assert.equal(detecterLangue({ pays: 'CA', navigateur: ['fr-CA'] }), 'fr', 'Canada : selon le navigateur');
  assert.equal(detecterLangue({ pays: 'CA', navigateur: ['en-CA'] }), 'en');
  assert.equal(detecterLangue({ pays: 'DE', navigateur: ['de-DE'] }), 'en', 'autre pays, ni français ni anglais → anglais');
  assert.equal(detecterLangue({ pays: 'DE', navigateur: ['de', 'fr'] }), 'fr');
  assert.equal(detecterLangue({ stockee: 'fr', pays: 'GB' }), 'fr', 'le choix fait sur l’appareil passe avant le pays');
  assert.equal(detecterLangue({ stockee: 'en', pays: 'FR' }), 'en');
  assert.equal(detecterLangue({ pays: '' }), 'fr'); assert.equal(detecterLangue({ pays: 'XX' }), 'fr');
});
