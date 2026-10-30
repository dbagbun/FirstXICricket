// e2e33: the season review - a year on one page (your side's record, champions, performers, awards, back pages,
// quote of the year, the board's verdict, close finishes), the year picker, the dashboard nudge, the image.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-team').value='4';$('#sp-coach').checked=true;$('#sp-go').click();
G(`for(let i=0;i<3000;i++){const fx=nextFixture();if(!fx||fx.date>'2004-01-20')break;simFixture(fx);
  if(S.coach.pc)S.coach.pc.qs.forEach((q,j)=>{if(q.a==null)pressAnswer(j,j%q.o.length);});if(S.coach.offers.length&&!S.coach.team)takeJob(S.coach.offers[0].team);}`);
const D=JSON.parse(G(`JSON.stringify((()=>{const D=seasonData(2003);return{n:D.n,my:D.my,rec:D.rec,champs:D.champs.length,runs:D.topRuns.length,hs:D.hs&&D.hs.v,heads:D.heads.length,quote:!!D.quote,objs:D.objs.length,done:D.done};})())`));
const n03=G(`S.matches.filter(E=>E.date.startsWith('2003')).length`);
ok(D.n===n03&&D.done,'the 2003 season: '+D.n+' matches');
const myN=G(`S.matches.filter(E=>E.date.startsWith('2003')&&E.teams.includes(pressTeam())).length`);
ok(Object.values(D.rec).reduce((a,r)=>a+r.p,0)===myN&&Object.values(D.rec).every(r=>r.w+r.l+r.d===r.p),'your side\'s record adds up');
ok(D.champs>=1,'champions crowned that year ('+D.champs+')');
ok(D.runs===3&&D.hs>=100,'performers and the highest score ('+D.hs+')');
ok(D.heads>=1&&D.quote,'back pages and a quote of the year');
// the dashboard nudge
w.go('home');ok(/The 2003 season review is in/.test($('#view').textContent),'the dashboard nudge');
$('[data-go="season"][data-arg="2003"]').click();
ok(G('VIEW')==='season'&&/Season review/.test($('#view').textContent)&&/2003/.test($('#view h2').textContent),'the review opens');
for(const t of['Champions','Performers','Back pages','Quote of the year'])ok($('#view').textContent.includes(t),'section: '+t);
w.go('home');ok(!/season review is in/.test($('#view').textContent),'the nudge goes once read');
// year picker
w.go('season',2003);const sel=$('#sr-y');sel.value='2002';sel.dispatchEvent(new w.Event('change'));
ok(/2002/.test($('#view h2').textContent),'another year');
// from the honours (Rankings) and the image
ok(G(`typeof seasonImage(2003)`)==='object','the image builds (or null without canvas)');
w.go('rank');$('[data-rkt="honours"]').click();
const fr=$('[data-go="season"]');if(fr){fr.click();ok(G('VIEW')==='season','Full review from the honours');}
console.log(fail?`e2e33: ${fail} failing`:'e2e33 ok');
process.exit(fail?1:0);
