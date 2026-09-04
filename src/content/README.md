# `src/content` — données de contenu

- `geo/countries.demo.v1.json` — catalogue factuel de **démonstration** (pays,
  capitale, continent, noms FR/AR, difficulté de base), entièrement
  `status = unverified` : servi uniquement si `DEMO_CONTENT_ENABLED`. Un fait
  passe à `validated` (avec `verifiedAt` et sources) après vérification humaine,
  jamais par un drapeau. Une donnée validée → plusieurs questions par gabarit.
- `questions/curated.v1.json` — banque curée (histoire, arabe, logique, gestion,
  culture). Jamais de contenu religieux inventé, jamais d'URL fictive.
- `questions/religion/oussoul-ath-thalatha.v1.json` — banque religieuse
  « Oussoul ath-Thalatha » (source de fond : Sharh Thalathat al-Usul, Shaykh
  Salih Al ash-Shaykh), 100 cartes en 5 niveaux importées depuis le PDF de
  contrôle humain par `scripts/content/import-oussoul.mjs`. **Toutes `draft`**
  tant qu'elles ne sont pas explicitement passées à `validated` après relecture ;
  seules les cartes validées sont jouables. Le livre reste derrière le rideau :
  il n'est cité que comme source sous la réponse. `animationKey` et `title`
  sont de la présentation pure (aucune influence sur le jeu).
- `questions/religion/wa-jaa-shahr-ramadan.v1.json` — banque « Wa Ja'a Shahr
  Ramadan » (Shaykh Abd ar-Razzaq ibn Abd al-Muhsin al-Badr, Dar al-Fadhila,
  2014), 25 cartes en 5 niveaux, mêmes règles, toutes `draft`.
- `questions/religion/ad-durous-al-mouhimmah.v1.json` — banque « Ad-Durous
  al-Muhimmah » (Sharḥ ad-Durūs al-Muhimmah li-ʿĀmmat al-Ummah, commentaire de
  Shaykh ʿAbd ar-Razzāq al-Badr sur le texte de Shaykh ʿAbd al-ʿAzīz ibn Bāz),
  100 cartes en 5 niveaux importées depuis le document de contrôle (DOCX) par
  `scripts/content/import-durous.mjs`, toutes `draft`. `animationHint` est la
  suggestion visuelle libre de l'auteur ; `animationKey` en est déduite par
  mots-clés (présentation pure). Une réponse « A. » est remplacée par le texte
  du choix A, tel quel. Les énoncés qui laissent voir le texte ou le
  commentaire portent une `reviewNotes` : à reformuler en relecture, jamais
  par le code.

Règles : explication FR **et** AR obligatoires pour toute question jouable ;
`status = validated` obligatoire ; source primaire obligatoire si la catégorie
l'exige (`requiresSource`). Voir `docs/decisions/0004`, `0020`, `0022`.
