# Contenu des guides Kounouzi (FR / EN). Chaque guide cible une recherche précise.
# Faits vérifiés dans le jeu (V39, 7 nov. 2026) : 1 959 questions (religion 373, invocations 206, histoire des prophètes 358, maths et logique 569, gestion 250, sciences 203). Ancien : (religion 375, invocations 214, histoire des prophètes 375 = 75 récits × 5 niveaux, maths et logique 587, gestion 250, sciences 212),
# 84 défis famille, 28 cases, 12 établissements, 2 à 6 joueurs, parties de 30/45/60 min ou libres, déplacement par « le Chemin »
# (suite fixe, la même pour tous), voix + 4 courts effets désactivables, Zakat 2,5 % après un tour de table et demi au-dessus de 1 000 K.

GUIDES = [
 {
  'id': 'halal',
  'fr': {
   'slug': 'jeu-de-societe-valeurs-islamiques',
   'title': "Un jeu de société fidèle à nos valeurs, sans dés ni musique",
   'desc': "Un jeu de société familial en accord avec nos valeurs : sans dés, sans hasard, sans musique, sans riba ni publicité. Découvrez comment il a été pensé.",
   'kick': "Fidèle à nos valeurs", 'h1': "Enfin un jeu de société <em>fidèle à nos valeurs</em>, pour toute la famille",
   'lead': "Pas de dés, pas de hasard, pas de musique, pas de publicité. Kounouzi a été pensé dès le départ en accord avec nos principes, pour que chaque famille puisse jouer l'esprit tranquille et apprendre en s'amusant.",
   'sections': [
    ("Pourquoi tant de parents cherchent un jeu fidèle à leurs valeurs", [
      "Beaucoup de jeux de plateau classiques reposent sur les dés et la chance, mettent en avant la spéculation ou l'argent gagné sans effort, et s'accompagnent de musique ou de publicités. Pour une famille musulmane, ce n'est pas toujours l'ambiance que l'on veut installer autour de la table.",
      "Kounouzi part de l'idée inverse : un vrai jeu de plateau, avec du suspense et des décisions, mais où chaque mécanique a été choisie dans le respect des principes islamiques."]),
    ("Ce qui rend Kounouzi fidèle à nos valeurs, concrètement", [
      ("ul", [
        "<b>Sans dés et sans hasard pour avancer</b> : le nombre de cases est donné par le Chemin, une suite équitable et identique pour tous les joueurs. Personne ne gagne grâce à la chance.",
        "<b>Sans musique</b> : seulement une voix chaleureuse qui lit les questions et annonce les cases, et quelques petits effets (applaudissements, pièces) que l'on peut couper en un geste.",
        "<b>Sans riba</b> : on n'apprend jamais à prêter avec intérêt. On apprend à épargner, à acheter avec mesure, à donner à la Caisse Masākīn et à verser la Zakat.",
        "<b>Sans publicité, sans achat intégré</b>, sans discussion avec des inconnus : un seul paiement, et l'écran reste entre vous.",
        "<b>Contenu religieux sourcé</b> : les questions de religion suivent le Coran et la Sunnah, et sont tirées uniquement de <a href='/sources-religion/'>nos 7 livres de référence</a>, sans rien y ajouter. Une relecture complète se poursuit en continu."])]),
    ("Un jeu qui valorise la générosité, pas la richesse", [
      "Dans Kounouzi, le score final additionne les Kounouz, le patrimoine et les points Hassanāt gagnés en donnant ou en aidant les autres. Un joueur généreux peut donc gagner même avec moins d'argent : c'est souvent le moment préféré des parents pour en parler avec leurs enfants.",
      "Les Hassanāt sont des points de jeu : ils servent à ouvrir la discussion sur la générosité, ce ne sont pas des récompenses spirituelles."]),
    ("Pour qui ?", [
      "Pour les familles avec des enfants dès 5 ans, les grands-parents, les écoles coraniques et les associations. De 2 à 6 joueurs sur un seul écran : téléphone, tablette ou ordinateur."]),
   ],
   'faq': [("Kounouzi a-t-il une certification religieuse ?", "Non : Kounouzi a été conçu dans le respect des principes islamiques (sans dés ni hasard pour avancer, sans musique, sans riba, sans publicité). Chaque famille reste juge de ce qui lui convient."),
           ("Peut-on couper tous les sons ?", "Oui. La voix et les petits effets se désactivent dans les réglages du jeu.")],
  },
  'en': {
   'slug': 'board-game-islamic-values',
   'title': "A board game true to our values: no dice, no music | Kounouzi",
   'desc': "A family board game in line with our values: no dice, no luck, no music, no riba and no ads. Discover how Kounouzi was designed.",
   'kick': "True to our values", 'h1': "Finally, a board game <em>true to our values</em>, for the whole family",
   'lead': "No dice, no luck, no music, no ads. Kounouzi was designed from day one in line with our principles, so every family can play with peace of mind and learn while having fun.",
   'sections': [
    ("Why so many parents look for a game true to their values", [
      "Many classic board games rely on dice and luck, celebrate speculation or easy money, and come with music or ads. For a Muslim family, that is not always the atmosphere you want around the table.",
      "Kounouzi starts from the opposite idea: a real board game, with suspense and decisions, where every mechanic was chosen with respect for Islamic principles."]),
    ("What makes Kounouzi true to our values, in practice", [
      ("ul", [
        "<b>No dice and no luck to move</b>: the number of squares comes from the Path, a fair sequence that is the same for every player. Nobody wins thanks to chance.",
        "<b>No music</b>: only a warm voice that reads the questions and announces the squares, plus a few short effects (cheering, coins) you can switch off in one tap.",
        "<b>No riba</b>: children never learn to lend with interest. They learn to save, to buy wisely, to give to the Masākīn Fund and to pay Zakat.",
        "<b>No ads, no in-app purchases</b>, no chatting with strangers: one payment, and the screen stays within your family.",
        "<b>Sourced religious content</b>: religion questions follow the Qur'an and the Sunnah, and are taken only from <a href='/en/religion-sources/'>our 7 reference books</a>, with nothing added. A full review is ongoing."])]),
    ("A game that rewards generosity, not wealth", [
      "In Kounouzi, the final score adds up Kounouz, properties and Hassanāt points earned by giving or helping others. A generous player can win with less money, which is often the parents' favourite moment to talk about it with their children.",
      "Hassanāt are game points: they open the conversation about generosity; they are not spiritual rewards."]),
    ("Who is it for?", [
      "For families with children from age 5, grandparents, Qur'an schools and community groups. 2 to 6 players on a single screen: phone, tablet or computer."]),
   ],
   'faq': [("Does Kounouzi have a religious certification?", "No: Kounouzi was designed with respect for Islamic principles (no dice or luck to move, no music, no riba, no ads). Each family remains the judge of what suits them."),
           ("Can all sounds be switched off?", "Yes. The voice and the short effects can be turned off in the game settings.")],
  },
 },
 {
  'id': 'educatif',
  'fr': {
   'slug': 'jeu-educatif-islamique-enfant',
   'title': "Jeu éducatif islamique pour enfants dès 5 ans | Kounouzi",
   'desc': "Un jeu éducatif islamique pour enfants : Coran, Sira, sciences, maths et valeurs, avec des questions adaptées à l'âge de chacun. À jouer en famille.",
   'kick': "Jeu éducatif islamique", 'h1': "Le jeu éducatif islamique qui donne <em>envie d'apprendre</em>",
   'lead': "Vos enfants révisent le Coran, la Sira, les sciences et les maths sans même s'en rendre compte. Chacun reçoit des questions à sa mesure, et toute la famille joue ensemble.",
   'sections': [
    ("Apprendre sans avoir l'impression d'être en classe", [
      "Les enfants retiennent mieux ce qu'ils vivent. Dans Kounouzi, une question arrive au bon moment, au milieu d'une partie, avec du suspense, un défi qui fait rire et des Kounouz à gagner. La bonne réponse devient une petite victoire, la mauvaise une occasion d'apprendre, sans jamais rien perdre.",
      "La famille valide elle-même les réponses : les parents expliquent, les enfants débattent, et la partie devient une vraie conversation."]),
    ("Près de 2 000 questions, six matières", [
      ("ul", [
        "<b>Religion</b> (373 questions) : piliers, prophètes, Sira, adab, vocabulaire du Coran, tirées uniquement de <a href='/sources-religion/'>nos 7 livres de référence</a>, avec la source de chaque réponse.",
        "<b>Histoire des prophètes</b> (358 questions) : les prophètes cités dans le Coran, avec la référence du verset.",
        "<b>Mathématiques et logique</b> (569) : calcul mental, suites, intrus et petits raisonnements, choisis selon l'âge.",
        "<b>Gestion</b> (250) : épargne, dépenses, partage, Zakat.",
        "<b>Sciences et nature</b> (203).",
        "<b>Invocations</b> (206) : les invocations et rappels du quotidien (sommeil, prière, repas, voyage…), tirés uniquement de <a href='/sources-religion/'>Sahîh Al-Adhkâr</a>, avec la référence de chaque réponse."])]),
    ("Des questions adaptées à l'âge réel de chaque enfant", [
      "Les questions sont rangées en quatre tranches d'âge, les mêmes pour toutes les matières : 5–8, 9–12, 13–17 et 18 ans et plus. Les 5–8 ans répondent avec 3 choix. Ensuite, le niveau s'ajuste : deux bonnes réponses de suite et les questions montent d'un cran, une erreur et elles redeviennent plus simples.",
      "Une voix lit chaque question à voix haute : un enfant qui ne sait pas encore lire peut jouer à égalité avec les plus grands."]),
    ("Bien plus qu'un quiz", [
      "Kounouzi est un vrai jeu de plateau : on achète une maktaba ou un hôtel à Médine, on relève des défis en famille, on donne à la Caisse Masākīn. Les connaissances se mélangent aux décisions, et c'est ce qui donne envie de rejouer."]),
   ],
   'faq': [("À partir de quel âge ?", "Dès 5 ans. Les plus petits jouent avec une voix qui lit tout, les adolescents et les adultes reçoivent les questions des tranches les plus avancées."),
           ("Les questions de religion sont-elles fiables ?", "Elles suivent le Coran et la Sunnah, et sont tirées uniquement de nos 7 livres de référence (liste sur kounouzi.com/sources-religion), sans rien y ajouter. Une relecture complète se poursuit en continu.")],
  },
  'en': {
   'slug': 'islamic-educational-game-for-kids',
   'title': "Islamic educational game for kids from age 5 | Kounouzi",
   'desc': "An Islamic educational game for kids: Qur'an, Sira, science, maths and values, with questions suited to each child's age. Play it as a family.",
   'kick': "Islamic educational game", 'h1': "The Islamic educational game that makes kids <em>want to learn</em>",
   'lead': "Your children revise the Qur'an, the Sira, science and maths without even noticing. Each one gets questions at their own level, and the whole family plays together.",
   'sections': [
    ("Learning without feeling like being in class", [
      "Children remember what they experience. In Kounouzi, a question comes at the right moment, in the middle of a game, with suspense, a challenge that makes everyone laugh and Kounouz to win. A right answer is a small victory, a wrong one a chance to learn, without ever losing anything.",
      "The family validates the answers: parents explain, children discuss, and the game becomes a real conversation."]),
    ("Nearly 2,000 questions, six subjects", [
      ("ul", [
        "<b>Religion</b> (373 questions): pillars, prophets, Sira, adab, Qur'an vocabulary, taken only from <a href='/en/religion-sources/'>our 7 reference books</a>, with the source of each answer.",
        "<b>Stories of the Prophets</b> (358 questions): the prophets mentioned in the Qur'an, with the verse reference.",
        "<b>Maths and logic</b> (569): mental arithmetic, sequences, odd-one-out and small reasoning puzzles, chosen by age.",
        "<b>Money skills</b> (250): saving, spending, sharing, Zakat.",
        "<b>Science and nature</b> (203).",
        "<b>Invocations</b> (206): everyday supplications and remembrances (sleep, prayer, meals, travel…), taken only from <a href='/en/religion-sources/'>Sahih Al-Adhkar</a>, with the reference of each answer."]),
      "The English translation of the questions is in progress: until a question is translated and checked, it appears in French."]),
    ("Questions suited to each child's real age", [
      "Questions are sorted into four age groups, the same for every subject: 5–8, 9–12, 13–17 and 18+. 5–8 year olds answer with 3 choices. Then the level adapts: two right answers in a row and the questions go up a notch, a mistake and they become simpler again.",
      "A voice reads every question out loud: a child who cannot read yet can play on equal terms with older ones."]),
    ("Much more than a quiz", [
      "Kounouzi is a real board game: you buy a maktaba or a hotel in Madinah, take on family challenges and give to the Masākīn Fund. Knowledge mixes with decisions, and that is what makes children want to play again."]),
   ],
   'faq': [("From what age?", "From age 5. The youngest play with a voice that reads everything; teenagers and adults get questions from the most advanced age groups."),
           ("Are the religion questions reliable?", "They follow the Qur'an and the Sunnah, and are taken only from our 7 reference books (list at kounouzi.com/en/religion-sources), with nothing added. A full review is ongoing.")],
  },
 },
 {
  'id': 'quiz',
  'fr': {
   'slug': 'quiz-islamique-famille',
   'title': "Quiz islamique en famille : questions sur l'islam par âge | Kounouzi",
   'desc': "Un quiz islamique à faire en famille, avec des questions sur l'islam adaptées à chaque âge, sourcées. Et bien plus qu'un quiz : un vrai jeu.",
   'kick': "Quiz islamique", 'h1': "Un quiz islamique en famille… <em>qui devient un vrai jeu</em>",
   'lead': "Des questions sur l'islam pour les enfants et les adultes, rangées par âge, avec leur source. Le tout dans une partie où l'on rit, on choisit et on partage.",
   'sections': [
    ("Le problème des quiz islamiques classiques", [
      "Les questions s'enchaînent, souvent les mêmes pour tous les âges. Le plus grand gagne, le plus petit décroche, et chacun finit sur son écran. Résultat : on apprend peu, et on n'a pas envie de recommencer."]),
    ("Ce que change Kounouzi", [
      ("ul", [
        "<b>Chaque joueur sa question</b> : un enfant de 6 ans et un parent ne reçoivent jamais la même difficulté.",
        "<b>Des questions sourcées</b> : chaque question de religion suit le Coran et la Sunnah, vient uniquement de <a href='/sources-religion/'>nos 7 livres de référence</a> et indique sa source.",
        "<b>La famille valide</b> : bonne réponse, en partie, ou pas cette fois. Les parents gardent la main et expliquent.",
        "<b>Pas de répétition</b> : le jeu retient les questions déjà posées à chaque joueur.",
        "<b>Un plateau, des défis, des dons</b> : les questions s'intègrent à un vrai jeu de plateau."])]),
    ("Exemples de thèmes abordés en religion", [
      "Les piliers de l'islam et de la foi, les prophètes, la Sira du Prophète ﷺ, le Ramadan, les bonnes manières (adab), le vocabulaire du Coran, d'après <a href='/sources-religion/'>nos 7 livres de référence</a>. Les questions vont des plus simples pour les 5–8 ans aux plus approfondies pour les adolescents et les adultes."]),
    ("Essayez avant d'acheter", [
      "Demandez une vraie partie d'essai de <span data-essai>30</span> minutes, gratuite, depuis <a href='/#essai-gratuit'>la page d'accueil</a> : le code arrive par e-mail et la partie s'ouvre tout de suite."]),
   ],
   'faq': [("Combien de questions de religion ?", "373 questions de religion, sur un total de près de 2 000 questions."),
           ("Faut-il savoir lire ?", "Non : une voix lit chaque question et chaque réponse.")],
  },
  'en': {
   'slug': 'islamic-quiz-for-families',
   'title': "Islamic quiz for families: questions about Islam by age | Kounouzi",
   'desc': "An Islamic quiz to play as a family, with questions about Islam suited to every age, sourced. And more than a quiz: a real board game.",
   'kick': "Islamic quiz", 'h1': "An Islamic family quiz… <em>that becomes a real game</em>",
   'lead': "Questions about Islam for children and adults, sorted by age, with their source. All inside a game where you laugh, choose and share.",
   'sections': [
    ("The problem with classic Islamic quizzes", [
      "Questions follow one another, often the same for every age. The eldest wins, the youngest gives up, and everyone ends up on their own screen. You learn little, and nobody wants to play again."]),
    ("What Kounouzi changes", [
      ("ul", [
        "<b>Each player gets their own question</b>: a 6-year-old and a parent never get the same difficulty.",
        "<b>Sourced questions</b>: each religion question follows the Qur'an and the Sunnah, comes only from <a href='/en/religion-sources/'>our 7 reference books</a> and shows its source, and an Arabic explanation comes with the answer.",
        "<b>The family decides</b>: right answer, partly right, or not this time. Parents stay in charge and explain.",
        "<b>No repeats</b>: the game remembers the questions already asked to each player.",
        "<b>A board, challenges, giving</b>: questions are part of a real board game."]),
      "The English translation of the questions is in progress: untranslated questions appear in French for now."]),
    ("Examples of religion topics", [
      "The pillars of Islam and of faith, the prophets, the Sira of the Prophet ﷺ, Ramadan, good manners (adab), Qur'an vocabulary, based on <a href='/en/religion-sources/'>our 7 reference books</a>. Questions range from the simplest for ages 5–8 to the deepest for teenagers and adults."]),
    ("Try before you buy", [
      "Request a real <span data-essai>30</span>-minute trial game, free, from <a href=\"/en/#essai-gratuit\">the home page</a>: the code arrives by e-mail and the game opens straight away."]),
   ],
   'faq': [("How many religion questions?", "373 religion questions, out of nearly 2,000 questions in total."),
           ("Do players need to read?", "No: a voice reads every question and every answer.")],
  },
 },
 {
  'id': 'zakat',
  'fr': {
   'slug': 'apprendre-zakat-enfants',
   'title': "Apprendre la Zakat et l'argent aux enfants en jouant | Kounouzi",
   'desc': "Apprendre aux enfants la Zakat, l'épargne et le don en jouant : un jeu de société où l'argent sert à construire, partager et aider, jamais à spéculer.",
   'kick': "Éducation financière", 'h1': "Apprendre la Zakat et la valeur de l'argent <em>en jouant</em>",
   'lead': "Économiser, acheter avec mesure, donner, verser la Zakat : dans Kounouzi, les enfants manipulent un patrimoine pour de faux et comprennent pour de vrai.",
   'sections': [
    ("Parler d'argent aux enfants, sans leçon de morale", [
      "Expliquer l'épargne ou la Zakat avec des mots, c'est abstrait. Le vivre dans une partie, c'est concret : on hésite à acheter un établissement, on garde une réserve, on choisit de donner ou de garder. Les enfants comprennent les conséquences de leurs choix, et les parents n'ont plus qu'à en parler."]),
    ("Comment l'argent fonctionne dans le jeu", [
      ("ul", [
        "<b>Les Kounouz</b> : la monnaie du jeu, gagnée en répondant aux questions et en relevant des défis.",
        "<b>Le patrimoine</b> : maktaba, hôtels à La Mecque et à Médine, restaurants, agences Omra, musée, parc. Les autres joueurs qui s'y arrêtent paient le service.",
        "<b>La case Don</b> : on choisit de donner à la Caisse Masākīn ou à un autre joueur, et l'on gagne des points Hassanāt.",
        "<b>La Zakat al-Māl</b> : un joueur qui garde plus de 1 000 Kounouz pendant un tour de table et demi de suite (le ḥawl du jeu, réglable) verse 2,5 % à la Caisse Masākīn. Une version simplifiée pour ouvrir la discussion.",
        "<b>Jamais de riba</b> : aucun prêt avec intérêt, aucune spéculation."])]),
    ("Le plus riche ne gagne pas forcément", [
      "Le score final additionne Kounouz, patrimoine et Hassanāt × 5. Un enfant qui a beaucoup donné peut finir devant celui qui a tout gardé. C'est souvent la question qui lance la discussion : « Il avait moins d'argent, mais il a gagné. Comment c'est possible ? »"]),
    ("Les questions de gestion", [
      "250 questions de gestion, adaptées à l'âge : pourquoi garder une réserve, comparer deux prix, éviter de gaspiller, pourquoi acheter à crédit peut mettre en difficulté."]),
   ],
   'faq': [("La Zakat du jeu est-elle la vraie règle de la Zakat ?", "C'est une version simplifiée et adaptée au jeu, pour faire découvrir le principe. Pour la pratique réelle, référez-vous à une personne de science."),
           ("À partir de quel âge ?", "Dès 5 ans ; les plus grands comprennent mieux les choix d'achat et de don.")],
  },
  'en': {
   'slug': 'teach-kids-zakat',
   'title': "Teach kids Zakat and money skills through play | Kounouzi",
   'desc': "Teach children Zakat, saving and giving through play: a board game where money is used to build, share and help, never to speculate.",
   'kick': "Money skills", 'h1': "Teach kids Zakat and the value of money <em>through play</em>",
   'lead': "Saving, buying wisely, giving, paying Zakat: in Kounouzi, children handle pretend wealth and understand for real.",
   'sections': [
    ("Talking about money with children, without lecturing", [
      "Explaining saving or Zakat with words is abstract. Living it in a game is concrete: you hesitate before buying a property, keep a reserve, choose to give or to keep. Children see the consequences of their choices, and parents just have to talk about it."]),
    ("How money works in the game", [
      ("ul", [
        "<b>Kounouz</b>: the game currency, earned by answering questions and completing challenges.",
        "<b>Properties</b>: maktaba, hotels in Makkah and Madinah, restaurants, Umrah agencies, a museum, a park. Other players who land there pay for the service.",
        "<b>The Giving square</b>: you choose to give to the Masākīn Fund or to another player, and earn Hassanāt points.",
        "<b>Zakat al-Māl</b>: a player who keeps more than 1,000 Kounouz for one and a half rounds in a row (the game's ḥawl, adjustable) pays 2.5% to the Masākīn Fund. A simplified version to start the conversation.",
        "<b>Never any riba</b>: no lending with interest, no speculation."])]),
    ("The richest player does not always win", [
      "The final score adds up Kounouz, properties and Hassanāt × 5. A child who gave a lot can finish ahead of one who kept everything. That is often the question that starts the conversation: \"He had less money, but he won. How is that possible?\""]),
    ("Money skills questions", [
      "250 money skills questions suited to each age: why keep a reserve, compare two prices, avoid waste, why buying on credit can cause trouble."]),
   ],
   'faq': [("Is the game's Zakat the real Zakat rule?", "It is a simplified version adapted to the game, to introduce the principle. For actual practice, refer to a person of knowledge."),
           ("From what age?", "From age 5; older children better understand buying and giving decisions.")],
  },
 },
 {
  'id': 'cadeau',
  'fr': {
   'slug': 'cadeau-ramadan-aid-enfant',
   'title': "Idée cadeau Ramadan et Aïd pour enfant : un jeu en famille",
   'desc': "Une idée cadeau pour le Ramadan ou l'Aïd : Kounouzi, le jeu de société éducatif fidèle à nos valeurs. Offert par code, en quelques secondes.",
   'kick': "Idée cadeau", 'h1': "Le cadeau de Ramadan et d'Aïd <em>qui rassemble toute la famille</em>",
   'lead': "Un cadeau qui ne finit pas au fond d'un placard : Kounouzi se joue ensemble, s'adapte à chaque âge et transmet des valeurs. Et il s'offre en quelques secondes, avec un simple code.",
   'sections': [
    ("Pourquoi offrir Kounouzi", [
      ("ul", [
        "<b>Pour toute la famille</b> : de 2 à 6 joueurs, dès 5 ans, petits et grands autour du même écran.",
        "<b>Fidèle à nos valeurs</b> : sans dés ni hasard pour avancer, sans musique, sans publicité.",
        "<b>Éducatif</b> : près de 2 000 questions (religion, invocations, sciences, maths et logique, histoire des prophètes, gestion) adaptées à l'âge de chacun.",
        "<b>Paiement unique, sans abonnement</b> : un seul paiement pour toute la famille, sur tous vos appareils, mises à jour incluses."])]),
    ("Parfait pour les soirées de Ramadan", [
      "Après l'iftar, une partie de 30, 45 ou 60 minutes réunit toute la famille. Les questions sur le Ramadan, le Coran et la générosité tombent à point, et la case Don rappelle l'esprit de partage du mois."]),
    ("Comment l'offrir", [
      ("ol", [
        "Achetez l'accès sur kounouzi.com : vous recevez un code d'accès juste après le paiement.",
        "Envoyez ce code à la famille de votre choix, par message ou glissé dans une carte.",
        "Elle l'entre sur kounouzi.com et le jeu s'ouvre sur tous ses appareils."])]),
    ("Aussi pour les écoles et les associations", [
      "Kounouzi s'utilise aussi en classe ou en atelier : un seul écran projeté, des équipes, et des questions adaptées à chaque tranche d'âge."]),
   ],
   'faq': [("Faut-il payer chaque année ?", "Non : paiement unique, sans abonnement, et les mises à jour (nouvelles questions, nouveaux défis) sont incluses."),
           ("Peut-on l'offrir à une famille à l'étranger ?", "Oui, le jeu fonctionne dans le navigateur, partout dans le monde.")],
  },
  'en': {
   'slug': 'ramadan-eid-gift-for-kids',
   'title': "Ramadan and Eid gift idea for kids: a family game | Kounouzi",
   'desc': "A gift idea for Ramadan or Eid: Kounouzi, the educational board game true to our values. Given with a code in seconds.",
   'kick': "Gift idea", 'h1': "The Ramadan and Eid gift <em>that brings the whole family together</em>",
   'lead': "A gift that does not end up at the back of a cupboard: Kounouzi is played together, adapts to every age and passes on values. And it can be given in seconds, with a simple code.",
   'sections': [
    ("Why give Kounouzi", [
      ("ul", [
        "<b>For the whole family</b>: 2 to 6 players, from age 5, young and old around the same screen.",
        "<b>True to our values</b>: no dice or luck to move, no music, no ads.",
        "<b>Educational</b>: nearly 2,000 questions (religion, invocations, science, maths and logic, prophets' stories, money skills) suited to each age; the English translation of the questions is in progress.",
        "<b>One-time payment, no subscription</b>: one payment for the whole family, on all your devices, updates included."])]),
    ("Perfect for Ramadan evenings", [
      "After iftar, a 30, 45 or 60-minute game brings the whole family together. Questions about Ramadan, the Qur'an and generosity come at the right time, and the Giving square recalls the sharing spirit of the month."]),
    ("How to give it", [
      ("ol", [
        "Buy access on kounouzi.com: you receive an access code right after payment.",
        "Send that code to the family of your choice, by message or inside a card.",
        "They enter it on kounouzi.com and the game opens on all their devices."])]),
    ("Also for schools and community groups", [
      "Kounouzi also works in class or in workshops: one projected screen, teams, and questions suited to each age group."]),
   ],
   'faq': [("Do I have to pay every year?", "No: one-time payment, no subscription, and updates (new questions, new challenges) are included."),
           ("Can I give it to a family abroad?", "Yes, the game runs in the browser, anywhere in the world.")],
  },
 },
 {
  'id': 'regles',
  'fr': {
   'slug': 'regles-du-jeu',
   'title': "Règles du jeu Kounouzi : comment jouer en famille | Kounouzi",
   'desc': "Les règles de Kounouzi expliquées simplement : le Chemin, les questions, les établissements, les défis famille, le Don, la Zakat et le score final.",
   'kick': "Règles du jeu", 'h1': "Comment jouer à Kounouzi : <em>les règles en 5 minutes</em>",
   'lead': "Pas de livret de 20 pages : le jeu explique tout à voix haute. Voici l'essentiel à savoir avant votre première partie.",
   'sections': [
    ("Préparer la partie", [
      "Ajoutez de 2 à 6 joueurs, indiquez pour chacun s'il s'agit d'un enfant (avec son âge) ou d'un adulte, choisissez un avatar, une couleur et la durée : 30, 45 ou 60 minutes, ou une partie libre. Chaque joueur commence avec 1 000 Kounouz."]),
    ("1. Le Chemin : avancer sans dés", [
      "À son tour, le joueur découvre son Chemin : de 1 à 5 cases, données par une suite équitable. Sur l'ensemble de la partie, tout le monde avance autant : personne n'est favorisé par la chance."]),
    ("2. Les cases du plateau", [
      ("ul", [
        "<b>Savoir</b> : une question adaptée à l'âge du joueur. Bonne réponse +100 Kounouz, en partie +50, et le double si l'explication est donnée.",
        "<b>Défi</b> : à tour de rôle, un défi famille (bouger, imiter un animal, faire un compliment…), une occasion Hassanāt, un duel ou une question bonus.",
        "<b>Établissement</b> : 12 lieux à acheter (maktaba, hôtels, restaurants, agences Omra…). Chaque visiteur paie 15 % du prix au propriétaire.",
        "<b>Don</b> : donner 30 Kounouz à la Caisse Masākīn ou à un joueur, pour gagner 10 Hassanāt.",
        "<b>Trésor</b> : +200 Kounouz. <b>Prison</b> : au tour suivant, une question pour sortir.",
        "<b>Départ</b> : chaque tour complet rapporte +200 Kounouz."])]),
    ("3. La Zakat", [
      "Un joueur qui garde plus de 1 000 Kounouz pendant un tour de table et demi de suite verse 2,5 % à la Caisse Masākīn : c'est la Zakat al-Māl du jeu."]),
    ("4. La fin de partie et le score", [
      "À la fin du temps choisi, le dernier tour de table se termine et le classement s'affiche. Score final = Kounouz + valeur du patrimoine + Hassanāt × 5. Donner compte : le plus riche ne gagne pas forcément."]),
   ],
   'faq': [("Peut-on mettre la partie en pause ?", "Oui, le menu met tout en pause, et une partie interrompue se reprend plus tard sur le même appareil."),
           ("Qui valide les réponses ?", "La famille : après la réponse affichée, on choisit bonne réponse, en partie ou pas cette fois.")],
  },
  'en': {
   'slug': 'how-to-play',
   'title': "Kounouzi rules: how to play as a family | Kounouzi",
   'desc': "Kounouzi rules explained simply: the Path, questions, properties, family challenges, Giving, Zakat and the final score.",
   'kick': "How to play", 'h1': "How to play Kounouzi: <em>the rules in 5 minutes</em>",
   'lead': "No 20-page booklet: the game explains everything out loud. Here is what to know before your first game.",
   'sections': [
    ("Setting up", [
      "Add 2 to 6 players, say for each whether they are a child (with their age) or an adult, choose an avatar, a colour and the length: 30, 45 or 60 minutes, or an open game. Each player starts with 1,000 Kounouz."]),
    ("1. The Path: moving without dice", [
      "On their turn, the player reveals their Path: 1 to 5 squares, given by a fair sequence. Over the whole game, everyone moves the same distance: nobody is favoured by luck."]),
    ("2. The board squares", [
      ("ul", [
        "<b>Knowledge</b>: a question suited to the player's age. Right answer +100 Kounouz, partly right +50, doubled if the explanation is given.",
        "<b>Challenge</b>: in turn, a family challenge (move, imitate an animal, give a compliment…), a Hassanāt opportunity, a duel or a bonus question.",
        "<b>Property</b>: 12 places to buy (maktaba, hotels, restaurants, Umrah agencies…). Each visitor pays the owner 15% of the price.",
        "<b>Giving</b>: give 30 Kounouz to the Masākīn Fund or to a player, to earn 10 Hassanāt.",
        "<b>Treasure</b>: +200 Kounouz. <b>Prison</b>: next turn, one question to get out.",
        "<b>Start</b>: each full lap earns +200 Kounouz."])]),
    ("3. Zakat", [
      "A player who keeps more than 1,000 Kounouz for one and a half rounds in a row pays 2.5% to the Masākīn Fund: this is the game's Zakat al-Māl."]),
    ("4. End of the game and score", [
      "When the chosen time is up, the last round finishes and the ranking appears. Final score = Kounouz + property value + Hassanāt × 5. Giving counts: the richest player does not always win."]),
   ],
   'faq': [("Can the game be paused?", "Yes, the menu pauses everything, and an interrupted game can be resumed later on the same device."),
           ("Who validates the answers?", "The family: once the answer is shown, you choose right, partly right or not this time.")],
  },
 },
]

# Les 7 livres d'où viennent les questions de religion (373) et d'invocations (206) (champ « source »). Pas de lien PDF.
LIVRES = [
 dict(ar="شرح ثلاثة الأصول", tr="Sharḥ Thalāthat al-Uṣūl", fr="Explication des Trois fondements", en="Explanation of the Three Fundamental Principles",
      aar="الشيخ صالح بن عبد العزيز آل الشيخ", a="Shaykh Ṣāliḥ Āl ash-Shaykh", n=100, ic="🕋",
      tfr="Les fondements de la croyance : connaître son Seigneur, sa religion et son Prophète ﷺ", ten="The foundations of belief: knowing one's Lord, one's religion and one's Prophet ﷺ"),
 dict(ar="شرح الدروس المهمة لعامة الأمة", tr="Sharḥ ad-Durūs al-Muhimmah li-ʿĀmmat al-Ummah", fr="Explication des Leçons importantes pour l'ensemble de la communauté", en="Explanation of the Important Lessons for the Whole Ummah",
      aar="الشيخ عبد الرزاق بن عبد المحسن البدر", a="Shaykh ʿAbd ar-Razzāq al-Badr", n=98, ic="📘",
      tfr="Les bases que tout musulman doit connaître : piliers, prière, comportement", ten="The basics every Muslim should know: pillars, prayer, conduct"),
 dict(ar="شرح الأرجوزة الميئية في ذكر حال أشرف البرية", tr="Sharḥ al-Urjūzah al-Miʾiyyah fī Dhikr Ḥāl Ashraf al-Bariyyah", fr="Explication du poème en cent vers sur la vie du meilleur des hommes", en="Explanation of the hundred-verse poem on the life of the best of creation",
      aar="الشيخ عبد الرزاق بن عبد المحسن البدر", a="Shaykh ʿAbd ar-Razzāq al-Badr", n=100, ic="🌙",
      tfr="La Sira : la vie du Prophète ﷺ", ten="The Sira: the life of the Prophet ﷺ"),
 dict(ar="وجاء شهر رمضان", tr="Wa Jāʾa Shahru Ramaḍān", fr="Et vint le mois de Ramadan", en="And the month of Ramadan came",
      aar="الشيخ عبد الرزاق بن عبد المحسن البدر", a="Shaykh ʿAbd ar-Razzāq al-Badr", n=25, ic="🏮",
      tfr="Le Ramadan et le jeûne", ten="Ramadan and fasting"),
 dict(ar="شرح القواعد الأربع", tr="Sharḥ al-Qawāʿid al-Arbaʿ", fr="Explication des Quatre règles", en="Explanation of the Four Principles",
      aar="الشيخ عبد الرزاق بن عبد المحسن البدر", a="Shaykh ʿAbd ar-Razzāq al-Badr", n=25, ic="🧭",
      tfr="Le Tawḥīd et ce qui s'y oppose", ten="Tawḥīd and what opposes it"),
 dict(ar="كلمة التوحيد لا إله إلا الله: فضائلها ومعناها وشروطها ونواقضها", tr="Kalimat at-Tawḥīd : Lā ilāha illā Allāh", fr="La parole de l'unicité : « Lā ilāha illā Allāh », ses mérites, son sens, ses conditions et ses annulatifs", en="The word of Tawḥīd: “Lā ilāha illā Allāh”, its merits, meaning, conditions and nullifiers",
      aar="الشيخ عبد الرزاق بن عبد المحسن البدر", a="Shaykh ʿAbd ar-Razzāq al-Badr", n=25, ic="☝️",
      tfr="Le sens de « Lā ilāha illā Allāh »", ten="The meaning of “Lā ilāha illā Allāh”"),
 dict(ar="صحيح الأذكار", tr="Ṣaḥīḥ al-Adhkār", fr="Le Rappel authentique : invocations et formules de rappel tirées des ouvrages de l'imam al-Albānī", en="The Authentic Remembrance: supplications and remembrances taken from the works of Imam al-Albānī",
      aar="الشيخ محمد ناصر الدين الألباني", a="Shaykh Muḥammad Nāṣir ad-Dīn al-Albānī", n=206, ic="🤲",
      tfr="Les invocations du quotidien : sommeil, prière, repas, voyage… (catégorie Invocations)", ten="Everyday supplications: sleep, prayer, meals, travel… (Invocations category)"),
]

GUIDES.append({
 'id': 'sources', 'custom': 'sources',
 'fr': {'slug': 'sources-religion', 'title': "Nos sources en religion : les livres du jeu | Kounouzi",
  'desc': "Les questions de religion de Kounouzi suivent le Coran et la Sunnah et sont tirées uniquement de sept livres, sans rien y ajouter. Découvrez-les.",
  'kick': "Nos sources", 'h1': "Le Coran, la Sunnah… <em>et sept livres, rien d'autre</em>",
  'lead': "Toutes les questions de religion de Kounouzi suivent le Coran et la Sunnah, et sont tirées uniquement des sept livres présentés ici. Nous n'avons rien ajouté : la source est indiquée sous chaque réponse, et une relecture complète se poursuit en continu.",
  'faq': [("D'où viennent les questions de religion ?", "Elles suivent le Coran et la Sunnah et sont tirées uniquement des sept livres présentés sur cette page, sans rien y ajouter. La source est affichée sous chaque réponse dans le jeu."),
          ("Avez-vous ajouté des questions d'autres sources ?", "Non. Toutes les questions de religion viennent de ces sept livres, et seulement d'eux."),
          ("Et les questions d'Histoire des prophètes ?", "Elles portent sur les récits des prophètes cités dans le Coran : la référence du verset est indiquée sous chaque réponse."),
          ("Et les questions d'Invocations ?", "Elles sont tirées uniquement de Sahîh Al-Adhkâr (Le Rappel authentique), recueil des invocations authentifiées par le shaykh al-Albānī. La référence est indiquée sous chaque réponse."),
          ("Combien de questions de religion y a-t-il ?", "373 questions de religion et 206 questions d'invocations, sur près de 2 000 questions au total, toutes rangées par tranche d'âge.")]},
 'en': {'slug': 'religion-sources', 'title': "Our religion sources: the books in the game | Kounouzi",
  'desc': "Kounouzi's religion questions follow the Qur'an and the Sunnah and are taken only from seven books, with nothing added. Discover them.",
  'kick': "Our sources", 'h1': "The Qur'an, the Sunnah… <em>and seven books, nothing else</em>",
  'lead': "All of Kounouzi's religion questions follow the Qur'an and the Sunnah, and are taken only from the seven books presented here. We added nothing: the source is shown under each answer, and a full review is ongoing.",
  'faq': [("Where do the religion questions come from?", "They follow the Qur'an and the Sunnah and are taken only from the seven books presented on this page, with nothing added. The source is shown under each answer in the game."),
          ("Did you add questions from other sources?", "No. All religion questions come from these seven books, and only from them."),
          ("And the Stories of the Prophets questions?", "They cover the stories of the prophets mentioned in the Qur'an: the verse reference is shown under each answer."),
          ("And the Invocations questions?", "They are taken only from Sahih Al-Adhkar (The Authentic Remembrance), a collection of supplications authenticated by Shaykh al-Albani. The reference is shown under each answer."),
          ("How many religion questions are there?", "373 religion questions and 206 invocation questions, out of nearly 2,000 questions in total, all sorted by age group.")]},
})

