// e2e13: head-to-head and friendlies - two players each captain a side and roll the dice; prompts name
// the player with the ball; a friendly between any two sides on any date leaves the career untouched.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),click=s=>$(s).click();
click('#sp-go');
// head-to-head on a calendar fixture
w.startFixture(G('nextFixture().key'));
$('#h2h').checked=true;$('#h2h').dispatchEvent(new w.Event('change'));
ok(!$('#h2h-names').classList.contains('hidden'),'player name boxes appear');
$('#h2h-0').value='Darren';$('#h2h-1').value='Sam';
click('#toss-go');
ok(G('LM.h2h')&&Object.values(G('LM.h2h')).sort().join()==='Darren,Sam','players named');
ok(Object.keys(G('LM.manualCaptain')).length===2&&G('LM.manual')===true,'both sides captained, real dice');
const bowler=G('LM.h2h[curInn(LM).bowl]');
click('#c-over');
ok($('#dice-in').innerHTML.includes(bowler),'the dice prompt names the player with the ball ('+bowler+')');
ok($('#view').innerHTML.includes(bowler+' ('),'captain panel shows who bowls and who bats');
$('#roll-v').value='50';click('#roll-ok');
ok(G('curInn(LM).balls.length')===1,'a roll bowls the ball');
G('LM.manual=false');click('#c-sim');
ok(G('S.matches.length')===1,'head-to-head match counts in the career');
w.closeModal();
// friendly: any two sides, any date, no career effect
const n0=G('S.matches.length'),st0=G('JSON.stringify(S.stats)');
w.go('home');click('#h-friendly');
$('#fr-a').value='12';$('#fr-b').value='1';$('[data-frf="T20"]').click();$('#fr-d').value='2004-01-01';click('#fr-go');
ok(G('LM.friendly')&&G('LM.fmt')==='T20'&&G('LM.date')==='2005-02-17','T20 friendly, moved to the first T20I date');
ok($('#h2h').checked,'friendlies default to two players');
click('#toss-go');G('LM.manual=false');click('#c-sim');
ok(G('LM.state')==='done'&&G('S.matches.length')===n0,'friendly finished, not archived');
ok(G('JSON.stringify(S.stats)')===st0,'career stats untouched');
ok(!G('S.live'),'no match left in progress');
setTimeout(()=>{ok($('#modal-box').innerHTML.includes(G('LM.result.text').split(' ')[0]),'result shown');
  console.log(fail?`e2e13: ${fail} failing`:'e2e13 ok');process.exit(fail?1:0);},150);
