// ═══ SEASON PLANNER & WORKLOAD — the year ahead, projected fatigue, resting players ═══
// S.rest = {fixtureKey:[pid]}: men you rest for one match (pickXI leaves them out like an injury; the entry
// goes once the match is played). Fatigue is projected through the fixtures ahead with fatigueOf's own rules:
// each match he's expected to play in the 10 days before adds a match's load, and his usual overs in the 14 days before.
const PLAN_N=8;
const restFor=key=>(S.rest&&S.rest[key])||[];
const isRested=(fx,pid)=>!!fx&&restFor(fx.key).includes(+pid);
function toggleRest(key,pid){
  S.rest=S.rest||{};const L=S.rest[key]=S.rest[key]||[],i=L.indexOf(+pid);
  if(i>=0)L.splice(i,1);else L.push(+pid);
  if(!L.length)delete S.rest[key];
  if(i<0&&typeof achieve==='function')achieve('rotate');
  return i<0;
}
function restAfter(M){if(S.rest&&M.key)delete S.rest[M.key];}
function myUpcoming(team,days=365){
  const d=careerDate(),to=addDays(d,days);
  return allFixtures().filter(x=>x.playable&&!S.done[x.key]&&x.date<=to&&(x.a===team||x.b===team));
}
// The XI you'd field: the real one where there is one, through your squad, injuries and rest.
function probableXI(fx,team){
  const base=(fx.f&&WORLD.xi[fx.f.cid]&&WORLD.xi[fx.f.cid][team]&&fixtureXI(fx.f.cid,team))||(fx.real&&testXI(fx.f.cid,team,fx.date))||nearestXI(team,fx.date);
  return pickXI(fx,team,base).xi.bat;
}
const statFmtOf=fx=>fx.cup&&cupById(fx.sid)?.league?'LEAGUE':fx.fmt;
function usualOvers(pid,fmt,date){
  const s=S.stats[fmt]&&S.stats[fmt][pid],st=pAttr(pid,date).style;
  if(st==='N')return 0;
  if(s&&s.m>=3)return s.bb/6/s.m;
  return fmt==='TEST'?22:fmt==='ODI'?8:3;
}
const styleLoad=st=>st==='P'?1.3:st==='M'?1:.7;
// Projected fatigue for every player in the XIs of the next fixtures: {fx, xi, f:{pid:fatigue}}.
function workloadPlan(team,n=PLAN_N){
  const list=myUpcoming(team).slice(0,n),rows=list.map(fx=>({fx,xi:probableXI(fx,team),f:{}}));
  for(let j=0;j<rows.length;j++){
    const R=rows[j],date=R.fx.date;
    for(const pid of R.xi){
      let ov=0,m=0;
      for(let i=0;i<j;i++){const P=rows[i],d=daysBetween(P.fx.date,date);if(!P.xi.includes(pid)||d>21)continue;
        if(d<=10)m+=P.fx.fmt==='TEST'?3:1;if(d<=14)ov+=usualOvers(pid,statFmtOf(P.fx),date);}
      R.f[pid]=clamp(fatigueOf(pid,date)+Math.round(ov*styleLoad(pAttr(pid,date).style)+m*5),0,100);
    }
  }
  return rows;
}
const injRisk=(pid,fmt,f,date)=>((fmt==='TEST'?.006:.003)+f/100*.03*(pAttr(pid,date).style==='P'?2:1))*100;
// Recent load: matches in 90 days, overs in 30.
function recentLoad(pid,date){
  let m=0,ov=0;
  for(let i=S.matches.length-1;i>=0;i--){const E=S.matches[i],d=daysBetween(E.date,date);if(d>90)break;if(d<0)continue;
    if(!E.teams.some(t=>E.xi[t].slice(0,11).includes(pid)))continue;m++;
    if(d<=30)for(const I of E.inns){const w=I.bw.find(x=>x[0]===pid);if(w)ov+=w[1]/6;}}
  return{m,ov:Math.round(ov)};
}
// Rest whoever is projected at 60+ (two a match at most, never in a knockout); returns how many were rested.
function autoRotate(team){
  let n=0;
  for(let pass=0;pass<PLAN_N;pass++){
    const rows=workloadPlan(team);let changed=false;
    for(const R of rows){
      const ko=/final|semi|quarter|play-off/i.test(R.fx.stage||R.fx.label||'');if(ko)continue;
      const tired=R.xi.filter(p=>R.f[p]>=60&&!isRested(R.fx,p)).sort((a,b)=>R.f[b]-R.f[a]);
      if(tired.length&&restFor(R.fx.key).length<2){toggleRest(R.fx.key,tired[0]);n++;changed=true;break;}
    }
    if(!changed)break;
  }
  return n;
}
