// ═══ RANKINGS & AWARDS — team ratings, player rankings, player of the series, the year's awards ═══
// Team rankings work like the real ones: a rating = points / matches over the last 3-4 years (see TEAM RATINGS
// below), with an annual update every 1 May. An Elo rating per team is still kept underneath (R.team: full members
// start 1500, Zimbabwe/Bangladesh 1400, associates 1250) to weigh the opposition in player rankings. Player rankings
// are an exponential average of match performances, scaled by the opposition's Elo, so form counts more than
// history. Both tables change after every match and are "released" weekly (Wednesdays): R.wk.prev keeps the places
// at the last release, so the tables show each side's and man's move since last week.
const RANK_K={ODI:24,TEST:32,T20:20,LEAGUE:20},RANK_ACTIVE_DAYS=420,AWARD_MIN_MATCHES=15;
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
    s+=L.ct*10+(L.ctk||0)*8+L.st*15+L.ro*12+L.c100*30+L.c50*15+L.w5*40;
    if(winnerBonus&&E.result.winner&&L.team===E.result.winner)s*=1.25;
    out[L.pid]={s,team:L.team,L};
  }
  return out;
}
function applyRankings(E){
  const R=R_(),T=R.team[E.fmt],[a,b]=E.teams,y=E.date.slice(0,4);
  rankRelease(E.date);R.wk.last=E.date;
  if(!E.teams.some(t=>COMPOSITE.has(+t)))teamRateMatch(E);
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
// Steadiness: each match moves the average by RANK_CFG.alpha (was .12 - one big score could take a man from 11th to
// 1st; now a hundred is worth a few places near the top). The average starts at 0, so rankVal corrects for that
// (divides by 1-(1-alpha)^n) and then holds a newcomer back until he has RANK_CFG.ramp matches in that format (a Test
// is one line for both innings): a proper record, not three good knocks, gets you to the top.
const RANK_CFG={alpha:.05,ramp:{ODI:20,TEST:10,T20:15,LEAGUE:12}};
function upd(tab,pid,perf,date){const x=tab[pid]||(tab[pid]={p:0,n:0,d:date});const a=RANK_CFG.alpha;x.p=x.p*(1-a)+perf*a;x.n++;x.d=date;}
function rankVal(x,fmt){if(!x||!x.n)return 0;const a=RANK_CFG.alpha;return x.p/(1-Math.pow(1-a,x.n))*Math.min(1,x.n/(RANK_CFG.ramp[fmt]||12));}
const PLAYER_SCALE={bat:{ODI:16,TEST:10,T20:24,LEAGUE:24},bowl:{ODI:14,TEST:12,T20:16,LEAGUE:16}};
const COMPOSITE=new Set(WORLD.teams.filter(t=>/ XI$/.test(t.name)).map(t=>t.id));   // Africa XI, Asia XI, ICC World XI
function playerRanking(fmt,kind,n=20,now=careerDate()){
  const R=R_(),tab=R[kind==='ar'?'bat':kind][fmt];
  const pts=(k,pid)=>{const x=R[k][fmt][pid];return x?Math.max(0,Math.round(rankVal(x,fmt)*PLAYER_SCALE[k][fmt])):0;};
  let L=Object.entries(tab).filter(([,x])=>x.n>=5&&daysBetween(x.d,now)<=RANK_ACTIVE_DAYS).map(([pid])=>+pid);
  if(kind==='ar')L=L.filter(pid=>R.bowl[fmt][pid]&&R.bowl[fmt][pid].n>=5).map(pid=>({pid,v:Math.round(pts('bat',pid)*pts('bowl',pid)/1000)}));
  else L=L.map(pid=>({pid,v:pts(kind,pid)}));
  return L.sort((x,y)=>y.v-x.v).slice(0,n);
}
// Ranking moves from one match (recordMatch, for matches you play): the team table and the top 10 batters, bowlers and
// all-rounders of that format, before and after - for the two sides playing and the men in the match (teams: any move;
// players: into or out of the top 10, or a new No.1). Anyone else only if he (or it) goes to No.1.
// E.rk = [{k:'team'|'bat'|'bowl'|'ar', id, from, to}] (0 = unranked); rankMoveText words one.
const RANK_TOP=10,RANK_KINDS=[['bat','batter'],['bowl','bowler'],['ar','all-rounder']];
function rankSnapshot(fmt){
  if(!R_().team[fmt])return null;
  const o={team:teamRanking(fmt).map(r=>r.team)};
  for(const[k]of RANK_KINDS)o[k]=playerRanking(fmt,k,200).map(r=>r.pid);
  return o;
}
function rankMoves(a,b,E){
  if(!a||!b)return[];
  const out=[],pos=(L,x)=>L.indexOf(x)+1,newTop=(f,to)=>to===1&&f!==1;
  const sides=new Set(E?E.teams:[]),men=new Set(E?E.teams.flatMap(t=>E.xi[t].slice(0,11)):[]);
  for(const t of new Set([...a.team,...b.team])){const f=pos(a.team,t),to=pos(b.team,t);
    if(!to)continue;
    if(E?sides.has(t)||(f!==to&&newTop(f,to)):f!==to)out.push({k:'team',id:t,from:f,to});}   // both sides every match, moved or not
  for(const[k]of RANK_KINDS){
    const top=L=>new Set(L.slice(0,RANK_TOP));const A=top(a[k]),B=top(b[k]);
    for(const p of new Set([...A,...B])){const f=pos(a[k],p),to=pos(b[k],p);
      if(!(A.has(p)!==B.has(p)||newTop(f,to)))continue;
      if(!E||men.has(p)||newTop(f,to))out.push({k,id:p,from:f,to});}
  }
  return out;
}
function rankMoveText(x,fmt){
  const F=FMT_NAME[fmt]||fmt,was=x.from?ordinal(x.from):'unranked',now=x.to?ordinal(x.to):'unranked';
  if(x.k==='team'){
    if(!x.from)return`${teamName(x.id)} into the ${F} team rankings at ${now}`;
    if(x.to===x.from)return`${teamName(x.id)} stay ${now} in the ${F} team rankings`;
    return`${teamName(x.id)} ${x.to<x.from?'up':'down'} to ${now} in the ${F} team rankings (was ${was})`;}
  const kind=RANK_KINDS.find(r=>r[0]===x.k)[1];
  if(x.to===1)return`${pName(x.id)} is the new No.1 ${F} ${kind} (was ${was})`;
  if(x.to&&x.to<=RANK_TOP)return`${pName(x.id)} into the top ${RANK_TOP} ${F} ${kind}s at ${now} (was ${was})`;
  return`${pName(x.id)} out of the top ${RANK_TOP} ${F} ${kind}s: now ${now} (was ${was})`;
}
// Career lists (matches you play): a man in the match who moves up the career runs or wickets list of the match's
// format, or of all international cricket (ODI + Test + T20I), within or into the top CAREER_TOP 20.
// E.lb = [{s:'r'|'bw', f:fmt|'ALL', id, from, to, v, passed:[pids]}] (from 0 = not on the list before).
const CAREER_TOP=20,CAREER_FMTS=['ODI','TEST','T20'];
function careerSnap(E){
  if(!CAREER_FMTS.includes(E.fmt))return null;
  const out={};
  for(const f of[E.fmt,'ALL'])for(const s of['r','bw']){
    const val=new Map();
    for(const g of f==='ALL'?CAREER_FMTS:[f])for(const[p,x]of Object.entries(S.stats[g]||{}))if(x[s])val.set(+p,(val.get(+p)||0)+x[s]);
    out[f+':'+s]={val,top:[...val.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,CAREER_TOP*2).map(x=>x[0])};
  }
  return out;
}
function careerMoves(a,b,E){
  if(!a||!b)return[];
  const men=E.teams.flatMap(t=>E.xi[t].slice(0,11)),out=[];
  const rank=(L,p)=>{const v=L.val.get(p);if(!v)return 0;let n=1;for(const x of L.val.values())if(x>v)n++;return n;};
  for(const k of Object.keys(b)){const[f,s]=k.split(':'),A=a[k],B=b[k];
    for(const p of men){const to=rank(B,p),from=rank(A,p);
      if(!to||to>CAREER_TOP||(from&&from<=to))continue;
      const passed=(from?A.top.slice(to-1,from-1):A.top.slice(to-1,CAREER_TOP)).filter(q=>q!==p&&rank(B,q)>to).slice(0,2).map(q=>[q,B.val.get(q)]);
      const v=B.val.get(p),joint=[...B.val.entries()].some(([q,x])=>q!==p&&x===v);
      out.push({s,f,id:p,from:from>CAREER_TOP*2?0:from,to,v,passed,joint});}}
  return out;
}
function careerMoveText(x){
  const list=`career ${x.f==='ALL'?'international (all formats)':FMT_NAME[x.f]} ${x.s==='r'?'runs':'wickets'}`;
  const was=x.from?ordinal(x.from):'outside the top '+(CAREER_TOP*2);
  return`${pName(x.id)} ${x.from&&x.from<=CAREER_TOP?'up to':'into the top '+CAREER_TOP+' at'} ${x.joint?'joint ':''}${ordinal(x.to)} on the ${list} list with ${x.v.toLocaleString()} (was ${was})${x.passed.length?', passing '+x.passed.map(q=>Array.isArray(q)?`${pName(q[0])} (${q[1].toLocaleString()})`:pName(q)).join(' and '):''}`;
}
function rankMovesHTML(E){
  const rk=E.rk||[],lb=E.lb||[];if(!rk.length&&!lb.length)return'';
  const icon=x=>x.to&&x.from===x.to?'<span class="muted">●</span>':x.to&&(!x.from||x.to<x.from)?'<span class="green">▲</span>':'<span class="red">▼</span>';
  return`<div class="banner" style="margin-top:10px">${rk.length?`<b>Rankings</b>${rk.map(x=>`<div style="font-size:13px;margin-top:3px">${icon(x)} ${x.k==='team'?badge(x.id)+' ':''}${esc(rankMoveText(x,E.fmt))}</div>`).join('')}`:''}
    ${lb.length?`<b style="display:block;margin-top:${rk.length?8:0}px">Career lists</b>${lb.map(x=>`<div style="font-size:13px;margin-top:3px"><span class="green">▲</span> ${esc(careerMoveText(x))}</div>`).join('')}`:''}</div>`;
}
// Leaderboards after a match you play (recordMatch): the team table and the top LB_TOP batters, bowlers and
// all-rounders of the format, and the career runs / wickets lists (the format and all internationals), each entry
// with its place before the match - so the men who held their place show too. E.lbd = {team:[[id,rating,from]],
// bat|bowl|ar:[[pid,pts,from]], 'c:FMT:r'|'c:ALL:bw'...:[[pid,total,from,to]]} (from 0 = not on the list before;
// career places are joint for equal totals). Kept on the last LB_KEEP played matches.
const LB_TOP=10,LB_KEEP=200;
function careerPos(L,p){const v=L.val.get(p);if(!v)return 0;let n=1;for(const x of L.val.values())if(x>v)n++;return n;}
function leaderboards(rkA,lbA,lbB,E){
  const o={};
  if(rkA){o.team=teamRanking(E.fmt).map(r=>[r.team,r.pts,rkA.team.indexOf(r.team)+1]);
    for(const[k]of RANK_KINDS)o[k]=playerRanking(E.fmt,k,LB_TOP).map(r=>[r.pid,r.v,rkA[k].indexOf(r.pid)+1]);}
  if(lbA&&lbB)for(const key of Object.keys(lbB)){const A=lbA[key],B=lbB[key];
    o['c:'+key]=B.top.slice(0,LB_TOP).map(p=>{const f=careerPos(A,p);return[p,B.val.get(p),f>CAREER_TOP*2?0:f,careerPos(B,p)];});}
  return o;
}
function lbTrim(){let n=0;for(let i=S.matches.length-1;i>=0;i--)if(S.matches[i].lbd&&++n>LB_KEEP)delete S.matches[i].lbd;}
let LB_TAB='team';
function leaderboardsHTML(E){
  const L=E.lbd;if(!L)return'';
  const men=new Set(E.teams.flatMap(t=>(E.xi[t]||[]).slice(0,11))),sides=new Set(E.teams),F=FMT_NAME[E.fmt]||E.fmt;
  const mv=(from,to)=>from?from-to:'new';
  const tabs=[['team','Teams'],['bat','Batting'],['bowl','Bowling'],['ar','All-rounders'],['r','Career runs'],['bw','Career wickets']]
    .filter(([k])=>k==='r'||k==='bw'?Object.keys(L).some(x=>x.endsWith(':'+k)):L[k]&&L[k].length);
  if(!tabs.length)return'';
  const tab=tabs.some(t=>t[0]===LB_TAB)?LB_TAB:tabs[0][0];
  const rows=(list,isTeam)=>list.map(([id,v,from],i)=>`<tr class="${(isTeam?sides:men).has(id)?'lb-hl':''}"><td class="muted">${i+1}</td>${mvCell(mv(from,i+1))}<td>${isTeam?tlabel(id):plink(id)}</td><td class="r"><b>${v}</b></td></tr>`).join('');
  const crows=list=>list.map(([id,v,from,to],i)=>{const joint=list.some((x,j)=>j!==i&&x[1]===v);return`<tr class="${men.has(id)?'lb-hl':''}"><td class="muted">${joint?'=':''}${to}</td>${mvCell(mv(from,to))}<td>${plink(id)}</td><td class="r"><b>${v.toLocaleString()}</b></td></tr>`;}).join('');
  const panel=k=>{
    if(k==='team')return`<table class="num lb"><tr><th>#</th><th></th><th>Team</th><th class="r">Rating</th></tr>${rows(L.team,true)}</table>`;
    if(k==='r'||k==='bw')return Object.keys(L).filter(x=>x.endsWith(':'+k)).map(x=>{const f=x.split(':')[1];
      return`<div class="sub" style="margin:6px 0 2px">${f==='ALL'?'All internationals':F}</div><table class="num lb"><tr><th>#</th><th></th><th>Player</th><th class="r">${k==='r'?'Runs':'Wkts'}</th></tr>${crows(L[x])}</table>`;}).join('');
    return`<table class="num lb"><tr><th>#</th><th></th><th>Player</th><th class="r">Points</th></tr>${rows(L[k],false)}</table>`;
  };
  return`<div class="lbd" style="margin-top:12px"><h3 style="margin:0 0 6px">Leaderboards</h3>
    <div class="seg lb-tabs" style="flex-wrap:wrap">${tabs.map(([k,n])=>`<button data-lbt="${k}" class="${k===tab?'on':''}">${n}</button>`).join('')}</div>
    ${tabs.map(([k])=>`<div class="lb-panel" data-lbp="${k}"${k===tab?'':' hidden'}>${panel(k)}</div>`).join('')}
    <div class="muted" style="font-size:12px;margin-top:6px">${F} after this match · ▲▼ = places moved in this match · highlighted = played in it</div></div>`;
}
function wireLeaderboards(root=document){
  root.querySelectorAll('.lbd [data-lbt]').forEach(b=>b.onclick=()=>{LB_TAB=b.dataset.lbt;const box=b.closest('.lbd');
    box.querySelectorAll('[data-lbt]').forEach(x=>x.classList.toggle('on',x===b));box.querySelectorAll('[data-lbp]').forEach(p=>p.hidden=p.dataset.lbp!==LB_TAB);});
}
// Both teams' places in that format's rankings, as the match starts (kept on M, so they don't change when it ends):
// pre-match under the venue and above the scoreboard while it's played.
function matchRanks(M){if(!M.rkPre){const L=teamRanking(M.fmt).map(r=>r.team);M.rkPre=Object.fromEntries(M.teams.map(t=>[t,L.indexOf(t)+1]));}return M.rkPre;}
function matchRankLine(M){
  if(!['ODI','TEST','T20'].includes(M.fmt)||M.challenge||M.statFmt==='LEAGUE'||!S||!S.rk)return'';
  const R=matchRanks(M);return`${FMT_NAME[M.fmt]} rankings: `+M.teams.map(t=>`${teamShort(t)} ${R[t]?ordinal(R[t]):'unranked'}`).join(' v ');
}
// ---------- TEAM RATINGS, the way the real rankings work ----------
// Each rated match earns each side points from the two ratings going into it: within 40 of each other, a win is
// worth the opponent's rating + 50, a loss the opponent's rating - 50, a tie or draw the opponent's rating; 40 or
// more apart, the stronger side gets its own rating +10 for a win, -40 for a draw, -90 for a loss (the weaker side
// +90 / +40 / -10). Points never go below 0. No-results and composite XIs are not rated. Rating = points / matches, over matches since 1 May
// three years before the last annual update: those since the May before it count in full, the two years before
// that at half. Every 1 May (TEAM_UPD) the oldest year drops off and the next one halves. A side new to the table
// starts with TEAM_SEED_N pretend matches at its seed rating (rankPts(eloStart)), dated its first game, so they
// age out the same way. R.icc[fmt] = [[date, team, points, seed?]].
const TEAM_SEED_N=4,TEAM_UPD='05-01',TEAM_CACHE=new WeakMap();
function teamTab(fmt){const R=R_();R.icc=R.icc||{};return R.icc[fmt]=R.icc[fmt]||[];}
const teamUpdYear=d=>+d.slice(0,4)-(d.slice(5)>=TEAM_UPD?0:1);   // year of the last annual update on or before d
function teamWt(d,now){const Y=teamUpdYear(now);return d>=(Y-1)+'-'+TEAM_UPD?1:d>=(Y-3)+'-'+TEAM_UPD?.5:0;}
function teamRatings(fmt,now=careerDate()){
  const tab=teamTab(fmt),c=TEAM_CACHE.get(tab);if(c&&c.len===tab.length&&c.now===now)return c.v;
  const v={};for(const[d,t,p,seed]of tab){const w=teamWt(d,now);if(!w)continue;const x=v[t]=v[t]||{pts:0,w:0,n:0};x.pts+=p*w;x.w+=w;if(!seed)x.n++;}
  for(const x of Object.values(v))x.r=x.pts/x.w;
  TEAM_CACHE.set(tab,{len:tab.length,now,v});return v;
}
const teamRating=(fmt,t,now)=>{const x=teamRatings(fmt,now)[t];return x?Math.round(x.r):rankPts(eloStart(t));};
function teamMatchPts(r,o,s){   // never below 0, so a rating can't go negative
  if(Math.abs(r-o)<40)return Math.max(0,o+(s===1?50:s===0?-50:0));
  return Math.max(0,r>o?r+(s===1?10:s===0?-90:-40):r+(s===1?90:s===0?-10:40));
}
function teamRateMatch(E){
  const tab=teamTab(E.fmt),d=E.date,res=E.result||{};
  if(tab.length&&!teamWt(tab[0][0],d)){const keep=tab.filter(x=>teamWt(x[0],d));tab.length=0;tab.push(...keep);}   // the annual update drops the oldest year
  const have=teamRatings(E.fmt,d);
  for(const t of E.teams)if(!have[t])for(let i=0;i<TEAM_SEED_N;i++)tab.push([d,+t,rankPts(eloStart(t)),1]);
  if(res.type==='nr')return;
  const[a,b]=E.teams,ra=teamRating(E.fmt,a,d),rb=teamRating(E.fmt,b,d),sa=res.winner===a?1:res.winner===b?0:.5;
  tab.push([d,+a,teamMatchPts(ra,rb,sa)],[d,+b,teamMatchPts(rb,ra,1-sa)]);
}
// The table: sides with a rated match in the window, best first. {team, pts (the rating), p (rated matches)}
function teamRanking(fmt,now=careerDate()){
  return Object.entries(teamRatings(fmt,now)).filter(([,x])=>x.n>0).map(([t,x])=>({team:+t,pts:Math.round(x.r),p:x.n,r:x.r}))
    .sort((a,b)=>b.r-a.r||a.team-b.team);
}
// ---------- weekly releases (Wednesdays) ----------
function rankWeek(d){const t=Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10)),back=(new Date(t).getUTCDay()+4)%7;return new Date(t-back*864e5).toISOString().slice(0,10);}
const RANK_REL_N=100;
function rankRelease(date){
  const R=R_(),k=rankWeek(date);if(R.wk&&R.wk.k===k)return;
  const prev={},now=R.wk?R.wk.last||date:date;
  for(const f of FORMATS){const o={team:teamRanking(f,now).map(r=>r.team)};for(const[kk]of RANK_KINDS)o[kk]=playerRanking(f,kk,RANK_REL_N,now).map(r=>r.pid);
    if(o.team.length||o.bat.length)prev[f]=o;}
  R.wk={k,prev,last:date};
}
// places moved since last week's release: a number (+ up), 'new', or null (no release yet)
function rankMv(fmt,list,id,pos){
  const R=R_(),P=R.wk&&R.wk.prev&&R.wk.prev[fmt];if(!P||!P[list])return null;
  const i=P[list].indexOf(id);return i<0?'new':i+1-pos;
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
// Saves from before the steadier player rankings (RANK_CFG): recount the batting and bowling averages from the
// scorecards once at the new weight. Team ratings, awards and the history are left as they are.
// (2: also the team ratings and the weekly releases.)
function rankSteady(){
  if(S.rkSteady>=2)return;S.rkSteady=2;
  if(!S.rk||!S.matches||!S.matches.length)return;
  const keep=S.rk;S.rk=blankRankings();
  try{for(const E of S.matches)applyRankings(E);for(const k of['bat','bowl','icc','wk'])keep[k]=S.rk[k];}finally{S.rk=keep;}
}
function rebuildRankings(){
  S.rk=blankRankings();
  for(const E of S.matches){applyRankings(E);playerOfSeries(E.sid);}
  if(S.matches.length)yearEnd(S.matches[S.matches.length-1]);
}
const AWARD_NAMES=[['coty','Cricketer of the Year'],['odiBat','ODI Batter of the Year','runs'],['odiBowl','ODI Bowler of the Year','wickets'],
  ['testBat','Test Batter of the Year','runs'],['testBowl','Test Bowler of the Year','wickets'],['emerging','Emerging Player of the Year'],['associate','Associate Player of the Year']];
