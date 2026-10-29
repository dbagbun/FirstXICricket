// ═══ FRANCHISE T20 LEAGUE — eight invented franchises, an auction, a season every April ═══
// S.league = {host, mine, founded, teams:{id:{id,name,short,col,purse,squad:[pids],titles:[]}}, seasons:{Y:{cup,champ}},
//   auction:{year, pool, i, lot:{pid,bid,lead,passed}, log:[]}|null}. Franchise ids 101-108 join TEAMS at load.
// Matches are T20s on the pitch (M.fmt) but archived as format 'LEAGUE', so international stats and records stay clean.
const FRANCHISES=[[101,'Bay Breakers','BAY','#0ea5e9'],[102,'Capital Crowns','CAP','#a16207'],[103,'Delta Dragons','DEL','#dc2626'],[104,'Highland Hawks','HIG','#15803d'],
  [105,'Metro Monarchs','MET','#7c3aed'],[106,'Port Pirates','POR','#0d9488'],[107,'Summit Strikers','SUM','#ea580c'],[108,'Valley Vipers','VAL','#65a30d']];
for(const[id,name,short]of FRANCHISES)TEAMS.set(id,{id,name,short,full:true,franchise:true});   // colours: 08-ui-shell
const isFranchise=t=>+t>=101&&+t<=108;
const LG_PURSE=100,LG_SQUAD=15,LG_OVERSEAS=6,LG_XI_OVERSEAS=4,LG_RETAIN=[12,9,7,5],LG_MONTH='-04-01';
function league(){return S&&S.league||null;}
// ---------- valuing a player on a date ----------
// a player's country: the generated pool, else the side he has played most for in the data
let NATION=null,KEEPERS=null;
function nationMaps(){if(NATION)return;NATION=new Map();KEEPERS=new Set();const cnt=new Map();
  for(const[cid,sides]of Object.entries(WORLD.xi))for(const[t,x]of Object.entries(sides)){KEEPERS.add(x[x[11]]);for(const p of x.slice(0,11)){const k=p+':'+t;cnt.set(k,(cnt.get(k)||0)+1);}}
  const best=new Map();for(const[k,n]of cnt){const[p,t]=k.split(':').map(Number);if(!best.has(p)||n>best.get(p)[1])best.set(p,[t,n]);}
  for(const[p,[t]]of best)NATION.set(p,t);}
function nationOf(pid){const g=genP(pid);if(g)return g.t;nationMaps();return NATION.get(+pid)||0;}
const isKeeper=pid=>{nationMaps();return!!(genP(pid)?.wk||KEEPERS.has(+pid));};
function playerValue(pid,date){
  const a=pAttr(pid,date),bat={B:5,BG:3.5,G:2.5,GR:1.5,R:.5}[a.bat]??2,bowl=a.style!=='N'&&a.rating<=5?(6-a.rating)*1.2:0;
  let runs=0,inn=0,wk=0,m=0;for(const f of['T20','ODI']){const s=S.stats[f][pid];if(s){runs+=s.r;inn+=s.inn;wk+=s.bw;m+=s.m;}}
  const h=((+pid)*2654435761>>>0)%100/100-.5;   // a fixed personal quirk, so valuations are stable
  return Math.max(.5,bat+bowl+(inn?Math.min(2,runs/inn/20):0)+(m?Math.min(2,wk/m):0)+Math.min(1.5,capsOf(pid)/80)+h);
}
// price on a 100 purse: a top star ~18, a solid player ~5, a squad man ~1.5 (8 x 100 for ~120 players)
const fairPrice=v=>Math.round((.3+Math.pow(Math.min(v,13)/12,2)*18)*10)/10;
function auctionPool(date){
  const from=addDays(date,-730),ps=new Set();
  for(let i=S.matches.length-1;i>=0;i--){const E=S.matches[i];if(E.date<from)break;if(E.fmt==='LEAGUE')continue;for(const t of E.teams)if(!isFranchise(t))E.xi[t].slice(0,11).forEach(p=>ps.add(p));}
  if(ps.size<200)for(const[t]of TEAM_GAMES)if(!COMPOSITE.has(t))(nearestXI(t,date)||{bat:[]}).bat.forEach(p=>ps.add(p));
  if(S.gen)for(const p of Object.keys(S.gen.players)){const g=S.gen.players[p];if((!g.ret||g.ret>date)&&(capsOf(+p)>0||g.domestic))ps.add(+p);}
  const owned=new Set(Object.values(league().teams).flatMap(t=>t.squad));
  return[...ps].filter(p=>!owned.has(p)&&!(S.gen&&S.gen.players[p]&&S.gen.players[p].ret&&S.gen.players[p].ret<=date)).map(p=>[p,playerValue(p,date)]).sort((a,b)=>b[1]-a[1]).slice(0,180).map(x=>x[0]);
}
// ---------- founding ----------
function foundLeague({host,mine,year}){
  const L={host:+host,mine:+mine,founded:+year,teams:{},seasons:{},auction:null,log:[]};
  for(const[id,name,short,col]of FRANCHISES)L.teams[id]={id,name,short,col,purse:LG_PURSE,squad:[],titles:[]};
  S.league=L;if(typeof achieve==='function')achieve('league');startAuction(+year);
  return L;
}
const overseas=(t,pid)=>nationOf(pid)!==league().host;
const squadNeeds=T=>LG_SQUAD-T.squad.length;
const overseasCount=T=>T.squad.filter(p=>overseas(T.id,p)).length;
function canBuy(T,pid,price){if(T.squad.length>=LG_SQUAD||price>T.purse-(squadNeeds(T)-1)*.5)return false;if(overseas(T.id,pid)&&overseasCount(T)>=LG_OVERSEAS)return false;return true;}
// AI valuation: fair price x how badly they need the player x a mood
function aiValue(T,pid,date){
  const v=playerValue(pid,date),a=pAttr(pid,date),bowlers=T.squad.filter(p=>pAttr(p,date).style!=='N').length;
  const needBowl=a.style!=='N'&&bowlers<6?1.15:1,late=squadNeeds(T)<=3?.85:1;
  const mood=.85+(((+pid)*31+T.id*17)%40)/100;
  const need=squadNeeds(T),cap=Math.min(T.purse-(need-1)*.5,T.purse/Math.max(1,need)*2.6);   // budget discipline
  return Math.min(fairPrice(v)*needBowl*late*mood,cap);
}
function startAuction(year){
  const L=league(),date=year+'-03-01';
  if(L.seasons[year-1])for(const T of Object.values(L.teams)){   // retention: AI keeps its best four, you choose
    if(T.id===L.mine&&L.keep){T.squad=T.squad.filter(p=>L.keep.includes(p)).slice(0,4);}
    else if(T.id!==L.mine)T.squad=T.squad.slice().sort((a,b)=>playerValue(b,date)-playerValue(a,date)).slice(0,4);
    else T.squad=[];
    T.purse=LG_PURSE-sum(LG_RETAIN.slice(0,T.squad.length));
  }
  L.keep=null;
  L.auction={year,pool:auctionPool(date),i:0,lot:null,log:[]};
  nextLot();
}
function nextLot(){
  const A=league().auction;if(!A)return;
  const teams=Object.values(league().teams);
  if(teams.every(T=>T.squad.length>=LG_SQUAD)||A.i>=A.pool.length){finishAuction();return;}
  const pid=A.pool[A.i++],v=playerValue(pid,A.year+'-03-01'),base=Math.max(.5,Math.round(fairPrice(v)*.4*2)/2);
  A.lot={pid,bid:base,lead:0,passed:false,base};
  if(!teams.some(T=>canBuy(T,pid,base))){A.log.push([pid,0,0]);A.lot=null;nextLot();return;}
}
// One round of AI bidding: the AI team that values him most (and can pay) raises; false if nobody will.
function aiRaise(){
  const L=league(),A=L.auction,lot=A.lot,date=A.year+'-03-01',inc=lot.bid<5?.5:1,next=lot.lead?lot.bid+inc:lot.bid;
  const cands=Object.values(L.teams).filter(T=>T.id!==L.mine&&T.id!==lot.lead&&canBuy(T,lot.pid,next)&&aiValue(T,lot.pid,date)>=next);
  if(!cands.length)return false;
  const T=cands.sort((a,b)=>aiValue(b,lot.pid,date)-aiValue(a,lot.pid,date))[0];
  lot.bid=next;lot.lead=T.id;return true;
}
function userBid(){
  const L=league(),lot=L.auction.lot,me=L.teams[L.mine],inc=lot.bid<5?.5:1,next=lot.lead?lot.bid+inc:lot.bid;
  if(lot.lead===L.mine||!canBuy(me,lot.pid,next))return false;
  lot.bid=next;lot.lead=L.mine;
  if(!aiRaise())settleLot();   // nobody comes back at you: sold
  return true;
}
function settleLot(){
  const L=league(),A=L.auction,lot=A.lot;if(!lot)return;
  while(lot.lead!==L.mine&&aiRaise()){}   // AI bids out among themselves once you're out (or not bidding)
  if(lot.lead){const T=L.teams[lot.lead];T.squad.push(lot.pid);T.purse=Math.round((T.purse-lot.bid)*10)/10;}
  A.log.push([lot.pid,lot.lead,lot.lead?lot.bid:0]);A.lot=null;nextLot();
}
function userPass(){const L=league();L.auction.lot.passed=true;if(L.auction.lot.lead===L.mine)return settleLot();settleLot();}
// You can also let the AI run your side of the auction: it bids your valuations for you.
function simAuction(){
  const L=league();let g=0;
  while(L.auction&&g++<3000){
    const lot=L.auction.lot;if(!lot)break;
    const me=L.teams[L.mine],date=L.auction.year+'-03-01',next=lot.lead?lot.bid+(lot.bid<5?.5:1):lot.bid;
    if(lot.lead!==L.mine&&canBuy(me,lot.pid,next)&&aiValue(me,lot.pid,date)>=next){userBid();continue;}
    settleLot();
  }
}
function finishAuction(){
  const L=league(),A=L.auction,date=A.year+'-03-01';
  // anyone short of a full squad picks up the best unsold men at their base price
  const sold=new Set(Object.values(L.teams).flatMap(T=>T.squad));
  const left=[...auctionPool(date),...squadAround(L.host,date,900),...Object.keys(S.gen?S.gen.players:{}).map(Number).filter(p=>S.gen.players[p].t===L.host)]
    .filter((p,i,a)=>!sold.has(p)&&a.indexOf(p)===i&&!(S.gen&&S.gen.players[p]&&S.gen.players[p].ret&&S.gen.players[p].ret<=date));
  for(const T of Object.values(L.teams))while(T.squad.length<LG_SQUAD){
    let i=left.findIndex(p=>!overseas(T.id,p)||overseasCount(T)<LG_OVERSEAS);
    if(i<0){genStore();left.push(newYoungster(L.host,A.year,true));i=left.length-1;}   // domestic players: there are only so many internationals
    const p=left.splice(i,1)[0];T.squad.push(p);sold.add(p);T.purse=Math.max(0,T.purse-.5);}
  L.log.push({year:A.year,text:`${A.year} auction: ${A.log.filter(x=>x[1]).length} players sold.`,top:A.log.filter(x=>x[1]).sort((a,b)=>b[2]-a[2]).slice(0,5)});
  L.lastAuction=A.log;L.auction=null;scheduleSeason(A.year);
}
function scheduleSeason(year){
  const L=league();if(L.seasons[year])return;
  let start=year+LG_MONTH;if(start<careerDate())start=addDays(careerDate(),3);
  const cup=createCup({name:`Franchise League ${year}`,fmt:'T20',format:'rr',host:L.host,start,teams:FRANCHISES.map(f=>f[0]),quiet:true});
  cup.league=true;L.seasons[year]={cup:cup.id,champ:0};fxDirty();
}
// XI from a squad: keeper, four or five bowlers, batters, at most four overseas
function leagueXI(team,date){
  const L=league();if(!L)return null;const T=L.teams[team];if(!T||T.squad.length<11)return null;
  const pool=T.squad.filter(p=>!(S.gen&&S.gen.players[p]&&S.gen.players[p].ret&&S.gen.players[p].ret<=date)&&!isInjured(p,date));
  const at=p=>pAttr(p,date),os=p=>overseas(team,p),val=p=>playerValue(p,date);
  let osN=0;const chosen=[];const take=p=>{if(chosen.includes(p))return false;if(os(p)){if(osN>=LG_XI_OVERSEAS)return false;osN++;}chosen.push(p);return true;};
  const keeper=pool.filter(isKeeper).sort((a,b)=>val(b)-val(a))[0];if(keeper)take(keeper);
  for(const p of pool.filter(p=>at(p).style!=='N').sort((a,b)=>at(a).rating-at(b).rating)){if(chosen.length>=6)break;take(p);}
  for(const p of pool.slice().sort((a,b)=>val(b)-val(a))){if(chosen.length>=11)break;take(p);}
  for(const p of pool){if(chosen.length>=11)break;if(!chosen.includes(p))chosen.push(p);}
  const order=p=>({B:0,BG:1,G:2,GR:3,R:4}[at(p).bat]??2)*10+(p===keeper?15:0)+(at(p).style!=='N'?6-Math.min(5,at(p).rating):0);
  const bat=chosen.slice(0,11).sort((a,b)=>order(a)-order(b));
  return{bat,wk:keeper||bat[5],cap:bat.slice().sort((a,b)=>capsOf(b)-capsOf(a))[0]};
}
// A new season: once a season is over, the next auction opens from January and runs itself by late March.
function ensureLeague(){
  const L=league();if(!L||S.sandbox)return false;
  const d=careerDate(),y=+d.slice(0,4);
  for(const[yy,s]of Object.entries(L.seasons)){const c=cupById(s.cup);if(c&&!s.champ&&c.fix.every(f=>S.done[f.key])){s.champ=cupChampion(c);L.teams[s.champ].titles.push(+yy);if(s.champ===L.mine)achieve('leagueWin');L.log.push({year:+yy,text:`${L.teams[s.champ].name} win the ${yy} Franchise League.`});}}
  const nextY=Math.max(...Object.keys(L.seasons).map(Number),L.founded-1)+1;
  if(!L.auction&&!L.seasons[nextY]&&d>=nextY+'-01-01'&&L.seasons[nextY-1]?.champ)startAuction(nextY);
  if(L.auction&&d>=L.auction.year+'-03-25'){simAuction();return true;}
  return false;
}
