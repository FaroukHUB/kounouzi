// Tests des événements (fiche, dates, import de questions et de défis). Lancer : node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chevauchements, evenementDuJour, lignesQuestions, themeDe, verifierDefi, verifierEvenement } from '../api/_evenements.js';

const base = { id: 'ramadan-2027', nom: 'Ramadan 2027', debut: '2027-02-08', fin: '2027-03-09' };

test('fiche : identifiant, dates et ordre des dates vérifiés', () => {
  assert.ok(verifierEvenement(base).evenement);
  assert.match(verifierEvenement({ ...base, id: 'Ramadan 2027' }).erreur, /Identifiant/);
  assert.match(verifierEvenement({ ...base, fin: '2027-02-01' }).erreur, /après/);
  assert.match(verifierEvenement({ ...base, debut: '' }).erreur, /dates/);
  assert.match(verifierEvenement({ ...base, plateau: 'pas-une-image' }).erreur, /Image/);
});

test('événement du jour : bornes incluses, inactif ignoré, chevauchement repéré', () => {
  const L = [{ ...base, actif: true }, { id: 'aid-2027', nom: 'Aïd', debut: '2027-03-10', fin: '2027-03-12', actif: true }];
  assert.equal(evenementDuJour(L, '2027-02-08').id, 'ramadan-2027');
  assert.equal(evenementDuJour(L, '2027-03-09').id, 'ramadan-2027');
  assert.equal(evenementDuJour(L, '2027-03-10').id, 'aid-2027');
  assert.equal(evenementDuJour(L, '2027-03-13'), null);
  assert.equal(evenementDuJour([{ ...base, actif: false }], '2027-02-10'), null);
  assert.deepEqual(chevauchements(L), []);
  assert.equal(chevauchements([...L, { id: 'x', nom: 'x', debut: '2027-03-01', fin: '2027-03-02', actif: true }]).length, 1);
});

test('import de questions : format de l’export accepté, id stable sans doublon', () => {
  const l = { theme: 'Maths & logique', tranche_age: null, niveau: 2, question: 'Combien de jours dure le mois ?', reponse: '29 ou 30' };
  const [a] = lignesQuestions([l], { ev: 'ramadan-2027' }), [b] = lignesQuestions([l], { ev: 'ramadan-2027' });
  assert.equal(a.question.t, 'maths'); assert.equal(a.question.id, b.question.id); assert.match(a.question.id, /^RAMADAN2027-/);
  assert.equal(a.question.statut, 'brouillon');
  assert.equal(lignesQuestions([{ ...l, id: 'MATH-001-0' }])[0].question.id, 'MATH-001-0');
  assert.equal(themeDe('Histoire des prophètes'), 'geography'); assert.equal(themeDe('inconnu'), null);
});

test('import de défis : titre et texte obligatoires, valeurs bornées, rattaché à l’événement', () => {
  assert.match(verifierDefi({ ti: 'Sans texte' }, { ev: 'ramadan-2027' }).erreur, /obligatoires/);
  const { defi } = verifierDefi({ ti: 'Les dattes', tx: 'Prépare des dattes pour la famille.', rw: 500, min: 1, v: [{ ageMin: 5, text: '3 dattes' }] }, { ev: 'ramadan-2027', index: 0 });
  assert.equal(defi.id, 'ramadan-2027-d01'); assert.equal(defi.ev, 'ramadan-2027');
  assert.equal(defi.defi.rw, 100); assert.equal(defi.defi.min, 3); assert.equal(defi.defi.cat, 'evenement'); assert.equal(defi.defi.v[0].text, '3 dattes');
});
