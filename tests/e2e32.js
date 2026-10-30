// e2e32: profiles and records for the newer systems - shot maps on player cards (from the ball logs), the
// Reviews record table, the Hall of Fame card on the dashboard, where a batting colour comes from.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`S.settings.drs='on';for(let i=0;i<40;i++)simFixture(nextFixture())`);
// a batter and a bowler with logs
const bat=G(`(()=>{const L=Object.entries(S.stats.ODI).sort((a,b)=>b[1].r-a[1].r);return +L[0][0];})()`);
const bowl=G(`(()=>{const L=Object.entries(S.stats.ODI).sort((a,b)=>b[1].bb-a[1].bb);return +L[0][0];})()`);
const P=JSON.parse(G(`JSON.stringify((()=>{const P=playerBalls(${bat});return{n:P.n,runs:P.bat.reduce((a,b)=>a+(b.bat||0),0)};})())`));
const logged=G(`S.matches.filter(E=>S.logs[E.id]&&E.teams.some(t=>E.xi[t].slice(0,11).includes(${bat}))).reduce((a,E)=>a+E.inns.reduce((x,I)=>x+(I.bt.find(r=>r[0]===${bat})||[0,0])[1],0),0)`);
ok(P.n>0&&P.runs===logged,'his logged balls add up to his runs in those matches ('+P.runs+')');
w.openPlayer(bat);ok(/Shots &amp; pitch map|Shots & pitch map/.test($('#modal-box').innerHTML)&&$('#modal-box .ground'),'the wagon wheel on his card');
w.closeModal();w.openPlayer(bowl);ok($('#modal-box .pitchmap'),'the pitch map on a bowler\'s card');
ok(/derived|from real averages|from your Excel/.test($('#modal-box').textContent),'where his colour comes from');
w.closeModal();
// review records
const R=JSON.parse(G(`JSON.stringify(drsRecords('ODI'))`));
const all=G(`S.matches.filter(E=>E.fmt==='ODI'&&E.drs).reduce((a,E)=>a+E.drs.filter(d=>d[4]!=='M').length,0)`);
ok(R.teams.reduce((a,r)=>a+r.rev,0)<=all&&R.teams.every(r=>r.won<=r.rev),'review counts ('+all+' reviews)');
w.go('records');ok(R.teams.length?/Reviews/.test($('#view').textContent):true,'the Reviews table in Records');
// the Hall of Fame card
w.go('home');ok(!/Hall of Fame/.test($('#view').textContent),'no Hall of Fame card before anyone is in');
G(`hof().inducted[${bat}]={year:2010,pct:88}`);w.go('home');
ok(/Hall of Fame/.test($('#view').textContent)&&/class of 2010/.test($('#view').textContent),'the Hall of Fame card');
$('#hof-go').click();ok(G('VIEW')==='rank'&&G('RK_F.tab')==='legends','it opens the Legends');
console.log(fail?`e2e32: ${fail} failing`:'e2e32 ok');
process.exit(fail?1:0);
