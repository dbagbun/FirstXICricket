// ═══ RANKINGS & AWARDS — team ratings, player rankings, player of the series, the year's awards ═══
// Team ratings are Elo underneath (full members start 1500, Zimbabwe/Bangladesh 1400, associates 1250) and are
// shown ICC-style: points = (Elo - 1000) / 5. Player rankings are an exponential average of match performances,
// scaled by the opposition's rating, so form counts more than history.
const RANK_K={ODI:24,TEST:32,T20:20,LEAGUE:20},RANK_ALPHA=.12,RANK_ACTIVE_DAYS=420,AWARD_MIN_MATCHES=15;
const eloStart=t=>{const T=TEAMS.get(+t);return T&&T.full?([10,11].includes(+t)?1400:1500):1250;};
const rankPts=elo=>Math.round((elo-1000)/5);
function blankRankings(){const e=()=>({});return{team:perFmt(e),yr:perFmt(e),bat:perFmt(e),bowl:perFmt(e),pos:{},awards:{},awardYear:0};}
function R_(){if(!S.rk)S.rk=blankRankings();return S.rk;}

// MOTM-style score for every player in a match (shared with pickMOTM's formula, without the winner bonus option)
function matchScores(E,winnerBonus=true){
  const out={};
  for(const L of Object.values(playerMatchLines(E))){
    let s=L.b>0?L.r*(L.r/L.b):L.r;
    s+=L.w*25+L.md*10;
    if(L.bb>0)s-=(L.br/(L.bb/6))*3;
    s+=L.ct*10+L.st*15+L.ro*12+L.c100*30+L.c50*15+L.w5*40;
    if(winnerBonus&&E.result.winner&&L.team===E.result.winner)s*=1.25;
    out[L.pid]={s,team:L.team,L};
  }
  return out;
}
function applyRankings(E){
  const R=R_(),T=R.team[E.fmt],[a,b]=E.teams,y=E.date.slice(0,4);
  for(const t of E.teams)if(T[t]==null)T[t]=eloStart(t);
  if(!R.yr[E.fmt][y])R.yr[E.fmt][y]={...T};     // ratings going into the year
  for(const t of E.teams)if(R.yr[E.fmt][y][t]==null)R.yr[E.fmt][y][t]=T[t];
  const ea=1/(1+10**((T[b]-T[a])/400)),res=E.result;
  const sa=res.winner===a?1:res.winner===b?0:.5;
  const k=RANK_K[E.fmt]*(E.stage&&/final|semi|quarter/i.test(E.stage)?1.25:1);
  const d=k*(sa-ea);T[a]+=d;T[b]-=d;
  // players
  const base={ODI:4.8,TEST:3.2,T20:7.5,LEAGUE:7.5}[E.fmt],L=playerMatchLines(E);
  for(const pid in L){
    const l=L[pid],opp=otherOf(E,l.team),f=(T[opp]||1500)/1500;
    if(l.bat){
      const sr=E.fmt!=='TEST'&&l.b?(l.r/l.b*100-(E.fmt==='ODI'?80:120))/400:0;
      const perf=(l.r+(l.r*sr))*f;
      upd(R.bat[E.fmt],pid,perf,E.date);
    }
    if(l.bb>=6){
      const perf=(l.w*22-(l.br-l.bb/6*base)*.35)*f;
      upd(R.bowl[E.fmt],pid,perf,E.date);
    }
  }
}
function upd(tab,pid,perf,date){const x=tab[pid]||(tab[pid]={p:0,n:0,d:date});x.p=x.p*(1-RANK_ALPHA)+perf*RANK_ALPHA;x.n++;x.d=date;}
const PLAYER_SCALE={bat:{ODI:16,TEST:10,T20:24,LEAGUE:24},bowl:{ODI:14,TEST:12,T20:16,LEAGUE:16}};
const COMPOSITE=new Set(WORLD.teams.filter(t=>/ XI$/.test(t.name)).map(t=>t.id));   // Africa XI, Asia XI, ICC World XI
function playerRanking(fmt,kind,n=20){
  const R=R_(),now=careerDate(),tab=R[kind==='ar'?'bat':kind][fmt];
  const pts=(k,pid)=>{const x=R[k][fmt][pid];return x?Math.max(0,Math.round(x.p*PLAYER_SCALE[k][fmt])):0;};
  let L=Object.entries(tab).filter(([,x])=>x.n>=5&&daysBetween(x.d,now)<=RANK_ACTIVE_DAYS).map(([pid])=>+pid);
  if(kind==='ar')L=L.filter(pid=>R.bowl[fmt][pid]&&R.bowl[fmt][pid].n>=5).map(pid=>({pid,v:Math.round(pts('bat',pid)*pts('bowl',pid)/1000)}));
  else L=L.map(pid=>({pid,v:pts(kind,pid)}));
  return L.sort((x,y)=>y.v-x.v).slice(0,n);
}
function teamRanking(fmt){
  const R=R_(),T=R.team[fmt],y=careerDate().slice(0,4),Y=(R.yr[fmt]||{})[y]||{};
  return Object.entries(T).filter(([t])=>(S.teams[fmt][t]||{}).p>0).map(([t,e])=>({team:+t,pts:rankPts(e),was:Y[t]!=null?rankPts(Y[t]):null,p:S.teams[fmt][t].p}))
    .sort((a,b)=>b.pts-a.pts);
}

// ---------- player of the series: best total match score over a finished series ----------
function seriesDone(sid){
  return fixturesOf(sid).filter(x=>x.playable).every(x=>S.done[x.key]);
}
function playerOfSeries(sid){
  const R=R_();if(R.pos[sid]||!sid||!seriesDone(sid))return null;
  const M=S.matches.filter(E=>E.sid===sid);if(M.length<2)return null;
  const tot={};
  for(const E of M)for(const[pid,x]of Object.entries(matchScores(E,false))){const t=tot[pid]=tot[pid]||{s:0,team:x.team};t.s+=x.s;}
  const [pid,x]=Object.entries(tot).sort((a,b)=>b[1].s-a[1].s)[0];
  R.pos[sid]={pid:+pid,team:x.team,date:M[M.length-1].date,title:M[0].series,matches:M.length};
  return R.pos[sid];
}

// ---------- the year's awards ----------
function awardsFor(year){
  const M=S.matches.filter(E=>E.date.startsWith(year));if(M.length<AWARD_MIN_MATCHES)return null;
  const score={},runs=perFmt(()=>({})),wk=perFmt(()=>({}));
  const newcomer=p=>{const g=genP(p),d=DEBUT.get(p)||(g&&!g.real&&g.debut)||'';return d>=(+year-1)+'-01-01'&&daysBetween(CAREER_START,d)>365;};
  for(const E of M){
    for(const[pid,x]of Object.entries(matchScores(E,false))){const o=score[pid]=score[pid]||{s:0,tm:{}};o.s+=x.s;o.tm[x.team]=(o.tm[x.team]||0)+1;}
    for(const I of E.inns){for(const r of I.bt)runs[E.fmt][r[0]]=(runs[E.fmt][r[0]]||0)+r[1];for(const w of I.bw)wk[E.fmt][w[0]]=(wk[E.fmt][w[0]]||0)+w[4];}
  }
  for(const o of Object.values(score))o.team=+Object.entries(o.tm).sort((a,b)=>b[1]-a[1])[0][0];   // his main team that year
  const best=(o,f=()=>true)=>{const e=Object.entries(o).filter(([p,v])=>f(+p,v)).sort((a,b)=>(b[1].s??b[1])-(a[1].s??a[1]))[0];return e?{pid:+e[0],v:Math.round(e[1].s??e[1])}:null;};
  const full=t=>TEAMS.get(+t)?.full;
  const A={year,matches:M.length};
  A.coty=best(score);
  A.odiBat=best(runs.ODI);A.odiBowl=best(wk.ODI);
  if(M.some(E=>E.fmt==='TEST')){A.testBat=best(runs.TEST);A.testBowl=best(wk.TEST);}
  A.emerging=best(score,p=>newcomer(p));
  A.associate=best(score,(p,v)=>!full(v.team)&&!COMPOSITE.has(v.team));
  const tw={};for(const E of M)for(const t of E.teams){if(COMPOSITE.has(t))continue;const x=tw[t]=tw[t]||{p:0,w:0};x.p++;if(E.result.winner===t)x.w++;}
  const team=Object.entries(tw).filter(([,x])=>x.p>=8).sort((a,b)=>b[1].w/b[1].p-a[1].w/a[1].p)[0];
  if(team)A.team={team:+team[0],w:team[1].w,p:team[1].p};
  return A;
}
// Called after every match: awards every finished year once (a year is finished when a match from a later year,
// or the end of the calendar, has been played).
function yearEnd(E){
  const R=R_(),y=+E.date.slice(0,4),done=!nextFixture(),out=[];
  const upto=done?y:y-1;
  for(let yy=Math.max(R.awardYear+1,+CAREER_START.slice(0,4));yy<=upto;yy++){
    const A=awardsFor(String(yy));if(A){R.awards[yy]=A;out.push(A);}
    if(!S.sandbox){const hf=hofVote(yy);if(A&&hf.length)A.hof=hf;}
    R.awardYear=yy;
  }
  return out;
}
function rebuildRankings(){
  S.rk=blankRankings();
  for(const E of S.matches){applyRankings(E);playerOfSeries(E.sid);}
  if(S.matches.length)yearEnd(S.matches[S.matches.length-1]);
}
const AWARD_NAMES=[['coty','Cricketer of the Year'],['odiBat','ODI Batter of the Year','runs'],['odiBowl','ODI Bowler of the Year','wickets'],
  ['testBat','Test Batter of the Year','runs'],['testBowl','Test Bowler of the Year','wickets'],['emerging','Emerging Player of the Year'],['associate','Associate Player of the Year']];
