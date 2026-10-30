// e2e23: DRS and umpires - era rules, the review prompt for your captain, overturned and umpire's-call reviews
// (with your own dice roll), AI reviews while simming, a review open across a reload, the archive, and perfect umpires.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
let w=boot(),G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
// era rules
const era=(fmt,date)=>G(`(()=>{const M={fmt:'${fmt}',date:'${date}'};drsSetup(M);return JSON.stringify(M.drs);})()`);
ok(era('ODI','2005-01-01')==='{"on":false,"n":1,"uc":false}','no DRS in 2005 ODIs (umpires still err)');
ok(era('ODI','2012-01-01')==='{"on":true,"n":1,"uc":false}','one review in 2012 ODIs');
ok(era('TEST','2021-01-01')==='{"on":true,"n":3,"uc":true}','three Test reviews from 2020');
ok(era('T20','2015-01-01').includes('"on":false'),'no T20 DRS before 2017');
G(`S.settings.drs='off'`);ok(era('ODI','2021-01-01')==='null','perfect umpires: no umpire layer');
G(`S.settings.drs='on'`);ok(era('ODI','2003-01-01')==='{"on":true,"n":2,"uc":true}','DRS always');
// your captain gets asked
G(`S.settings.captain='manual'`);
w.startFixture(G('nextFixture().key'));$('#toss-go').click();
ok(G('!!LM.drs&&LM.drs.on'),'the live match has DRS');
G('UMP.falseDot=.3');
let g=0;while(!$('#rv-yes')&&g++<300)$('#c-ball').click();
ok($('#rv-yes'),'a review prompt appears ('+g+' balls)');
ok(G(`LM.pending&&LM.pending.type==='review'`),'the match waits for the decision');
ok(/Review it\?/.test($('#controls').textContent),'the prompt asks');
// a reload with the review still open
G('saveGame()');
const store={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);store[k]=w.localStorage.getItem(k);}
const w2=boot(store);
ok(w2.eval(`S.live&&S.live.pending&&S.live.pending.type==='review'&&!!S.live.cur.rev`),'the open review survives a reload');
const P=G('JSON.stringify(LM.pending)'),pend=JSON.parse(P),rev=JSON.parse(G('JSON.stringify(LM.cur.rev)'));
const ev0=G(`LM.events.filter(e=>e.t==='drs').length`),left0=pend.left;
$('#rv-yes').click();
const e=JSON.parse(G(`JSON.stringify(LM.events.filter(e=>e.t==='drs').slice(-1)[0]||null)`));
ok(e&&G(`LM.events.filter(e=>e.t==='drs').length`)===ev0+1&&e.rev===1,'the review is recorded');
if(e){
  const want=rev.how==='lbw'&&e.uc<=25?'U':rev.truth!==rev.field?'O':'S';
  ok(e.code===want,`review result follows the card (${e.code} v ${want}, ${rev.how}, roll ${e.uc})`);
  ok(e.left===left0-(e.code==='S'?1:0),'a failed review is lost, a good one kept');
  ok(e.out===(e.code==='O'?rev.truth:rev.field),'the decision ends up right');
  ok(G(`/Review|review/.test(drsText(LM.events.filter(e=>e.t==='drs').slice(-1)[0]))`),'review text');
}
ok(!G('LM.pending'),'play goes on');
// umpire's call with your own dice
G('LM.manual=true;UMP.falseDot=1');
let lbw=false;g=0;
while(g++<400&&!lbw){
  if($('#roll-ok')){$('#roll-v').value=String(1+g%100);$('#roll-ok').click();continue;}
  if($('#rv-yes')){if(G('LM.pending.how')==='lbw'&&G('LM.pending.left')>0){lbw=true;break;}$('#rv-no').click();continue;}
  $('#c-ball').click();
}
ok(lbw,'an lbw review comes up');
if(lbw){
  $('#rv-yes').click();
  ok(G(`LM.needRoll`)==='uc'&&/umpire's call/.test($('#dice-in').textContent),"asked for the umpire's call roll");
  $('#roll-v').value='12';$('#roll-ok').click();
  const u=JSON.parse(G(`JSON.stringify(LM.events.filter(e=>e.t==='drs').slice(-1)[0])`));
  ok(u.code==='U'&&u.uc===12,"a 12 is umpire's call: "+u.code);
}
// the AI decides while you sim, and the archive keeps the reviews
G('LM.manual=false;UMP.falseDot=.0015');
$('#c-sim').click();
ok(G(`LM.state==='done'`),'the match sims to the end through any reviews');
const E=JSON.parse(G('JSON.stringify(S.matches[S.matches.length-1])'));
ok(Array.isArray(E.drs)&&E.drs.length>=2,'reviews archived: '+(E.drs||[]).length);
ok(G(`scorecardHTML(S.matches[S.matches.length-1],null).includes('Reviews:')`),'the scorecard lists the reviews');
// over a run of simmed matches: errors happen, the AI reviews, nothing hangs
const r=JSON.parse(G(`(()=>{const c={};for(let i=0;i<20;i++){const fx=nextFixture();simFixture(fx);const E=S.matches[S.matches.length-1];(E.drs||[]).forEach(d=>c[d[4]]=(c[d[4]]||0)+1);}return JSON.stringify(c);})()`));
ok((r.O||0)+(r.S||0)>3&&(r.M||0)+(r.O||0)>0,'simmed reviews: '+JSON.stringify(r));
// perfect umpires
G(`S.settings.drs='off'`);
ok(G(`(()=>{for(let i=0;i<10;i++)simFixture(nextFixture());return S.matches.slice(-10).every(E=>!E.drs);})()`),'no reviews with perfect umpires');
w.go('settings');ok($('[data-set="drs"][data-val="off"]').classList.contains('on'),'the setting shows');
console.log(fail?`e2e23: ${fail} failing`:'e2e23 ok');
process.exit(fail?1:0);
