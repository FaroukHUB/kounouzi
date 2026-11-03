// Tests des tranches d'âge et de la sélection des questions. Lancer : node --test tests/
// Aucun accès réseau ni base : on utilise private/data.json (les 1 764 questions) et le vrai code du jeu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as A from '../public/ages.js';
import { verifierQuestion } from '../api/admin.js';

const DATA = JSON.parse(readFileSync(new URL('../private/data.json', import.meta.url)));
const enfant = (age, extra = {}) => ({ name: 'E' + age, child: true, age, level: 'standard', levels: {}, streak: {}, themeIdx: 0, ...extra });
const adulte = (level = 'standard') => ({ name: 'Adulte', child: false, age: 30, level, levels: {}, streak: {}, themeIdx: 0 });
const GENERAUX = ['geography', 'sciences', 'logic', 'management'];

// ---------- Moteur réel du jeu, extrait de private/jeu.html ----------
function moteur(data, { seen = {}, used = [] } = {}) {
  const html = readFileSync(new URL('../private/jeu.html', import.meta.url), 'utf8');
  const fn = (nom) => {
    const l = html.split('\n').find(x => x.startsWith(`function ${nom}(`)); assert.ok(l, `fonction ${nom} introuvable`);
    if (l.trimEnd().endsWith('}')) return l;
    const m = html.match(new RegExp(`(function ${nom}\\([\\s\\S]*?\\n})\\n`)); return m[1]; };
  const ligne = (debut) => { const l = html.split('\n').find(x => x.startsWith(debut)); assert.ok(l, debut); return l; };
  const store = { _s: { kounouzi_v2_seen: seen }, get(k) { return this._s[k]; }, set(k, v) { this._s[k] = v; } };
  const ctx = { DATA: data, S: { usedQ: used }, RG: {}, THEMES: ['religion', 'maths', 'geography', 'sciences', 'logic', 'management'],
    store, tranchesPourJoueur: A.tranchesPourJoueur, questionsEligibles: A.questionsEligibles, Math, Set, console };
  vm.createContext(ctx);
  vm.runInContext([fn('startLevel'), ligne('const bandsFor'), ligne("const SEEN_KEY"), ligne('const SEEN ='), ligne('const seenOf'),
    fn('poolFor'), fn('selectQuestion'), fn('nextTheme'),
    'this.api={startLevel,bandsFor,poolFor,selectQuestion,nextTheme}'].join('\n'), ctx);
  return ctx.api;
}
// Ancienne règle (avant correction), pour la non-régression.
function ancienneTranche(theme, p) {
  const rel = theme === 'religion', a = p.child ? p.age : 30;
  if (!p.child) return rel ? ['14+', '12-14'] : ['13+', '11-12'];
  if (rel) return [a <= 7 ? '5-8' : a <= 9 ? '8-10' : a <= 11 ? '10-12' : a <= 13 ? '12-14' : '14+'];
  return [a <= 6 ? '5-6' : a <= 8 ? '7-8' : a <= 10 ? '9-10' : a <= 12 ? '11-12' : '13+'];
}

// ---------- Les deux classifications ----------
test('deux classifications distinctes, maths sans tranche', () => {
  assert.deepEqual(A.tranchesDuTheme('religion'), ['5-8', '8-10', '10-12', '12-14', '14+']);
  for (const t of GENERAUX) assert.deepEqual(A.tranchesDuTheme(t), ['5-6', '7-8', '9-10', '11-12', '13+']);
  assert.deepEqual(A.tranchesDuTheme('maths'), []);
  assert.equal(A.systemeDe('inconnu'), null);
});
test('les données réelles n’utilisent que des tranches valables pour leur thème', () => {
  const mauvaises = DATA.questions.filter(q => !A.trancheValidePour(q.t, q.a));
  assert.equal(mauvaises.length, 0, mauvaises.slice(0, 5).map(q => q.id).join(', '));
  assert.equal(DATA.questions.filter(q => q.t === 'maths' && q.a == null).length, 338);
});

// ---------- Âge réel → tranches ----------
const ATTENDU = {
  5: ['5-6', ['5-8']], 6: ['5-6', ['5-8']], 7: ['7-8', ['5-8']], 8: ['7-8', ['5-8', '8-10']], 9: ['9-10', ['8-10']],
  10: ['9-10', ['8-10', '10-12']], 11: ['11-12', ['10-12']], 12: ['11-12', ['10-12', '12-14']], 13: ['13+', ['12-14']],
  14: ['13+', ['12-14', '14+']], 15: ['13+', ['14+']], 18: ['13+', ['14+']], 60: ['13+', ['14+']],
};
for (const [age, [gen, rel]] of Object.entries(ATTENDU)) {
  test(`${age>=18?'joueur de':'enfant de'} ${age} ans (profil enfant) : générale ${gen}, religion ${rel.join(' + ')}`, () => {
    for (const t of GENERAUX) assert.deepEqual(A.tranchesPourJoueur(t, enfant(+age)), [gen]);
    assert.deepEqual(A.tranchesPourJoueur('religion', enfant(+age)), rel);
  });
}
test('adultes : les deux tranches les plus hautes, sans plafond d’âge (règle existante conservée)', () => {
  for (const lvl of ['standard', 'avance', 'decouverte']) {
    assert.deepEqual(new Set(A.tranchesPourJoueur('religion', adulte(lvl))), new Set(['12-14', '14+']));
    assert.deepEqual(new Set(A.tranchesPourJoueur('sciences', adulte(lvl))), new Set(['11-12', '13+']));
  }
  assert.deepEqual(A.niveauxMaths(adulte()), [4, 5]);
  assert.deepEqual(A.niveauxMaths(adulte('decouverte')), [3, 4]);
});
test('maths : choix par niveau selon l’âge (règle existante inchangée)', () => {
  const att = { 5: [1], 6: [1], 7: [1, 2], 8: [1, 2], 9: [2, 3], 10: [2, 3], 11: [3, 4], 12: [3, 4], 13: [4, 5], 15: [4, 5] };
  for (const [a, d] of Object.entries(att)) assert.deepEqual(A.niveauxMaths(enfant(+a)), d);
  const pool = A.questionsEligibles(DATA.questions, 'maths', enfant(8));
  assert.ok(pool.length > 0 && pool.every(q => [1, 2].includes(q.d)));
});

// ---------- Non-régression sur les 1 764 questions ----------
test('non-régression : thèmes généraux identiques à avant, religion = avant + tranche voisine aux âges charnières', () => {
  for (let age = 5; age <= 17; age++) {
    const p = enfant(age);
    for (const t of GENERAUX) assert.deepEqual(A.tranchesPourJoueur(t, p), ancienneTranche(t, p), `${t} ${age} ans`);
    const avant = new Set(ancienneTranche('religion', p)), apres = new Set(A.tranchesPourJoueur('religion', p));
    for (const b of avant) assert.ok(apres.has(b), `religion ${age} ans perd ${b}`);
  }
});
test('chaque âge (5 → 17 ans, adultes) a des questions dans chaque thème', () => {
  const joueurs = [...Array.from({ length: 13 }, (_, i) => enfant(i + 5)), adulte(), adulte('decouverte')];
  for (const p of joueurs) for (const t of A.THEMES) assert.ok(A.questionsEligibles(DATA.questions, t, p).length > 0, `${t} ${p.child ? p.age + ' ans' : 'adulte'}`);
});
test('âges charnières en religion : la difficulté moyenne reste proche du niveau de départ', () => {
  const M = moteur(DATA);
  for (const age of [8, 10, 12, 14]) {
    const p = enfant(age), lvl = M.startLevel(p), pool = M.poolFor(p, 'religion');
    const w = pool.map(q => 1 / (1 + Math.abs(q.d - lvl) * 1.5)), tot = w.reduce((a, b) => a + b, 0);
    const moy = pool.reduce((s, q, i) => s + q.d * w[i], 0) / tot;
    // la tranche voisine ne représente qu'une part minoritaire du tirage, et la moyenne reste à moins d'un niveau
    assert.ok(Math.abs(moy - lvl) <= 1, `${age} ans : niveau ${lvl}, moyenne ${moy.toFixed(2)}`);
    console.log(`  religion ${age} ans : niveau de départ ${lvl}, difficulté moyenne attendue ${moy.toFixed(2)} sur ${pool.length} questions`);
  }
});

// ---------- Moteur réel : cas particuliers ----------
test('moteur : chaque question tirée est dans les tranches du joueur (300 tirages par âge et par thème)', () => {
  for (const p of [enfant(6), enfant(8), enfant(10), enfant(12), enfant(14), enfant(16), adulte()]) {
    const M = moteur(DATA);
    for (const t of ['religion', 'geography', 'sciences']) {
      const ok = new Set(A.tranchesPourJoueur(t, p));
      for (let k = 0; k < 300; k++) { const q = M.selectQuestion(p, t); assert.ok(q && q.t === t && ok.has(q.a), `${t} ${p.age} → ${q && q.a}`); }
    }
  }
});
test('toutes les questions adaptées déjà vues : le cycle recommence, sans sortir de la tranche', () => {
  const p = enfant(7), ids = A.questionsEligibles(DATA.questions, 'logic', p).map(q => q.id);
  const M = moteur(DATA, { seen: { e7: [...ids] } });
  for (let k = 0; k < 50; k++) assert.equal(M.selectQuestion(p, 'logic').a, '7-8');
});
test('un thème sans aucune question adaptée est sauté (pas de question d’une autre tranche)', () => {
  const data = { ...DATA, questions: DATA.questions.filter(q => !(q.t === 'religion' && q.a === '5-8')) };
  const M = moteur(data), p = enfant(6);
  assert.equal(M.poolFor(p, 'religion').length, 0);
  assert.equal(M.selectQuestion(p, 'religion'), null);
  const vus = Array.from({ length: 12 }, () => M.nextTheme(p));
  assert.ok(!vus.includes('religion') && vus.includes('maths') && vus.includes('logic'));
  // un enfant de 8 ans garde la religion grâce à la tranche 8-10
  assert.ok(M.poolFor(enfant(8), 'religion').length > 0);
});
test('question dépubliée (absente des données du jeu) : jamais proposée', () => {
  const retiree = DATA.questions.find(q => q.t === 'sciences' && q.a === '9-10');
  const data = { ...DATA, questions: DATA.questions.filter(q => q !== retiree) };
  const M = moteur(data);
  for (let k = 0; k < 400; k++) assert.notEqual(M.selectQuestion(enfant(9), 'sciences')?.id, retiree.id);
});
test('âge absent, tranche inconnue ou mal écrite : la question n’est pas proposée, une écriture voisine est reconnue', () => {
  const base = DATA.questions.filter(q => q.t === 'geography').slice(0, 3);
  const qs = [{ ...base[0], id: 'X1', a: null }, { ...base[1], id: 'X2', a: '7 à 8' }, { ...base[2], id: 'X3', a: '7–8 ans' }];
  const pool = A.questionsEligibles(qs, 'geography', enfant(8));
  assert.deepEqual(pool.map(q => q.id), ['X3']);
  assert.equal(A.normaliserTranche('13 +'), '13+');
  assert.equal(A.normaliserTranche('n’importe quoi'), null);
});
test('un joueur qui change d’âge change de tranches ; joueurs d’âges différents dans la même partie', () => {
  const p = enfant(7); assert.deepEqual(A.tranchesPourJoueur('sciences', p), ['7-8']);
  p.age = 9; assert.deepEqual(A.tranchesPourJoueur('sciences', p), ['9-10']);
  const M = moteur(DATA), petit = enfant(6), grand = enfant(13), papa = adulte();
  for (let k = 0; k < 60; k++) {
    assert.equal(M.selectQuestion(petit, 'geography').a, '5-6');
    assert.equal(M.selectQuestion(grand, 'geography').a, '13+');
    assert.ok(['13+', '11-12'].includes(M.selectQuestion(papa, 'geography').a));
  }
});
test('partie mélangeant Religion, Sciences et Histoire-Géo : rotation normale, tranches respectées', () => {
  const M = moteur(DATA), p = enfant(10); const ordre = [];
  for (let k = 0; k < 12; k++) { const t = M.nextTheme(p); ordre.push(t); const q = M.selectQuestion(p, t); assert.ok(q);
    if (t !== 'maths') assert.ok(A.tranchesPourJoueur(t, p).includes(q.a)); }
  assert.deepEqual(ordre.slice(0, 6), ['religion', 'maths', 'geography', 'sciences', 'logic', 'management']);
});

// ---------- Tableau de bord : filtres ----------
const Q = [
  { id: 'R1', t: 'religion', a: '10-12', statut: 'publiee', q: { fr: 'Prière' }, r: { fr: '' } },
  { id: 'R2', t: 'religion', a: '5-8', statut: 'brouillon', q: { fr: 'Prophète' }, r: { fr: '' } },
  { id: 'S1', t: 'sciences', a: '11-12', statut: 'publiee', q: { fr: 'Planète' }, r: { fr: '' } },
  { id: 'S2', t: 'sciences', a: '9-10', statut: 'archivee', q: { fr: 'Prisme' }, r: { fr: '' } },
  { id: 'G1', t: 'geography', a: '11-12', statut: 'publiee', q: { fr: 'Pérou' }, r: { fr: '' } },
  { id: 'M1', t: 'maths', a: null, statut: 'publiee', q: { fr: 'Calcul' }, r: { fr: '' } },
];
const ids = (l) => l.map(q => q.id);
test('filtre Religion : seulement les tranches religion', () => {
  const g = A.optionsFiltreAge('religion'); assert.equal(g.length, 1);
  assert.deepEqual(g[0].options.map(o => o.value), ['religion:5-8', 'religion:8-10', 'religion:10-12', 'religion:12-14', 'religion:14+']);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { theme: 'religion', age: 'religion:10-12' })), ['R1']);
});
test('filtre Sciences : seulement les tranches générales', () => {
  assert.deepEqual(A.optionsFiltreAge('sciences')[0].options.map(o => o.value), ['generale:5-6', 'generale:7-8', 'generale:9-10', 'generale:11-12', 'generale:13+']);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { theme: 'sciences', age: 'generale:11-12' })), ['S1']);
  assert.deepEqual(A.optionsFiltreAge('maths'), []);
});
test('Tous les thèmes : deux groupes séparés, sans ambiguïté entre classifications', () => {
  const g = A.optionsFiltreAge(''); assert.deepEqual(g.map(x => x.label), ['Âges généraux', 'Âges religion']);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { age: 'generale:11-12' })), ['S1', 'G1']);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { age: 'religion:10-12' })), ['R1']);
  const toutes = g.flatMap(x => x.options.map(o => o.value)); assert.equal(new Set(toutes).size, toutes.length);
});
test('changement de thème après un âge : retour à « Tous les âges » si la tranche n’existe plus', () => {
  assert.equal(A.filtreAgeCompatible('sciences', 'religion:10-12'), false);
  assert.equal(A.filtreAgeCompatible('', 'religion:10-12'), true);
  assert.equal(A.filtreAgeCompatible('geography', 'generale:11-12'), true);
  assert.equal(A.filtreAgeCompatible('maths', 'generale:11-12'), false);
});
test('combinaison âge + thème + statut + recherche', () => {
  assert.deepEqual(ids(A.filtrerQuestions(Q, { theme: 'sciences', age: 'generale:9-10', statut: 'archivee', recherche: 'pris' })), ['S2']);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { theme: 'sciences', age: 'generale:9-10', statut: 'publiee' })), []);
  assert.deepEqual(ids(A.filtrerQuestions(Q, { statut: 'publiee', recherche: 'p' })), ['R1', 'S1', 'G1']);
});

// ---------- Création / modification (validation serveur) ----------
const base = { q: { fr: 'Question ?' }, r: { fr: 'Réponse.' }, d: 2 };
test('création d’une question religieuse : tranche religion obligatoire, publication avec source + explications FR et AR', () => {
  assert.match(verifierQuestion({ ...base, t: 'religion', a: '7-8', statut: 'brouillon' }).erreur, /Tranche/);
  assert.ok(verifierQuestion({ ...base, t: 'religion', a: '5-8', statut: 'brouillon' }).question);
  assert.match(verifierQuestion({ ...base, t: 'religion', a: '5-8', statut: 'publiee' }).erreur, /source/);
  const ok = verifierQuestion({ ...base, t: 'religion', a: '5-8', statut: 'publiee', s: 'Livre — Auteur', e: { fr: 'Expl.', ar: 'شرح' } });
  assert.equal(ok.question.statut, 'publiee'); assert.equal(ok.question.a, '5-8');
});
test('modification d’une question générale : identifiant, traductions et champs conservés', () => {
  const v = verifierQuestion({ ...base, id: 'SCI-910-031', t: 'sciences', a: '9–10', statut: 'publiee', q: { fr: 'Q ?', ar: 'س؟', en: 'Q?' }, r: { fr: 'R', en: 'A' }, e: { fr: 'E', en: 'Ex' }, src: 'v2', poids: 2, prio: true });
  const q = v.question;
  assert.equal(q.id, 'SCI-910-031'); assert.equal(q.a, '9-10');
  assert.deepEqual(q.q, { fr: 'Q ?', ar: 'س؟', en: 'Q?' }); assert.deepEqual(q.r, { fr: 'R', en: 'A' }); assert.deepEqual(q.e, { fr: 'E', en: 'Ex' });
  assert.equal(q.src, 'v2'); assert.equal(q.poids, 2); assert.equal(q.prio, true); assert.equal(q.d, 2);
});
test('changement de catégorie : une tranche incompatible est refusée, jamais enregistrée en silence', () => {
  assert.match(verifierQuestion({ ...base, id: 'R1', t: 'sciences', a: '10-12' }).erreur, /Tranche/);   // religion → sciences
  assert.match(verifierQuestion({ ...base, id: 'S1', t: 'religion', a: '11-12' }).erreur, /Tranche/);   // sciences → religion
  assert.equal(verifierQuestion({ ...base, id: 'S1', t: 'maths', a: '11-12' }).question.a, null);       // maths : pas de tranche
  assert.ok(verifierQuestion({ ...base, id: 'S1', t: 'religion', a: '10-12' }).question);
});
