// e2e24: press & media - back-page headlines for your team, the pre-series question on the board's target,
// post-match press conferences and their effects (confidence, morale, pressure, a player fired up or rattled,
// the target's stakes), lapsing questions, morale in the engine, the press room and back pages on screen, reloads.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const w=boot(),G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-team').value='4';$('#sp-coach').checked=true;$('#sp-go').click();
// before the first series: the target question
ok(G(`S.coach.pc&&S.coach.pc.qs.some(q=>q.pre===coachNext().sid)`),'a pre-series question about the target');
ok($('#view').innerHTML.includes('Press room')&&$('[data-pq]'),'the press room is on the coach screen');
const obj0=G(`S.coach.objs.find(o=>o.sid===coachNext().sid).w`);
const qi=G(`S.coach.pc.qs.findIndex(q=>q.pre)`);
$(`[data-pq="${qi}:0"]`).click();
ok(Math.abs(G(`S.coach.objs.find(o=>o.sid===coachNext().sid).w`)-obj0*1.35)<.02,'talking it up raises the stakes');
ok(G(`S.coach.pc.qs[${qi}].a`)===0&&$('#view').innerHTML.includes('quote me'),'your answer is shown');
ok(G(`JSON.parse(localStorage.getItem(ACH_KEY)).press`),'achievement');
// play the first match: a headline and a press conference
G(`simFixture(coachNext())`);
const E=JSON.parse(G('JSON.stringify(S.matches.at(-1))'));
const hd=JSON.parse(G(`JSON.stringify(headOf(S.matches.at(-1).id))`));
ok(hd&&hd.team===4&&hd.h.length>8&&hd.h===hd.h.toUpperCase(),'a back-page headline: '+(hd&&hd.h));
ok(hd&&hd.s.startsWith(E.result.text),'the standfirst has the result');
ok(G(`S.coach.pc.mid===S.matches.at(-1).id&&S.coach.pc.qs.length>=1`),'a press conference after the match');
const q0=G(`S.coach.pc.qs[0].t`);
ok(E.result.winner===4?/win|rank/.test(q0):E.result.winner?/wrong|better/.test(q0):/happy/.test(q0),'the first question fits the result: '+q0);
// answers move confidence, morale and pressure
const before=JSON.parse(G(`JSON.stringify({c:S.coach.conf,m:S.coach.morale,h:S.coach.heat})`));
const fx=JSON.parse(G(`JSON.stringify(S.coach.pc.qs[0].o[1][1])`));
G(`pressAnswer(0,1)`);
const after=JSON.parse(G(`JSON.stringify({c:S.coach.conf,m:S.coach.morale,h:S.coach.heat})`));
ok(after.c===Math.max(0,Math.min(100,before.c+(fx.c||0)))&&after.m===Math.max(0,Math.min(100,before.m+(fx.m||0)))&&after.h===Math.max(0,Math.min(100,before.h+(fx.h||0))),'the answer applies its effects');
ok(G(`pressAnswer(0,0)`)===null,'a question can only be answered once');
// a player question: fired up -> one form step in the engine
G(`S.coach.boost={}`);
const pid=G(`(()=>{const M=buildMatch(coachNext());return M.xi[4].bat[2];})()`);
G(`S.coach.pc.qs.push({t:'test',a:null,o:[['x',{p:${pid},up:1}]]})`);
const out=G(`pressAnswer(S.coach.pc.qs.length-1,0)`);
ok(G(`S.coach.boost[${pid}]`)===1&&out[0].includes('fired up'),'the player is fired up');
ok(G(`buildMatch(coachNext()).mods.bat[${pid}]`)===1,'he plays a form step up');
// morale at the extremes
G(`S.coach.boost={};S.coach.morale=90`);
const mm=JSON.parse(G(`(()=>{const M=buildMatch(coachNext());return JSON.stringify(M.moraleP||null);})()`));
ok(mm&&mm.up,'a buzzing dressing room lifts a top-order batter');
G(`S.coach.morale=10`);
ok(G(`(()=>{const M=buildMatch(coachNext());return M.moraleP&&!M.moraleP.up;})()`),'an unhappy one drops one');
G(`S.coach.morale=55`);
ok(G(`!buildMatch(coachNext()).moraleP`),'a settled one does neither');
// unanswered questions lapse at the next match, with a little pressure
G(`S.coach.pc.qs.push({t:'unanswered',a:null,o:[['x',{}]]})`);
const h0=G('S.coach.heat'),mid0=G('S.coach.pc.mid');
G(`simFixture(coachNext())`);
ok(G('S.coach.pc.mid')!==mid0,'a new press conference replaces the old one');
ok(G(`S.coach.boost&&Object.keys(S.coach.boost).length===0`),'boosts last one match');
// a series: headlines pile up, the dashboard shows the back pages
G(`for(let i=0;i<6;i++){const n=coachNext();if(!n)break;simFixture(n);}`);
ok(G(`S.press.heads.length`)>=8&&G(`S.press.heads.every(h=>h.team===4)`),'headlines for your team only');
ok(G(`new Set(S.press.heads.map(h=>h.h)).size`)>=3,'varied headlines');
w.go('home');ok($('#view').innerHTML.includes('Back pages')&&$$('.paper').length===3,'back pages on the dashboard');
ok($('#view').innerHTML.includes('press conference'),'the coach card flags the press conference');
w.go('coach');ok($('#view').innerHTML.includes('Dressing room')&&$('#view').innerHTML.includes('Media pressure'),'morale and pressure bars');
// high pressure: the job question after a defeat, and defeats cost extra
G(`S.coach.heat=85`);
const lossE=G(`(()=>{const L=S.matches.filter(E=>E.teams.includes(4)&&E.result.winner&&E.result.winner!==4);return L.length?L.at(-1).id:null;})()`);
if(lossE){
  const qs=G(`pressQs(S.matches.find(E=>E.id===${JSON.stringify(lossE)}),4).map(q=>q.t).join('|')`);
  ok(/losing patience/.test(qs),'the job question under pressure');
  const hl=G(`(()=>{const h=headlineFor(S.matches.find(E=>E.id===${JSON.stringify(lossE)}),4);return h.h;})()`);
  ok(hl.length>5,'a defeat headline: '+hl);
}
// the done screen shows the back page for your match
w.startFixture(G('coachNext().key'));$('#toss-go').click();
G(`LM.manualCaptain=null;simMatch(LM)`);w.rerender();
ok($('#view').querySelector('.paper')&&/Face the press/.test($('#view').textContent),"tomorrow's back page and the press call after the match");
// survives a reload
G('saveGame()');
const store={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);store[k]=w.localStorage.getItem(k);}
const w2=boot(store);
ok(w2.eval('S.press.heads.length')===G('S.press.heads.length')&&w2.eval('!!S.coach.pc'),'press state saved');
// a follower (no coach) gets headlines but no press conferences
const w3=boot();w3.document.querySelector('#sp-team').value='1';w3.document.querySelector('#sp-go').click();
w3.eval(`for(let i=0;i<40;i++)simFixture(nextFixture())`);
ok(w3.eval(`(S.press?S.press.heads.length:0)>0&&S.press.heads.every(h=>h.team===1)&&!S.coach`),'headlines follow the team you follow');
console.log(fail?`e2e24: ${fail} failing`:'e2e24 ok');
process.exit(fail?1:0);
