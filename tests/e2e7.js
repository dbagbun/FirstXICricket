// e2e7: rankings & awards - team and player rankings move, players of the series are crowned, each finished
// year gets its awards (and a season review), rebuild matches live, an old save gains rankings on load.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const w=boot(),G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`for(const fx of allFixtures())if(fx.playable&&fx.date<'2004-02-01')simFixture(fx);saveGame()`);
const T=G(`teamRanking('ODI')`);
ok(T.length>=10&&T.every((r,i)=>i===0||T[i-1].pts>=r.pts),'team rankings sorted ('+T.length+' teams)');
ok(T.some(r=>r.pts!==100),'ratings have moved');
const full=G(`teamRanking('ODI').filter(r=>TEAMS.get(r.team).full).reduce((a,r)=>a+r.pts,0)/teamRanking('ODI').filter(r=>TEAMS.get(r.team).full).length`);
const assoc=G(`(()=>{const L=teamRanking('ODI').filter(r=>!TEAMS.get(r.team).full&&!COMPOSITE.has(r.team));return L.reduce((a,r)=>a+r.pts,0)/L.length;})()`);
ok(full>assoc+20,'full members rated above associates ('+full.toFixed(0)+' v '+assoc.toFixed(0)+')');
const bat=G(`playerRanking('ODI','bat',10)`),bowl=G(`playerRanking('ODI','bowl',10)`);
ok(bat.length===10&&bowl.length===10,'player rankings populated');
ok(bat[0].v>300&&bat[0].v<1100,'top batting points in a sane range ('+bat[0].v+')');
ok(G(`S.rk.awards[2003]`)&&!G(`S.rk.awards[2004]`)&&G(`S.rk.awardYear`)===2003,'2003 awarded, 2004 not yet');
ok(!G(`S.rk.awards[2002]`)===(G(`S.matches.filter(E=>E.date.startsWith('2002')).length`)<15),'a year with too few matches gets no awards');
const A=G(`S.rk.awards[2003]`);
ok(A.coty&&A.odiBat&&A.odiBowl&&A.team,'2003 awards complete');
ok(A.odiBat.v===G(`S.matches.filter(E=>E.fmt==='ODI'&&E.date.startsWith('2003')).reduce((a,E)=>a+E.inns.reduce((b,I)=>b+(I.bt.find(r=>r[0]===${A.odiBat.pid})||[0,0])[1],0),0)`),'ODI batter of the year has the most runs');
ok(!G(`S.rk.awards[2003].associate`)||!G(`TEAMS.get(S.stats.ODI[S.rk.awards[2003].associate.pid].teams[0]).full`),'associate award goes to an associate');
const pos=G(`Object.keys(S.rk.pos).length`);
const fin=G(`[...new Set(S.matches.map(m=>m.sid))].filter(s=>seriesDone(s)&&S.matches.filter(m=>m.sid===s).length>=2).length`);
ok(pos===fin&&pos>10,'every finished series has a player of the series ('+pos+'/'+fin+')');
// rebuild = live
const live=G(`JSON.stringify(S.rk.team)`);G('rebuildRankings()');
ok(G(`JSON.stringify(S.rk.team)`)===live,'rebuilt team ratings match live ones');
// screens
for(const t of['teams','bat','bowl','ar','honours','pos']){w.eval(`RK_F.tab='${t}';go('rank')`);ok(!$('#view').innerHTML.includes('Something went wrong')&&$('#view').innerHTML.length>200,'rankings tab '+t);}
w.openPlayer(A.coty.pid);ok($('#modal-box').innerHTML.includes('Cricketer of the Year 2003'),'player card shows his award');w.closeModal();
// result modal shows a player of the series when a series finishes
const key=G(`(()=>{const n=nextFixture();const rest=allFixtures().filter(x=>x.sid===n.sid&&x.playable&&!S.done[x.key]);for(const x of rest.slice(0,-1))simFixture(x);return rest[rest.length-1].key;})()`);
w.startFixture(key);$('#toss-go').click();$('#c-sim').click();
await_();
function await_(){setTimeout(()=>{
  const m=$('#modal-box').innerHTML;
  ok(G(`S.matches.filter(m=>m.sid===fixtureByKey(${JSON.stringify(key)}).sid).length`)<2||m.includes('Player of the series'),'result shows the player of the series');
  // old save without rankings
  const raw=JSON.parse(G('JSON.stringify(S)'));delete raw.rk;
  const w2=boot({fxi_save_1:JSON.stringify(raw),fxi_slot:'0'});
  ok(w2.eval('S.rk&&Object.keys(S.rk.team.ODI).length')>=10,'old save gains rankings on load');
  console.log(fail?`e2e7: ${fail} failing`:'e2e7 ok');
  process.exit(fail?1:0);
},200);}
