// Tests des tranches d'âge et de la sélection des questions. Lancer : node --test tests/
// Aucun accès réseau ni base : on utilise private/data.json (V39 : 1 959 questions) et le vrai code du jeu.
import { test } from 'node:test';
import { creerT } from '../public/i18n.js';
import { DICOS } from '../public/i18n/jeu.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as A from '../public/ages.js';
import { verifierQuestion } from '../api/admin.js';

const DATA = JSON.parse(readFileSync(new URL('../private/data.json', import.meta.url)));
const enfant = (age, extra = {}) => ({ name: 'E' + age, child: true, age, level: 'standard', levels: {}, streak: {}, themeIdx: 0, ...extra });
const adulte = (level = 'standard') => ({ name: 'Adulte', child: false, age: 30, level, levels: {}, streak: {}, themeIdx: 0 });
const MATIERES = ['religion', 'invocations', 'maths', 'geography', 'sciences', 'management'];

// ---------- Moteur réel du jeu, extrait de private/jeu.html ----------
function moteur(data, { seen = {}, used = [] } = {}) {
  const html = readFileSync(new URL('../private/jeu.html', import.meta.url), 'utf8');
  const fn = (nom) => {
    const l = html.split('\n').find(x => x.startsWith(`function ${nom}(`) || x.startsWith(`async function ${nom}(`)); assert.ok(l, `fonction ${nom} introuvable`);
    if (l.trimEnd().endsWith('}')) return l;
    const m = html.match(new RegExp(`((?:async )?function ${nom}\\([\\s\\S]*?\\n})\\n`)); return m[1]; };
  const ligne = (debut) => { const l = html.split('\n').find(x => x.startsWith(debut)); assert.ok(l, debut); return l; };
  const store = { _s: { kounouzi_v2_seen: seen }, get(k) { return this._s[k]; }, set(k, v) { this._s[k] = v; } };
  const ctx = { DATA: data, EV: data.EV || null, S: { usedQ: used }, RG: {}, THEMES: ['religion', 'invocations', 'maths', 'geography', 'sciences', 'management'],
    store, tranchesPourJoueur: A.tranchesPourJoueur, questionsEligibles: A.questionsEligibles, paliers: A.paliers, Math, Set, console,
    toasts: [], THEME_INFO: {}, LANG: 'fr', t: creerT(DICOS, () => 'fr'), openCard() { throw new Error('ne doit pas ouvrir de carte sans question'); } };
  ctx.toast = (m) => ctx.toasts.push(m);
  vm.createContext(ctx);
  vm.runInContext([fn('startLevel'), ligne('const bandsFor'), ligne("const SEEN_KEY"), ligne('const SEEN ='), ligne('const seenOf'),
    ligne('const EVQ'), ligne('const Q_NORMALES'), ligne('const Q_EV'), ligne('const aDesQuestionsEv'),
    fn('poolFor'), fn('paliersFor'), fn('selectQuestion'), fn('nextTheme'), fn('levelRange'), fn('adapt'), fn('askQuestion'),
    'this.api={startLevel,bandsFor,poolFor,selectQuestion,nextTheme,levelRange,adapt,askQuestion,toasts:this.toasts}'].join('\n'), ctx);
  return ctx.api;
}

// ---------- Une seule classification : 5-8, 9-12, 13-17, 18+ ----------
test('une seule classification pour toutes les matières, maths comprises', () => {
  for (const t of MATIERES) assert.deepEqual(A.tranchesDuTheme(t), ['5-8', '9-12', '13-17', '18+']);
  assert.equal(A.normaliserTranche('9–12 ans'), '9-12'); assert.equal(A.normaliserTranche('18 ans et +'), '18+');
  assert.equal(A.normaliserTranche('13+'), null); assert.equal(A.normaliserTranche('n’importe quoi'), null);
});
test('données V41 : 1 989 questions, toutes avec une tranche valable et un âge minimum dans leur tranche', () => {
  assert.equal(DATA.questions.length, 1989);
  const sans = DATA.questions.filter(q => !A.normaliserTranche(q.a)); assert.equal(sans.length, 0, sans.slice(0, 5).map(q => q.id).join(', '));
  const am = DATA.questions.filter(q => A.trancheDeLAge(q.am) !== q.a); assert.equal(am.length, 0, am.slice(0, 5).map(q => q.id).join(', '));
  assert.equal(new Set(DATA.questions.map(q => q.id)).size, 1989, 'doublon d’identifiant');
});
test('QCM : 628 questions à 3 choix (5-8 ans à l’origine), bonne lettre cohérente avec la réponse', () => {
  const qcm = DATA.questions.filter(q => q.qcm); assert.equal(qcm.length, 628);
  for (const q of qcm) {
    assert.deepEqual(Object.keys(q.qcm.fr).sort(), ['A', 'B', 'C'], q.id);
    assert.equal(q.qcm.fr[q.qcm.ok], q.r.fr, q.id); assert.equal(q.qcm.en[q.qcm.ok], q.r.en, q.id);
  }
});
test('Histoire des prophètes 5-8 ans : questions dédiées (p58), dès 5 ans', () => {
  const p = DATA.questions.filter(q => q.p58); assert.ok(p.length >= 5);
  assert.ok(p.every(q => q.t === 'geography' && q.a === '5-8' && q.am === 5 && q.qcm));
});
test('rappels de réponse : jamais présentés comme explication', () => {
  assert.equal(DATA.questions.filter(q => /^Réponse attendue/.test(q.e?.fr || '')).length, 0);
  assert.equal(DATA.questions.filter(q => /^Correct answer/.test(q.e?.en || '')).length, 0);
});

// ---------- Âge réel → tranches, par priorité ----------
const ATTENDU = { 4: ['5-8'], 5: ['5-8'], 8: ['5-8'], 9: ['9-12', '5-8'], 12: ['9-12', '5-8'], 13: ['13-17', '9-12', '5-8'], 17: ['13-17', '9-12', '5-8'], 18: ['18+', '13-17', '9-12', '5-8'] };
for (const [age, tr] of Object.entries(ATTENDU)) {
  test(`profil enfant de ${age} ans : ${tr.join(' puis ')} (jamais une tranche plus âgée)`, () => {
    for (const t of MATIERES) assert.deepEqual(A.tranchesPourJoueur(t, enfant(+age)), tr);
  });
}
test('adultes : 18+, puis 13-17, 9-12, 5-8 ; « découverte » commence par 13-17', () => {
  assert.deepEqual(A.tranchesPourJoueur('maths', adulte()), ['18+', '13-17', '9-12', '5-8']);
  assert.deepEqual(A.tranchesPourJoueur('maths', adulte('decouverte')), ['13-17', '18+', '9-12', '5-8']);
});

// ---------- Le point le plus important : jamais une question d'un âge plus grand ----------
const RANG = { '5-8': 0, '9-12': 1, '13-17': 2, '18+': 3 };
test('moteur : 300 tirages par âge (5 → 17 ans) et par matière, jamais une tranche plus âgée, âge minimum ≤ âge', () => {
  for (let age = 5; age <= 17; age++) {
    const p = enfant(age), tr = A.trancheDeLAge(age);
    for (const t of MATIERES) {
      const M = moteur(DATA);
      for (let k = 0; k < 300; k++) { const q = M.selectQuestion(p, t); if (!q) continue;
        assert.ok(q.t === t && RANG[q.a] <= RANG[tr] && !(q.am > age), `${t} ${age} ans → ${q.id} (${q.a}, ${q.am} ans)`);
        if (t === 'geography' && tr === '5-8') assert.ok(q.p58, `${age} ans : ancienne variante ${q.id}`); }
    }
  }
});
test('priorité : tant qu’il reste des questions non vues dans sa tranche, le joueur n’en reçoit pas d’autre', () => {
  for (const [p, t] of [[enfant(10), 'religion'], [enfant(15), 'religion'], [adulte(), 'maths'], [enfant(11), 'maths']]) {
    const M = moteur(DATA), propre = A.paliers(DATA.questions, t, p)[0];
    for (let k = 0; k < Math.min(40, propre.length - 5); k++) assert.equal(M.selectQuestion(p, t).a, A.tranchesPourJoueur(t, p)[0], `${t} ${p.age}`);
  }
});
test('tranche du joueur épuisée : complément par la tranche juste en dessous, jamais au-dessus', () => {
  const p = enfant(10), vus = A.paliers(DATA.questions, 'sciences', p)[0].map(q => q.id);
  const M = moteur(DATA, { seen: { e10: [...vus] } });
  for (let k = 0; k < 20; k++) assert.equal(M.selectQuestion(p, 'sciences').a, '5-8');
  const ad = moteur(DATA); for (let k = 0; k < 20; k++) assert.equal(ad.selectQuestion(adulte(), 'religion').a, '13-17', 'adulte : pas de religion 18+, donc 13-17');
});
test('Histoire des prophètes 5-8 : les 30 questions vues, la série recommence, jamais les anciennes variantes', () => {
  const p = enfant(6), ids = DATA.questions.filter(q => q.p58).map(q => q.id);
  const M = moteur(DATA, { seen: { e6: [...ids] } });
  for (let k = 0; k < 40; k++) { const q = M.selectQuestion(p, 'geography'); if (q) assert.ok(q.p58, q.id); }
});
test('âge minimum : un enfant de 5 ans n’a jamais une question prévue pour 6, 7 ou 8 ans', () => {
  const pool = MATIERES.flatMap(t => A.questionsEligibles(DATA.questions, t, enfant(5)));
  assert.ok(pool.length > 0 && pool.every(q => q.am <= 5));
});
test('question sans tranche, tranche inconnue ou ancienne tranche (13+, 7-8…) : jamais proposée', () => {
  const b = { ...DATA.questions.find(q => q.t === 'sciences' && q.a === '9-12'), am: 9 };
  const qs = [{ ...b, id: 'X1', a: null }, { ...b, id: 'X2', a: '9-10' }, { ...b, id: 'X3', a: '13+' }, { ...b, id: 'X4', a: '9–12 ans' }];
  assert.deepEqual(A.questionsEligibles(qs, 'sciences', enfant(10)).map(q => q.id), ['X4']);
  assert.deepEqual(A.questionsEligibles(qs, 'sciences', enfant(8)).map(q => q.id), [], 'un enfant de 8 ans ne reçoit pas une 9-12');
});
test('un thème sans aucune question adaptée est sauté (jamais une question d’une autre tranche)', () => {
  const M = moteur({ ...DATA, questions: DATA.questions.filter(q => !q.p58) }), p = enfant(5);
  assert.equal(M.poolFor(p, 'geography').length, 0);
  assert.equal(M.selectQuestion(p, 'geography'), null);
  const vus = Array.from({ length: 12 }, () => M.nextTheme(p));
  assert.ok(!vus.includes('geography') && vus.includes('religion') && vus.includes('maths'));
});
test('joueurs d’âges différents dans la même partie : chacun reste dans sa tranche', () => {
  const M = moteur(DATA), petit = enfant(7), moyen = enfant(10), grand = enfant(15), papa = adulte();
  for (let k = 0; k < 60; k++) {
    assert.equal(M.selectQuestion(petit, 'religion').a, '5-8'); assert.equal(M.selectQuestion(moyen, 'religion').a, '9-12');
    assert.equal(M.selectQuestion(grand, 'religion').a, '13-17'); assert.ok(RANG[M.selectQuestion(papa, 'geography').a] <= 3);
  }
});
test('toutes les questions adaptées déjà vues : le cycle recommence, sans sortir de la tranche', () => {
  const p = enfant(7), ids = A.questionsEligibles(DATA.questions, 'sciences', p).map(q => q.id);
  const M = moteur(DATA, { seen: { e7: [...ids] } });
  for (let k = 0; k < 50; k++) { const q = M.selectQuestion(p, 'sciences'); assert.equal(q.a, '5-8'); assert.ok(q.am <= 7); }
});
test('aucun thème n’a de question adaptée : pas de boucle infinie, pas de plantage, la question est sautée', async () => {
  const M = moteur({ ...DATA, questions: [] }), p = enfant(8);
  const t0 = Date.now();
  for (let k = 0; k < 50; k++) assert.ok(typeof M.nextTheme(p) === 'string');
  assert.equal(M.selectQuestion(p, 'religion'), null);
  assert.deepEqual([...M.levelRange(p, 'religion')], [1, 5]);
  assert.equal(await M.askQuestion(p), 'skip');
  assert.equal(await M.askQuestion(p, { theme: 'sciences', title: 'Duel' }), 'skip');
  assert.match(M.toasts[0], /Pas de question adaptée/);
  assert.ok(Date.now() - t0 < 500);
});
test('même question en double dans le fichier (groupe) : jamais reposée deux fois à la même table', () => {
  const doubles = DATA.questions.filter(q => q.src && q.src.startsWith('groupe:'));
  assert.ok(doubles.length >= 2);
  const M = moteur({ ...DATA, questions: doubles }), p = enfant(8);
  const vus = []; let q; while ((q = M.selectQuestion(p, 'geography')) && vus.length < 30) { if (vus.includes(q.src)) break; vus.push(q.src); }
  assert.equal(new Set(vus).size, vus.length);
});
test('variété : une même partie ne repose pas deux fois le même modèle de question (seuls les nombres changent)', () => {
  const api = moteur(DATA); const p = enfant(11); const mod = (q) => q.q.fr.replace(/\d+(?:[.,]\d+)?/g, '#').replace(/\s+/g, ' ').trim().slice(0, 70);
  const vus = []; for (let k = 0; k < 12; k++) { const q = api.selectQuestion(p, 'maths'); assert.ok(q); vus.push(mod(q)); }
  assert.equal(new Set(vus).size, vus.length, 'modèle répété : ' + vus.join(' | '));
});
test('événement en cours : seules ses questions sortent ; joueur sans question d’événement à son âge → questions habituelles ; hors événement, jamais', () => {
  const evq = {}; const rel = DATA.questions.filter(q => q.t === 'religion' && q.a === '9-12' && q.am <= 9).slice(0, 12); rel.forEach(q => { evq[q.id] = 'ramadan'; });
  const data = { ...DATA, evq, EV: { id: 'ramadan', nom: 'Ramadan' } };
  const api = moteur(data), p9 = enfant(9);
  for (let k = 0; k < 20; k++) { const th = api.nextTheme(p9); const q = api.selectQuestion(p9, th); assert.ok(q && evq[q.id] === 'ramadan', 'question hors événement'); }
  const p5 = enfant(5); const q5 = api.selectQuestion(p5, api.nextTheme(p5)); assert.ok(q5 && !evq[q5.id]);
  const hors = moteur({ ...DATA, evq });
  for (let k = 0; k < 60; k++) { const q = hors.selectQuestion(p9, 'religion'); if (q) assert.ok(!evq[q.id], 'question d’événement hors de ses dates'); }
});

// ---------- Tableau de bord : filtres ----------
const Q = [
  { id: 'R1', t: 'religion', a: '9-12', statut: 'publiee', q: { fr: 'Prière' }, r: { fr: '' } },
  { id: 'R2', t: 'religion', a: '5-8', statut: 'brouillon', q: { fr: 'Prophète' }, r: { fr: '' } },
  { id: 'S1', t: 'sciences', a: '9-12', statut: 'publiee', q: { fr: 'Planète' }, r: { fr: '' } },
  { id: 'S2', t: 'sciences', a: '13-17', statut: 'archivee', q: { fr: 'Prisme' }, r: { fr: '' } },
  { id: 'M1', t: 'maths', a: '18+', statut: 'publiee', q: { fr: 'Calcul' }, r: { fr: '' } },
];
const ids = (l) => l.map(q => q.id);
test('filtre d’âge : les 4 tranches, pour tous les thèmes', () => {
  assert.deepEqual(A.optionsFiltreAge('')[0].options.map(o => o.value), ['5-8', '9-12', '13-17', '18+']);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { age: '9-12' })), ['R1', 'S1']);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { theme: 'maths', age: '18+' })), ['M1']);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { theme: 'sciences', age: '13-17', statut: 'archivee', recherche: 'pris' })), ['S2']);
  assert.equal(A.filtreAgeCompatible('maths', '9-12'), true); assert.equal(A.filtreAgeCompatible('', 'religion:10-12'), false);
});

// ---------- Création / modification (validation serveur) ----------
const base = { q: { fr: 'Question ?' }, r: { fr: 'Réponse.' }, d: 2 };
test('tranche obligatoire pour toutes les matières, maths comprises ; âge minimum dans la tranche', () => {
  assert.match(verifierQuestion({ ...base, t: 'maths', a: null }).erreur, /Tranche/);
  assert.match(verifierQuestion({ ...base, t: 'sciences', a: '13+' }).erreur, /Tranche/);
  assert.equal(verifierQuestion({ ...base, t: 'maths', a: '9-12' }).question.am, 9);
  assert.equal(verifierQuestion({ ...base, t: 'maths', a: '9-12', am: 11 }).question.am, 11);
  assert.match(verifierQuestion({ ...base, t: 'maths', a: '9-12', am: 14 }).erreur, /âge minimum/);
});
test('QCM : trois choix et la bonne lettre, sinon refus', () => {
  const qcm = { fr: { A: 'Un', B: 'Deux', C: 'Trois' }, en: { A: 'One', B: 'Two', C: 'Three' }, ok: 'B' };
  assert.deepEqual(verifierQuestion({ ...base, t: 'sciences', a: '5-8', qcm }).question.qcm, qcm);
  assert.match(verifierQuestion({ ...base, t: 'sciences', a: '5-8', qcm: { ...qcm, ok: 'D' } }).erreur, /QCM/);
  assert.match(verifierQuestion({ ...base, t: 'sciences', a: '5-8', qcm: { fr: { A: 'Un', B: 'Deux' }, ok: 'A' } }).erreur, /QCM/);
});
test('religion : publication seulement avec source + explication FR (arabe facultatif, décision du 7 nov. 2026)', () => {
  assert.ok(verifierQuestion({ ...base, t: 'religion', a: '5-8', statut: 'brouillon' }).question);
  assert.match(verifierQuestion({ ...base, t: 'religion', a: '5-8', statut: 'publiee' }).erreur, /source/);
  assert.match(verifierQuestion({ ...base, t: 'religion', a: '5-8', statut: 'publiee', s: 'Livre', e: { ar: 'ش' } }).erreur, /source/);
  assert.equal(verifierQuestion({ ...base, t: 'religion', a: '5-8', statut: 'publiee', s: 'Livre', e: { fr: 'E' } }).question.statut, 'publiee');
  assert.equal(verifierQuestion({ ...base, t: 'religion', a: '5-8', statut: 'publiee', s: 'Livre', e: { fr: 'E', ar: 'ش' } }).question.statut, 'publiee');
});
test('modification : identifiant, traductions, âge minimum et QCM conservés', () => {
  const v = verifierQuestion({ ...base, id: 'SCI-1', t: 'sciences', a: '9–12', am: 10, statut: 'publiee', q: { fr: 'Q ?', en: 'Q?' }, r: { fr: 'R', en: 'A' }, e: { fr: 'E' }, src: 'v2', poids: 2, prio: true }).question;
  assert.equal(v.id, 'SCI-1'); assert.equal(v.a, '9-12'); assert.equal(v.am, 10);
  assert.deepEqual(v.q, { fr: 'Q ?', en: 'Q?' }); assert.deepEqual(v.e, { fr: 'E' }); assert.equal(v.src, 'v2'); assert.equal(v.poids, 2);
});
test('adulte en Histoire des prophètes : ni question ni fait répété, tranches parcourues de la sienne vers les plus jeunes', () => {
  const M = moteur(DATA), papa = adulte(); const b = []; for (let k = 0; k < 60; k++) b.push(M.selectQuestion(papa, 'geography'));
  assert.equal(new Set(b.map(q => q.id)).size, 60, 'question répétée');
  const faits = b.filter(q => q.src).map(q => q.src); assert.equal(new Set(faits).size, faits.length, 'fait répété');
  for (let k = 1; k < b.length; k++) assert.ok(RANG[b[k].a] <= RANG[b[k - 1].a], 'retour vers une tranche plus âgée : ' + b.map(q => q.a).join(','));
});
