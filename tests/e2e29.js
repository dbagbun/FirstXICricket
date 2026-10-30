// e2e29: the Start here checklist (steps tick themselves off from what you do, Show me, hide and bring back,
// hidden for established careers) and keyboard shortcuts (match controls, tabs, reviews, help, never while typing).
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const w=boot(),G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
const key=(k,o={})=>{const t=o.target||w.document.body;t.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...o}));};
$('#sp-go').click();
ok($('#start-here')&&/0\/7/.test($('#start-here').textContent),'Start here on a new career');
ok($$('[data-sh]').length===7,'seven steps with Show me');
// Show me: the Tournament Centre
$$('[data-sh]')[3].click();ok(G('VIEW')==='tour','Show me goes there');
w.go('records');w.go('home');
ok(/2\/7/.test($('#start-here').textContent),'visiting screens ticks them off');
// play a match through the checklist
$$('[data-sh]')[0].click();ok(G('VIEW')==='match','Show me starts the match');
$('#toss-go').click();
// keyboard in the match
const lb0=G('curInn(LM).lb');key('n');ok(G('curInn(LM).lb')>lb0||G('LM.cur&&LM.cur.n')>0,'N bowls a ball');
key('o');ok(G('LM.cur')===null&&G('curInn(LM).lb')%6===0,'O bowls the over');
const ov=G('curInn(LM).lb');key('f');ok(G('curInn(LM).lb')>=ov+24||G('LM.inns.length')>1,'F bowls five overs');
key('5');ok(G('MATCH_TAB')==='rr'&&$('#rr-tbl'),'5 opens the run-rate card');
key('2');ok(G('MATCH_TAB')==='comm','2 the ball by ball');
key('?');ok(!$('#modal').classList.contains('hidden')&&/Keyboard shortcuts/.test($('#modal-box').textContent),'? shows the keys');
const lb1=G('curInn(LM).lb');key('o');ok(G('curInn(LM).lb')===lb1,'keys wait while a window is open');
key('Escape');ok($('#modal').classList.contains('hidden'),'Esc closes it');
// typing never triggers
w.go('play');$('[data-pt="build"]').click();const inp=$('#cb-title');inp.focus();key('h',{target:inp});ok(G('VIEW')==='play','typing in a box is just typing');
key('m');ok(G('VIEW')==='match','M back to the match');
// reviews by key
G(`S.settings.drs='on';LM.drs={on:true,n:2,uc:true};LM.manualCaptain=Object.fromEntries(LM.teams.map(t=>[t,true]));UMP.falseDot=1;`);
let g=0;while(!$('#rv-yes')&&g++<60)key('n');
if($('#rv-yes')){const n=G(`LM.events.filter(e=>e.t==='drs').length`);key('r');ok(!G('LM.pending')&&(G(`LM.events.filter(e=>e.t==='drs').length`)>n||G('LM.needRoll')==='uc'),'R reviews');}
else ok(false,'a review came up');
G('UMP.falseDot=.0015;LM.manual=false;LM.needRoll=null');
key('S',{shiftKey:true});ok(G(`LM.state`)==='done'||G('!!LM.pending'),'Shift+S sims the match');
w.go('home');
ok(/[3-7]\/7/.test(($('#start-here')||{textContent:''}).textContent),'playing ticks the match and run-rate card');
// hide, and bring it back from the guide
$('#sh-hide').click();ok(!$('#start-here')&&G('S.tour.hidden'),'hidden');
w.openGuide();$('#g-start').click();ok($('#start-here'),'back from How to play');
// an established career starts with it hidden
G(`for(let i=0;i<25;i++)simFixture(nextFixture());delete S.tour;saveGame()`);
const store={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);store[k]=w.localStorage.getItem(k);}
const w2=boot(store);w2.go('home');ok(!w2.document.querySelector('#start-here'),'not shown to a career past 20 matches');
console.log(fail?`e2e29: ${fail} failing`:'e2e29 ok');
process.exit(fail?1:0);
