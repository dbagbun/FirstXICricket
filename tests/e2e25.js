// e2e25: the season planner - calendar, projected fatigue through the fixtures ahead, resting a player
// (he's left out and replaced, the rest lapses once the match is played), auto-rotation, the screen and phone widths.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
// no managed team: a calendar only
$('#sp-go').click();
w.go('plan');ok($('#view').innerHTML.includes('Season planner')&&$('.cal-m')&&!$('[data-rest]'),'calendar without a managed team');
// coach England
G(`S.coach=null`);w.go('coach');$('#co-team').value='4';$('#co-go').click();
ok(G('S.coach.team')===4,'coaching England');
w.go('plan');
ok($('.wl-grid')&&$$('[data-rest]').length>50,'the workload grid');
ok(/The year ahead/.test($('#view').textContent)&&$$('.cal-s').length>=2,'the year ahead');
ok(!/matchs/.test($('#view').textContent),'plurals');
const rows=JSON.parse(G(`JSON.stringify(workloadPlan(4).map(R=>({key:R.fx.key,xi:R.xi,f:R.f,date:R.fx.date,fmt:R.fx.fmt})))`));
ok(rows.length===8&&rows.every(R=>R.xi.length===11),'eight fixtures with an XI each');
// a bowler who plays a run of four matches within a month builds load
let k=-1,pace=null;
for(let i=0;i+3<rows.length&&!pace;i++){if(G(`daysBetween('${rows[i].date}','${rows[i+3].date}')`)>30)continue;
  pace=rows[i].xi.find(p=>G(`pAttr(${p},'${rows[i].date}').style`)==='P'&&rows.slice(i,i+4).every(R=>R.xi.includes(p)));if(pace)k=i;}
if(pace){
  const seq=rows.slice(k,k+4).map(R=>R.f[pace]);
  ok(Math.max(...seq.slice(1))>seq[0],'projected fatigue builds over a run of matches: '+seq.join(','));
  const before=rows[k+2].f[pace];
  $(`[data-rest="${rows[k+1].key}:${pace}"]`).click();
  ok(G(`isRested(fixtureByKey('${rows[k+1].key}'),${pace})`),'rested');
  const r2=JSON.parse(G(`JSON.stringify(workloadPlan(4).map(R=>({xi:R.xi,f:R.f})))`));
  ok(!r2[k+1].xi.includes(pace)&&r2[k+1].xi.length===11,'he is out of that XI and the squad fills the gap');
  ok(r2[k+2].f[pace]<before,'and fresher afterwards ('+before+' -> '+r2[k+2].f[pace]+')');
  ok($(`[data-rest="${rows[k+1].key}:${pace}"]`).textContent==='R','the grid shows the rest');
  ok(G(`JSON.parse(localStorage.getItem(ACH_KEY)).rotate`),'achievement');
  // the real match: he doesn't play, with a note; the rest lapses once it's played
  const M=JSON.parse(G(`(()=>{const M=buildMatch(fixtureByKey('${rows[k+1].key}'));return JSON.stringify({bat:M.xi[4].bat,notes:M.selNotes});})()`));
  ok(!M.bat.includes(pace)&&M.notes.some(n=>n.out===pace&&n.why==='rested'),'rested in the real XI, with a note');
  G(`for(let i=0;i<${k+2};i++)simFixture(coachNext())`);
  ok(G(`S.done['${rows[k+1].key}']`)&&!G(`S.rest&&S.rest['${rows[k+1].key}']`),'the rest lapses once the match is played');
  ok(G(`!S.matches.find(E=>E.id===S.done['${rows[k+1].key}']).xi[4].slice(0,11).includes(${pace})`),'and he sat it out');
}else ok(false,'found a pace bowler playing a run of matches');
// auto-rotation
G(`fatigueOf=(o=>(p,d)=>pAttr(p,d).style==='P'?70:o(p,d))(fatigueOf)`);   // every quick is shattered
const n=G(`autoRotate(4)`);
ok(n>0,'auto-rotation rests the tired ('+n+')');
ok(G(`Object.values(S.rest).every(L=>L.length<=2)`),'two at most a match');
w.go('plan');$('#pl-clear').click();
ok(G(`!S.rest||myUpcoming(4).every(x=>!S.rest[x.key])`),'clear all rests');
console.log(fail?`e2e25: ${fail} failing`:'e2e25 ok');
process.exit(fail?1:0);
