# Modèle de banque de questions — document de contrôle

Ce modèle sert à préparer **20 à 30 questions par matière et par niveau**
(maths, géographie, histoire, arabe, logique, gestion, culture…). Le même
format est déjà utilisé pour les banques religieuses. Un DOCX est préférable
à un PDF : le texte arabe y reste intact à l'import.

Import : `node scripts/content/import-durous.mjs <texte.txt> <sortie.json> <nœud> <préfixe-id>`
(le texte est extrait du DOCX paragraphe par paragraphe). La catégorie est le
premier segment du nœud : `maths.calcul` → maths, `geographie.capitales` →
geography (identifiants de catégorie : `religion`, `maths`, `geography`,
`history`, `arabic`, `logic`, `management`, `culture`).

## Structure du document

```
NIVEAU 1
Public indicatif : 5-8 ans - 20 cartes
1.01 - Titre court de la carte
QUESTION : L'énoncé, en une ou deux phrases.
A. Premier choix
B. Deuxième choix
C. Troisième choix
RÉPONSE : A. Premier choix.
Explication FR : Une phrase courte qui explique la réponse.
الشرح بالعربية: جملة قصيرة تشرح الجواب.
Source : Manuel ou programme - Auteur, PDF p. 12.
Animation suggérée : Une description visuelle libre (facultative).

1.02 - …
```

Puis `NIVEAU 2` … `NIVEAU 5` avec leurs publics indicatifs (8-10, 10-12,
12-14, 14 ans+ / adultes). Les niveaux sont une difficulté de jeu.

## Règles

- **Question et réponse en français** ; les choix `A.` `B.` `C.` (2 à 4) ou
  `Vrai / Faux` sont facultatifs. Une réponse « A. » seule est remplacée à
  l'import par le texte du choix A.
- **Explication FR et explication AR obligatoires** pour qu'une carte puisse
  être jouée (règle Kounouzi : les deux langues, toujours). La ligne arabe
  commence par `الشرح بالعربية:`.
- **Source** : obligatoire pour la religion (ouvrage, auteur, pages),
  facultative ailleurs (un manuel, un programme, une page). Jamais d'URL
  inventée.
- **Animation suggérée** : facultative ; purement visuelle, jamais de visage ni
  de personne représentée, aucune influence sur le jeu.
- Le livre ou le manuel n'est jamais le sujet de la question (« dans le
  texte… » est signalé à l'import pour reformulation).
- Toute carte importée est en **brouillon** (`draft`) jusqu'à validation
  humaine explicite ; seules les cartes validées sont servies aux joueurs.

## Ce que fait l'import

Il découpe le document, conserve tout tel quel (aucune reformulation, aucun
contenu ajouté), déduit une famille d'animation à partir de la suggestion,
génère les identifiants (`<préfixe>-L<niveau>-<numéro>`) et signale dans
`reviewNotes` ce qui demande une relecture. Une banque d'une nouvelle matière
doit ensuite être enregistrée dans `src/config/content` (une ligne) pour
entrer dans le registre.
