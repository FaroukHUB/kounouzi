// Kounouzi — texte réellement envoyé à la voix (source unique, utilisée par le jeu et par le tableau de bord).
// Seule la voix change : l'écran garde toujours l'écriture d'origine. Aucun accès au DOM ni au réseau ici.

// La voix lit les mots arabes en arabe : on les écrit en lettres arabes avec les harakat (voyelles) pour une prononciation juste.
export const AR_WORDS = [
  [/Masākīn Fund/gi,'صُنْدُوقُ الْمَسَاكِين'],[/As-salāmu ʿalaykum/gi,'السَّلَامُ عَلَيْكُم'],[/Zakat al-Māl/gi,'زَكَاةُ الْمَال'],[/Caisse Masākīn/gi,'صُنْدُوقُ الْمَسَاكِين'],[/Masākīn/gi,'الْمَسَاكِين'],
  [/Hassanāt|Hassanat/gi,'حَسَنَاتْ'],[/ʿUmra|Omra/gi,'عُمْرَة'],[/Zakat/gi,'الزَّكَاة'],[/ḥawl/gi,'الْحَوْل'],
  [/Maktaba Al-Albānī/gi,'مَكْتَبَةُ الْأَلْبَانِي'],[/Maktaba As-Sunnah/gi,'مَكْتَبَةُ السُّنَّة'],[/Agence Omra An-Nour|Agence عمرة An-Nour/gi,'وَكَالَةُ عُمْرَةِ النُّور'],[/Agence Omra Al-Hudā|Agence عمرة Al-Hudā/gi,'وَكَالَةُ عُمْرَةِ الْهُدَى'],[/Hôtel At-Tawḥīd/gi,'فُنْدُقُ التَّوْحِيد'],[/Hôtel Al-Iḥsān/gi,'فُنْدُقُ الْإِحْسَان'],[/Hôtel Al-Sharif/gi,'فُنْدُقُ الشَّرِيف'],[/Hôtel El Kunuz/gi,'فُنْدُقُ الْكُنُوز'],
  [/Umrah|ʿUmrah/gi,'عُمْرَة'],[/An-Nour عمرة Agency/gi,'وَكَالَةُ عُمْرَةِ النُّور'],[/Al-Hudā عمرة Agency/gi,'وَكَالَةُ عُمْرَةِ الْهُدَى'],
  [/Hotel At-Tawḥīd/gi,'فُنْدُقُ التَّوْحِيد'],[/Hotel Al-Iḥsān/gi,'فُنْدُقُ الْإِحْسَان'],[/Hotel Al-Sharif/gi,'فُنْدُقُ الشَّرِيف'],[/Hotel El Kunuz/gi,'فُنْدُقُ الْكُنُوز']];

// En français, certains mots sont parfois lus à l'anglaise : la voix reçoit une écriture qui se lit pareil en français
// (case → caze, don → dont, prison → prizon, nez → né), et les unités abrégées sont dites en entier (15 s → 15 secondes). L'écran ne change pas.
const MOT=(re,f)=>t=>t.replace(new RegExp('(^|[^\\p{L}])'+re+'(?![\\p{L}])','gu'),f);
const UNITE=(un,plur)=>(m,a,n)=>a+n+' '+(Number(n)<2? un : plur);
export const FR_SON=t=>[
  MOT('([Cc])ase(s?)',(m,a,c,s)=>a+c+'aze'+s), MOT('([Dd])ons?',(m,a,d)=>a+d+'ont'), MOT('([Pp])rison(s?)',(m,a,p,s)=>a+p+'rizon'+s), MOT('([Nn])ez',(m,a,n)=>a+n+'é'),
  MOT('(\\d+) ?(?:s|sec)',UNITE('seconde','secondes')), MOT('(\\d+) ?min',UNITE('minute','minutes')),
].reduce((x,f)=>f(x),t);
export const EN_SON=t=>[MOT('(\\d+) ?(?:s|sec)',UNITE('second','seconds')), MOT('(\\d+) ?min',UNITE('minute','minutes'))].reduce((x,f)=>f(x),t);

// Dictionnaire de prononciation réglé dans le tableau de bord : « écrit » → « dit » (mot entier, sans tenir compte des majuscules
// ni des accents de translittération : la ligne « Nuh » vaut aussi pour « Nûh », « Nūḥ »…, et ‘ ʿ ’ ' sont équivalents).
const echapRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const VARIANTES=(()=>{ const m={}; const ajoute=c=>{ const b=c.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase(); if(b.length===1&&/[a-z]/.test(b)&&b!==c.toLowerCase()) (m[b]||=new Set()).add(c); };
  for(let x=0xC0;x<=0x24F;x++) ajoute(String.fromCharCode(x)); for(let x=0x1E00;x<=0x1EFF;x++) ajoute(String.fromCharCode(x));
  return Object.fromEntries(Object.entries(m).map(([b,v])=>[b,[...v].join('')])); })();
const APOS="ʿʾ‘’'`";
const motifSouple=e=>[...e.normalize('NFD').replace(/\p{M}/gu,'')].map(c=>{ const b=c.toLowerCase();
  if(APOS.includes(c)) return '['+echapRe(APOS)+']';
  if(VARIANTES[b]) return '['+b+b.toUpperCase()+VARIANTES[b]+']\\p{M}*';
  return echapRe(c); }).join('');
export const compilerPron=(liste)=>(Array.isArray(liste)?liste:[]).filter(p=>p&&p.e&&p.d)
  .sort((a,b)=>b.e.length-a.e.length).map(p=>[new RegExp('(^|[^\\p{L}\\p{M}])('+motifSouple(p.e)+')(?=$|[^\\p{L}\\p{M}])','giu'),p.d]);
// QCM : « A. Nûh » est lu d'un trait (« anu ») ; la voix reçoit « A, Nûh » pour marquer une petite pause après la lettre.
const LETTRE_CHOIX=/(^|[\s:(«])([A-F])[.)]\s+(?=\S)/g;
/** Texte dit par la voix : dictionnaire, puis mots arabes, puis corrections propres à la langue. */
export function texteVoix(t, lang, pron=[]){
  // « Nūḥ = نُوحٌ » (translittération = arabe) : la voix ne lit que l'arabe, une seule fois.
  t=String(t).replace(/([^\s=]+) = ((?:[\u0600-\u06FF\uFDF0-\uFDFF]+\s?)+)/g,'$2 ');
  pron.forEach(([re,d])=>{ t=t.replace(re,(m,a)=>a+d); }); AR_WORDS.forEach(([re,ar])=>{ t=t.replace(re,ar); });
  if(lang!=='ar') t=t.replace(LETTRE_CHOIX,'$1$2, ');
  if(lang==='fr') t=FR_SON(t); else if(lang==='en') t=EN_SON(t);
  return t.replace(/\s+/g,' ').trim().slice(0,680);
}
