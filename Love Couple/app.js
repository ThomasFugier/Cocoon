const STORAGE_KEY = "duo-secret-v1";
const UNLOCK_TIMEOUT_MS = 5 * 60 * 1000;

const LEVELS = [
  { value: 0, label: "😶", hint: "Pas pour moi" },
  { value: 1, label: "🙂", hint: "Curieux" },
  { value: 2, label: "😍", hint: "Partant" },
  { value: 3, label: "🔥", hint: "Tres envie" }
];

const COLORS = [
  { key: "ruby", label: "Rouge Tentation", hex: "#e86689" },
  { key: "mint", label: "Corail Nude", hex: "#ef8e82" },
  { key: "peach", label: "Abricot Brulant", hex: "#f3a06f" },
  { key: "sun", label: "Mandarine Douce", hex: "#e9ad6b" },
  { key: "rose", label: "Rose Velvet", hex: "#f27aad" },
  { key: "teal", label: "Prune Desire", hex: "#b06cae" },
  { key: "lilac", label: "Violet Satin", hex: "#b08de8" },
  { key: "sky", label: "Lavande Sexy", hex: "#9e86e6" }
];

const CARD_SETS = {
  "Vanille": [
    { title: "Baiser lent de 5 minutes", type: "practice", moods: ["leger", "sensuel"], blurb: "Sans parler, vous restez connectes et vous suivez le rythme de l autre." },
    { title: "Massage nuque et epaules", type: "practice", moods: ["leger"], blurb: "Un relachement simple pour installer une ambiance douce." },
    { title: "Caresse des mains", type: "practice", moods: ["leger"], blurb: "Explorer les doigts, paumes et poignets avec attention." },
    { title: "Regard soutenu", type: "practice", moods: ["sensuel"], blurb: "Deux minutes yeux dans les yeux pour monter la tension." },
    { title: "Douche romantique", type: "practice", moods: ["leger", "sensuel"], blurb: "Eau chaude, gestes lents et complicite sans objectif." },
    { title: "Film sous plaid", type: "practice", moods: ["leger"], blurb: "Choisir un film court et rester colles tout du long." },
    { title: "Danse lente salon", type: "practice", moods: ["leger", "sensuel"], blurb: "Une chanson, lumieres basses, proches l un de l autre." },
    { title: "Compliments corporels", type: "discussion", moods: ["leger", "sensuel"], blurb: "Dire trois choses concretes que vous aimez chez l autre." },
    { title: "Respiration synchronisee", type: "practice", moods: ["leger"], blurb: "Caler vos respirations pendant 3 minutes allonges." },
    { title: "Prelude playlist", type: "practice", moods: ["sensuel"], blurb: "Construire une mini playlist de 5 titres qui vous excitent." },
    { title: "Baiser cou et clavicule", type: "practice", moods: ["sensuel"], blurb: "Explorer le haut du corps avec des gestes tres lents." },
    { title: "Petit dejeuner au lit", type: "practice", moods: ["leger"], blurb: "Un matin complice pour prolonger la tendresse." },
    { title: "Sieste peau contre peau", type: "practice", moods: ["leger", "sensuel"], blurb: "Se poser 20 minutes sans ecran et sans parler." },
    { title: "Huile parfumee", type: "practice", moods: ["sensuel"], blurb: "Massage lent avec une huile choisie ensemble." },
    { title: "Baiser surprise cuisine", type: "practice", moods: ["leger"], blurb: "Voler un vrai moment a deux dans une routine." },
    { title: "Je te guide la main", type: "practice", moods: ["sensuel"], blurb: "Montrer ce que vous aimez avec douceur et precision." },
    { title: "Duo bain chaud", type: "practice", moods: ["leger", "sensuel"], blurb: "Bain, musique douce et gestes tranquilles." },
    { title: "Jeu des frissons", type: "practice", moods: ["sensuel"], blurb: "Effleurer differentes zones et nommer ce qui plait." },
    { title: "Cocooning pluie", type: "practice", moods: ["leger"], blurb: "Jour de pluie, lumiere tamisee, temps lent a deux." },
    { title: "Baiser apres dispute", type: "discussion", moods: ["leger"], blurb: "Rituel de reconnexion apres un desaccord mineur." },
    { title: "Sourire et silence", type: "practice", moods: ["leger"], blurb: "Un moment sans mots juste pour retrouver l autre." },
    { title: "Dos contre torse", type: "practice", moods: ["sensuel"], blurb: "Etre enlace longtemps sans aller plus loin." },
    { title: "Rituel bonne nuit", type: "practice", moods: ["leger"], blurb: "Creer un geste intime fixe chaque soir." },
    { title: "Je te decris", type: "discussion", moods: ["sensuel"], blurb: "Dire ce qui vous attire dans le moment present." },
    { title: "Main dans les cheveux", type: "practice", moods: ["leger", "sensuel"], blurb: "Geste simple, lent et tres rassurant." },
    { title: "Baiser pulse", type: "practice", moods: ["sensuel"], blurb: "Changer rythme et intensite a tour de role." },
    { title: "Pause sans telephone", type: "practice", moods: ["leger"], blurb: "30 minutes dediees uniquement a votre lien." },
    { title: "Jeu des 3 envies", type: "discussion", moods: ["leger", "sensuel"], blurb: "Chacun propose trois idees simples pour ce soir." },
    { title: "Caresse ventre et hanches", type: "practice", moods: ["sensuel"], blurb: "Explorer des zones souvent oubliees." },
    { title: "Minute gratitude intime", type: "discussion", moods: ["leger"], blurb: "Remercier l autre pour un geste de la semaine." }
  ],
  "BDSM": [
    { title: "Echelle d intensite", type: "discussion", moods: ["aventureux"], blurb: "Definir vos niveaux de confort de 1 a 5 avant de jouer." },
    { title: "Mot de securite trio", type: "discussion", moods: ["leger", "aventureux"], blurb: "Choisir stop, ralentir, et check ensemble." },
    { title: "Bandeau et guidance", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Un partenaire guide l autre verbalement avec douceur." },
    { title: "Consignes douces", type: "practice", moods: ["aventureux"], blurb: "Donner des instructions simples, claires, consenties." },
    { title: "Role dominant 10 min", type: "practice", moods: ["aventureux"], blurb: "Essai court pour tester la dynamique sans pression." },
    { title: "Role soumis 10 min", type: "practice", moods: ["aventureux"], blurb: "Lacher prise dans un cadre defini ensemble." },
    { title: "Bondage poignets consensuel", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Attacher les poignets avec regles claires et checks reguliers." },
    { title: "Jeu de permission", type: "practice", moods: ["aventureux"], blurb: "Demander la permission pour chaque etape du jeu." },
    { title: "Ordres murmurés", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Voix basse, ton ferme, cadre bienveillant." },
    { title: "Position tenue et regard", type: "practice", moods: ["aventureux"], blurb: "Maintenir une posture plus intense pendant que l autre guide." },
    { title: "Jeu d attente", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Faire monter le desir en imposant de petites pauses." },
    { title: "Interdits du soir", type: "discussion", moods: ["aventureux"], blurb: "Lister clairement ce qui est non negociable." },
    { title: "Autorisation de toucher", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Toucher seulement apres signal ou consentement verbal." },
    { title: "Code couleur emotion", type: "discussion", moods: ["leger", "aventureux"], blurb: "Vert orange rouge pour garder le jeu securise." },
    { title: "Jeu de regard dominant", type: "practice", moods: ["sensuel"], blurb: "Diriger sans parole par posture et regard." },
    { title: "Rituel debut scene", type: "practice", moods: ["aventureux"], blurb: "Phrase ou geste qui marque l entree en jeu." },
    { title: "Rituel fin scene", type: "practice", moods: ["leger", "aventureux"], blurb: "Sortir de la dynamique avec douceur." },
    { title: "Aftercare 15 minutes", type: "practice", moods: ["leger"], blurb: "Hydrater, enlacer, verbaliser les ressentis." },
    { title: "Relecture des limites", type: "discussion", moods: ["leger"], blurb: "Ce qui etait bien, trop, ou a ajuster." },
    { title: "Scenario pouvoir doux", type: "practice", moods: ["aventureux"], blurb: "Mini role-play axé consentement et langage." },
    { title: "Stop and breathe", type: "practice", moods: ["aventureux"], blurb: "Pause imposee pour checker le confort mutuel." },
    { title: "Jeu de privation visuelle", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Bandeau et guidance tactile lente." },
    { title: "Ordre puis recompense", type: "practice", moods: ["aventureux"], blurb: "Associer consigne respectee et feedback positif." },
    { title: "Question de consentement sexy", type: "discussion", moods: ["sensuel"], blurb: "Demander clairement ce qui excite vraiment." },
    { title: "Fessee consensuelle progressive", type: "practice", moods: ["aventureux"], blurb: "Rythme progressif, zones securisees, mot de pause actif." },
    { title: "Distance imposee", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Rester proches sans se toucher pendant une minute." },
    { title: "Guidage vocal uniquement", type: "practice", moods: ["aventureux"], blurb: "Aucun geste, seulement la voix pour mener." },
    { title: "Edging controle", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Faire monter tres haut puis redescendre avant l orgasme." },
    { title: "Contrat d un soir", type: "discussion", moods: ["aventureux"], blurb: "Poser les regles avant de commencer." },
    { title: "Debrief scene", type: "discussion", moods: ["leger"], blurb: "Dire ce qui a plu et ce qui doit changer." }
  ],
  "Jeux de rôle": [
    { title: "Inconnus dans un bar", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Se retrouver comme si c etait la premiere fois." },
    { title: "Message mystere", type: "practice", moods: ["leger", "sensuel"], blurb: "Envoyer un brief de personnage avant de se voir." },
    { title: "Code secret de rendez-vous", type: "practice", moods: ["leger"], blurb: "Un mot qui lance le role-play dans la soiree." },
    { title: "Hotel imaginaire", type: "practice", moods: ["sensuel"], blurb: "Transformer la chambre en suite de week-end." },
    { title: "Premier date version 2", type: "practice", moods: ["leger", "sensuel"], blurb: "Se poser des questions comme au debut." },
    { title: "Guide et voyageur", type: "practice", moods: ["aventureux"], blurb: "Un partenaire mene, l autre se laisse surprendre." },
    { title: "Coach et star", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Jeu de confiance et de valorisation." },
    { title: "Late check-in", type: "practice", moods: ["sensuel"], blurb: "Scene d arrivee tardive et tension douce." },
    { title: "Voix anonyme", type: "practice", moods: ["aventureux"], blurb: "Jouer un personnage avec une voix differente." },
    { title: "Rendez-vous interdit", type: "practice", moods: ["aventureux"], blurb: "Fiction de secret et d envie retenue." },
    { title: "Prof et eleve adulte", type: "practice", moods: ["aventureux"], blurb: "Role-play consensuel et adulte, cadre clarifie." },
    { title: "Patron et negociateur", type: "practice", moods: ["aventureux"], blurb: "Jeu de pouvoir verbal et d accords." },
    { title: "Message vocal tease", type: "practice", moods: ["sensuel"], blurb: "Lancer le scenario avant la rencontre." },
    { title: "Jeu de costume", type: "practice", moods: ["leger", "aventureux"], blurb: "Un accessoire suffit pour changer l energie." },
    { title: "Role discret en public", type: "practice", moods: ["leger", "aventureux"], blurb: "Codes complices en restant respectueux." },
    { title: "Scenariste a deux", type: "discussion", moods: ["leger"], blurb: "Ecrire ensemble les 5 etapes du jeu." },
    { title: "Mot de scene", type: "discussion", moods: ["leger"], blurb: "Choisir debut, pause, fin avant de jouer." },
    { title: "Role de reunion", type: "practice", moods: ["leger", "aventureux"], blurb: "Improviser une scene courte et complice." },
    { title: "Aeroport retrouvailles", type: "practice", moods: ["sensuel"], blurb: "Simuler une attente longue puis retrouvailles." },
    { title: "Surnoms du soir", type: "practice", moods: ["leger", "sensuel"], blurb: "Adopter de nouveaux noms le temps d une nuit." },
    { title: "Invitation cachee", type: "practice", moods: ["sensuel"], blurb: "Laisser un mot suggestif dans l appart." },
    { title: "Carte mission", type: "practice", moods: ["aventureux"], blurb: "Chaque partenaire tire une mission playful." },
    { title: "Nuit cinema prive", type: "practice", moods: ["leger", "sensuel"], blurb: "Pretendre que vous louez une salle juste pour vous." },
    { title: "Decouverte guidee", type: "practice", moods: ["sensuel"], blurb: "Un partenaire decrit l experience pas a pas." },
    { title: "Role de confidence", type: "practice", moods: ["leger"], blurb: "Jeu axé intimite emotionnelle avant le physique." },
    { title: "Lettres de personnage", type: "discussion", moods: ["leger"], blurb: "Ecrire deux mini bios pour nourrir la scene." },
    { title: "Scene en trois actes", type: "practice", moods: ["aventureux"], blurb: "Debut doux, tension, final tendre." },
    { title: "Check consentement en role", type: "discussion", moods: ["leger"], blurb: "Valider ce qui reste fiction ou non." },
    { title: "Role inversé", type: "practice", moods: ["aventureux"], blurb: "Rejouer la meme scene en inversant les roles." },
    { title: "After role cuddle", type: "practice", moods: ["leger"], blurb: "Sortie de role avec reconnexion affective." }
  ],
  "Communication": [
    { title: "Mes 3 zones preferees", type: "discussion", moods: ["leger", "sensuel"], blurb: "Nommer precisement ce qui vous plait le plus." },
    { title: "Ce que je veux plus", type: "discussion", moods: ["leger"], blurb: "Dire ce que vous souhaitez intensifier." },
    { title: "Ce que je veux moins", type: "discussion", moods: ["leger"], blurb: "Poser des limites claires sans culpabilite." },
    { title: "Mots qui excitent", type: "discussion", moods: ["sensuel"], blurb: "Partager le vocabulaire qui vous allume." },
    { title: "Mots a eviter", type: "discussion", moods: ["leger"], blurb: "Identifier ce qui casse votre desir." },
    { title: "Feedback en sandwich", type: "discussion", moods: ["leger"], blurb: "Un point adore, un ajustement, un point adore." },
    { title: "Feu vert actuel", type: "discussion", moods: ["leger"], blurb: "Ce soir je suis ok pour... et pas pour..." },
    { title: "Echelle de desir", type: "discussion", moods: ["leger", "sensuel"], blurb: "Se noter de 1 a 10 au debut et a la fin." },
    { title: "Fantasme soft partage", type: "discussion", moods: ["sensuel"], blurb: "Decrire une idee qui vous excite sans pression." },
    { title: "Fantasme a garder fiction", type: "discussion", moods: ["leger"], blurb: "Distinguer ce qui reste imaginaire." },
    { title: "Question intime du jour", type: "discussion", moods: ["leger"], blurb: "Une seule question pour nourrir le lien." },
    { title: "Debrief post moment", type: "discussion", moods: ["leger"], blurb: "Qu est ce qui etait top pour toi?" },
    { title: "Signal non verbal", type: "discussion", moods: ["leger"], blurb: "Choisir un geste pour ralentir sans parler." },
    { title: "Tempo ideal", type: "discussion", moods: ["sensuel"], blurb: "Rapide, moyen, lent: ce qui vous convient." },
    { title: "Preference ambiance", type: "discussion", moods: ["leger"], blurb: "Lumiere, musique, odeur: vos settings favoris." },
    { title: "Consentement continu", type: "discussion", moods: ["leger"], blurb: "Rappeler que le oui peut changer." },
    { title: "Avant pendant apres", type: "discussion", moods: ["leger"], blurb: "Ce qui compte le plus a chaque phase." },
    { title: "Top 5 caresses", type: "discussion", moods: ["sensuel"], blurb: "Classer vos gestes preferes." },
    { title: "Rituel securite", type: "discussion", moods: ["leger"], blurb: "Hydratation, mot pause, check energie." },
    { title: "Parler plus sale ou pas", type: "discussion", moods: ["sensuel"], blurb: "Poser les attentes sur le dirty talk." },
    { title: "Confiance et pudeur", type: "discussion", moods: ["leger"], blurb: "Dire ce qui vous met a l aise." },
    { title: "Je me sens desire quand...", type: "discussion", moods: ["sensuel"], blurb: "Completer la phrase chacun votre tour." },
    { title: "Limites temporaires", type: "discussion", moods: ["leger"], blurb: "Ce qui est non pour cette periode." },
    { title: "Oui conditionnel", type: "discussion", moods: ["leger", "aventureux"], blurb: "Definir les conditions qui rendent ok." },
    { title: "Aftercare ideal", type: "discussion", moods: ["leger"], blurb: "Calin, douche, silence, paroles: vos besoins." },
    { title: "Temps de reconnexion", type: "discussion", moods: ["leger"], blurb: "Combien de temps il vous faut apres." },
    { title: "Frein mental actuel", type: "discussion", moods: ["leger"], blurb: "Nommer sans jugement ce qui bloque." },
    { title: "Contexte qui excite", type: "discussion", moods: ["sensuel"], blurb: "Quand et ou vous vous sentez le plus ouverts." },
    { title: "Consentement sexy", type: "discussion", moods: ["sensuel"], blurb: "Trouver des formulations excitantes et claires." },
    { title: "Bilan du mois", type: "discussion", moods: ["leger"], blurb: "Regarder ce qui a evolue dans votre intimite." }
  ],
  "Sensations": [
    { title: "Plume sur la peau", type: "practice", moods: ["sensuel"], blurb: "Explorer legerement les zones de frisson." },
    { title: "Glacon doux", type: "practice", moods: ["aventureux"], blurb: "Froid tres leger puis chaleur de la main." },
    { title: "Serviette chaude", type: "practice", moods: ["sensuel"], blurb: "Contraste thermique en douceur." },
    { title: "Soie et coton", type: "practice", moods: ["sensuel"], blurb: "Comparer textures et reactions." },
    { title: "Parfum choisi", type: "practice", moods: ["leger", "sensuel"], blurb: "Associer une odeur a votre moment intime." },
    { title: "Musique basse", type: "practice", moods: ["leger"], blurb: "Tester comment le son change vos gestes." },
    { title: "Lumiere tamisee", type: "practice", moods: ["leger", "sensuel"], blurb: "Ajuster l ambiance pour renforcer la sensation." },
    { title: "Respiration oreille", type: "practice", moods: ["sensuel"], blurb: "Proximite et souffle sans contact fort." },
    { title: "Peau contre peau lente", type: "practice", moods: ["sensuel"], blurb: "Bouger tres lentement pour sentir les details." },
    { title: "Huile chauffante douce", type: "practice", moods: ["sensuel"], blurb: "Massage progressif avec temperature confortable." },
    { title: "Couverture lourde", type: "practice", moods: ["leger"], blurb: "Rassurance corporelle et apaisement." },
    { title: "Bain moussant", type: "practice", moods: ["leger", "sensuel"], blurb: "Relaxation et contact sans urgence." },
    { title: "Mains glacees puis chaudes", type: "practice", moods: ["aventureux"], blurb: "Mini contrastes sur zones non sensibles." },
    { title: "Pieds et mollets", type: "practice", moods: ["leger"], blurb: "Detente corporelle souvent sous-estimee." },
    { title: "Vibration musicale", type: "practice", moods: ["sensuel"], blurb: "Sentir les basses proches du corps." },
    { title: "Douche alternance", type: "practice", moods: ["aventureux"], blurb: "Tres leger chaud/frais pour reveiller les sens." },
    { title: "Fellation rythme guide", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Explorer profondeur, rythme et pauses en communication constante." },
    { title: "Cunnilingus attentif", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Prendre le temps, ajuster pression et vitesse selon feedback." },
    { title: "Tissu sur les yeux", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Moins de vision, plus de sensations." },
    { title: "Position 69 lente", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Rester synchrones et privilegier le rythme plutot que la vitesse." },
    { title: "Silence total", type: "practice", moods: ["leger"], blurb: "Couper les bruits pour ecouter le corps." },
    { title: "Chuchotements", type: "practice", moods: ["sensuel"], blurb: "Voix basse au creux de l oreille." },
    { title: "Sensation de poids", type: "practice", moods: ["sensuel"], blurb: "Pression douce des mains sur le torse." },
    { title: "Caresse au ralenti", type: "practice", moods: ["sensuel"], blurb: "Allonger chaque geste pour amplifier." },
    { title: "Levrette lente", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Maintenir une cadence lente avec contact verbal et corporel." },
    { title: "Chaleur de la paume", type: "practice", moods: ["leger", "sensuel"], blurb: "Poser la main fixe pour apaiser." },
    { title: "Tension et relachement", type: "practice", moods: ["leger"], blurb: "Contracter puis detendre pour sentir mieux." },
    { title: "Bruit blanc + calin", type: "practice", moods: ["leger"], blurb: "Creer une bulle sensorielle calme." },
    { title: "Texture velours", type: "practice", moods: ["sensuel"], blurb: "Tester matieres douces sur le cou et les bras." },
    { title: "Penetration lente en face a face", type: "practice", moods: ["sensuel", "aventureux"], blurb: "Garder le regard et caler les mouvements sur la respiration." }
  ]
};

const CARD_PREFIX = { "Vanille": "v", BDSM: "b", "Jeux de rôle": "r", Communication: "a", Sensations: "s" };

let CARDS = Object.entries(CARD_SETS).flatMap(([category, items]) =>
  items.map((item, index) => ({
    id: `${CARD_PREFIX[category]}${String(index + 1).padStart(2, "0")}`,
    title: item.title,
    category,
    type: item.type,
    moods: item.moods,
    blurb: item.blurb
  }))
);

let CATEGORIES = ["Toutes", ...new Set(CARDS.map((card) => card.category))];
let FIRST_ROUND_IDS = CARDS.slice(0, 10).map((card) => card.id);

function refreshCardIndexes() {
  CATEGORIES = ["Toutes", ...new Set(CARDS.map((card) => card.category))];
  FIRST_ROUND_IDS = CARDS.slice(0, 10).map((card) => card.id);
}

const defaultState = {
  profiles: {
    A: { id: "A", name: "Partenaire 1", sex: "", color: "rose", pinHash: "" },
    B: { id: "B", name: "Partenaire 2", sex: "", color: "mint", pinHash: "" }
  },
  votes: { A: {}, B: {} },
  matchThreshold: 1,
  coupleCodeHash: "",
  onboardingDone: false,
  phaseTwoDone: false,
  revealedMatchIds: [],
  updatedAt: Date.now()
};

let state = loadState();
let unlocked = { A: 0, B: 0 };
let activeTab = "for-you";
let scanner = null;
let onboardingHideTimer = null;
let loginHideTimer = null;
let connectToastTimer = null;
let envieModalHideTimer = null;
let revealFlowHideTimer = null;
let onboardingStep = 0;
let sessionState = null;
let revealState = null;
let connectedProfileId = null;
let loginState = { profileId: "A", pin: "" };
let currentEnvieCardId = null;
let currentEnvieContext = "default";
let pendingMatchBounceIds = [];
let pendingForYouContext = null;
let lastForYouScrollTop = 0;
const onboardingDraft = {
  A: { name: "", sex: "autre", pin: "", color: "rose" },
  B: { name: "", sex: "autre", pin: "", color: "mint" }
};

const ONBOARDING_STEPS = [
  { key: "welcome", profile: null, title: "Bienvenue", sub: "Glissez doucement dans votre bulle." },
  { key: "name", profile: "A", title: "Premier prenom", sub: "" },
  { key: "persona", profile: "A", title: "Choix rapide", sub: "" },
  { key: "color", profile: "A", title: "Choisis une couleur", sub: "" },
  { key: "pin", profile: "A", title: "Code secret", sub: "" },
  { key: "name", profile: "B", title: "Deuxieme prenom", sub: "" },
  { key: "persona", profile: "B", title: "Choix rapide", sub: "" },
  { key: "color", profile: "B", title: "Choisis une couleur", sub: "" },
  { key: "pin", profile: "B", title: "Code secret", sub: "" },
  { key: "done", profile: null, title: "C'est pret", sub: "Vos profils sont verrouilles. Seuls les matches seront reveles." }
];

const el = {
  topbar: document.querySelector(".topbar"),
  tabs: Array.from(document.querySelectorAll(".tab-btn")),
  panels: Array.from(document.querySelectorAll(".tab-panel")),
  matchThreshold: document.getElementById("match-threshold"),
  coupleCode: document.getElementById("couple-code"),
  saveCoupleCode: document.getElementById("save-couple-code"),
  coupleTitle: document.getElementById("couple-title"),
  coupleVibe: document.getElementById("couple-vibe"),
  coupleMatchCount: document.getElementById("couple-match-count"),
  coupleSharedCount: document.getElementById("couple-shared-count"),
  coupleProgress: document.getElementById("couple-progress"),
  coupleSharedList: document.getElementById("couple-shared-list"),
  coupleRevealHint: document.getElementById("couple-reveal-hint"),
  coupleRevealBtn: document.getElementById("couple-reveal-btn"),
  coupleReplayBtn: document.getElementById("couple-replay-btn"),
  categoryFilter: document.getElementById("category-filter"),
  typeFilter: document.getElementById("type-filter"),
  connectedHint: document.getElementById("connected-hint"),
  cardsHint: document.getElementById("cards-hint"),
  cardsList: document.getElementById("cards-list"),
  forYouFeed: document.getElementById("for-you-feed"),
  moodFilter: document.getElementById("mood-filter"),
  revealBtn: document.getElementById("reveal-btn"),
  surpriseBtn: document.getElementById("surprise-btn"),
  matchHint: document.getElementById("match-hint"),
  tonightPicks: document.getElementById("tonight-picks"),
  matchesList: document.getElementById("matches-list"),
  exportProfile: document.getElementById("export-profile"),
  exportQr: document.getElementById("export-qr"),
  startScan: document.getElementById("start-scan"),
  qrOutput: document.getElementById("qr-output"),
  scannerNode: document.getElementById("scanner"),
  payloadInput: document.getElementById("payload-input"),
  importPayload: document.getElementById("import-payload"),
  syncStatus: document.getElementById("sync-status"),
  onboarding: document.getElementById("onboarding"),
  onProgress: document.getElementById("on-progress"),
  onTitle: document.getElementById("on-title"),
  onSub: document.getElementById("on-sub"),
  onFlow: document.querySelector(".on-flow"),
  onLive: document.getElementById("on-live"),
  onStage: document.getElementById("on-stage"),
  onError: document.getElementById("on-error"),
  onBack: document.getElementById("on-back"),
  onNext: document.getElementById("on-next"),
  guidedLane: document.getElementById("guided-lane"),
  guidedKicker: document.getElementById("guided-kicker"),
  guidedTitle: document.getElementById("guided-title"),
  guidedSub: document.getElementById("guided-sub"),
  guidedAction: document.getElementById("guided-action"),
  sessionFlow: document.getElementById("session-flow"),
  sessionProfile: document.getElementById("session-profile"),
  sessionProgress: document.getElementById("session-progress"),
  sessionTitle: document.getElementById("session-title"),
  sessionMeta: document.getElementById("session-meta"),
  sessionLevels: Array.from(document.querySelectorAll(".session-level")),
  sessionStop: document.getElementById("session-stop"),
  envieModal: document.getElementById("envie-modal"),
  envieModalKicker: document.getElementById("envie-modal-kicker"),
  envieModalTitle: document.getElementById("envie-modal-title"),
  envieModalBlurb: document.getElementById("envie-modal-blurb"),
  envieModalDuo: document.getElementById("envie-modal-duo"),
  envieModalLevels: document.getElementById("envie-modal-levels"),
  envieModalClose: document.getElementById("envie-modal-close"),
  revealFlow: document.getElementById("reveal-flow"),
  revealKicker: document.getElementById("reveal-kicker"),
  revealTitle: document.getElementById("reveal-title"),
  revealSub: document.getElementById("reveal-sub"),
  revealCard: document.getElementById("reveal-card"),
  revealNext: document.getElementById("reveal-next"),
  revealClose: document.getElementById("reveal-close"),
  connectFab: document.getElementById("connect-fab"),
  connectIcon: document.getElementById("connect-icon"),
  connectLabel: document.getElementById("connect-label"),
  connectToast: document.getElementById("connect-toast"),
  loginSheet: document.getElementById("login-sheet"),
  loginA: document.getElementById("login-profile-a"),
  loginB: document.getElementById("login-profile-b"),
  loginDots: document.getElementById("login-dots"),
  loginPad: document.getElementById("login-pad"),
  loginError: document.getElementById("login-error"),
  loginClose: document.getElementById("login-close")
};

init();

async function init() {
  await loadCardsDatabase();
  setupTabs();
  setupProfiles();
  setupControls();
  setupOnboarding();
  setActiveTab(activeTab);
  renderAll();
  if (!window.isSecureContext) {
    el.startScan.disabled = true;
    setSyncStatus("Mode sans serveur detecte: scan camera indisponible, utilisez export/coller.", false);
  }
  updateHeaderScrollState();
}

async function loadCardsDatabase() {
  try {
    const response = await fetch("./cards.csv", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const raw = await response.text();
    const parsed = parseCardsCsv(raw);
    if (!parsed.length) {
      return;
    }
    CARDS = parsed;
    refreshCardIndexes();
  } catch (error) {
    // fallback to embedded cards
  }
}

function parseCardsCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return [];
  }

  const header = rows[0].map((cell, index) => {
    const normalized = index === 0 ? cell.replace(/^\uFEFF/, "") : cell;
    return normalized.trim().toLowerCase();
  });
  const idx = {
    id: header.indexOf("id"),
    title: header.indexOf("title"),
    category: header.indexOf("category"),
    type: header.indexOf("type"),
    moods: header.indexOf("moods"),
    blurb: header.indexOf("blurb")
  };

  const required = [idx.title, idx.category, idx.type, idx.moods, idx.blurb];
  if (required.some((value) => value < 0)) {
    return [];
  }

  return rows.slice(1)
    .map((row, rowIndex) => {
      const title = (row[idx.title] || "").trim();
      const category = (row[idx.category] || "").trim();
      const type = (row[idx.type] || "practice").trim();
      const moodsRaw = (row[idx.moods] || "").trim();
      const blurb = (row[idx.blurb] || "").trim();
      const providedId = idx.id >= 0 ? (row[idx.id] || "").trim() : "";

      if (!title || !category || !blurb) {
        return null;
      }

      const moods = moodsRaw
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

      const safeType = type === "discussion" ? "discussion" : "practice";
      const safeMoods = moods.length ? moods : ["leger"];
      const fallbackPrefix = CARD_PREFIX[category] || "c";
      const id = providedId || `${fallbackPrefix}${String(rowIndex + 1).padStart(2, "0")}`;

      return {
        id,
        title,
        category,
        type: safeType,
        moods: safeMoods,
        blurb
      };
    })
    .filter(Boolean);
}

function parseCsvRows(input) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === "\"") {
      if (inQuotes && input[i + 1] === "\"") {
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && input[i + 1] === "\n") {
        i += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function setupOnboarding() {
  hydrateOnboardingDraft();
  el.onBack.addEventListener("click", onOnboardingBack);
  el.onNext.addEventListener("click", onOnboardingNext);

  if (shouldShowOnboarding()) {
    openOnboarding();
  }
}

function setupTabs() {
  el.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.dataset.tab);
    });
  });
}

function hydrateOnboardingDraft() {
  onboardingDraft.A.name = state.profiles.A.name !== "Partenaire 1" ? state.profiles.A.name : "";
  onboardingDraft.A.sex = state.profiles.A.sex || "autre";
  onboardingDraft.A.pin = "";
  onboardingDraft.A.color = state.profiles.A.color || "rose";
  onboardingDraft.B.name = state.profiles.B.name !== "Partenaire 2" ? state.profiles.B.name : "";
  onboardingDraft.B.sex = state.profiles.B.sex || "autre";
  onboardingDraft.B.pin = "";
  onboardingDraft.B.color = state.profiles.B.color || "mint";
}

function shouldShowOnboarding() {
  return !hasPrimaryOnboardingComplete();
}

function hasPrimaryOnboardingComplete() {
  const hasPins = Boolean(state.profiles.A.pinHash && state.profiles.B.pinHash);
  const hasRealNames = state.profiles.A.name !== "Partenaire 1" && state.profiles.B.name !== "Partenaire 2";
  return Boolean(state.onboardingDone && hasPins && hasRealNames);
}

function openOnboarding() {
  if (onboardingHideTimer) {
    window.clearTimeout(onboardingHideTimer);
    onboardingHideTimer = null;
  }
  document.body.classList.add("onboarding-active");
  el.onboarding.classList.remove("closing");
  el.onboarding.hidden = false;
  goOnboardingStep(0, true);
}

function closeOnboarding() {
  el.onboarding.classList.add("closing");
  onboardingHideTimer = window.setTimeout(() => {
    el.onboarding.hidden = true;
    el.onboarding.classList.remove("closing");
    document.body.classList.remove("onboarding-active");
    renderConnectionUi();
    renderGuidedLane();
    onboardingHideTimer = null;
  }, 260);
}

function goOnboardingStep(step, immediate = false) {
  onboardingStep = step;
  el.onError.textContent = "";
  if (immediate) {
    renderOnboardingStep();
    return;
  }
  el.onFlow.classList.add("step-fade-out");
  window.setTimeout(() => {
    renderOnboardingStep();
    el.onFlow.classList.remove("step-fade-out");
  }, 220);
}

function renderOnboardingStep() {
  const step = ONBOARDING_STEPS[onboardingStep];
  const totalInteractive = ONBOARDING_STEPS.length - 1;
  el.onProgress.textContent = onboardingStep === 0 ? "COCOON" : `ETAPE ${onboardingStep}/${totalInteractive}`;
  el.onTitle.textContent = step.title;
  el.onSub.textContent = step.key === "done" ? "" : (step.sub || stepSubtitle(step));
  el.onTitle.style.setProperty("--on-accent", profileAccent(step.profile));
  el.onLive.innerHTML = buildLiveSummary(step);

  el.onBack.style.visibility = onboardingStep === 0 ? "hidden" : "visible";
  el.onBack.style.display = onboardingStep === 0 ? "none" : "inline-flex";
  el.onNext.textContent = onboardingStep === ONBOARDING_STEPS.length - 1 ? "Entrer" : onboardingStep === 0 ? "Commencer" : "Suivant";

  el.onStage.innerHTML = buildOnboardingStage(step);
  wireOnboardingStage(step);
}

function stepSubtitle(step) {
  if (step.key === "name") {
    return "";
  }
  if (step.key === "persona") {
    return "";
  }
  if (step.key === "color") {
    return "Le prenom prend la teinte choisie.";
  }
  if (step.key === "pin") {
    return "";
  }
  return "";
}

function buildLiveSummary(step) {
  if (step.key === "welcome") {
    return "";
  }
  if (step.key === "done") {
    return `<div class="done-names">
      <span class="name-preview" style="--on-accent:${colorHex(onboardingDraft.A.color)}">${escapeHtml(onboardingDraft.A.name || "Partenaire")}</span>
      <span class="name-preview" style="--on-accent:${colorHex(onboardingDraft.B.color)}">${escapeHtml(onboardingDraft.B.name || "Partenaire")}</span>
    </div>`;
  }
  const draft = onboardingDraft[step.profile];
  const parts = [];
  if (draft.name.trim()) {
    parts.push(`<strong>${escapeHtml(draft.name)}</strong>`);
  }
  if (step.key !== "name") {
    parts.push(`<span>${personaLabel(draft.sex)}</span>`);
  }
  if (step.key === "color" || step.key === "pin") {
    parts.push(`<span class="live-color" style="--live-color:${colorHex(draft.color)}">${colorLabel(draft.color)}</span>`);
  }
  return parts.length ? `<div class="live-chip">${parts.join('<span class="live-sep">•</span>')}</div>` : "";
}

function personaLabel(value) {
  if (value === "homme") {
    return "Masculin";
  }
  if (value === "femme") {
    return "Feminin";
  }
  return "Neutre";
}

function colorLabel(key) {
  const color = COLORS.find((c) => c.key === key);
  return color ? color.label : "Couleur";
}

async function commitOnboarding() {
  for (const profileId of ["A", "B"]) {
    const draft = onboardingDraft[profileId];
    state.profiles[profileId].name = draft.name;
    state.profiles[profileId].sex = draft.sex;
    state.profiles[profileId].color = draft.color;
    state.profiles[profileId].pinHash = await hashText(draft.pin);
  }
  state.onboardingDone = true;
  state.updatedAt = Date.now();
  saveState();
}

function buildOnboardingStage(step) {
  if (step.key === "welcome") {
    return "";
  }
  if (step.key === "name") {
    const draft = onboardingDraft[step.profile];
    return `<input id="on-name-input" class="on-name" maxlength="24" placeholder="Prenom" value="${escapeHtml(draft.name)}" />`;
  }
  if (step.key === "persona") {
    const draft = onboardingDraft[step.profile];
    return `<div class="persona-row">
      <button type="button" class="persona-btn ${draft.sex === "homme" ? "active" : ""}" data-sex="homme">Masculin</button>
      <button type="button" class="persona-btn ${draft.sex === "femme" ? "active" : ""}" data-sex="femme">Feminin</button>
      <button type="button" class="persona-btn ${draft.sex === "autre" ? "active" : ""}" data-sex="autre">Neutre</button>
    </div>`;
  }
  if (step.key === "color") {
    const draft = onboardingDraft[step.profile];
    const swatches = COLORS.map((color) => `<button type="button" class="color-btn ${draft.color === color.key ? "active" : ""}" data-color="${color.key}" style="--swatch:${color.hex}" aria-label="${color.label}"></button>`).join("");
    return `<div class="palette-row">${swatches}</div><p class="name-preview" style="--on-accent:${colorHex(draft.color)}">${escapeHtml(draft.name || "Prenom")}</p>`;
  }
  if (step.key === "pin") {
    const draft = onboardingDraft[step.profile];
    const dots = new Array(4).fill("").map((_, i) => `<span class="pin-dot ${i < draft.pin.length ? "filled" : ""}"></span>`).join("");
    return `<div class="pin-dots">${dots}</div><div class="pin-pad">${pinPadButtons()}</div>`;
  }
  if (step.key === "done") {
    return `<p class="on-sub on-done-sub">Vos profils sont verrouilles. Seuls les matches seront reveles.</p>`;
  }
  return "";
}

function wireOnboardingStage(step) {
  if (step.key === "name") {
    const input = document.getElementById("on-name-input");
    input.focus();
    input.addEventListener("input", () => {
      onboardingDraft[step.profile].name = input.value;
    });
    return;
  }
  if (step.key === "persona") {
    el.onStage.querySelectorAll(".persona-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        onboardingDraft[step.profile].sex = btn.dataset.sex;
        renderOnboardingStep();
      });
    });
    return;
  }
  if (step.key === "color") {
    el.onStage.querySelectorAll(".color-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        onboardingDraft[step.profile].color = btn.dataset.color;
        renderOnboardingStep();
      });
    });
    return;
  }
  if (step.key === "pin") {
    el.onStage.querySelectorAll(".pad-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const digit = btn.dataset.digit;
        const action = btn.dataset.action;
        const value = onboardingDraft[step.profile].pin;
        if (digit && value.length < 4) {
          onboardingDraft[step.profile].pin += digit;
        }
        if (action === "back") {
          onboardingDraft[step.profile].pin = value.slice(0, -1);
        }
        if (action === "clear") {
          onboardingDraft[step.profile].pin = "";
        }
        renderOnboardingStep();
      });
    });
  }
}

function onOnboardingBack() {
  if (onboardingStep === 0) {
    return;
  }
  goOnboardingStep(onboardingStep - 1);
}

async function onOnboardingNext() {
  const step = ONBOARDING_STEPS[onboardingStep];
  const valid = validateOnboardingStep(step);
  if (!valid) {
    return;
  }
  if (step.key === "done") {
    await commitOnboarding();
    closeOnboarding();
    renderAll();
    return;
  }
  goOnboardingStep(onboardingStep + 1);
}

function validateOnboardingStep(step) {
  const profileId = step.profile;
  if (!profileId) {
    return true;
  }
  const draft = onboardingDraft[profileId];
  if (step.key === "name" && !draft.name.trim()) {
    el.onError.textContent = "Ajoute un prenom.";
    return false;
  }
  if (step.key === "pin" && !/^\d{4}$/.test(draft.pin)) {
    el.onError.textContent = "Entre 4 chiffres.";
    return false;
  }
  return true;
}

function profileAccent(profileId) {
  if (!profileId) {
    return "#7acce1";
  }
  return colorHex(onboardingDraft[profileId].color);
}

function pinPadButtons() {
  return [
    '<button type="button" class="pad-btn" data-digit="1">1</button>',
    '<button type="button" class="pad-btn" data-digit="2">2</button>',
    '<button type="button" class="pad-btn" data-digit="3">3</button>',
    '<button type="button" class="pad-btn" data-digit="4">4</button>',
    '<button type="button" class="pad-btn" data-digit="5">5</button>',
    '<button type="button" class="pad-btn" data-digit="6">6</button>',
    '<button type="button" class="pad-btn" data-digit="7">7</button>',
    '<button type="button" class="pad-btn" data-digit="8">8</button>',
    '<button type="button" class="pad-btn" data-digit="9">9</button>',
    '<button type="button" class="pad-btn" data-action="clear">C</button>',
    '<button type="button" class="pad-btn" data-digit="0">0</button>',
    '<button type="button" class="pad-btn" data-action="back">⌫</button>'
  ].join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setupProfiles() {
  renderProfileForms();
}

function setupControls() {
  if (el.matchThreshold) {
    el.matchThreshold.addEventListener("change", () => {
      state.matchThreshold = Number(el.matchThreshold.value);
      saveState();
      renderMatches();
    });
  }

  if (el.saveCoupleCode && el.coupleCode) {
    el.saveCoupleCode.addEventListener("click", async () => {
      const code = el.coupleCode.value.trim();
      if (code.length < 6) {
        setSyncStatus("Le code de couple doit faire au moins 6 caractères.", true);
        return;
      }
      state.coupleCodeHash = await hashText(code);
      saveState();
      el.coupleCode.value = "";
      setSyncStatus("Code de couple sauvegardé.", false);
    });
  }

  if (el.coupleRevealBtn) {
    el.coupleRevealBtn.addEventListener("click", () => openRevealFlow("new"));
  }
  if (el.coupleReplayBtn) {
    el.coupleReplayBtn.addEventListener("click", () => openRevealFlow("seen"));
  }
  if (el.revealNext) {
    el.revealNext.addEventListener("click", onRevealNext);
  }
  if (el.revealClose) {
    el.revealClose.addEventListener("click", closeRevealFlow);
  }
  if (el.revealFlow) {
    el.revealFlow.addEventListener("click", (event) => {
      if (event.target === el.revealFlow) {
        closeRevealFlow();
      }
    });
  }

  el.categoryFilter.addEventListener("change", renderCards);
  el.typeFilter.addEventListener("change", renderCards);

  el.revealBtn.addEventListener("click", () => {
    renderMatches(true);
  });

  el.moodFilter.addEventListener("change", () => renderMatches(true));

  el.surpriseBtn.addEventListener("click", () => {
    const matches = computeMatches();
    if (matches.length === 0) {
      el.matchHint.textContent = "Pas encore de match. Continuez à noter les cartes.";
      return;
    }
    const item = matches[Math.floor(Math.random() * matches.length)];
    el.tonightPicks.innerHTML = `<article class="pick"><strong>Surprise mutuelle</strong><p>${item.title}</p><span class="badge">${item.category}</span></article>`;
  });

  el.exportQr.addEventListener("click", onExportQr);
  el.startScan.addEventListener("click", onStartScan);
  el.importPayload.addEventListener("click", onImportPayload);
  el.guidedAction.addEventListener("click", onGuidedAction);
  el.sessionStop.addEventListener("click", stopSessionFlow);
  el.sessionLevels.forEach((btn) => {
    btn.addEventListener("click", () => onSessionVote(Number(btn.dataset.level)));
  });

  el.connectFab.addEventListener("click", () => {
    if (connectedProfileId) {
      disconnectProfile();
      return;
    }
    openLoginSheet();
  });
  el.loginA.addEventListener("click", () => setLoginProfile("A"));
  el.loginB.addEventListener("click", () => setLoginProfile("B"));
  el.loginClose.addEventListener("click", closeLoginSheet);
  el.loginPad.querySelectorAll(".pad-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleLoginPad(btn.dataset.digit, btn.dataset.action));
  });
  el.envieModalClose.addEventListener("click", closeEnvieModal);
  el.envieModal.addEventListener("click", (event) => {
    if (event.target === el.envieModal) {
      closeEnvieModal();
    }
  });

  window.addEventListener("scroll", updateHeaderScrollState, { passive: true });
  if (el.forYouFeed) {
    el.forYouFeed.addEventListener("scroll", updateHeaderScrollState, { passive: true });
  }
}

function renderAll() {
  renderProfileForms();
  renderSelectors();
  renderLoginProfileButtons();
  renderConnectionUi();
  renderGuidedLane();
  renderForYou();
  renderCards();
  renderMatches();
  renderSync();
}

function renderLoginProfileButtons() {
  el.loginA.textContent = state.profiles.A.name;
  el.loginB.textContent = state.profiles.B.name;
}

function renderProfileForms() {
  document.querySelectorAll(".profile-card").forEach((card) => {
    const id = card.dataset.profile;
    const profile = state.profiles[id];
    card.querySelector('[data-role="name"]').textContent = profile.name;
    card.querySelector('[data-role="sex"]').textContent = profile.sex || "Neutre";
    const colorNode = card.querySelector('[data-role="color"]');
    colorNode.textContent = colorLabel(profile.color);
    colorNode.style.background = colorHex(profile.color);
  });

  if (!el.coupleTitle || !el.coupleVibe || !el.coupleMatchCount || !el.coupleSharedCount || !el.coupleProgress) {
    return;
  }

  const aName = state.profiles.A.name;
  const bName = state.profiles.B.name;
  const matchedCards = computeMatches();
  const revealedMatches = getSeenMatches();
  const matchCount = revealedMatches.length;
  const sharedCards = CARDS.filter((card) => state.votes.A[card.id] !== undefined && state.votes.B[card.id] !== undefined);
  const sharedCount = sharedCards.length;
  const duoProgress = Math.round((sharedCount / CARDS.length) * 100);
  const newMatchCount = getNewMatches().length;
  const seenMatchCount = getSeenMatches().length;

  el.coupleTitle.textContent = `${aName} + ${bName}`;
  el.coupleVibe.textContent = matchCount === 0
    ? "Votre bulle démarre. Notez quelques cartes ensemble."
    : matchCount < 4
      ? "Belle connexion en cours, vos envies commencent a se rejoindre."
      : "Super alchimie: vous avez deja plusieurs envies compatibles.";
  el.coupleMatchCount.textContent = String(matchCount);
  el.coupleSharedCount.textContent = String(sharedCount);
  el.coupleProgress.textContent = `${duoProgress}%`;

  if (el.coupleSharedList) {
    if (revealedMatches.length === 0) {
      el.coupleSharedList.innerHTML = '<p class="couple-shared-empty">Aucun match revele pour le moment.</p>';
    } else {
      const animatedSet = new Set(pendingMatchBounceIds);
      let animatedOrder = 0;
      const list = revealedMatches.map((card) => {
        const shouldAnimate = animatedSet.has(card.id);
        const delay = shouldAnimate ? `${animatedOrder * 120}ms` : "0ms";
        if (shouldAnimate) {
          animatedOrder += 1;
        }
        return `<button type="button" class="couple-shared-item is-match-row ${shouldAnimate ? "match-bounce-in" : ""}" style="animation-delay:${delay}" data-card-id="${card.id}"><p class="couple-shared-title">${card.title}</p><span class="couple-shared-chip is-match">Match</span></button>`;
      }).join("");
      el.coupleSharedList.innerHTML = `<p class="couple-shared-head">Matches</p>${list}`;
      el.coupleSharedList.querySelectorAll(".couple-shared-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          openEnvieModal(btn.dataset.cardId, "shared");
        });
      });
      pendingMatchBounceIds = [];
    }
  }

  if (el.coupleRevealHint) {
    el.coupleRevealHint.textContent = newMatchCount > 0
      ? `${newMatchCount} nouveau(x) match(es) a reveler.`
      : "Pas de nouveau match pour l'instant.";
  }
  if (el.coupleRevealBtn) {
    el.coupleRevealBtn.disabled = newMatchCount === 0;
  }
  if (el.coupleReplayBtn) {
    el.coupleReplayBtn.disabled = seenMatchCount === 0;
  }
}

function renderSelectors() {
  const profileOptions = ["A", "B"].map((id) => `<option value="${id}">${state.profiles[id].name}</option>`);
  el.exportProfile.innerHTML = profileOptions.join("");

  el.categoryFilter.innerHTML = CATEGORIES.map(
    (category) => `<option value="${category}">${category}</option>`
  ).join("");

  if (!el.typeFilter.value) {
    el.typeFilter.value = "all";
  }
  if (!el.categoryFilter.value) {
    el.categoryFilter.value = "Toutes";
  }

  if (el.matchThreshold) {
    el.matchThreshold.value = String(state.matchThreshold);
  }
}

function renderGuidedLane() {
  el.guidedLane.hidden = true;
}

function getGuidedStage() {
  if (state.phaseTwoDone) {
    return "FREE";
  }
  const aDone = firstRoundCount("A") >= FIRST_ROUND_IDS.length;
  const bDone = firstRoundCount("B") >= FIRST_ROUND_IDS.length;
  if (!aDone) {
    return "A_PENDING";
  }
  if (!bDone) {
    return "B_PENDING";
  }
  return "READY_REVEAL";
}

function firstRoundCount(profileId) {
  return FIRST_ROUND_IDS.filter((id) => state.votes[profileId][id] !== undefined).length;
}

function renderCards() {
  const profileId = connectedProfileId;
  const category = el.categoryFilter.value || "Toutes";
  const type = el.typeFilter.value || "all";

  let list = CARDS;
  if (category !== "Toutes") {
    list = list.filter((card) => card.category === category);
  }
  if (type !== "all") {
    list = list.filter((card) => card.type === type);
  }

  el.connectedHint.textContent = "";
  el.cardsHint.textContent = "";

  el.cardsList.innerHTML = list
    .map((card) => {
      const vote = profileId ? state.votes[profileId][card.id] : undefined;
      const voteLabel = connectedProfileId
        ? vote === undefined
          ? '<span class="vote-heart-off" aria-label="Non repondu" title="Non repondu">♡</span>'
          : `Reponse: ${LEVELS.find((lvl) => lvl.value === vote)?.label || ""}`
        : "";

      return `<button class="envie-tile" data-card-id="${card.id}" type="button" style="--accent:${connectedProfileId ? colorHex(
        state.profiles[profileId].color
      ) : "#b9c7e8"}">
        <h3>${card.title}</h3>
        <p class="meta"><span class="badge">${card.category}</span><span class="badge">${card.type === "discussion" ? "Discussion" : "Pratique"}</span></p>
        <p class="envie-preview">${voteLabel}</p>
      </button>`;
    })
    .join("");

  el.cardsList.querySelectorAll(".envie-tile").forEach((btn) => {
    btn.addEventListener("click", () => {
      openEnvieModal(btn.dataset.cardId);
    });
  });
}

function openEnvieModal(cardId, context = "default") {
  if (envieModalHideTimer) {
    window.clearTimeout(envieModalHideTimer);
    envieModalHideTimer = null;
  }
  currentEnvieCardId = cardId;
  currentEnvieContext = context;
  renderEnvieModal();
  el.envieModal.hidden = false;
  el.envieModal.classList.remove("closing");
  void el.envieModal.offsetWidth;
  el.envieModal.classList.add("open");
}

function closeEnvieModal() {
  currentEnvieCardId = null;
  currentEnvieContext = "default";
  el.envieModal.classList.remove("open");
  el.envieModal.classList.add("closing");
  envieModalHideTimer = window.setTimeout(() => {
    el.envieModal.hidden = true;
    el.envieModal.classList.remove("closing");
    envieModalHideTimer = null;
  }, 280);
}

function renderEnvieModal() {
  if (!currentEnvieCardId) {
    return;
  }
  const card = CARDS.find((item) => item.id === currentEnvieCardId);
  if (!card) {
    return;
  }

  const profileId = connectedProfileId;
  const currentVote = profileId ? state.votes[profileId][card.id] : undefined;
  const voteA = state.votes.A[card.id];
  const voteB = state.votes.B[card.id];
  const openedFromShared = currentEnvieContext === "shared";

  el.envieModalKicker.textContent = card.category;
  el.envieModalTitle.textContent = card.title;
  el.envieModalBlurb.textContent = openedFromShared ? "Vos deux reponses sur cette carte" : cardBlurb(card);

  if (el.envieModalDuo) {
    if (openedFromShared && voteA !== undefined && voteB !== undefined) {
      const levelA = LEVELS.find((lvl) => lvl.value === voteA);
      const levelB = LEVELS.find((lvl) => lvl.value === voteB);
      el.envieModalDuo.hidden = false;
      el.envieModalDuo.innerHTML = `<article class="duo-vote duo-a"><p class="duo-name">${escapeHtml(state.profiles.A.name)}</p><p class="duo-level">${levelA ? levelA.label : "-"}</p><p class="duo-hint">${levelA ? levelA.hint : ""}</p></article><span class="duo-heart">❤</span><article class="duo-vote duo-b"><p class="duo-name">${escapeHtml(state.profiles.B.name)}</p><p class="duo-level">${levelB ? levelB.label : "-"}</p><p class="duo-hint">${levelB ? levelB.hint : ""}</p></article>`;
    } else {
      el.envieModalDuo.hidden = true;
      el.envieModalDuo.innerHTML = "";
    }
  }
  if (openedFromShared) {
    el.envieModalLevels.innerHTML = "";
    el.envieModalLevels.hidden = true;
    return;
  }

  el.envieModalLevels.innerHTML = LEVELS.map((level) => {
    const selected = Number(currentVote) === level.value;
    const selectColor = connectedProfileId ? colorHex(state.profiles[connectedProfileId].color) : "#7acce1";
    return `<button class="for-you-level envies-level ${selected ? "selected" : ""}" data-level="${level.value}" style="--select-color:${selectColor}" title="${level.hint}">${level.label}</button>`;
  }).join("");
  el.envieModalLevels.hidden = false;

  el.envieModalLevels.querySelectorAll(".envies-level").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!connectedProfileId) {
        btn.classList.remove("pop");
        void btn.offsetWidth;
        btn.classList.add("pop");
        showConnectToast();
        return;
      }

      const level = Number(btn.dataset.level);
      state.votes[connectedProfileId][card.id] = level;
      state.updatedAt = Date.now();
      saveState();

      el.envieModalLevels.querySelectorAll(".envies-level").forEach((node) => node.classList.remove("selected"));
      btn.classList.add("selected", "pop");
      btn.style.setProperty("--select-color", colorHex(state.profiles[connectedProfileId].color));

      renderCards();
      renderForYou();
      renderMatches();
      renderProfileForms();
    });
  });
}

function renderForYou() {
  if (!el.forYouFeed) {
    return;
  }
  const profileId = connectedProfileId || "A";
  const isConnected = Boolean(connectedProfileId);
  const feedCards = buildForYouDeck(profileId, isConnected);
  el.forYouFeed.innerHTML = renderForYouCardsMarkup(feedCards, 0);
  el.forYouFeed.dataset.profileId = profileId;
  el.forYouFeed.dataset.isConnected = isConnected ? "1" : "0";
  pendingForYouContext = null;
  lastForYouScrollTop = el.forYouFeed.scrollTop;
  syncForYouVisibleVoteState();

  if (!el.forYouFeed.dataset.boundInfinite) {
    el.forYouFeed.addEventListener("click", (event) => {
      const btn = event.target.closest(".for-you-level");
      if (!btn) {
        return;
      }
      handleForYouVote(btn);
    });

    el.forYouFeed.addEventListener("scroll", () => {
      const currentTop = el.forYouFeed.scrollTop;
      if (pendingForYouContext && Math.abs(currentTop - lastForYouScrollTop) > 3) {
        applyPendingForYouContext();
      }
      lastForYouScrollTop = el.forYouFeed.scrollTop;

      const nearBottom = el.forYouFeed.scrollTop + el.forYouFeed.clientHeight >= el.forYouFeed.scrollHeight - 360;
      if (!nearBottom) {
        return;
      }
      appendForYouCards();
    });

    el.forYouFeed.dataset.boundInfinite = "1";
  }
}

function handleForYouVote(btn) {
  if (!connectedProfileId) {
    btn.classList.remove("pop");
    void btn.offsetWidth;
    btn.classList.add("pop");
    showConnectToast();
    return;
  }

  const actions = btn.closest(".for-you-actions");
  if (actions) {
    actions.querySelectorAll(".for-you-level").forEach((node) => node.classList.remove("selected"));
  }
  btn.classList.add("selected");
  btn.classList.remove("pop");
  void btn.offsetWidth;
  btn.classList.add("pop");
  btn.style.setProperty("--select-color", colorHex(state.profiles[connectedProfileId].color));

  const cardId = btn.dataset.cardId;
  const level = Number(btn.dataset.level);
  state.votes[connectedProfileId][cardId] = level;
  state.updatedAt = Date.now();
  saveState();
  renderCards();
  renderMatches();
  renderGuidedLane();
  renderProfileForms();
}

function appendForYouCards() {
  if (!el.forYouFeed || !el.forYouFeed.dataset.profileId) {
    return;
  }
  if (el.forYouFeed.dataset.appending === "1") {
    return;
  }
  el.forYouFeed.dataset.appending = "1";

  const profileId = el.forYouFeed.dataset.profileId;
  const isConnected = el.forYouFeed.dataset.isConnected === "1";
  const currentCount = el.forYouFeed.querySelectorAll(".for-you-card").length;
  const moreCards = buildForYouWave(profileId, isConnected).slice(0, 24);
  el.forYouFeed.insertAdjacentHTML("beforeend", renderForYouCardsMarkup(moreCards, currentCount));
  syncForYouVisibleVoteState();

  window.setTimeout(() => {
    el.forYouFeed.dataset.appending = "0";
  }, 0);
}

function queueForYouIncomingContext(profileId, isConnected) {
  pendingForYouContext = { profileId, isConnected };
}

function applyPendingForYouContext() {
  if (!el.forYouFeed || !pendingForYouContext) {
    return;
  }

  const cards = Array.from(el.forYouFeed.querySelectorAll(".for-you-card"));
  const viewport = Math.max(1, el.forYouFeed.clientHeight);
  const currentIndex = Math.max(0, Math.floor(el.forYouFeed.scrollTop / viewport));
  const keepCount = Math.min(cards.length, currentIndex + 1);

  cards.slice(keepCount).forEach((node) => node.remove());

  const replacement = buildLoopDeck(
    buildForYouWave(pendingForYouContext.profileId, pendingForYouContext.isConnected),
    72
  );
  el.forYouFeed.insertAdjacentHTML("beforeend", renderForYouCardsMarkup(replacement, keepCount));

  el.forYouFeed.dataset.profileId = pendingForYouContext.profileId;
  el.forYouFeed.dataset.isConnected = pendingForYouContext.isConnected ? "1" : "0";
  pendingForYouContext = null;
  syncForYouVisibleVoteState();
}

function syncForYouVisibleVoteState() {
  if (!el.forYouFeed) {
    return;
  }

  const isConnected = Boolean(connectedProfileId);
  const selectColor = isConnected ? colorHex(state.profiles[connectedProfileId].color) : "";

  el.forYouFeed.querySelectorAll(".for-you-actions").forEach((actions) => {
    const buttons = Array.from(actions.querySelectorAll(".for-you-level"));
    if (!buttons.length) {
      return;
    }

    if (!isConnected) {
      buttons.forEach((btn) => {
        btn.classList.remove("selected");
        btn.style.removeProperty("--select-color");
      });
      return;
    }

    const cardId = buttons[0].dataset.cardId;
    const vote = state.votes[connectedProfileId][cardId];
    buttons.forEach((btn) => {
      btn.style.setProperty("--select-color", selectColor);
      btn.classList.toggle("selected", vote !== undefined && Number(btn.dataset.level) === Number(vote));
    });
  });
}

function renderForYouCardsMarkup(cards, startIndex = 0) {
  return cards
    .map((card, idx) => {
      const feedIdx = startIndex + idx;
      const levelButtons = LEVELS.map((level) => {
        return `<button class="for-you-level" data-feed-idx="${feedIdx}" data-card-id="${card.id}" data-level="${level.value}" title="${level.hint}">${level.label}</button>`;
      }).join("");

      return `<article class="for-you-card" data-feed-idx="${feedIdx}">
        <div class="for-you-main">
          <p class="for-you-kicker">${card.category}</p>
          <h2>${card.title}</h2>
          <p class="for-you-blurb">${cardBlurb(card)}</p>
        </div>
        <div class="for-you-actions">${levelButtons}</div>
      </article>`;
    })
    .join("");
}

function showConnectToast() {
  if (!el.connectToast) {
    return;
  }
  if (connectToastTimer) {
    window.clearTimeout(connectToastTimer);
    connectToastTimer = null;
  }
  el.connectToast.hidden = false;
  el.connectToast.classList.remove("show");
  void el.connectToast.offsetWidth;
  el.connectToast.classList.add("show");

  connectToastTimer = window.setTimeout(() => {
    el.connectToast.classList.remove("show");
    el.connectToast.hidden = true;
    connectToastTimer = null;
  }, 1500);
}

function buildForYouDeck(profileId, isConnected = Boolean(connectedProfileId)) {
  const firstWave = buildForYouWave(profileId, isConnected);
  return buildLoopDeck(firstWave, 72);
}

function buildForYouWave(profileId, isConnected = Boolean(connectedProfileId)) {
  if (!isConnected) {
    const unseenByBoth = CARDS.filter((card) =>
      state.votes.A[card.id] === undefined && state.votes.B[card.id] === undefined
    );
    const seenByAtLeastOne = CARDS.filter((card) =>
      !(state.votes.A[card.id] === undefined && state.votes.B[card.id] === undefined)
    );
    return [...shuffleCards(unseenByBoth), ...shuffleCards(seenByAtLeastOne)];
  }

  const otherId = profileId === "A" ? "B" : "A";
  const otherAnsweredFirst = CARDS.filter((card) =>
    state.votes[profileId][card.id] === undefined && state.votes[otherId][card.id] !== undefined
  );
  const unansweredByBoth = CARDS.filter((card) =>
    state.votes[profileId][card.id] === undefined && state.votes[otherId][card.id] === undefined
  );
  const alreadyAnsweredByMe = CARDS.filter((card) => state.votes[profileId][card.id] !== undefined);

  return [
    ...shuffleCards(otherAnsweredFirst),
    ...shuffleCards(unansweredByBoth),
    ...shuffleCards(alreadyAnsweredByMe)
  ];
}

function buildLoopDeck(firstWave, minLength = 48) {
  const base = firstWave.length > 0 ? firstWave : [...CARDS];
  const deck = [...firstWave];
  while (deck.length < minLength) {
    deck.push(...shuffleCards(base));
  }
  return deck.slice(0, minLength);
}

function shuffleCards(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cardBlurb(card) {
  if (card.blurb) {
    return card.blurb;
  }
  return `Un moment doux autour de "${card.title.toLowerCase()}" pour explorer ensemble et voir si vos envies se rejoignent.`;
}

function renderMatches(revealed = false) {
  const mood = el.moodFilter.value || "all";
  const matches = computeMatches().filter((card) => {
    if (mood === "all") {
      return true;
    }
    return card.moods.includes(mood);
  });

  const picks = matches.slice(0, 3);
  el.tonightPicks.innerHTML = picks
    .map(
      (item) => `<article class="pick"><strong>Tonight pick</strong><p>${item.title}</p><span class="badge">${item.category}</span></article>`
    )
    .join("");

  if (!revealed) {
    el.matchesList.innerHTML = "";
    el.matchHint.textContent = "Appuyez sur \"Révéler nos secrets\" pour afficher uniquement vos compatibilités.";
    return;
  }

  if (matches.length === 0) {
    el.matchesList.innerHTML = "";
    el.matchHint.textContent = "Aucun match pour le filtre actuel. Continuez à explorer les cartes.";
    return;
  }

  el.matchHint.textContent = `${matches.length} match(es) révélés.`;
  el.matchesList.innerHTML = matches
    .map(
      (card) => `<article class="practice-card match-card">
        <h3>${card.title}</h3>
        <p class="meta"><span class="badge">${card.category}</span><span class="badge">${card.type === "discussion" ? "Discussion" : "Pratique"}</span></p>
      </article>`
    )
    .join("");
}

function renderSync() {
  setSyncStatus("Prêt pour un export/import QR.");
}

function renderConnectionUi() {
  const showFab = hasPrimaryOnboardingComplete() && el.onboarding.hidden;
  el.connectFab.hidden = !showFab;
  if (!showFab) {
    return;
  }

  if (!connectedProfileId) {
    el.connectLabel.textContent = "Se connecter";
    el.connectFab.classList.add("is-disconnected");
    el.connectFab.style.background = "linear-gradient(150deg, rgba(122, 206, 225, 0.92), rgba(251, 105, 153, 0.9))";
    return;
  }
  const profile = state.profiles[connectedProfileId];
  el.connectFab.classList.remove("is-disconnected");
  el.connectLabel.textContent = profile.name;
  el.connectFab.style.background = colorHex(profile.color);
}

function openLoginSheet(forceProfileId = null) {
  if (loginHideTimer) {
    window.clearTimeout(loginHideTimer);
    loginHideTimer = null;
  }
  loginState = { profileId: forceProfileId || "A", pin: "" };
  el.loginSheet.hidden = false;
  el.loginSheet.classList.remove("closing");
  void el.loginSheet.offsetWidth;
  el.loginSheet.classList.add("open");
  setLoginProfile(loginState.profileId);
  renderLoginDots();
  el.loginError.textContent = "";
}

function closeLoginSheet() {
  el.loginSheet.classList.remove("open");
  loginHideTimer = window.setTimeout(() => {
    el.loginSheet.hidden = true;
    el.loginSheet.classList.remove("closing");
    loginHideTimer = null;
  }, 320);
}

function setLoginProfile(profileId) {
  loginState.profileId = profileId;
  loginState.pin = "";
  el.loginA.classList.toggle("active", profileId === "A");
  el.loginB.classList.toggle("active", profileId === "B");
  renderLoginDots();
}

function renderLoginDots() {
  Array.from(el.loginDots.querySelectorAll(".pin-dot")).forEach((dot, idx) => {
    dot.classList.toggle("filled", idx < loginState.pin.length);
  });
}

async function handleLoginPad(digit, action) {
  if (digit && loginState.pin.length < 4) {
    loginState.pin += digit;
  }
  if (action === "back") {
    loginState.pin = loginState.pin.slice(0, -1);
  }
  if (action === "clear") {
    loginState.pin = "";
  }
  renderLoginDots();

  if (loginState.pin.length === 4) {
    const ok = await verifyPin(loginState.profileId, loginState.pin);
    if (!ok) {
      el.loginError.textContent = "Code invalide";
      loginState.pin = "";
      renderLoginDots();
      return;
    }
    connectedProfileId = loginState.profileId;
    unlocked[connectedProfileId] = Date.now() + 8 * 60 * 60 * 1000;
    closeLoginSheet();
    renderConnectionUi();
    renderCards();
    queueForYouIncomingContext(connectedProfileId, true);
    syncForYouVisibleVoteState();
    renderGuidedLane();
  }
}

function disconnectProfile() {
  if (!connectedProfileId) {
    return;
  }
  unlocked[connectedProfileId] = 0;
  connectedProfileId = null;
  renderConnectionUi();
  renderCards();
  queueForYouIncomingContext("A", false);
  syncForYouVisibleVoteState();
}

async function onGuidedAction() {
  const stage = getGuidedStage();
  if (stage === "FREE") {
    setActiveTab("cards");
    return;
  }
  if (stage === "READY_REVEAL") {
    const totalMatches = computeMatches().length;
    alert(`${totalMatches} match(es) trouves.`);
    setActiveTab("cards");
    state.phaseTwoDone = true;
    saveState();
    renderGuidedLane();
    return;
  }
  const profileId = stage === "A_PENDING" ? "A" : "B";
  if (connectedProfileId !== profileId) {
    openLoginSheet(profileId);
    return;
  }
  startSessionFlow(profileId);
}

function setActiveTab(tabId) {
  const changed = activeTab !== tabId;
  activeTab = tabId;
  el.tabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
  el.panels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tabId}`));
  updateHeaderScrollState();
  if (changed) {
    bounceBackgroundShapes();
  }
}

function bounceBackgroundShapes() {
  document.querySelectorAll(".bg-shape").forEach((node) => {
    node.classList.remove("bg-bounce");
    void node.offsetWidth;
    node.classList.add("bg-bounce");
    window.setTimeout(() => {
      node.classList.remove("bg-bounce");
    }, 1700);
  });
}

function updateHeaderScrollState() {
  const forYouActive = activeTab === "for-you";
  const scrollTop = forYouActive && el.forYouFeed ? el.forYouFeed.scrollTop : window.scrollY;
  const opacity = Math.max(0, Math.min(1, scrollTop / 22));
  document.documentElement.style.setProperty("--header-grad-opacity", String(opacity));
  document.body.classList.toggle("header-scrolled", opacity > 0.02);
}

function startSessionFlow(profileId) {
  const queue = FIRST_ROUND_IDS.filter((id) => state.votes[profileId][id] === undefined);
  if (queue.length === 0) {
    renderGuidedLane();
    return;
  }
  sessionState = { profileId, queue, index: 0 };
  el.sessionFlow.hidden = false;
  renderSessionCard();
}

function renderSessionCard() {
  if (!sessionState) {
    return;
  }
  const { profileId, queue, index } = sessionState;
  const card = CARDS.find((item) => item.id === queue[index]);
  if (!card) {
    finishSessionFlow();
    return;
  }
  el.sessionProfile.textContent = state.profiles[profileId].name;
  el.sessionProgress.textContent = `${index + 1} / ${queue.length}`;
  el.sessionTitle.textContent = card.title;
  el.sessionMeta.textContent = card.category;
}

function onSessionVote(level) {
  if (!sessionState) {
    return;
  }
  const { profileId, queue, index } = sessionState;
  const cardId = queue[index];
  state.votes[profileId][cardId] = level;
  state.updatedAt = Date.now();
  saveState();
  renderProfileForms();
  sessionState.index += 1;
  if (sessionState.index >= sessionState.queue.length) {
    finishSessionFlow();
    return;
  }
  renderSessionCard();
}

function finishSessionFlow() {
  const finishedProfile = sessionState ? sessionState.profileId : null;
  sessionState = null;
  el.sessionFlow.hidden = true;
  if (finishedProfile) {
    unlocked[finishedProfile] = 0;
  }
  renderCards();
  renderForYou();
  renderMatches();
  renderGuidedLane();
}

function stopSessionFlow() {
  sessionState = null;
  el.sessionFlow.hidden = true;
  renderGuidedLane();
}

function computeMatches() {
  return CARDS.filter((card) => {
    const a = state.votes.A[card.id];
    const b = state.votes.B[card.id];
    if (a === undefined || b === undefined) {
      return false;
    }
    return a >= state.matchThreshold && b >= state.matchThreshold;
  });
}

function getNewMatches() {
  const revealed = new Set(Array.isArray(state.revealedMatchIds) ? state.revealedMatchIds : []);
  return computeMatches().filter((card) => !revealed.has(card.id));
}

function getSeenMatches() {
  const revealed = new Set(Array.isArray(state.revealedMatchIds) ? state.revealedMatchIds : []);
  return computeMatches().filter((card) => revealed.has(card.id));
}

function openRevealFlow(mode = "new") {
  if (!el.revealFlow || !el.revealKicker || !el.revealTitle || !el.revealSub || !el.revealCard || !el.revealNext) {
    return;
  }

  if (revealFlowHideTimer) {
    window.clearTimeout(revealFlowHideTimer);
    revealFlowHideTimer = null;
  }

  const queue = mode === "seen" ? getSeenMatches() : getNewMatches();
  revealState = {
    mode,
    queue,
    index: -1,
    stage: "intro"
  };

  el.revealFlow.hidden = false;
  el.revealFlow.classList.remove("closing");
  void el.revealFlow.offsetWidth;
  el.revealFlow.classList.add("open");
  renderRevealStep();
}

function closeRevealFlow(returnToMenu = false) {
  if (!el.revealFlow) {
    return;
  }

  if (revealFlowHideTimer) {
    window.clearTimeout(revealFlowHideTimer);
    revealFlowHideTimer = null;
  }

  commitRevealProgress();

  revealState = null;
  el.revealFlow.classList.remove("open");
  el.revealFlow.classList.add("closing");
  revealFlowHideTimer = window.setTimeout(() => {
    el.revealFlow.hidden = true;
    el.revealFlow.classList.remove("closing");
    revealFlowHideTimer = null;
    renderProfileForms();
    if (returnToMenu) {
      setActiveTab("nous");
    }
  }, 320);
}

function commitRevealProgress() {
  if (!revealState || revealState.mode === "seen") {
    return;
  }

  let upto = -1;
  if (revealState.stage === "cards") {
    upto = revealState.index;
  } else if (revealState.stage === "done") {
    upto = revealState.queue.length - 1;
  }

  if (upto < 0) {
    return;
  }

  const previouslyRevealed = new Set(Array.isArray(state.revealedMatchIds) ? state.revealedMatchIds : []);
  const nowRevealed = revealState.queue.slice(0, upto + 1).map((card) => card.id);
  const newlyAdded = nowRevealed.filter((id) => !previouslyRevealed.has(id));

  if (!newlyAdded.length) {
    return;
  }

  state.revealedMatchIds = Array.from(new Set([...previouslyRevealed, ...nowRevealed]));
  pendingMatchBounceIds = newlyAdded;
  state.updatedAt = Date.now();
  saveState();
}

function onRevealNext() {
  if (!revealState) {
    return;
  }

  if (revealState.stage === "intro") {
    if (revealState.queue.length === 0) {
      closeRevealFlow();
      return;
    }
    revealState.stage = "cards";
    revealState.index = 0;
    renderRevealStep(true);
    return;
  }

  if (revealState.stage === "cards") {
    if (revealState.index < revealState.queue.length - 1) {
      revealState.index += 1;
      renderRevealStep(true);
      return;
    }
    closeRevealFlow(true);
    return;
  }

  closeRevealFlow(true);
}

function renderRevealStep(withAnimation = false) {
  if (!revealState || !el.revealKicker || !el.revealTitle || !el.revealSub || !el.revealCard || !el.revealNext) {
    return;
  }

  const total = revealState.queue.length;
  const seenMode = revealState.mode === "seen";
  if (revealState.stage === "intro") {
    el.revealKicker.textContent = seenMode ? "Revoir vos matchs" : "Nuit de revelation";
    el.revealTitle.textContent = seenMode
      ? `${total} match${total > 1 ? "s" : ""} deja reveles`
      : `${total} etincelle${total > 1 ? "s" : ""} a decouvrir`;
    el.revealSub.textContent = total > 0
      ? (seenMode ? "Revivez vos moments forts un par un." : "On les devoile une par une.")
      : (seenMode ? "Aucun match deja revele pour le moment." : "Aucun nouveau match pour le moment.");
    el.revealCard.hidden = true;
    el.revealCard.innerHTML = "";
    el.revealNext.textContent = total > 0 ? (seenMode ? "Revoir" : "Lancer") : "Fermer";
    el.revealNext.disabled = false;
    return;
  }

  if (revealState.stage === "cards") {
    const card = revealState.queue[revealState.index];
    if (!card) {
      revealState.stage = "done";
      renderRevealStep();
      return;
    }
    const levelAValue = state.votes.A[card.id];
    const levelBValue = state.votes.B[card.id];
    const levelA = LEVELS.find((lvl) => lvl.value === levelAValue);
    const levelB = LEVELS.find((lvl) => lvl.value === levelBValue);
    const heatPercent = Math.round((((levelAValue || 0) + (levelBValue || 0)) / 6) * 100);
    el.revealKicker.textContent = `Match ${revealState.index + 1}/${total}`;
    el.revealTitle.textContent = "Connexion intense";
    el.revealSub.textContent = "Continuez pour reveler la suivante.";
    el.revealCard.hidden = false;
    el.revealCard.innerHTML = `<p class="reveal-heat">Chaleur ${heatPercent}%</p><h3>${card.title}</h3><p class="reveal-card-meta"><span class="badge">${card.category}</span><span class="badge">${card.type === "discussion" ? "Discussion" : "Pratique"}</span></p><div class="reveal-duo"><p>${escapeHtml(state.profiles.A.name)} ${levelA ? levelA.label : ""}</p><span>❤</span><p>${escapeHtml(state.profiles.B.name)} ${levelB ? levelB.label : ""}</p></div><p class="reveal-card-blurb">${cardBlurb(card)}</p>`;
    if (withAnimation) {
      el.revealCard.classList.remove("is-pop");
      void el.revealCard.offsetWidth;
      el.revealCard.classList.add("is-pop");
    }
    el.revealNext.textContent = revealState.index === total - 1 ? "Terminer" : "Continuer";
    el.revealNext.disabled = false;
    return;
  }

  el.revealKicker.textContent = "Revelation terminee";
  el.revealTitle.textContent = seenMode
    ? "Revue de vos matchs terminee"
    : "Tous vos nouveaux matchs sont devoiles";
  el.revealSub.textContent = seenMode
    ? "Vous pouvez les revoir quand vous voulez."
    : "Profitez de cette energie ensemble.";
  el.revealCard.hidden = true;
  el.revealNext.textContent = "Retour au menu";
  el.revealNext.disabled = false;
}

async function onExportQr() {
  try {
    const code = await requestCoupleCode();
    if (!code) {
      return;
    }
    const profileId = el.exportProfile.value;
    const packet = {
      version: 1,
      profileId,
      profileName: state.profiles[profileId].name,
      votes: state.votes[profileId],
      updatedAt: Date.now()
    };
    const encoded = await encryptPacket(packet, code);
    el.payloadInput.value = encoded;
    el.qrOutput.innerHTML = "";
    const canvas = document.createElement("canvas");
    el.qrOutput.append(canvas);
    await QRCode.toCanvas(canvas, encoded, {
      width: 240,
      margin: 1,
      color: { dark: "#311b43", light: "#ffffff" }
    });
    setSyncStatus(`QR généré pour ${state.profiles[profileId].name}.`);
  } catch (error) {
    setSyncStatus(`Erreur export: ${error.message}`, true);
  }
}

async function onStartScan() {
  if (!window.Html5Qrcode) {
    setSyncStatus("Librairie de scan indisponible.", true);
    return;
  }
  if (!scanner) {
    scanner = new Html5Qrcode("scanner");
  }

  try {
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 220 },
      (decodedText) => {
        el.payloadInput.value = decodedText;
        setSyncStatus("QR scanné. Cliquez sur importer.");
        scanner.stop();
      },
      () => {}
    );
  } catch (error) {
    setSyncStatus("Impossible de lancer la caméra.", true);
  }
}

async function onImportPayload() {
  try {
    const raw = el.payloadInput.value.trim();
    if (!raw.startsWith("DUO1.")) {
      throw new Error("Format invalide.");
    }
    const code = await requestCoupleCode();
    if (!code) {
      return;
    }
    const packet = await decryptPacket(raw, code);
    if (!packet.profileId || !packet.votes) {
      throw new Error("Paquet incomplet.");
    }
    state.votes[packet.profileId] = { ...state.votes[packet.profileId], ...packet.votes };
    state.updatedAt = Date.now();
    saveState();
    renderCards();
    renderForYou();
    renderMatches();
    renderGuidedLane();
    renderProfileForms();
    setSyncStatus(`Import réussi pour ${packet.profileName || packet.profileId}.`);
  } catch (error) {
    setSyncStatus(`Erreur import: ${error.message}`, true);
  }
}

async function requestCoupleCode() {
  const code = window.prompt("Code de couple (chiffrement QR):");
  if (!code) {
    return null;
  }
  if (code.length < 6) {
    setSyncStatus("Code trop court.", true);
    return null;
  }
  if (state.coupleCodeHash) {
    const isValid = (await hashText(code)) === state.coupleCodeHash;
    if (!isValid) {
      setSyncStatus("Code de couple incorrect.", true);
      return null;
    }
  }
  return code;
}

function setSyncStatus(message, isError = false) {
  el.syncStatus.textContent = message;
  el.syncStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function colorHex(key) {
  const color = COLORS.find((c) => c.key === key);
  return color ? color.hex : "#f4b8d0";
}

async function verifyPin(profileId, pin) {
  if (!/^\d{4}$/.test(pin)) {
    return false;
  }
  const hash = await hashText(pin);
  return hash === state.profiles[profileId].pinHash;
}

function isUnlocked(profileId) {
  return unlocked[profileId] > Date.now();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(defaultState);
    }
    const parsed = JSON.parse(raw);
    const merged = {
      ...structuredClone(defaultState),
      ...parsed,
      profiles: {
        ...structuredClone(defaultState).profiles,
        ...(parsed.profiles || {})
      },
      votes: {
        ...structuredClone(defaultState).votes,
        ...(parsed.votes || {})
      }
    };
    if (typeof parsed.onboardingDone !== "boolean") {
      merged.onboardingDone = Boolean(merged.profiles.A.pinHash && merged.profiles.B.pinHash);
    }
    if (!Array.isArray(merged.revealedMatchIds)) {
      merged.revealedMatchIds = [];
    }
    return merged;
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return toBase64(hashBuffer);
}

async function deriveAesKey(code, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(code),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPacket(packet, code) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(code, salt);
  const data = new TextEncoder().encode(JSON.stringify(packet));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const output = {
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    data: toBase64(encrypted)
  };
  return `DUO1.${btoa(JSON.stringify(output))}`;
}

async function decryptPacket(encoded, code) {
  const json = JSON.parse(atob(encoded.slice(5)));
  const salt = fromBase64(json.salt);
  const iv = fromBase64(json.iv);
  const data = fromBase64(json.data);
  const key = await deriveAesKey(code, new Uint8Array(salt));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
