// e2e1: new career -> play the first ODI through the live controls -> every screen renders ->
// sim through the 2003 World Cup (timeline knockouts) -> a Test series -> manual dice -> save & reload.
const {JSDOM}=require('jsdom'),fs=require('fs');
const file=process.argv[2]||'dist/first-xi.html';
const html=fs.readFileSync(file,'utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
function boot(store){
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
    beforeParse(w){w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
      w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}});
  return dom.window;
}
const w=boot();
const $=s=>w.document.querySelector(s),click=s=>{const e=typeof s==='string'?$(s):s;if(!e)throw new Error('missing '+s);e.click();};
const G=k=>w.eval(k);

// splash -> new career
ok($('#sp-go'),'splash shows');
click('#sp-go');
ok(G('S')&&G('S.matches.length')===0,'career created');
ok($('#h-play'),'dashboard has play button');
// play the first fixture
click('#h-play');
ok(G('VIEW')==='match'&&$('#toss-go'),'pre-match screen');
click('#toss-go');
ok(G('LM.state')==='live','match live after toss');
click('#c-ball');ok(G('curInn(LM).balls.length')===1,'one ball bowled');
click('#c-over');ok(G('curInn(LM).lb')===6,'first over complete ('+G('curInn(LM).lb')+')');
click('#c-5');ok(G('curInn(LM).lb')===36,'six overs after 5 more');
for(const t of['comm','charts','rr','card']){click(`[data-tab="${t}"]`);ok($('#mtab').innerHTML.length>50,'match tab '+t);}
click('#c-inn');ok(G('LM.inns.length')===2,'second innings started');
click('#c-sim');
ok(G('S.matches.length')===1,'match archived');
const E=G('S.matches[0]');
ok(E.result&&E.result.text,'result text: '+(E.result&&E.result.text));
ok(E.motm>0,'man of the match picked');
ok(Object.keys(G('S.stats.ODI')).length>=22,'career stats for both XIs');
const runsBat=E.inns.map(I=>I.bt.reduce((a,r)=>a+r[1],0)+I.ex.reduce((a,b)=>a+b,0));
ok(E.inns.every((I,i)=>I.runs===runsBat[i]),'batters + extras = total');
ok(E.inns.every(I=>I.bw.reduce((a,b)=>a+b[1],0)===I.lb),'bowler balls = legal balls');
ok(E.inns.every(I=>I.bw.every(b=>b[1]<=60)),'no bowler over 10 overs');
ok(E.inns.every(I=>I.bw.reduce((a,b)=>a+b[4],0)+I.bt.filter(r=>r[5]==='ro').length===I.wkts),'bowler wickets + run outs = wickets');
w.closeModal();
for(const v of['home','fixtures','tour','records','players','history','miles','settings','match']){w.go(v);ok(!$('#view').innerHTML.includes('Something went wrong'),'view '+v);}
w.openPlayer(E.motm);ok($('#modal-box').innerHTML.includes('career'),'player profile');w.closeModal();
w.openScorecard(E.id);ok($('#modal-box').innerHTML.includes('Fall of wickets'),'scorecard modal');w.closeModal();

// sim to the end of the 2003 World Cup
const wc=G(`[...SERIES.values()].find(s=>s.name==='ICC World Cup'&&s.year==='2003').sid`);
const upto=G(`allFixtures().filter(x=>x.playable&&!S.done[x.key]&&x.date<=SERIES.get(${JSON.stringify(wc)}).end).length`);
for(const fx of G(`allFixtures().filter(x=>x.playable&&!S.done[x.key]&&x.date<=SERIES.get(${JSON.stringify(wc)}).end)`))w.simFixture(fx);
ok(G('S.matches.length')===1+upto,'simmed to end of the 2003 World Cup ('+G('S.matches.length')+')');
const ed=G(`edition(${JSON.stringify(wc)})`);
ok(G(`edition(${JSON.stringify(wc)}).labels.join('')`)==='AB','2003 World Cup has pools A and B');
ok(G(`edition(${JSON.stringify(wc)}).hasSuper`),'2003 World Cup has a Super Six');
ok(G(`superTeams(edition(${JSON.stringify(wc)})).length`)===6,'six Super Six teams');
const top3=G(`groupTables(edition(${JSON.stringify(wc)})).flatMap(t=>t.rows.slice(0,3).map(r=>r.team))`);
const sup=G(`superTeams(edition(${JSON.stringify(wc)}))`);
ok(sup.length===6&&sup.every(t=>top3.includes(t)),'Super Six = top three of each pool in your timeline');
const supGames=G(`S.matches.filter(m=>m.sid===${JSON.stringify(wc)}&&edition(m.sid).stageOf.get(m.fid)==='super')`);
ok(supGames.length===9&&supGames.every(m=>m.teams.every(t=>sup.includes(t))),'super-stage games are played by the timeline qualifiers ('+supGames.length+')');
ok(supGames.every(m=>m.teams.every(t=>sup.includes(t))&&G(`edition(${JSON.stringify(wc)}).groups.get(${m.teams[0]})`)!==G(`edition(${JSON.stringify(wc)}).groups.get(${m.teams[1]})`)),'super-stage games are cross-pool');
const fin=G(`S.matches.find(m=>m.sid===${JSON.stringify(wc)}&&m.stage==='Final')`);
ok(fin,'final played');
const semis=G(`S.matches.filter(m=>m.sid===${JSON.stringify(wc)}&&m.stage==='Semi-final')`);
ok(semis.length===2,'two semi-finals');
ok(fin&&semis.length===2&&fin.teams.every(t=>semis.some(s=>s.result.winner===t)),'final contested by the semi-final winners');
const st=G(`superTable(edition(${JSON.stringify(wc)})).map(r=>r.team)`);
ok(semis.length===2&&new Set(semis.flatMap(s=>s.teams)).size===4&&semis.flatMap(s=>s.teams).every(t=>st.slice(0,4).includes(t)),'semi-finalists are the Super Six top four');
w.go('tour',wc);ok($('#view').innerHTML.includes('Super Six'),'tournament centre shows Super Six');
ok($('#view').innerHTML.includes('Knockouts'),'tournament centre shows bracket');

// Test series
const T=G(`createTestSeries({a:4,b:1,n:2,start:'2003-07-01'})`);
ok(T.fix.length===2,'test series created');
for(const x of T.fix)w.simFixture(w.fixtureByKey(x.key));
const tests=G(`S.matches.filter(m=>m.fmt==='TEST'&&m.sid==='${T.id}')`);
ok(tests.length===2,'two Tests played');
ok(tests.every(m=>m.inns.length>=2&&m.result.text),'tests have results: '+tests.map(m=>m.result.text).join(' | '));
ok(tests.every(m=>m.inns.reduce((a,I)=>a+I.lb,0)<=450*6),'tests within 450 overs');
ok(G(`Object.keys(S.stats.TEST).length`)>=22,'test stats kept separately');
ok(G('recordsData("TEST").runs.length')>0,'test records');
w.go('records');click('[data-rf="TEST"]');ok($('#view').innerHTML.includes('Most runs'),'test records screen');

// manual dice
G(`S.settings.dice='manual'`);
const nx=G('nextFixture().key');
w.startFixture(nx);click('#toss-go');
click('#c-over');
ok($('#roll-v'),'manual dice asks for a roll');
$('#roll-v').value='37';click('#roll-ok');
ok(G('LM.cur&&LM.cur.roll')===37||G('curInn(LM).balls[0].roll')===37,'manual roll used');
ok(G('curInn(LM).balls.length')===1,'manual roll bowls one ball');
G(`S.settings.dice='auto'`);G('LM.manual=false');
click('#c-over');
const balls=G('curInn(LM).balls');
ok(balls.length>=6,'over completes after switching back to auto');
ok(balls.filter(b=>!b.exType||!['wd','nb'].includes(b.exType)).every(b=>b.roll===37||b.col===1),'base roll 37 reads across the row (compensation balls use col 1)');

// save + reload
w.saveGame();
const store={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);store[k]=w.localStorage.getItem(k);}
ok(store.fxi_save_1&&store.fxi_save_1.startsWith('LZ1:'),'save is compressed');
const n0=G('S.matches.length'),live0=G('curInn(S.live).lb');
const w2=boot(store);
ok(w2.eval('S.matches.length')===n0,'reload keeps matches');
ok(w2.eval('S.live&&curInn(S.live).lb')===live0,'reload keeps the live match');
w2.go('match');ok(w2.document.querySelector('#c-over'),'live match resumes');
w2.document.querySelector('#c-sim').click();
ok(w2.eval('S.matches.length')===n0+1,'resumed match finishes');
console.log(fail?`e2e1: ${fail} failing`:'e2e1 ok');
process.exit(fail?1:0);
