// e2e8: timeline v history - the Cricsheet ODI importer adds real results; they appear only after you play
// a match, the drift card counts same/changed results, the result shows history, Settings can hide it all.
const {execFileSync}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fxi-'));
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const world=path.join(tmp,'world.json'),zip=path.join(tmp,'odis_json.zip'),html=path.join(tmp,'game.html');
fs.copyFileSync(path.join(root,'data/world.json'),world);
execFileSync('python3',['-I',path.join(__dirname,'fixtures/make_cricsheet_odis_sample.py'),world,zip]);
const out=execFileSync('python3',['-I',path.join(root,'tools/cricsheet_odis.py'),zip,world]).toString();
ok(/real results for 4 fixtures/.test(out),'importer: '+out.trim());
execFileSync('node',[path.join(root,'tools/build.js'),html,world]);
const w=new JSDOM(fs.readFileSync(html,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
ok(G('HAS_REAL'),'real results loaded');
const R0=G(`WORLD.real[FIX[0].cid]`);
ok(R0.r[1]==='wkts'&&R0.r[2]===3&&R0.inn[0][1]===5&&R0.inn[0][2]===1&&R0.inn[0][3]===2,'totals parsed (5/1 off 2 legal balls)');
ok(R0.pom>0&&R0.top[0]>0&&R0.bb[1]===1,'player of the match, top scorer, best bowler mapped to ids');
ok(G(`realOf({fid:FIX[0].no})`)&&!$('#view').innerHTML.includes('really'),'nothing shown before playing');
// play the first fixture through the UI
w.startFixture(G('nextFixture().key'));$('#toss-go').click();$('#c-sim').click();
const E=G('S.matches[0]');
setTimeout(()=>{
  ok($('#modal-box').innerHTML.includes('In history'),'result pop-up shows the real result');
  w.closeModal();w.openScorecard(E.id);
  ok($('#modal-box').innerHTML.includes('What really happened'),'scorecard shows what really happened');
  w.closeModal();
  const same=G(`sameAsHistory(S.matches[0])`);
  ok(same===(E.result.winner===R0.r[0]),'same-as-history judged on the winner');
  G(`for(const fx of allFixtures().filter(x=>x.fmt==='ODI').slice(1,3))simFixture(fx)`);
  const D=G('timelineDrift()');
  ok(D.n===2,'no-result fixture is not counted ('+D.n+')');
  w.go('home');ok($('#view').innerHTML.includes('Your timeline v history'),'drift card on the dashboard');
  w.go('history','changed');ok(!$('#view').innerHTML.includes('Something went wrong'),'changed-history filter');
  // 2003 World Cup final: champions banner after the final is played
  G(`for(const fx of allFixtures())if(fx.playable&&!S.done[fx.key]&&fx.date<='2003-03-23')simFixture(fx)`);
  w.go('tour','ICC World Cup|2003-02');
  ok($('#view').innerHTML.includes('in history: <b>'+G(`teamName(WORLD.real['65286'].r[0])`)),'tournament centre shows the real champions');
  G(`S.settings.history='off'`);w.go('home');
  ok(!$('#view').innerHTML.includes('Your timeline v history')&&!G('realOf(S.matches[0])'),'Settings can hide history');
  fs.rmSync(tmp,{recursive:true,force:true});
  console.log(fail?`e2e8: ${fail} failing`:'e2e8 ok');
  process.exit(fail?1:0);
},150);
