// ═══ ACHIEVEMENTS — unlocked anywhere (careers and challenges), kept per device in ACH_KEY ═══
const ACH_KEY='fxi_ach';
const ACHIEVEMENTS=[
  ['first','🏏','First ball','Play your first match.'],
  ['m100','📅','Season ticket','100 matches in a career.'],['m500','📚','Almanack','500 matches in a career.'],['m1000','🗂️','Wisden','1,000 matches in a career.'],
  ['calendar','🏁','The whole lot','Play out the entire real ODI calendar, 2002-2026.'],
  ['future','🔭','Into the unknown','Play a match after the real calendar ends.'],['era','🕰️','A new era','Take a career to 2036.'],
  ['test1','⚪','Whites on','Play a Test.'],['t20','⚡','Twenty20 vision','Play a T20.'],['h2h','🤝','Grudge match','Finish a two-player head-to-head.'],
  ['dice','🎲','Old school','Finish a match rolling your own dice.'],['cupBuilt','🏟️','Organiser','Build your own tournament.'],
  ['ton','💯','Three figures','See a hundred scored.'],['dbl','🌟','Double top','An ODI double hundred.'],['t20ton','🚀','Short-form century','A T20 hundred.'],['triple','👑','Triple','A Test triple hundred.'],
  ['big400','🔥','Four hundred','A team makes 400 in an ODI.'],['under50','🧊','Collapse','A side bowled out for under 50.'],['chase350','🏃','Mountain climbed','Chase down 350 or more.'],
  ['hat','🎩','Hat-trick','Witness a hat-trick.'],['seven','7️⃣','Seventh heaven','Seven wickets in an innings.'],['tenfor','🔟','Ten in the match','Ten wickets in a Test.'],
  ['drs','📺','Upstairs','Win a review as captain.'],
  ['tie','🟰','Honours even','A tied match.'],['so','⏱️','Super over','A super over decides it.'],['dl','🌧️','Duckworth what?','A rain-affected D/L result.'],
  ['draw','🛡️','Rain-soaked stalemate','A drawn Test.'],['inns','🧱','Innings and plenty','An innings victory.'],
  ['assocWC','😲','Giant-killers','An associate nation wins a World Cup final.'],['no1','🥇','Top of the world','The team you follow goes No.1 in the ODI rankings.'],
  ['awards','🎤','Awards night','Reach an end-of-year awards ceremony.'],
  ['league','💼','Owner','Found a franchise league.'],['leagueWin','🏆','Franchise champions','Win the Franchise League with your franchise.'],
  ['coach1','📋','The job','Take a coaching job.'],['target10','🎯','Delivering','Meet 10 board targets.'],['sacked','📦','Clear your desk','Get sacked.'],
  ['nations3','✈️','Journeyman','Coach three different nations.'],['coachWC','🏆','World champion coach','Win a World Cup final as coach.'],
  ['challenge1','🧩','Up for it','Complete a challenge.'],['challenge3','⭐','Three stars','Three-star a challenge.'],
  ['challengeAll','🗺️','Full set','Complete every built-in challenge.'],['challengeAll3','🌠','Perfectionist','Three-star every built-in challenge.'],
];
function readAch(){try{return JSON.parse(localStorage.getItem(ACH_KEY)||'{}');}catch(e){return{};}}
function achieve(id){
  const A=readAch();if(A[id])return false;
  const d=ACHIEVEMENTS.find(a=>a[0]===id);if(!d)return false;
  A[id]=new Date().toISOString().slice(0,10);try{localStorage.setItem(ACH_KEY,JSON.stringify(A));}catch(e){}
  if(typeof toast==='function'&&typeof document!=='undefined')toast(`${d[1]} Achievement: <b>${esc(d[2])}</b> - ${esc(d[3])}`,'ms');
  return true;
}
// After every archived match (careers and the sandbox): what happened in it, and where the career stands.
function achCheck(E,M){
  const a=achieve;
  a('first');
  if(!S.sandbox){const n=S.matches.length;if(n>=100)a('m100');if(n>=500)a('m500');if(n>=1000)a('m1000');
    if(E.fmt==='ODI'&&E.fid&&ODI_FX.every(x=>!x.playable||S.done[x.key]))a('calendar');}
  if(!S.sandbox&&E.date>LAST_REAL)a('future');if(!S.sandbox&&E.date>='2036-01-01')a('era');
  if(E.fmt==='TEST')a('test1');if(E.fmt==='T20')a('t20');
  if(M&&M.h2h)a('h2h');if(M&&M.manual&&!M.sim)a('dice');
  for(const I of E.inns){
    for(const r of I.bt){if(r[1]>=100)a('ton');if(E.fmt==='ODI'&&r[1]>=200)a('dbl');if(E.fmt==='T20'&&r[1]>=100)a('t20ton');if(E.fmt==='TEST'&&r[1]>=300)a('triple');}
    for(const w of I.bw)if(w[4]>=7)a('seven');
    if(E.fmt==='ODI'&&I.runs>=400)a('big400');if(I.why==='all out'&&I.runs<50)a('under50');
  }
  const last=E.inns[E.inns.length-1],r=E.result;
  if(E.fmt!=='TEST'&&r.type==='wkts'&&last&&last.target>=350)a('chase350');
  if(E.ev.some(e=>e[0]==='hat'))a('hat');
  if(E.fmt==='TEST'){const L=playerMatchLines(E);if(Object.values(L).some(l=>l.w>=10))a('tenfor');}
  if(r.type==='tie')a('tie');if(r.type==='so')a('so');if(E.dl)a('dl');if(r.type==='draw')a('draw');if(r.type==='inns')a('inns');
  const final=/^final/i.test(E.stage||'')&&/World Cup/i.test(E.series||'')&&!/Qualif|League/i.test(E.series||'');
  if(final&&r.winner&&!TEAMS.get(r.winner)?.full&&!COMPOSITE.has(r.winner))a('assocWC');
  if(final&&S.coach&&S.coach.team&&r.winner===S.coach.team)a('coachWC');
  const my=S.settings.myTeam;if(my&&teamRanking('ODI')[0]?.team===my&&S.matches.length>30)a('no1');
  if(S.rk&&Object.keys(S.rk.awards).length)a('awards');
  if(S.coach){if(S.coach.objs.filter(o=>o.status==='met').length>=10)a('target10');if(S.coach.history.some(h=>h.why==='sacked'))a('sacked');
    if(new Set([...S.coach.history.map(h=>h.team),S.coach.team].filter(Boolean)).size>=3)a('nations3');}
}
