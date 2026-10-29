// e2e11: T20 and custom series - schedule T20I and ODI series between any two sides, they slot in by date,
// play with 4-over bowlers on the provisional RR_8/RR_9 ladder, and keep their own stats, records and rankings.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const w=boot(),G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
ok(G(`WORLD.cards['8'].length===100&&WORLD.cards['9'].length===100`),'provisional RR_8 and RR_9 exist');
ok(G(`WORLD.cards['9'].flat().filter(t=>/^W_/.test(t)).length===WORLD.cards['7'].flat().filter(t=>/^W_/.test(t)).length`),'RR_9 keeps every RR_7 wicket token');
// a T20 series via the dialog (dates before 2005 move to the first T20I)
w.openTestCreator('T20');$('#ts-a').value='12';$('#ts-b').value='3';$('#ts-n').value='3';$('#ts-d').value='2003-01-01';$('#ts-go').click();
const T=G(`S.tests[S.tests.length-1]`);
ok(T.fmt==='T20'&&T.fix.length===3&&T.fix[0].date==='2005-02-17','T20 series created from the first T20I date');
ok(/T20Is/.test(T.title)&&G(`fixtureByKey('${T.fix[0].key}').label`)==='1st T20I','T20 labels');
const O=G(`createSeries({fmt:'ODI',a:13,b:15,n:2,start:'2004-06-01'})`);
ok(O.fix.length===2&&G(`fixtureByKey('${O.fix[0].key}').fmt`)==='ODI','custom ODI series between associates');
// play a T20 live through the UI
w.startFixture(T.fix[0].key);$('#toss-go').click();
ok(G('LM.fmt')==='T20'&&G('curInn(LM).maxOv')===20,'T20 match, 20 overs');
$('#c-sim').click();
const E=G('S.matches[S.matches.length-1]');
ok(E.fmt==='T20'&&E.inns.every(I=>I.lb<=120),'T20 innings at most 20 overs');
ok(E.inns.every(I=>I.bw.every(b=>b[1]<=24)),'no bowler over 4 overs');
ok(E.inns.every(I=>I.runs===I.bt.reduce((a,r)=>a+r[1],0)+I.ex.reduce((a,b)=>a+b,0)),'T20 scorecard adds up');
ok(G(`Object.keys(S.stats.T20).length`)>=22&&!G(`Object.keys(S.stats.ODI).length`),'T20 stats kept separately');
w.closeModal();
for(const x of T.fix.slice(1).concat(O.fix))G(`simFixture(fixtureByKey('${x.key}'))`);
ok(G(`S.matches.filter(m=>m.fmt==='T20').length`)===3,'whole T20 series played');
ok(G(`seriesStatus('${T.id}').played`)===3,'T20 series status');
ok(G(`teamRanking('T20').length`)===2,'T20 rankings');
w.eval(`REC_F.fmt='T20';go('records')`);ok($('#view').innerHTML.includes('Most runs')&&!$('#view').innerHTML.includes('Something went wrong'),'T20 records');
w.eval(`PL_F.fmt='T20';go('players')`);ok(!$('#view').innerHTML.includes('Something went wrong'),'T20 players');
w.eval(`RK_F.fmt='T20';RK_F.tab='teams';go('rank')`);ok($('#view').innerHTML.includes('T20s'),'T20 rankings tab');
w.go('fixtures');w.eval(`FX_F.fmt='T20';FX_F.status='all';FX_F.year='2005';rerender()`);ok($('#view').innerHTML.includes('T20I'),'fixtures list T20s');
// old save without T20 buckets loads
G('saveGame()');const raw=JSON.parse(G('JSON.stringify(S)'));delete raw.stats.T20;delete raw.teams.T20;delete raw.fast.T20;for(const k of['team','yr','bat','bowl'])delete raw.rk[k].T20;
const w2=boot({fxi_save_1:JSON.stringify(raw),fxi_slot:'0'});
ok(w2.eval(`S.stats.T20&&S.teams.T20&&S.fast.T20&&S.rk.team.T20`)!==undefined,'old save gains T20 tables');
console.log(fail?`e2e11: ${fail} failing`:'e2e11 ok');
process.exit(fail?1:0);
