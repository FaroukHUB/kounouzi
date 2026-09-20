# 0041 — Retrait de 13 Défis famille, sans remplacement ni renumérotation

**Statut** : acceptée (décision produit, 2026-09-20) — modifie la banque de
l'ADR 0027, dont la décision de conception reste valable

## Contexte
La banque des Défis famille comptait les 100 défis du PDF de conception
(ADR 0027). L'auteur en retire 13 après relecture :

| Retirés | Catégorie |
| --- | --- |
| CH-003, CH-011, CH-013, CH-015 | mouvement |
| CH-047 | famille |
| CH-077, CH-078 | géographie |
| CH-082, CH-083 | maths |
| CH-094, CH-095, CH-096, CH-097 | religion |

## Décision

### 1. Retrait sec : ni remplacement, ni renumérotation
La banque passe de 100 à **87 défis**. Les identifiants restants ne bougent
pas : `CH-002` est suivi de `CH-004`, et les trous sont assumés. Un
identifiant désigne toujours le même défi, dans une sauvegarde comme dans une
mémoire pédagogique déjà écrite — renuméroter ferait pointer d'anciennes
données vers un autre défi. Un test vérifie la liste exacte des identifiants
restants.

### 2. Un réimport ne peut plus les ressusciter
Le script `scripts/content/import-defis.mjs` régénère la banque depuis le
texte du PDF : sans garde-fou, le prochain import ramènerait les 13. Il porte
donc désormais un `REMOVED_IDS`, décision de données au même titre que
`CONSENT_IDS`, et leurs `contentRef` devenues sans objet sont supprimées.
C'est le principe déjà retenu pour les banques religieuses (ADR 0030) : un
réimport ne doit jamais défaire une décision humaine.

### 3. Deux catégories tombent à zéro, et restent déclarées
`geography` et `maths` n'ont plus aucun défi. Elles restent dans
`CHALLENGE_CATEGORIES` et dans l'interrupteur parent `memoryLogic` : ce sont
des mécaniques, pas du contenu, et une catégorie sans carte ne sert
simplement rien — exactement comme une catégorie de Savoir sans contenu
validé. Rien n'est retiré du moteur ni des réglages parents.

### 4. Plus aucun défi ne demande de question religieuse
CH-094 à CH-097 étaient les seuls défis à `contentRef` de type
`validated_question` sur la catégorie Religion. Les trois défis religieux
restants (CH-091, CH-092, CH-093) sont des **récitations**, dont
l'éligibilité se décide par joueur dans le moteur et qui n'apparaissent donc
jamais dans `contentAvailable`. Celui-ci se réduit à `["CH-099", "CH-100"]`,
les deux boss « savoir » à catégorie libre.

Le mécanisme, lui, est intact : un défi porteur d'une contrainte de catégorie
demande toujours une question validée de cette catégorie, la refuse si elle
ne correspond pas, et la fige dans l'état. Deux tests le poussent désormais
avec une **définition de test** au lieu d'une carte de la banque — la banque
n'en contient plus — contre le registre réel et ses banques religieuses
validées.

## Conséquences
- 87 défis servis ; les répartitions par catégorie, le nombre de « OH NON »
  (25), les 9 boss et les 3 défis à consentement sont mis à jour dans les
  tests.
- Plus aucun défi ne mentionne de pompes : le test qui vérifiait que CH-011
  était réservé aux 10 ans et plus vérifie maintenant l'absence totale.
- Les ADR 0027, 0030 et 0032 mentionnent des défis retirés. Ils ne sont pas
  réécrits : une décision datée reste ce qu'elle était, et le présent ADR est
  le seul endroit où lire l'état courant.
