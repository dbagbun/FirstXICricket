// ═══ LEGENDS — retirements, the Hall of Fame, teams of the decade, all-time XIs ═══
// S.hof = {retired:{pid:date}, inducted:{pid:{year,pct}}, ballots:{year:[[pid,pct]]}, onBallot:{pid:firstYear}, notes:[]}
// Retired: a generated retirement, or 50+ caps and no match for two years. Eligible two years after retiring;
// 75% needed, at most HOF_MAX a year, five years on the ballot. The vote follows a career score.
const HOF_CAPS=50,HOF_PCT=75,HOF_MAX=3,HOF_YEARS=5;
function hof(){if(!S.hof)S.hof={retired:{},inducted:{},ballots:{},onBallot:{},notes:[]};return S.hof;}
function careerOf(pid){
  const out={m:0,r:0,w:0,c100:0,w5:0,ct:0,st:0,motm:0,last:'',first:'',teams:new Set()};
  for(const f of FORMATS){const s=S.stats[f][pid];if(!s)continue;
    out.m+=s.m;out.r+=s.r;out.w+=s.bw;out.c100+=s.c100;out.w5+=s.w5;out.ct+=s.ct;out.st+=s.st;out.motm+=s.motm;
    if(!out.last||s.last>out.last)out.last=s.last;if(!out.first||s.first<out.first)out.first=s.first;s.teams.forEach(t=>out.teams.add(t));}
  return out;
}
function legacyScore(pid){
  const c=careerOf(pid),R=R_();let aw=0;
  for(const A of Object.values(R.awards))for(const[k]of AWARD_NAMES)if(A[k]&&A[k].pid===pid)aw++;
  return c.r/45+c.w*1.1+c.c100*5+c.w5*6+c.m*.25+c.motm*2+aw*12+(c.st+c.ct)*.3;
}
function findRetirements(date){
  const H=hof(),out=[];
  const done=pid=>{if(H.retired[pid])return;H.retired[pid]=date;const c=careerOf(pid);
    const line=`${pName(pid)} retires: ${c.m} internationals, ${c.r.toLocaleString()} runs${c.w?`, ${c.w} wickets`:''}.`;H.notes.push({date,text:line,pid});out.push(line);};
  if(S.gen)for(const[p,g]of Object.entries(S.gen.players))if(g.ret&&g.ret<=date&&capsOf(+p)>=10)done(+p);
  const seen=new Set();
  for(const f of FORMATS)for(const pid in S.stats[f]){if(seen.has(pid))continue;seen.add(pid);
    const c=careerOf(+pid);if(c.m>=HOF_CAPS&&c.last&&daysBetween(c.last,date)>730&&!(S.gen&&S.gen.players[pid]&&!S.gen.players[pid].ret))done(+pid);}
  return out;
}
// The vote at the end of `year`: the career score, ranked against everyone eligible, becomes a percentage.
function hofVote(year){
  const H=hof();if(H.ballots[year])return[];
  const date=year+'-12-31';findRetirements(date);
  const elig=Object.entries(H.retired).filter(([p,d])=>!H.inducted[p]&&daysBetween(d,date)>=730&&(H.onBallot[p]??year)>year-HOF_YEARS).map(([p])=>+p);
  for(const p of elig)if(H.onBallot[p]==null)H.onBallot[p]=year;
  const sc=elig.map(p=>[p,legacyScore(p)]).sort((a,b)=>b[1]-a[1]);
  const top=sc.length?sc[0][1]:1;
  const ballot=sc.map(([p,s])=>[p,clamp(Math.round(30+60*s/Math.max(top,180)+rndInt(-6,6)),1,99)]).sort((a,b)=>b[1]-a[1]);
  H.ballots[year]=ballot;
  const ins=ballot.filter(b=>b[1]>=HOF_PCT).slice(0,HOF_MAX);
  for(const[p,pct]of ins){H.inducted[p]={year,pct};H.notes.push({date,text:`${pName(p)} is inducted into the Hall of Fame with ${pct}% of the vote.`,pid:p});}
  return ins.map(([p,pct])=>({pid:p,pct}));
}
// Team of the decade / all-time XI: six batters, a keeper and four bowlers from a set of matches or players.
function bestXI(players,fmt){
  const st=p=>S.stats[fmt][p]||null,ok=players.filter(p=>st(p)&&st(p).m>=5);
  const bat=p=>{const s=st(p);return s.r*(1+Math.min(1,batAvg(s)/50||0));};
  const bowl=p=>{const s=st(p);return s.bw*(1+Math.min(1,25/(bowlAvg(s)||99)));};
  const kc=new Map();for(const E of S.matches)if(E.fmt===fmt)for(const t of E.teams){const k=E.xi[t][11];kc.set(k,(kc.get(k)||0)+1);}
  const keeperScore=p=>kc.get(p)||0;
  const used=new Set(),pickN=(arr,n,f)=>arr.filter(p=>!used.has(p)).sort((a,b)=>f(b)-f(a)).slice(0,n).map(p=>{used.add(p);return p;});
  const keeper=pickN(ok.filter(p=>keeperScore(p)>=5),1,p=>keeperScore(p)*10+bat(p))[0];
  const bowlers=pickN(ok.filter(p=>st(p).bw>=10),4,bowl);
  const batters=pickN(ok,6,bat);
  return{batters,keeper,bowlers};
}
function decadeTeams(dec){
  const from=dec+'-01-01',to=(dec+9)+'-12-31',out={};
  for(const f of FORMATS){
    const ps=new Set();for(const E of S.matches)if(E.fmt===f&&E.date>=from&&E.date<=to)for(const t of E.teams)E.xi[t].slice(0,11).forEach(p=>ps.add(p));
    if(ps.size>=30)out[f]=bestXI([...ps],f);
  }
  return out;
}
function allTimeXI(team,fmt){
  const ps=Object.keys(S.stats[fmt]).map(Number).filter(p=>S.stats[fmt][p].teams.includes(team));
  return ps.length>=15?bestXI(ps,fmt):null;
}
function storyOf(pid){
  const out=[],c=careerOf(pid),H=hof();
  if(c.first)out.push([c.first,'First international in your career']);
  for(const m of S.ms.filter(m=>m.pid===pid))out.push([m.date,m.text+' ('+m.fmt+')']);
  for(const[y,A]of Object.entries(R_().awards))for(const[k,n]of AWARD_NAMES)if(A[k]&&A[k].pid===pid)out.push([y+'-12-31',n+' '+y]);
  if(H.retired[pid])out.push([H.retired[pid],'Retired']);
  if(H.inducted[pid])out.push([H.inducted[pid].year+'-12-31',`Inducted into the Hall of Fame (${H.inducted[pid].pct}%)`]);
  return out.sort((a,b)=>a[0]<b[0]?-1:1);
}
