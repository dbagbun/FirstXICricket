// e2e9: presentation - a wicket ball by ball shows the TV graphic, sims don't, the dice element is there,
// TV graphics can be switched off (milestones fall back to toasts), sound on/off never breaks play.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),click=s=>$(s).click();
click('#sp-go');
w.startFixture(G('nextFixture().key'));click('#toss-go');
click('#c-ball');ok($('#dice-roll'),'dice roll element on screen');
let g=0;while(G('curInn(LM).wkts')===0&&g++<400)click('#c-ball');
ok(G('curInn(LM).wkts')===1,'a wicket fell ball by ball');
ok($('#tv')&&$('#tv').textContent.includes('WICKET'),'TV graphic for the wicket');
ok(G(`curInn(LM).balls.some(b=>b.ev.some(e=>e.t==='w'))`),'wicket event recorded on the ball');
ok(!$('#mtab').innerHTML.includes('undefined'),'commentary clean');
// sims stay quiet
$('#tv').textContent='';
click('#c-5');
ok(!$('#tv').textContent.includes('WICKET')||G('FX.allow')===false,'5-over jumps do not flash graphics');
// sound on: jsdom has no audio - must be harmless
click('#c-snd');ok(G('S.settings.sound')===true,'sound toggled on');
for(let i=0;i<12;i++)click('#c-ball');
ok(G('curInn(LM).lb')>36||G('LM.inns.length')>1,'play continues with sound on');
click('#c-snd');ok(G('S.settings.sound')===false,'sound toggled off');
// TV graphics off -> milestones go back to toasts
G(`S.settings.tv=false`);
ok(G(`fxEvent(LM,{t:'50',pid:curInn(LM).st,balls:40,inn:curInn(LM).no})`)===false,'graphics off: no banner');
G(`S.settings.tv=true`);
// broadcast styles: the scorebug replaces the scoreboard; body carries the style
for(const t of['classic','modern','event']){G(`S.settings.broadcast='${t}';applyBroadcast()`);w.go('match');
  ok(w.document.body.dataset.bc===t&&$('.bug')&&!$('.scorebar')&&$('.bug-runs').textContent.includes('-'),'broadcast style '+t);}
G(`S.settings.broadcast='standard';applyBroadcast()`);w.go('match');ok($('.scorebar')&&!$('.bug'),'standard keeps the scoreboard');
w.go('settings');ok($('[data-set="broadcast"]'),'broadcast style setting');
w.go('settings');ok($('[data-set="sound"]')&&$('[data-set="tv"]'),'sound and TV settings');
$('[data-set="tv"][data-val="false"]').click();ok(G('S.settings.tv')===false,'TV setting saves a boolean');
console.log(fail?`e2e9: ${fail} failing`:'e2e9 ok');
process.exit(fail?1:0);
