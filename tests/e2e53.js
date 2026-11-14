// e2e53: milestones say how many got there first ("2,000 career runs - the 1st player to get there"), per format;
// a match you play lists the ranking moves (teams that moved, players into or out of the top 10, a new No.1) with the
// new and the old position, in the result and on the scorecard. Quick sims don't work them out.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`for(let i=0;i<700;i++)simFixture(nextFixture())`);
// milestones in order
const ms=G(`S.ms.filter(m=>m.fmt==='ODI'&&m.cat==='Career Runs'&&m.thr===1000)`);
ok(ms.length>=3,'several 1,000-run ODI careers ('+ms.length+')');
ok(ms.every((m,i)=>m.nth===i+1&&m.text.endsWith(`the ${G(`ordinal(${i+1})`)} player to get there`)),'numbered in order: '+ms.slice(0,3).map(m=>m.text).join(' | '));
ok(G(`S.ms.filter(m=>m.fmt==='TEST'&&m.cat==='Career Runs'&&m.thr===1000)[0]?.nth`)===1,'counted per format');
ok(G(`S.ms.filter(m=>m.cat==='Hat-trick').every(m=>!m.nth)`),'one-off moments are not numbered');
ok(JSON.stringify(G(`(()=>{const a=JSON.stringify(S.msN);delete S.msN;return JSON.stringify(msCount())===a;})()`))==='true','the counts rebuild from the milestones (older saves)');
ok(G(`S.matches.every(E=>!E.rk)`),'quick sims skip the ranking moves');
// a match you play
const r=G(`(()=>{const fx=nextFixture();const M=buildMatch(fx);doToss(M);simMatch(M);const E=S.matches[S.matches.length-1];return{rk:E.rk||[],fmt:E.fmt,id:E.id};})()`);
let found=r.rk.length?r:null;
for(let i=0;i<8&&!found;i++){const x=G(`(()=>{const fx=nextFixture();const M=buildMatch(fx);doToss(M);simMatch(M);const E=S.matches[S.matches.length-1];return{rk:E.rk||[],fmt:E.fmt,id:E.id};})()`);if(x.rk.length)found=x;}
ok(found,'a played match brings ranking moves');
if(found){
  const txt=found.rk.map(x=>G(`rankMoveText(${JSON.stringify(x)},'${found.fmt}')`));
  ok(txt.every(t=>/\(was (\d+(st|nd|rd|th)|unranked)\)/.test(t)),'each gives the old position: '+txt.slice(0,3).join(' | '));
  ok(found.rk.every(x=>x.k==='team'?x.from!==x.to:(x.from<=10)!==(x.to<=10&&x.to>0)||x.to===1),'only moves of note');
  G(`openScorecard(${JSON.stringify(found.id)})`);ok(/Rankings/.test($('#modal-box').textContent),'on the scorecard');G(`closeModal()`);
}
// the words
ok(G(`rankMoveText({k:'bat',id:+Object.keys(WORLD.players)[0],from:14,to:8},'ODI')`).includes('into the top 10 ODI batters at 8th (was 14th)'),'into the top 10');
ok(G(`rankMoveText({k:'bowl',id:+Object.keys(WORLD.players)[0],from:9,to:12},'TEST')`).includes('out of the top 10 Test bowlers: now 12th (was 9th)'),'out of the top 10');
ok(G(`rankMoveText({k:'bat',id:+Object.keys(WORLD.players)[0],from:3,to:1},'ODI')`).includes('new No.1 ODI batter (was 3rd)'),'a new No.1');
ok(G(`rankMoveText({k:'team',id:1,from:4,to:3},'ODI')`).includes('up to 3rd in the ODI team rankings (was 4th)'),'teams');
console.log(fail?`e2e53: ${fail} failing`:'e2e53 ok');process.exit(fail?1:0);
