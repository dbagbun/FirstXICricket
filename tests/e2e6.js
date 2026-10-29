// e2e6: captaincy - you captain your team: pick the bowler for an over (incl. a part-timer), the last over's
// bowler is refused, attitude shifts the card, send in a different batter (one-step colour lift), AI on the other side.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),click=s=>$(s).click();
$('#sp-team').value='4';click('#sp-go');
G(`S.settings.captain='manual'`);
w.startFixture(G('nextFixture().key'));            // England v Sri Lanka, 2002
ok(G('JSON.stringify(LM.manualCaptain)')==='{"4":true}','you captain the team you follow only');
$('#toss-w').value='4';$('#toss-c').value='bowl';click('#toss-go');
ok(G('curInn(LM).bowl')===4,'England bowl first');
ok($('#cap-bowl'),'bowler picker shown when your side bowls');
ok($('[data-att="f4"]'),'field attitude shown');
// choose a part-timer for over 1
const pt=G(`bowlerOptions(LM).find(o=>!o.regular&&o.ok).pid`);
$('#cap-bowl').value=String(pt);$('#cap-bowl').dispatchEvent(new w.Event('change'));
click('#c-over');
ok(G('curInn(LM).overs[0].bowler')===pt,'your chosen part-timer bowled over 1');
// the same man can't bowl over 2
ok(G(`bowlerOptions(LM).find(o=>o.pid===${pt}).ok`)===false,"last over's bowler is not available");
G(`LM.nextBowler=${pt}`);click('#c-over');
ok(G('curInn(LM).overs[1].bowler')!==pt,'an invalid pick falls back to the AI');
// attitude
const base=G(`situationShift(LM,curInn(LM),3)`);
click('[data-att="f4"][data-v="1"]');
ok(G(`situationShift(LM,curInn(LM),3)`)===Math.min(3,base+1),'attack moves the card one step');
click('[data-att="f4"][data-v="-1"]');
ok(G(`situationShift(LM,curInn(LM),3)`)===Math.max(-1,base-1),'defend moves it back');
click('[data-att="f4"][data-v="0"]');
// the AI captains Sri Lanka's batting: no batting controls for them
ok(!$('#cap-next'),'no batting controls for the AI side');
click('#c-inn');
ok(G('curInn(LM).bat')===4,'England bat second');
ok($('#cap-next')&&!$('#cap-bowl'),'batting controls when your side bats');
// send in the No.11 next
const eleven=G('curInn(LM).order[10]');
$('#cap-next').value=String(eleven);$('#cap-next').dispatchEvent(new w.Event('change'));
ok(G('curInn(LM).order[2]')===eleven,'No.11 moved up to go in next');
ok(G(`batColour(LM,${eleven},3,curInn(LM).bowl)`)==='G','a RED tail-ender sent in at 3 is GREEN, not BLUE');
const wk0=G('curInn(LM).wkts');
let g=0;while(G('curInn(LM).wkts')===wk0&&G('LM.state')==='live'&&g++<300)click('#c-ball');
ok(G('LM.state')!=='live'||G(`curInn(LM).bt[${eleven}]`)!==undefined,'he comes in at the fall of the next wicket');
click('#c-sim');
ok(G('S.matches.length')===1,'match completes');
// both sides when you don't follow a playing team
G(`S.settings.myTeam=0`);w.closeModal();
w.startFixture(G('nextFixture().key'));
ok(Object.keys(G('LM.manualCaptain')).length===2,'without a followed team you captain both sides');
console.log(fail?`e2e6: ${fail} failing`:'e2e6 ok');
process.exit(fail?1:0);
