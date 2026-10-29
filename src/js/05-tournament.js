// ═══ SERIES & TOURNAMENTS — pools from fixture pairings, points tables with NRR, stages, timeline knockouts ═══
// Rules learned the hard way in the Excel version:
//  - stage detection uses team-pairing analysis, never match counts (Cricsheet has gaps) or fixture position;
//  - a pool fixture needs BOTH teams in the pool (one-team checks bleed across pools);
//  - pool size is not raw Union-Find. The Excel opponent-count mode breaks when Cricsheet is missing games
//    (2003 World Cup: four absent, mode 5 for pools of 7), so here the pool size is the largest one whose
//    capped Union-Find partition is a near-complete round robin (>= 75% of in-pool pairings played).
// Labelled fixtures "(Match N)" are league/pool/super-stage games; unlabelled ones in a labelled edition are
// knockouts - except a run longer than QF+SF+F, whose early games are an unlabelled super stage (2003 Super Six).
const PTS_WIN=4,PTS_TIE=2;
const EDITIONS=new Map();
function edition(sid){
  if(EDITIONS.has(sid))return EDITIONS.get(sid);
  const s=SERIES.get(sid);if(!s)return null;
  const fix=s.fix.map(n=>FIX_BY_NO.get(n));
  const labelled=fix.some(f=>f.mno>0);
  const league=fix.filter(f=>!labelled||f.mno>0);let ko=labelled?fix.filter(f=>!f.mno):[];
  const groups=detectGroups(league);
  if(ko.length>3&&ko.length!==7){league.push(...ko.slice(0,ko.length-3));ko=ko.slice(-3);}
  const gOf=t=>groups.get(t)||'';
  const stageOf=new Map();
  for(const f of league)stageOf.set(f.no,!groups.size?'':gOf(f.a)&&gOf(f.a)===gOf(f.b)&&(f.mno||!labelled)?'group':'super');
  const K=ko.length,tri=s.teams.size===3;
  ko.forEach((f,i)=>{
    const fromEnd=K-1-i;
    let st;
    if(tri&&K<=3)st='final'+(K>1?' '+(i+1):'');
    else if(fromEnd===0)st='final';
    else if(fromEnd<=2&&K>=3)st='semi';
    else if(fromEnd<=6&&K>=7)st='quarter';
    else st='playoff';
    stageOf.set(f.no,st);
  });
  const labels=[...new Set(groups.values())].sort();
  const hasSuper=league.some(f=>stageOf.get(f.no)==='super');
  const E={sid,s,fix,league,ko,groups,labels,stageOf,hasSuper,K,tri};
  EDITIONS.set(sid,E);
  return E;
}
function detectGroups(fixtures){
  const opp=new Map(),pairs=[];
  for(const f of fixtures){
    for(const[x,y]of[[f.a,f.b],[f.b,f.a]]){if(!opp.has(x))opp.set(x,new Set());opp.get(x).add(y);}
    pairs.push([f.a,f.b]);
  }
  const teams=[...opp.keys()],out=new Map();
  if(teams.length<3)return out;
  const played=new Set(pairs.map(([a,b])=>a<b?a+'-'+b:b+'-'+a));
  const partition=cap=>{
    const parent=new Map(teams.map(t=>[t,t])),sz=new Map(teams.map(t=>[t,1]));
    const find=t=>{while(parent.get(t)!==t){parent.set(t,parent.get(parent.get(t)));t=parent.get(t);}return t;};
    for(const[a,b]of pairs){
      const ra=find(a),rb=find(b);if(ra===rb)continue;
      if(sz.get(ra)+sz.get(rb)<=cap){if(sz.get(ra)>=sz.get(rb)){parent.set(rb,ra);sz.set(ra,sz.get(ra)+sz.get(rb));}else{parent.set(ra,rb);sz.set(rb,sz.get(ra)+sz.get(rb));}}
    }
    const roots=[];for(const t of teams){const r=find(t);if(!roots.includes(r))roots.push(r);}
    return roots.map(r=>teams.filter(t=>find(t)===r));
  };
  const coverage=gs=>{let have=0,all=0;for(const g of gs)for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){all++;const[a,b]=g[i]<g[j]?[g[i],g[j]]:[g[j],g[i]];if(played.has(a+'-'+b))have++;}return all?have/all:0;};
  for(let cap=teams.length;cap>=3;cap--){
    const gs=partition(cap),sizes=gs.map(g=>g.length);
    if(Math.max(...sizes)-Math.min(...sizes)>1||coverage(gs)<.75)continue;
    if(gs.length===1){teams.forEach(t=>out.set(t,'ALL'));return out;}
    gs.forEach((g,i)=>g.forEach(t=>out.set(t,String.fromCharCode(65+i))));
    return out;
  }
  teams.forEach(t=>out.set(t,'ALL'));
  return out;
}
const stageName=(st,E)=>({group:E&&E.labels.length===1?'League':'Group stage',super:'Super stage',quarter:'Quarter-final',semi:'Semi-final',final:'Final',playoff:'Play-off'}[st]||(st&&st.startsWith('final ')?'Final ('+st.slice(6)+')':''));
function superName(E){const q=superTeams(E).length;return q===6?'Super Six':q===8?'Super Eight':q===4?'Super Four':'Super stage';}
function histSuperTeams(E){const t=new Set();for(const f of E.league)if(E.stageOf.get(f.no)==='super'){t.add(f.a);t.add(f.b);}return[...t];}
// Super stage in your timeline: within each pool the historical qualifiers are swapped one-for-one for your
// top teams (each super-stage game is pool X v pool Y, so any swap inside a pool keeps the fixture list sound).
function superMap(E){
  if(!E.hasSuper||S.settings.knockouts!=='timeline'||!leagueComplete(E,'group'))return null;
  const hist=histSuperTeams(E),map=new Map();
  for(const t of groupTables(E)){
    const H=hist.filter(x=>E.groups.get(x)===t.g),top=t.rows.slice(0,H.length).map(r=>r.team);
    const outH=H.filter(x=>!top.includes(x)),inT=top.filter(x=>!H.includes(x));
    H.forEach(x=>map.set(x,x));outH.forEach((x,i)=>map.set(x,inT[i]));
  }
  return map;
}
function superTeams(E){const m=superMap(E),h=histSuperTeams(E);return m?h.map(t=>m.get(t)||t):h;}

// Results played in this career for an edition: fixture no -> archived match
function editionResults(sid){
  const out=new Map();
  for(const E of S.matches)if(E.sid===sid&&E.fid)out.set(E.fid,E);
  return out;
}
// Points table. NRR: an all-out innings counts as the full quota of overs.
function pointsTable(sid,teamFilter,fixFilter){
  const R=editionResults(sid),rows=new Map();
  const row=t=>{if(!rows.has(t))rows.set(t,{team:t,p:0,w:0,l:0,t:0,nr:0,pts:0,rf:0,bf:0,ra:0,ba:0});return rows.get(t);};
  if(teamFilter)teamFilter.forEach(row);
  for(const[fno,E]of R){
    const f=FIX_BY_NO.get(fno);
    if(fixFilter&&!fixFilter(f,E))continue;
    if(teamFilter&&!(teamFilter.includes(E.teams[0])&&teamFilter.includes(E.teams[1])))continue;
    for(const t of E.teams){
      const r=row(t),res=E.result;r.p++;
      if(res.type==='tie'){r.t++;r.pts+=PTS_TIE;}else if(res.type==='nr'||res.type==='draw'){r.nr++;r.pts+=PTS_TIE;}
      else if(res.winner===t){r.w++;r.pts+=PTS_WIN;}else r.l++;
    }
    for(const I of E.inns){
      const q=(E.fmt==='ODI'?50:0)*6,balls=I.wkts>=10&&q?q:I.lb;
      row(I.bat).rf+=I.runs;row(I.bat).bf+=balls;row(I.bowl).ra+=I.runs;row(I.bowl).ba+=balls;
    }
  }
  const list=[...rows.values()];
  list.forEach(r=>r.nrr=(r.bf?r.rf/(r.bf/6):0)-(r.ba?r.ra/(r.ba/6):0));
  list.sort((a,b)=>b.pts-a.pts||b.nrr-a.nrr||b.w-a.w||teamName(a.team).localeCompare(teamName(b.team)));
  return list;
}
function groupTables(E){
  return E.labels.map(g=>{
    const teams=[...E.groups].filter(([,l])=>l===g).map(([t])=>t);
    return{g,teams,rows:pointsTable(E.sid,teams,f=>E.stageOf.get(f.no)==='group')};
  });
}
// Super stage: super-stage games plus pool games between two qualifiers (points carried forward).
function superTable(E){
  const q=superTeams(E);
  return pointsTable(E.sid,q,f=>{const st=E.stageOf.get(f.no);return st==='super'||(st==='group'&&q.includes(f.a)&&q.includes(f.b));});
}
function leagueComplete(E,stage){
  const fx=E.league.filter(f=>!stage||E.stageOf.get(f.no)===stage);
  return fx.length>0&&fx.every(f=>S.done['o'+f.no]);
}

// ---------- timeline knockouts ----------
// When the league stage is finished in your career, knockouts are re-seeded from your tables
// (semis 1v4 / 2v3, or A1vB2 / B1vA2; quarter-finals A1vB4, A2vB3, A3vB2, A4vB1). Other shapes follow history.
function koSeeds(E){
  if(!leagueComplete(E))return null;
  if(E.hasSuper)return superTable(E).map(r=>r.team);
  if(E.labels.length<=1)return pointsTable(E.sid,null,f=>E.stageOf.get(f.no)==='group').map(r=>r.team);
  return null;
}
function koWinner(fno){const E=S.matches.find(m=>m.fid===fno);return E?E.result.winner||0:0;}
function resolveFixture(f){
  const E=edition(f.sid);if(!E||S.settings.knockouts!=='timeline')return null;
  if(E.stageOf.get(f.no)==='super'){const m=superMap(E);return m?{a:m.get(f.a)||f.a,b:m.get(f.b)||f.b}:null;}
  return resolveKO(f,E);
}
function resolveKO(f,E){
  E=E||edition(f.sid);if(!E||!E.ko.includes(f)||S.settings.knockouts!=='timeline')return null;
  const i=E.ko.indexOf(f),K=E.K,st=E.stageOf.get(f.no);
  const seeds=koSeeds(E);
  const tabs=E.labels.length>1?groupTables(E).map(t=>t.rows.map(r=>r.team)):null;
  const want=(a,b)=>a&&b&&a!==b?{a,b}:null;
  if(E.tri&&K<=3){const s=seeds||[];return want(s[0],s[1]);}
  if(K===1){if(seeds)return want(seeds[0],seeds[1]);if(tabs&&tabs.length===2&&leagueComplete(E))return want(tabs[0][0],tabs[1][0]);return null;}
  if(K===3){
    if(st==='final')return want(koWinner(E.ko[0].no),koWinner(E.ko[1].no));
    if(seeds&&!tabs)return i===0?want(seeds[0],seeds[3]):want(seeds[1],seeds[2]);
    if(E.hasSuper&&seeds)return i===0?want(seeds[0],seeds[3]):want(seeds[1],seeds[2]);
    if(tabs&&leagueComplete(E)){
      if(tabs.length===2)return i===0?want(tabs[0][0],tabs[1][1]):want(tabs[1][0],tabs[0][1]);
      if(tabs.length===4){const ws=tabs.map(t=>t[0]);return i===0?want(ws[0],ws[3]):want(ws[1],ws[2]);}
    }
    return null;
  }
  if(K===7&&tabs&&tabs.length===2){
    if(st==='quarter'){if(!leagueComplete(E))return null;const[A,B]=tabs;return[want(A[0],B[3]),want(A[1],B[2]),want(A[2],B[1]),want(A[3],B[0])][i];}
    if(st==='semi'){const q=E.ko.slice(0,4).map(x=>koWinner(x.no));return i===4?want(q[0],q[3]):want(q[1],q[2]);}
    if(st==='final')return want(koWinner(E.ko[4].no),koWinner(E.ko[5].no));
  }
  return null;
}

// ---------- bilateral series ----------
function seriesStatus(sid){
  const s=SERIES.get(sid)||testSeries(sid);if(!s)return null;
  const R=S.matches.filter(m=>m.sid===sid),w={};
  let dr=0;for(const E of R){if(E.result.winner)w[E.result.winner]=(w[E.result.winner]||0)+1;else dr++;}
  const teams=[...s.teams],[a,b]=teams,wa=w[a]||0,wb=w[b]||0,total=s.fix.length,left=total-R.length;
  let text;
  if(!R.length)text=`${total}-match series`;
  else if(wa===wb)text=left?`Series level ${wa}-${wb}`:`Series drawn ${wa}-${wb}`;
  else{const[l,ws,ls]=wa>wb?[a,wa,wb]:[b,wb,wa];text=`${teamName(l)} ${left?(ws>ls+left?'have won':'lead'):'won'} ${ws}-${ls}`;}
  return{text,played:R.length,total,wins:w,draws:dr,left};
}
