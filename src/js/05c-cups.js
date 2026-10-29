// ═══ YOUR OWN TOURNAMENTS — S.cups: build a World Cup of your own ═══
// cup = {id:'C<n>', name, fmt, format, host, start, teams (seeded), groups {A:[...]}, fix:[{key, n, date, stage,
//   label, group, sa, sb, venue, city}]}. Knockout slots: 'S3' seed 3, 'P2' 2nd in the league, 'A1' winner of
//   group A, 'W:<key>' winner of that fixture. Slots resolve when what they need has been played.
const CUP_FORMATS={
  rr:{name:'Round robin, then semi-finals & final',min:3,max:10},
  groups2:{name:'Two groups, then semi-finals & final',min:6,max:16},
  groups4:{name:'Four groups, then quarter-finals',min:8,max:16},
  ko:{name:'Straight knockout',sizes:[4,8,16]},
};
const KO_ORDER={4:[1,4,2,3],8:[1,8,4,5,2,7,3,6],16:[1,16,8,9,4,13,5,12,2,15,7,10,3,14,6,11]};
function rrPairs(list){const out=[];for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)out.push([list[i],list[j]]);
  // spread each team's games: order by the later of the two indices, then the earlier
  return out.sort((x,y)=>(Math.max(list.indexOf(x[0]),list.indexOf(x[1]))-Math.max(list.indexOf(y[0]),list.indexOf(y[1])))||list.indexOf(x[0])-list.indexOf(y[0]));}
function createCup({name,fmt='ODI',format='rr',host,start,teams}){
  const fk=fmt==='TEST'?'TEST':fmt;
  teams=[...new Set(teams.map(Number))].sort((a,b)=>rankPtsOf(b,fk)-rankPtsOf(a,fk));
  if(fmt==='TEST')format='rr';
  if(fmt==='T20'&&start<T20_START)start=T20_START;
  const id='C'+(S.cupSeq=(S.cupSeq||0)+1);
  const cup={id,name:name||`${teamName(host)} ${start.slice(0,4)} ${FMT_NAME[fmt]} Cup`,fmt,format,host:+host,start,teams,groups:{},fix:[]};
  const gap=fmt==='TEST'?6:1;let day=0;
  const venues=(HOME_VENUES.get(+host)||[{venue:teamName(host)+' Oval',city:''}]).slice(0,10);
  const add=(stage,label,sa,sb,group)=>{const n=cup.fix.length+1,v=venues[(n-1)%venues.length];
    cup.fix.push({key:id+'.'+n,n,date:addDays(start,day),stage,label,group:group||'',sa,sb,venue:v.venue,city:v.city});day+=gap;};
  const ng=format==='groups2'?2:format==='groups4'?4:format==='rr'?1:0;
  if(ng){
    const G=[...Array(ng)].map(()=>[]);
    teams.forEach((t,i)=>{const r=Math.floor(i/ng),k=r%2?ng-1-i%ng:i%ng;G[k].push(t);});   // snake seeding
    G.forEach((g,k)=>cup.groups[String.fromCharCode(65+k)]=g);
    const lists=G.map((g,k)=>rrPairs(g).map(p=>[...p,String.fromCharCode(65+k)]));
    for(let r=0;lists.some(l=>l.length);r++)for(const l of lists)if(l.length){const[a,b,g]=l.shift();add('group',ng>1?'Group '+g:'League',a,b,ng>1?g:'');}
    day+=1;
  }
  const W=k=>'W:'+id+'.'+k;
  if(fmt==='TEST'){}
  else if(format==='rr'){
    if(teams.length>=4){add('semi','Semi-final 1','P1','P4');const s1=cup.fix.length;add('semi','Semi-final 2','P2','P3');day+=1;add('final','Final',W(s1),W(s1+1));}
    else add('final','Final','P1','P2');
  }else if(format==='groups2'){
    add('semi','Semi-final 1','A1','B2');const s1=cup.fix.length;add('semi','Semi-final 2','B1','A2');day+=1;add('final','Final',W(s1),W(s1+1));
  }else if(format==='groups4'){
    const q=cup.fix.length+1;
    add('quarter','Quarter-final 1','A1','B2');add('quarter','Quarter-final 2','B1','A2');add('quarter','Quarter-final 3','C1','D2');add('quarter','Quarter-final 4','D1','C2');day+=1;
    add('semi','Semi-final 1',W(q),W(q+2));add('semi','Semi-final 2',W(q+1),W(q+3));day+=1;add('final','Final',W(q+4),W(q+5));
  }else{
    const size=teams.length,order=KO_ORDER[size];let round=[];
    const rname=n=>n===2?'Final':n===4?'Semi-final':n===8?'Quarter-final':'Round of '+n;
    for(let i=0;i<size;i+=2){add(size===2?'final':size===4?'semi':size===8?'quarter':'r16',`${rname(size)} ${i/2+1}`,'S'+order[i],'S'+order[i+1]);round.push(cup.fix.length);}
    for(let n=size/2;n>=2;n/=2){day+=1;const next=[];
      for(let i=0;i<round.length;i+=2){add(n===2?'final':n===4?'semi':'quarter',n===2?'Final':`${rname(n)} ${i/2+1}`,W(round[i]),W(round[i+1]));next.push(cup.fix.length);}
      round=next;}
  }
  (S.cups=S.cups||[]).push(cup);fxDirty();
  if(!S.sandbox&&typeof achieve==='function')achieve('cupBuilt');
  return cup;
}
const cupById=id=>(S.cups||[]).find(c=>c.id===id);
function cupMatches(cup){return S.matches.filter(E=>E.sid===cup.id);}
// Points table from archived matches (W4, T/NR 2; NRR with an all-out innings counted as the full quota).
function tableFrom(matches,teams){
  const rows=new Map(teams.map(t=>[t,{team:t,p:0,w:0,l:0,t:0,nr:0,pts:0,rf:0,bf:0,ra:0,ba:0}]));
  for(const E of matches){
    if(!E.teams.every(t=>rows.has(t)))continue;
    for(const t of E.teams){const r=rows.get(t),res=E.result;r.p++;
      if(res.type==='tie'){r.t++;r.pts+=PTS_TIE;}else if(res.type==='nr'||res.type==='draw'){r.nr++;r.pts+=PTS_TIE;}
      else if(res.winner===t){r.w++;r.pts+=PTS_WIN;}else r.l++;}
    for(const I of E.inns){const q=E.fmt==='TEST'?0:(I.mo||E.maxOv||50)*6,balls=I.wkts>=10&&q?q:I.lb;
      rows.get(I.bat).rf+=I.runs;rows.get(I.bat).bf+=balls;rows.get(I.bowl).ra+=I.runs;rows.get(I.bowl).ba+=balls;}
  }
  const list=[...rows.values()];
  list.forEach(r=>r.nrr=(r.bf?r.rf/(r.bf/6):0)-(r.ba?r.ra/(r.ba/6):0));
  return list.sort((a,b)=>b.pts-a.pts||b.nrr-a.nrr||b.w-a.w||a.team-b.team);
}
function cupGroupDone(cup){return cup.fix.filter(f=>f.stage==='group').every(f=>S.done[f.key]);}
function cupTables(cup){
  const M=cupMatches(cup).filter(E=>/^Group|^League/.test(E.stage));
  return Object.entries(cup.groups).map(([g,teams])=>({g,rows:tableFrom(M,teams)}));
}
function resolveSlot(cup,spec){
  if(!spec)return 0;
  if(typeof spec==='number')return spec;   // a group fixture names its teams directly
  if(spec[0]==='S')return cup.teams[+spec.slice(1)-1]||0;
  if(spec.startsWith('W:')){
    const key=spec.slice(2),mid=S.done[key];if(!mid)return 0;
    const E=S.matches.find(m=>m.id===mid);if(!E)return 0;
    if(E.result.winner)return E.result.winner;
    return E.teams.slice().sort((a,b)=>cup.teams.indexOf(a)-cup.teams.indexOf(b))[0];   // no result: the higher seed goes through
  }
  if(!cupGroupDone(cup))return 0;
  const T=cupTables(cup);
  if(spec[0]==='P'){const all=tableFrom(cupMatches(cup).filter(E=>/^League/.test(E.stage)),cup.teams);return(all[+spec.slice(1)-1]||{}).team||0;}
  const t=T.find(x=>x.g===spec[0]);return t&&t.rows[+spec.slice(1)-1]?t.rows[+spec.slice(1)-1].team:0;
}
function cupFx(cup,f){
  const a=resolveSlot(cup,f.sa)||(+f.sa||0),b=resolveSlot(cup,f.sb)||(+f.sb||0);
  return{key:f.key,fmt:cup.fmt,date:f.date,a,b,venue:f.venue,city:f.city,sid:cup.id,title:cup.name,label:f.label,stage:f.stage==='group'?f.label:f.label.replace(/ \d+$/,''),
    playable:!!(a&&b),custom:true,cup:true,superOver:f.stage!=='group',slots:[f.sa,f.sb]};
}
function cupChampion(cup){
  const fin=cup.fix.find(f=>f.stage==='final');
  if(fin)return resolveSlot(cup,'W:'+fin.key);
  if(!cupGroupDone(cup))return 0;
  return tableFrom(cupMatches(cup),cup.teams)[0].team;
}
function slotName(s){
  if(!s)return'TBD';if(s[0]==='S')return'Seed '+s.slice(1);if(s[0]==='P')return ordinal(+s.slice(1))+' in the league';
  if(s.startsWith('W:'))return'Winner of match '+s.split('.').pop();return ordinal(+s.slice(1))+' in group '+s[0];
}
