# 0030 — Validation humaine des six banques Religion, portée par les données

**Statut** : acceptée (décision du propriétaire du projet, 2026-09-04)

## Contexte
Les six banques religieuses (Oussoul ath-Thalatha, Wa Ja'a Shahr Ramadan,
Ad-Durous al-Muhimmah, Sirah al-Urjuzah, Al-Qawaid al-Arba, Kalimah at-Tawhid ;
375 cartes) ont été importées `draft`, revues humainement, corrigées par la
couche `corrections.v1.json`, et l'arabe des 23 cartes bloquées a été vérifié
caractère par caractère contre les documents sources originaux. Le propriétaire
valide les banques dans cet état. Il faut que ce passage à `validated` :
n'invente ni ne modifie aucun contenu, reste soumis aux gardes existantes,
et survive à tout réimport (les importeurs écrivent toujours `draft`).

## Décision
- **Le statut reste le mécanisme unique** : `status = validated` dans la
  donnée de la banque, contrôlé par le schéma (`curatedBankSchema` refuse une
  carte validée sans explication arabe) et par la garde de jouabilité
  (`playabilityIssues` : validée, FR + AR, source obligatoire pour la
  religion). Aucun drapeau, aucun contournement, aucun nouveau champ.
- **La décision humaine est une donnée** : `validation.v1.json` liste les
  375 identifiants validés, la date et la décision. `apply-corrections.mjs`
  l'applique après les corrections, à chaque réimport : une carte listée
  passe à `validated` si elle franchit la garde (FR + AR présents, au moins
  une source, aucune `reviewNotes`), sinon l'application ÉCHOUE. Une carte
  absente de la liste reste dans le statut de l'import. Un réimport ne fait
  donc jamais perdre une validation, et ne valide jamais rien de nouveau.
- **Conséquences dans le jeu** : la catégorie Religion est désormais servie
  par le registre selon l'audience, l'âge et le niveau (Learning Engine
  inchangé) ; les défis CH-094 à CH-097, qui référencent une question
  Religion validée, deviennent éligibles quand leurs autres conditions sont
  remplies (`contentAvailable` calculé depuis le registre, comme avant).
  Banque de sourates, autres catégories et Learning Engine : inchangés.

## Tests
`tests/unit/content/validation.test.ts` : liste = exactement les 375 cartes
des six banques ; 375 validées / 0 brouillon ; FR, AR, sources, aucune note ;
servies pour enfant et adulte sur les cinq niveaux ; réimport simulé (banque
remise en `draft`) qui retrouve ses validations, carte hors liste qui reste
`draft`, carte listée sans arabe / sans source / annotée qui fait échouer
l'application.
