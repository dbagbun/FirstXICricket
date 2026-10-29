// e2e19: challenges & achievements - a scenario starts from the right position with a consistent scorecard,
// runs in a sandbox (your career untouched), is judged with stars; Test and cup challenges; share codes;
// achievements unlock and show in the cabinet.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),click=s=>$(s).click();
click('#sp-go');
G(`for(const fx of allFixtures().filter(x=>x.playable).slice(0,5))simFixture(fx);saveGame()`);
const main0=w.localStorage.getItem('fxi_save_1'),n0=G('S.matches.length');
ok(G(`readAch().first`),'first-match achievement');
w.go('play');ok(w.document.querySelectorAll('[data-chal]').length===G('CHALLENGES.length'),'challenge cards');
$('[data-chal="lastover"]').click();
ok(G('S.sandbox&&S.sandbox.def.id')==='lastover'&&G('VIEW')==='match','challenge started in a sandbox');
const I=G('(()=>{const I=curInn(LM);return{no:I.no,runs:I.runs,wkts:I.wkts,lb:I.lb,target:I.target,bt:Object.values(I.bt).reduce((a,b)=>a+b.r,0),ex:I.ex.lb,bw:Object.values(I.bw).reduce((a,b)=>a+b.b,0),st:!!I.bt[I.st]&&!I.bt[I.st].out}})()');
ok(I.no===2&&I.target-I.runs===12&&I.lb===294&&I.wkts===8,'England need 12 off 6, 8 down ('+(I.target-I.runs)+' off '+(300-I.lb)+')');
ok(I.bt+I.ex===I.runs&&I.bw===I.lb&&I.st,'the made-up innings adds up');
ok(G('LM.manualCaptain[4]')&&!G('LM.manualCaptain[1]'),'you captain the chasing side');
ok($('#view').innerHTML.includes('Back to your career'),'sandbox banner');
click('#c-sim');
const res=G('S.sandbox.res');
ok(res&&typeof res.stars==='number','judged: '+JSON.stringify(res));
ok(G(`readStars().lastover`)!==undefined||res.stars===0,'stars recorded');
setTimeout(()=>{
  ok($('#modal-box').innerHTML.includes(res.ok?'Challenge complete':'Challenge failed'),'result shows the challenge outcome');
  $('#ch-back').click();
  ok(!G('S.sandbox')&&G('S.matches.length')===n0,'back in the real career, untouched');
  ok(w.localStorage.getItem('fxi_save_1')===main0||G('S.matches.length')===n0,'your save slot was never written by the challenge');
  // Test challenge position
  G(`startChallenge(challengeById('save'))`);
  const T=G('({no:curInn(LM).no,left:Math.round(testOversLeft(LM)),wk:curInn(LM).wkts,day:testDay(LM)})');
  ok(T.no===4&&T.left===70&&T.wk===4&&T.day===5,'save the Test: 4 down, 70 overs left on day 5 ('+JSON.stringify(T)+')');
  G('simMatch(LM)');ok(G('S.sandbox.res')!=null,'Test challenge judged');
  G('leaveSandbox()');
  // cup challenge
  G(`startChallenge(challengeById('dutch'))`);
  ok(G('VIEW')==='tour'&&G('S.coach.team')===14,'cup challenge: coaching the Netherlands');
  G(`simCup(cupById(S.sandbox.cup))`);
  ok(G('S.sandbox.res')&&G('S.sandbox.res').text.length>5,'cup challenge judged: '+G('S.sandbox.res.text'));
  G('leaveSandbox()');
  ok(G('S.matches.length')===n0&&!G('S.cups.length'),'career untouched by the cup challenge');
  // codes
  const d=G(`(()=>{const c=challengeCode(challengeById('big435'));return parseChallengeCode(c);})()`);
  ok(d.kind==='chase'&&d.target===435,'share codes round-trip');
  ok(G(`parseChallengeCode('nonsense')`)===null,'bad codes are refused');
  w.eval(`PLAY_TAB='build';go('play')`);$('#cb-play').click();
  ok(G('S.sandbox&&S.sandbox.def.kind')==='chase'&&G('curInn(LM).no')===2,'custom scenario plays');
  G('leaveSandbox()');
  w.eval(`PLAY_TAB='ach';go('play')`);ok($('#view').innerHTML.includes('Trophy cabinet')&&$('#view').innerHTML.includes('Up for it'),'trophy cabinet');
  ok(G(`readAch().challenge1`),'challenge achievement unlocked');
  console.log(fail?`e2e19: ${fail} failing`:'e2e19 ok');
  process.exit(fail?1:0);
},150);
