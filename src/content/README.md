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
- `questions/religion/sirah-al-urjuzah.v1.json` — banque « Sirah — al-Urjūzah
  al-Miʾiyyah » (Sharḥ al-Urjūzah al-Miʾiyyah fī Dhikr Ḥāl Ashraf al-Bariyyah,
  commentaire de Shaykh ʿAbd ar-Razzāq ibn ʿAbd al-Muḥsin al-Badr sur le matn
  d'Ibn Abī al-ʿIzz al-Ḥanafī), 100 cartes en 5 niveaux importées depuis le
  PDF de contrôle par le même script, toutes `draft`. Les sources portent un
  `locator` (« Matn, vers 3-4 ») en plus de la page. L'extraction PDF coupe
  l'arabe : seuls les cas simples sont recollés (signalés à relire) ; les
  autres explications arabes sont laissées **vides** avec `reviewNotes`, à
  saisir depuis le document de contrôle (un DOCX donnerait l'arabe intact).
- `questions/religion/al-qawaid-al-arba.v1.json` — banque « Al-Qawāʿid
  al-Arbaʿ » (Sharḥ al-Qawāʿid al-Arbaʿ, Shaykh ʿAbd ar-Razzāq ibn ʿAbd
  al-Muḥsin al-Badr, Dār al-Imām Muslim, 1441 H / 2020), 25 cartes en
  5 niveaux, mêmes règles, toutes `draft`. Cinq explications arabes ont perdu
  un signe diacritique à l'extraction : la jonction est annotée dans
  `reviewNotes`, à rétablir en relecture.
- `questions/religion/kalimah-at-tawhid.v1.json` — banque « Kalimah
  at-Tawḥīd » (Kalimah at-Tawhid : Lā ilāha illā Allāh, ses mérites, son sens,
  ses conditions et ses annulatifs, Shaykh ʿAbd ar-Razzāq ibn ʿAbd al-Muḥsin
  al-Badr), 25 cartes en 5 niveaux, mêmes règles, toutes `draft`. Les sources
  portent le thème du chapitre en `locator`. Arabe du PDF très abîmé : huit
  explications laissées vides avec `reviewNotes`, onze recollées à relire.

- `challenges/family-challenges.v1.json` — banque canonique V1 des **Défis
  famille** (100 défis, importés du PDF de conception par
  `scripts/content/import-defis.mjs`). Données pures : catégorie, âge minimal,
  gain, texte, adaptation et variantes d'âge, drapeaux OH NON / boss / contact,
  clé d'animation, référence de contenu validé (défis religieux : aucun texte
  religieux, jamais servis sans contenu validé), résultats économiques réels
  des défis solidaires. Sélection déterministe cachée (ADR 0027).

- `religion/quran/surah-bank.v1.json` — **références de récitation
  uniquement** (38 sourates : identifiant, numéro, nom FR/AR, niveau de jeu).
  Aucun verset stocké, affiché ni généré ; schéma strict ; validation orale par
  la tablée (ADR 0028).

Règles : explication FR **et** AR obligatoires pour toute question jouable ;
`status = validated` obligatoire ; source primaire obligatoire si la catégorie
l'exige (`requiresSource`). Voir `docs/decisions/0004`, `0020`, `0022`.
