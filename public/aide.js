// Aide Kounouzi : bulle d'aide du site, sans IA. Elle cherche la réponse préparée la plus proche de la question
// (mots-clés, synonymes, fautes de frappe tolérées), propose un mini-quiz tiré des vraies questions du jeu,
// et transmet à l'équipe les questions restées sans réponse (onglet Avis du tableau de bord).
(function () {
  if (window.__kzAide) return; window.__kzAide = true;
  const EN = (document.documentElement.lang || 'fr').slice(0, 2) === 'en';
  const BASE = EN ? '/en/' : '/';
  const SOURCES = EN ? '/en/religion-sources/' : '/sources-religion/';
  const RETRACT = EN ? '/en/withdrawal/' : '/retractation/';
  const REGLES = EN ? '/en/how-to-play/' : '/regles-du-jeu/';
  let prix = null;

  // ---------- Réponses préparées (FR / EN) ----------
  // k : mots-clés et expressions (sans accents, en minuscules) ; r : réponse ; a : boutons proposés.
  const A = { // boutons
    offre: [EN ? 'See the offer' : "Voir l'offre", BASE + '#offre'],
    essai: [EN ? 'Free trial game' : "Partie d'essai gratuite", BASE + '#essai-gratuit'],
    sources: [EN ? 'Our reference books' : 'Nos livres de référence', SOURCES],
    regles: [EN ? 'How to play' : 'Les règles du jeu', REGLES],
    retract: [EN ? 'Withdrawal page' : 'Page de rétractation', RETRACT],
    ecrire: [EN ? 'Write to the team' : "Écrire à l'équipe", 'form:avis'],
    bug: [EN ? 'Report a bug' : 'Signaler un bug', 'form:bug'],
    partenariat: [EN ? 'Propose a partnership' : 'Proposer un partenariat', 'form:partenariat'],
    quiz: [EN ? 'Try a game question' : 'Une question du jeu', 'quiz:'],
    quizRel: [EN ? 'A religion question' : 'Une question de religion', 'quiz:religion'],
    quizInv: [EN ? 'An invocation question' : "Une question d'invocations", 'quiz:invocations'],
  };
  const ESS = () => (prix && prix.essai) || 30;
  const P = () => (prix ? prix.txt : (EN ? '€6.99' : '6,99 €'));
  const PN = () => (prix && prix.normal ? (EN ? ` (launch price, instead of ${prix.normal} later)` : ` (prix de lancement, au lieu de ${prix.normal} plus tard)`) : '');
  const INTENTS = [
    { id: 'prix', k: ['prix', 'combien', 'cout', 'coute', 'tarif', 'cher', 'euro', 'euros', 'payer', 'price', 'cost', 'how much', 'expensive', 'promo', 'reduction'],
      r: () => EN ? `Kounouzi costs ${P()}${PN()}. It is a one-time payment, with no subscription, for the whole family and on all your devices. Updates are included.`
                  : `Kounouzi coûte ${P()}${PN()}. C'est un paiement unique, sans abonnement, pour toute la famille et sur tous vos appareils. Les mises à jour sont incluses.`, a: ['offre', 'essai'] },
    { id: 'abonnement', k: ['abonnement', 'abonne', 'mensuel', 'chaque mois', 'par mois', 'renouvel', 'resilier', 'subscription', 'monthly', 'every month', 'mise a jour', 'mises a jour', 'updates', 'update'],
      r: () => EN ? 'No subscription. You pay once for the whole family, on all your devices, and frequent updates are included: new questions, new challenges, special editions (Ramadan, Eid…) and bonuses.'
                  : "Aucun abonnement. Vous payez une seule fois pour toute la famille, sur tous vos appareils, et les mises à jour fréquentes sont incluses : nouvelles questions, nouveaux défis, éditions spéciales (Ramadan, Aïd…) et bonus.", a: ['offre'] },
    { id: 'essai', k: ['essai', 'gratuit', 'gratuite', 'tester', 'essayer', 'demo', 'decouvrir', 'trial', 'free', 'try'],
      r: () => EN ? `Yes! You can try a real ${ESS()}-minute game for free, with no card needed. Your trial code arrives by e-mail and opens the game on your device.`
                  : `Oui ! Vous pouvez essayer une vraie partie de ${ESS()} minutes, gratuitement et sans carte bancaire. Votre code d'essai arrive par e-mail et ouvre le jeu sur votre appareil.`, a: ['essai'] },
    { id: 'age', k: ['age', 'ans', 'enfant', 'enfants', 'petit', 'petite', 'maternelle', 'ado', 'adolescent', 'adulte', 'adultes', 'niveau', 'difficulte', 'kids', 'child', 'children', 'years old', 'teen', 'adult', 'level'],
      r: () => EN ? 'From age 5. Each player gets questions for their own age (5–6, 7–8, 9–10, 11–12 and 13+; in religion 5–8, 8–10, 10–12, 12–14 and 14+), and the voice reads them aloud, so children who cannot read yet can play too. Adults choose their level: Beginner, Standard or Advanced.'
                  : "Dès 5 ans. Chaque joueur reçoit des questions selon son âge (5–6, 7–8, 9–10, 11–12 et 13 ans et plus ; en religion 5–8, 8–10, 10–12, 12–14 et 14 ans et plus), et la voix les lit à voix haute : les enfants qui ne lisent pas encore peuvent jouer. Les adultes choisissent leur niveau : Découverte, Standard ou Avancé.", a: ['essai'] },
    { id: 'joueurs', k: ['joueur', 'joueurs', 'combien de personnes', 'nombre de joueurs', 'duree', 'combien de temps', 'minutes', 'longtemps', 'pause', 'players', 'how many people', 'how long', 'duration'],
      r: () => EN ? 'From 2 to 6 players around one screen. A game lasts 30, 45 or 60 minutes, or has no time limit, and can be paused.'
                  : "De 2 à 6 joueurs autour d'un même écran. Une partie dure 30, 45 ou 60 minutes, ou sans limite, et peut être mise en pause.", a: ['regles'] },
    { id: 'appareils', k: ['tablette', 'telephone', 'portable', 'smartphone', 'ordinateur', 'iphone', 'ipad', 'android', 'samsung', 'pc', 'mac', 'tele', 'television', 'appareil', 'appareils', 'installer', 'installation', 'telecharger', 'application', 'appli', 'app', 'ecran d accueil', 'tablet', 'phone', 'computer', 'device', 'install', 'download', 'home screen'],
      r: () => EN ? 'Kounouzi is played in the browser, on phone, tablet or computer, with nothing to download. Once the game is open, tap “Install” to add it to your home screen like an app: it then opens in one tap. The same code works on all your family\'s devices.'
                  : "Kounouzi se joue dans le navigateur, sur téléphone, tablette ou ordinateur, sans rien télécharger. Une fois le jeu ouvert, touchez « Installer » pour l'ajouter à l'écran d'accueil comme une application : il s'ouvre ensuite d'un seul geste. Le même code marche sur tous les appareils de la famille.", a: ['essai'] },
    { id: 'internet', k: ['internet', 'connexion', 'hors ligne', 'hors connexion', 'wifi', 'reseau', 'offline', 'connection'],
      r: () => EN ? 'An Internet connection is needed to open the game and for the voice.' : 'Il faut une connexion Internet pour ouvrir le jeu et pour la voix.', a: [] },
    { id: 'code', k: ['code', 'perdu', 'oublie', 'retrouver', 'lien', 'acces', 'ouvre pas', 'connecter', 'mot de passe', 'compte', 'lost', 'forgot', 'link', 'access', 'password', 'account', 'log in', 'login'],
      r: () => EN ? 'There is no account or password: your access code stays open on the devices where you have used it, and your personal link (in the e-mail received after purchase) opens the game directly. Lost everything? Write to us with the e-mail address used for payment and we will send it again.'
                  : "Il n'y a ni compte ni mot de passe : votre code reste ouvert sur les appareils où vous l'avez utilisé, et votre lien personnel (dans l'e-mail reçu après l'achat) ouvre directement le jeu. Tout perdu ? Écrivez-nous avec l'adresse e-mail utilisée pour le paiement, on vous le renvoie.", a: ['ecrire'] },
    { id: 'sources', k: ['source', 'sources', 'livre', 'livres', 'reference', 'fiable', 'fiabilite', 'savant', 'coran', 'sunna', 'sunnah', 'hadith', 'pdf', 'verifie', 'book', 'books', 'reliable', 'quran', 'scholar'],
      r: () => EN ? 'Religion questions follow the Qur\'an and the Sunnah and are taken only from our 7 reference books, without adding anything. The source is shown under each answer, and everything is reviewed before publication.'
                  : "Les questions de religion suivent le Coran et la Sunnah, et sont tirées uniquement de nos 7 livres de référence, sans rien y ajouter. La source est indiquée sous chaque réponse et tout est relu avant publication.", a: ['sources', 'quizRel'] },
    { id: 'religionQ', k: ['invocation', 'invocations', 'doua', 'dua', 'dhikr', 'adhkar', 'priere', 'salat', 'jeune', 'ramadan', 'prophete', 'prophetes', 'allah', 'islam', 'ablution', 'zakat', 'est ce permis', 'ai je le droit', 'licite', 'haram', 'fatwa', 'prayer', 'fasting', 'prophet', 'allowed', 'permissible'],
      r: () => EN ? 'I do not give religious answers myself. The game\'s questions come only from our 7 reference books, with their source. For a question about your own situation, please ask a person of knowledge. Would you like a question from the game?'
                  : "Je ne donne pas de réponse religieuse moi-même. Les questions du jeu viennent uniquement de nos 7 livres de référence, avec leur source. Pour une question qui concerne votre situation, demandez à une personne de science. Envie d'une question du jeu ?", a: ['quizInv', 'quizRel', 'sources'] },
    { id: 'valeurs', k: ['dice', 'jeu de des', 'lancer de', 'hasard', 'chance', 'musique', 'valeurs', 'islamique', 'halal', 'riba', 'interet', 'publicite', 'pub', 'achat integre', 'dice', 'luck', 'music', 'values', 'islamic', 'ads', 'advert'],
      r: () => EN ? 'Kounouzi was designed in line with Islamic principles: you move without dice or luck, there is no music (only a voice and a few sound effects you can turn off), riba is never taught but saving, giving and Zakat are, and there are no ads or in-app purchases. It has no certification: each family remains the judge of what suits it.'
                  : "Kounouzi a été conçu dans le respect des principes islamiques : on avance sans dés ni hasard, il n'y a pas de musique (seulement une voix et quelques effets que l'on peut couper), on n'apprend jamais le riba mais l'épargne, le don et la Zakat, et il n'y a ni publicité ni achat intégré. Il n'a pas de certification : chaque famille reste juge de ce qui lui convient.", a: ['regles'] },
    { id: 'hassanat', k: ['hassanat', 'hasanat', 'hassanate', 'points', 'score', 'gagner', 'gagnant', 'recompense', 'win', 'winner', 'reward'],
      r: () => EN ? 'Hassanāt are game points earned by giving, sharing or succeeding at a family challenge. They count in the score to show that generosity has value. They are not real spiritual rewards: it is a chance to talk about it with your children.'
                  : "Les Hassanāt sont des points de jeu que l'on gagne en donnant, en partageant ou en réussissant un défi en famille. Ils comptent dans le score pour montrer que la générosité a de la valeur. Ce ne sont pas de vraies récompenses spirituelles : c'est une occasion d'en parler avec vos enfants.", a: ['regles'] },
    { id: 'themes', k: ['theme', 'themes', 'categorie', 'categories', 'matiere', 'matieres', 'sujets', 'combien de questions', 'questions', 'maths', 'sciences', 'gestion', 'histoire', 'logique', 'topics', 'subjects', 'how many questions'],
      r: () => EN ? 'Over 2,000 questions in 6 themes: Religion, Invocations, Stories of the Prophets, Maths and logic, Science and Money skills, plus family challenges. Want to try one?'
                  : "Plus de 2 000 questions en 6 thèmes : Religion, Invocations, Histoire des prophètes, Maths et logique, Sciences et Gestion, plus des défis en famille. Vous en voulez une ?", a: ['quiz', 'regles'] },
    { id: 'regles', k: ['regle', 'regles', 'comment jouer', 'comment ca marche', 'deroulement', 'chemin', 'case', 'cases', 'plateau', 'defi', 'defis', 'rules', 'how to play', 'how does it work', 'board', 'challenge'],
      r: () => EN ? 'Each player in turn reveals their Path (a number from 1 to 5, no dice), the pawn moves on the 3D board, and the square decides: a question, a property to buy, a family challenge, a gift… The voice guides the whole table, step by step.'
                  : "Chacun à son tour découvre son Chemin (un nombre de 1 à 5, sans dés), le pion avance sur le plateau en 3D et la case décide : une question, un établissement à acheter, un défi en famille, un don… La voix guide toute la table, pas à pas.", a: ['regles', 'essai'] },
    { id: 'paiement', k: ['carte', 'paiement', 'payer', 'securise', 'securite', 'stripe', 'paypal', 'cb', 'visa', 'mastercard', 'dinar', 'dinars', 'algerie', 'card', 'payment', 'secure', 'pay'],
      r: () => EN ? 'Payment is by card, secured by Stripe: we never see your card details. Your code appears right after payment and is also sent by e-mail.'
                  : "Le paiement se fait par carte bancaire, sécurisé par Stripe : nous ne voyons jamais vos données bancaires. Votre code s'affiche juste après le paiement et vous est aussi envoyé par e-mail.", a: ['offre'] },
    { id: 'retract', k: ['rembourse', 'remboursement', 'rembourser', 'retractation', 'retracter', 'annuler', 'annulation', 'satisfait', 'refund', 'withdraw', 'withdrawal', 'cancel'],
      r: () => EN ? 'Kounouzi is digital content opened right after payment: before paying, you ask for immediate access and acknowledge losing the 14-day right of withdrawal. You can still send a request on the withdrawal page, and if a problem prevents you from playing, write to us: we will find a solution.'
                  : "Kounouzi est un contenu numérique ouvert dès le paiement : avant de payer, vous demandez l'accès immédiat et reconnaissez perdre le droit de rétractation de 14 jours. Vous pouvez quand même envoyer une demande sur la page de rétractation, et si un problème vous empêche de jouer, écrivez-nous : on trouvera une solution.", a: ['retract', 'ecrire'] },
    { id: 'bug', k: ['bug', 'bugs', 'marche pas', 'fonctionne pas', 'bloque', 'bloquee', 'erreur', 'probleme', 'plante', 'ecran noir', 'pas de son', 'son', 'voix', 'lent', 'broken', 'not working', 'error', 'problem', 'stuck', 'crash', 'sound', 'voice'],
      r: () => EN ? 'Sorry about that! Tell us what happened and on which device (phone, tablet, computer): we read every message and fix things quickly. Tip: in the game settings, you can test and adjust the voice.'
                  : "Désolé ! Dites-nous ce qui s'est passé et sur quel appareil (téléphone, tablette, ordinateur) : on lit chaque message et on corrige vite. Astuce : dans les réglages du jeu, vous pouvez tester et régler la voix.", a: ['bug'] },
    { id: 'partenariat', k: ['partenariat', 'partenaire', 'ecole', 'association', 'mosquee', 'influenceur', 'createur', 'collaboration', 'revendeur', 'presse', 'partnership', 'partner', 'school', 'influencer', 'press'],
      r: () => EN ? 'With pleasure! Introduce yourself in a few words (who you are, what you suggest) and we will get back to you by e-mail.'
                  : 'Avec plaisir ! Présentez-vous en quelques mots (qui vous êtes, ce que vous proposez) et nous vous répondrons par e-mail.', a: ['partenariat'] },
    { id: 'contact', k: ['contact', 'contacter', 'email', 'e mail', 'mail', 'humain', 'quelqu un', 'equipe', 'telephone de', 'whatsapp', 'human', 'someone', 'team', 'reach'],
      r: () => EN ? 'You can write to us with the form on the Contact page, or at contact@kounouzi.com. We answer as quickly as possible.'
                  : "Vous pouvez nous écrire avec le formulaire de la page Contact, ou à contact@kounouzi.com. Nous répondons au plus vite.", a: ['ecrire'] },
    { id: 'langues', k: ['langue', 'langues', 'anglais', 'francais', 'arabe', 'traduction', 'language', 'english', 'french', 'arabic'],
      r: () => EN ? 'The site and the game are available in French and English: you can switch language in the game settings, and the voice follows.'
                  : 'Le site et le jeu existent en français et en anglais : on change de langue dans les réglages du jeu, et la voix suit.', a: [] },
    { id: 'cadeau', k: ['cadeau', 'offrir', 'aid', 'eid', 'anniversaire', 'neveu', 'niece', 'gift', 'present', 'birthday'],
      r: () => EN ? 'Good idea! After the purchase you receive a code and a personal link: you can pass them on to the family you want to give it to.'
                  : "Bonne idée ! Après l'achat, vous recevez un code et un lien personnel : il suffit de les transmettre à la famille à qui vous l'offrez.", a: ['offre'] },
    { id: 'quiz', k: ['quiz', 'joue avec moi', 'pose moi', 'teste moi', 'une question', 'question du jeu', 'exemple de question', 'jouer', 'play', 'test me', 'ask me', 'example question'],
      r: () => '', a: [], quiz: true },
    { id: 'salut', k: ['bonjour', 'salut', 'salam', 'salaam', 'assalamu', 'coucou', 'bonsoir', 'hello', 'hi', 'hey'],
      r: () => EN ? 'Wa ʿalaykum as-salām and welcome! Ask me anything about Kounouzi: price, ages, how to play, installation…' : "Wa ʿalaykum as-salām et bienvenue ! Posez-moi vos questions sur Kounouzi : prix, âges, déroulement d'une partie, installation…", a: ['quiz'] },
    { id: 'merci', k: ['merci', 'super', 'genial', 'parfait', 'top', 'thanks', 'thank you', 'great', 'perfect'],
      r: () => EN ? 'With pleasure! Anything else?' : 'Avec plaisir ! Autre chose ?', a: [] },
  ];
  const SUGG = EN ? [['prix', 'Price'], ['age', 'From what age?'], ['essai', 'Free trial'], ['appareils', 'Which devices?'], ['sources', 'Religion sources'], ['quiz', 'A game question']]
                  : [['prix', 'Le prix'], ['age', 'Dès quel âge ?'], ['essai', 'Essai gratuit'], ['appareils', 'Sur quels appareils ?'], ['sources', 'Sources religieuses'], ['quiz', 'Une question du jeu']];
  const STOP = new Set('le la les un une des du de d l et ou a au aux en est ce ca c je j tu il on nous vous mon ma mes ton ta vos votre notre pour par sur dans avec sans qui que quoi quel quelle quels quelles comment est-ce pas ne n y the a an is are of to in on for it do does i you we can what how which my your'.split(' '));
  const norm = s => String(s).toLowerCase().replace(/(^|[^a-zà-ÿ])d[ée]s(?=$|[^a-zà-ÿ])/g, (m, a) => (/dés/.test(m) ? a + ' dice ' : m)).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ').replace(/[^a-z0-9؀-ۿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const lev1 = (a, b) => { if (Math.abs(a.length - b.length) > 1) return false; let i = 0, j = 0, e = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } } return e + (a.length - i) + (b.length - j) <= 1; };
  function chercher(txt) {
    const n = ' ' + norm(txt) + ' ', mots = n.trim().split(' ').filter(w => w && !STOP.has(w));
    let best = null, bs = 0;
    for (const it of INTENTS) {
      let s = 0;
      for (const k of it.k) {
        if (k.includes(' ')) { if (n.includes(' ' + k + ' ') || n.includes(' ' + k)) s += 3; continue; }
        for (const w of mots) {
          if (w === k) s += 3;
          else if (k.length >= 4 && w.length >= 4 && (w.startsWith(k) || k.startsWith(w))) s += 1.5;
          else if (k.length >= 5 && lev1(w, k)) s += 2;
        }
      }
      if (s > bs) { bs = s; best = it; }
    }
    return bs >= 2 ? best : null;
  }

  // ---------- Interface ----------
  const css = `
.kza-b{position:fixed;inset-inline-end:18px;bottom:var(--kza-bas,18px);z-index:60;width:62px;height:62px;border-radius:50%;border:2px solid #efbe4c;background:radial-gradient(circle at 35% 30%,#22395c,#0c1626 70%);box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 4px rgba(239,190,76,.12);cursor:pointer;padding:0;display:grid;place-items:center;transition:transform .2s}
.kza-b:hover{transform:scale(1.06)}.kza-b:focus-visible{outline:3px solid #efbe4c;outline-offset:3px}
.kza-b img{width:46px;height:46px;border-radius:50%;object-fit:cover}
.kza-b i{position:absolute;top:2px;inset-inline-end:2px;width:14px;height:14px;border-radius:50%;background:#efbe4c;border:2px solid #0c1626}
.kza-b.pulse i{animation:kzaP 1.2s ease-out 2}@keyframes kzaP{0%{box-shadow:0 0 0 0 rgba(239,190,76,.8)}100%{box-shadow:0 0 0 14px rgba(239,190,76,0)}}
.kza-tip{position:fixed;inset-inline-end:90px;bottom:calc(var(--kza-bas,18px) + 14px);z-index:60;background:#f7ecd4;color:#3a2606;font:800 15px Nunito,system-ui,sans-serif;padding:9px 14px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.35);animation:kzaIn .3s}
@keyframes kzaIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.kza-p{position:fixed;inset-inline-end:16px;bottom:calc(var(--kza-bas,18px) + 74px);z-index:65;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100dvh - var(--kza-bas,18px) - 110px));display:flex;flex-direction:column;border-radius:22px;background:#14243b;border:1.5px solid rgba(239,190,76,.4);box-shadow:0 24px 70px rgba(0,0,0,.55);overflow:hidden;font-family:Nunito,system-ui,sans-serif;color:#f7ecd4;animation:kzaIn .25s}
.kza-p[hidden]{display:none}
.kza-h{display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(0,0,0,.25);border-bottom:1px solid rgba(255,255,255,.08)}
.kza-h img{width:34px;height:34px;border-radius:50%}.kza-h b{flex:1;font-size:16px}
.kza-h button{background:none;border:0;color:#f7ecd4;font-size:22px;cursor:pointer;width:40px;height:40px;border-radius:50%}
.kza-l{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.kza-m{max-width:88%;padding:10px 13px;border-radius:16px;font-size:15px;line-height:1.45;font-weight:700;white-space:pre-wrap}
.kza-m.bot{background:rgba(255,255,255,.07);border-end-start-radius:6px;align-self:flex-start}
.kza-m.moi{background:#efbe4c;color:#3a2606;border-end-end-radius:6px;align-self:flex-end}
.kza-m small{display:block;margin-top:6px;opacity:.75;font-size:12.5px}
.kza-a{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:100%}
.kza-a button,.kza-a a{font:800 13.5px Nunito,system-ui,sans-serif;color:#f7ecd4;background:rgba(0,0,0,.25);border:1.5px solid rgba(239,190,76,.45);border-radius:999px;padding:8px 12px;cursor:pointer;text-decoration:none;min-height:38px;display:inline-flex;align-items:center}
.kza-a button:hover,.kza-a a:hover{background:rgba(239,190,76,.16)}
.kza-a .ok{border-color:#3ddc84;background:rgba(61,220,132,.18)}.kza-a .ko{border-color:#ff8a7a;background:rgba(255,138,122,.14)}
.kza-f{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.2)}
.kza-f input{flex:1;min-width:0;border-radius:14px;border:1.5px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);color:#f7ecd4;font:700 15px Nunito,system-ui,sans-serif;padding:11px 13px}
.kza-f button{border:0;border-radius:14px;background:linear-gradient(180deg,#ffd77a,#efbe4c);color:#3a2606;font:900 15px Nunito,system-ui,sans-serif;padding:0 16px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.kza-b.pulse i,.kza-p,.kza-tip{animation:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const T = EN ? { aria: 'Open Kounouzi help', tip: 'A question?', titre: 'Kounouzi help', fermer: 'Close', ph: 'Ask your question…', env: 'Send',
      hello: 'Assalāmu ʿalaykum! I can answer your questions about Kounouzi: price, ages, devices, how a game works… Ask away, or pick a topic:',
      pasCompris: "I don't have the answer to that yet. I've passed your question on to the team so they can add it. In the meantime, here are some topics, or write to us:",
      quizIntro: 'Here is a real question from the game', voir: 'Show the answer', bonne: 'Well done! ✓', mauvaise: 'Not quite! The answer was:', rep: 'Answer:', src: 'Source:', autre: 'Another one', jouer: 'Try a free game',
      quizErr: 'I cannot fetch a question right now. Try again in a moment!' }
    : { aria: "Ouvrir l'aide Kounouzi", tip: 'Une question ?', titre: 'Aide Kounouzi', fermer: 'Fermer', ph: 'Posez votre question…', env: 'Envoyer',
      hello: "Assalāmu ʿalaykum ! Je réponds à vos questions sur Kounouzi : prix, âges, appareils, déroulement d'une partie… Écrivez-moi, ou choisissez un sujet :",
      pasCompris: "Je n'ai pas encore la réponse à ça. J'ai transmis votre question à l'équipe pour qu'elle l'ajoute. En attendant, voici quelques sujets, ou écrivez-nous :",
      quizIntro: 'Voici une vraie question du jeu', voir: 'Voir la réponse', bonne: 'Bravo, bonne réponse ! ✓', mauvaise: 'Presque ! La bonne réponse était :', rep: 'Réponse :', src: 'Source :', autre: 'Une autre', jouer: 'Essayer une partie gratuite',
      quizErr: "Je n'arrive pas à charger une question pour le moment. Réessayez dans un instant !" };
  const THEME = EN ? { religion: 'Religion', invocations: 'Invocations', geography: 'Stories of the Prophets', maths: 'Maths & logic', sciences: 'Science', management: 'Money skills' }
                   : { religion: 'Religion', invocations: 'Invocations', geography: 'Histoire des prophètes', maths: 'Maths & logique', sciences: 'Sciences', management: 'Gestion' };
  const LOGO = '/img/app/icon-192.png?v=2';
  const b = document.createElement('button'); b.className = 'kza-b'; b.type = 'button'; b.setAttribute('aria-label', T.aria); b.setAttribute('aria-expanded', 'false');
  b.innerHTML = `<img src="${LOGO}" alt="" width="46" height="46"><i></i>`;
  const p = document.createElement('div'); p.className = 'kza-p'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', T.titre);
  p.innerHTML = `<div class="kza-h"><img src="${LOGO}" alt=""><b>${T.titre}</b><button type="button" aria-label="${T.fermer}">✕</button></div><div class="kza-l" aria-live="polite"></div>
    <form class="kza-f"><input type="text" maxlength="300" placeholder="${T.ph}" aria-label="${T.ph}" autocomplete="off"><button type="submit">${T.env}</button></form>`;
  document.body.append(b, p);
  const L = p.querySelector('.kza-l'), F = p.querySelector('form'), I = F.querySelector('input');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Hauteur de la bulle : au-dessus du bandeau mobile et, tant qu'il est affiché, du bandeau cookies (s'ils se chevauchent).
  const bas = () => {
    let y = 18; const H = innerHeight;
    const d = document.querySelector('.dock'); if (d && getComputedStyle(d).display !== 'none' && d.offsetHeight) y = Math.max(y, H - d.getBoundingClientRect().top + 12);
    const k = document.getElementById('kzCookies');
    if (k && !k.hidden && k.offsetHeight) { const r = k.getBoundingClientRect(); if (r.right > innerWidth - 90) y = Math.max(y, H - r.top + 12); }
    document.documentElement.style.setProperty('--kza-bas', Math.round(y) + 'px');
  };
  bas(); addEventListener('resize', bas); setTimeout(bas, 800);
  const kc = document.getElementById('kzCookies'); if (kc) new MutationObserver(bas).observe(kc, { attributes: true, attributeFilter: ['hidden', 'style'] });
  const fin = () => { L.scrollTop = L.scrollHeight; };
  const msg = (html, qui = 'bot') => { const d = document.createElement('div'); d.className = 'kza-m ' + qui; d.innerHTML = html; L.appendChild(d); fin(); return d; };
  function boutons(liste) {
    if (!liste.length) return; const d = document.createElement('div'); d.className = 'kza-a';
    for (const it of liste) {
      const [lab, cible] = Array.isArray(it) ? it : A[it]; if (!lab) continue;
      if (/^(form|quiz):/.test(cible)) { const x = document.createElement('button'); x.type = 'button'; x.textContent = lab; x.onclick = () => action(cible); d.appendChild(x); }
      else { const x = document.createElement('a'); x.href = cible; x.textContent = lab; x.onclick = () => { if (cible.startsWith(BASE + '#') && location.pathname === BASE) fermer(); }; d.appendChild(x); }
    }
    L.appendChild(d); fin(); return d;
  }
  function suggestions() { boutons(SUGG.map(([id, lab]) => [lab, 'quiz:' + (id === 'quiz' ? '' : '@' + id)])); }
  function action(c) {
    if (c.startsWith('form:')) {
      const type = c.slice(5), f = document.getElementById('avisForm');
      if (f) { const r = f.querySelector(`input[name=type][value=${type}]`); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } fermer(); f.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => f.querySelector('textarea')?.focus(), 600); }
      else location.href = (EN ? '/en/contact/' : '/contact/') + '?type=' + type;
      return;
    }
    const q = c.slice(5);
    if (q.startsWith('@')) { const it = INTENTS.find(x => x.id === q.slice(1)); msg(esc(it.k && SUGG.find(s => s[0] === it.id)?.[1] || ''), 'moi'); return repondre(it); }
    quiz(q);
  }
  async function chargerPrix() {
    if (prix) return; try { const d = await (await fetch('/api/code')).json(); const f = c => new Intl.NumberFormat(EN ? 'en-GB' : 'fr-FR', { style: 'currency', currency: 'EUR' }).format(c / 100);
      if (d.prix) prix = { txt: f(d.prix.eur), normal: d.prix.normal > d.prix.eur ? f(d.prix.normal) : '', essai: d.essaiMinutes || 0 }; } catch {}
  }
  function repondre(it) { if (it.quiz) return quiz(''); msg(esc(it.r())); boutons(it.a); }
  async function quiz(t) {
    const m = msg('…');
    try {
      const r = await fetch('/api/aide?quiz=1&lang=' + (EN ? 'en' : 'fr') + (t ? '&t=' + encodeURIComponent(t) : '')); const d = await r.json(); if (!d.q) throw 0;
      m.innerHTML = `<small style="margin:0 0 6px">${esc(T.quizIntro)} · ${esc(THEME[d.t] || '')}</small>${esc(d.q)}`;
      const src = d.s ? `<small>${esc(T.src)} ${esc(d.s)}</small>` : '';
      const suite = () => boutons([[T.autre, 'quiz:' + (t || '')], A.essai]);
      if (d.choix && d.choix.length > 1) {
        const box = document.createElement('div'); box.className = 'kza-a';
        d.choix.forEach((c, i) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = String.fromCharCode(65 + i) + '. ' + c;
          x.onclick = () => { [...box.children].forEach(y => y.disabled = true); const bon = i === d.bonne; x.classList.add(bon ? 'ok' : 'ko'); box.children[d.bonne]?.classList.add('ok');
            msg(bon ? `${esc(T.bonne)}${src}` : `${esc(T.mauvaise)} ${esc(d.r)}${src}`); suite(); };
          box.appendChild(x); });
        L.appendChild(box); fin();
      } else {
        const box = document.createElement('div'); box.className = 'kza-a'; const x = document.createElement('button'); x.type = 'button'; x.textContent = T.voir;
        x.onclick = () => { box.remove(); msg(`${esc(T.rep)} ${esc(d.r)}${src}`); suite(); }; box.appendChild(x); L.appendChild(box); fin();
      }
    } catch { m.textContent = T.quizErr; }
  }
  async function noter(q) { try { await fetch('/api/aide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, lang: EN ? 'en' : 'fr', page: location.pathname }) }); } catch {} }
  F.onsubmit = async e => {
    e.preventDefault(); const q = I.value.trim(); if (!q) return; I.value = ''; msg(esc(q), 'moi');
    await chargerPrix(); const it = chercher(q);
    setTimeout(() => { if (it) repondre(it); else { msg(esc(T.pasCompris)); suggestions(); boutons(['ecrire']); noter(q); } }, 250);
  };
  let ouvert = false, debut = false;
  function ouvrir() { ouvert = true; p.hidden = false; b.setAttribute('aria-expanded', 'true'); document.querySelector('.kza-tip')?.remove(); try { localStorage.setItem('kounouzi_aide_vue', '1'); } catch {}
    if (!debut) { debut = true; chargerPrix(); msg(esc(T.hello)); suggestions(); } setTimeout(() => I.focus(), 50); }
  function fermer() { ouvert = false; p.hidden = true; b.setAttribute('aria-expanded', 'false'); }
  b.onclick = () => (ouvert ? fermer() : ouvrir());
  p.querySelector('.kza-h button').onclick = fermer;
  addEventListener('keydown', e => { if (e.key === 'Escape' && ouvert) { fermer(); b.focus(); } });
  // Première visite : la pastille pulse et une petite bulle « Une question ? » s'affiche quelques secondes, une seule fois.
  let vue = false; try { vue = !!localStorage.getItem('kounouzi_aide_vue'); } catch {}
  if (!vue) setTimeout(() => { if (ouvert) return; b.classList.add('pulse'); const tip = document.createElement('div'); tip.className = 'kza-tip'; tip.textContent = T.tip; tip.onclick = ouvrir; document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 6000); try { localStorage.setItem('kounouzi_aide_vue', '1'); } catch {} }, 4000);
})();
