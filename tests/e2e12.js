// e2e12: coach career - start as coach, board targets per series, squads and XI picks (injury replacements),
// fatigue and form mods, targets judged with confidence moving, the sack and job offers, contract renewal,
// "sim to my next match", and the Coach screen.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-team').value='4';$('#sp-coach').checked=true;$('#sp-go').click();
ok(G('S.coach&&S.coach.team')===4,'coach of England');
ok(G('VIEW')==='coach'&&$('#view').innerHTML.includes('Board confidence'),'coach screen opens');
ok(G(`S.coach.objs.some(o=>o.status==='open'&&o.sid===coachNext().sid)`),'a board target for the first series');
ok(!G(`S.coach.objs.some(o=>o.kind==='rank'&&o.n<1)`),'no rankings target without a table');
const nx=G('coachNext()');
const sq=G(`squadFor(coachNext().sid,4,coachNext().date)`);
ok(sq.length===15,'squad of 15');
const real=G(`fixtureXI(coachNext().f.cid,4).bat`);
ok(real.every(p=>sq.includes(p)),'the real XI is in the squad');
// injure a real-XI player: he's replaced from the squad
G(`S.inj={${real[2]}:{until:'2003-01-01',what:'hamstring',team:4}}`);
const M=G(`(()=>{const M=buildMatch(coachNext());return{bat:M.xi[4].bat,notes:M.selNotes};})()`);
ok(!M.bat.includes(real[2])&&M.notes.some(n=>n.out===real[2]&&n.why==='injured'),'injured player replaced, with a note');
ok(M.bat.every(p=>sq.includes(p)),'XI picked from the squad');
G(`S.inj={}`);
// leave a player out of the squad: he's replaced too
G(`(()=>{const s=squadFor(coachNext().sid,4,coachNext().date);s.splice(s.indexOf(${real[4]}),1);})()`);
ok(!G(`buildMatch(coachNext()).xi[4].bat`).includes(real[4]),'a player you leave out of the squad does not play');
// screens
w.go('coach');ok($('#view').innerHTML.includes('Squad -')&&$$sq(),'squad table');
function $$sq(){return w.document.querySelectorAll('[data-sq]').length>=15;}
w.go('home');ok($('#view').innerHTML.includes('Coach of'),'dashboard coach card');
// sim the first series: target judged, confidence moves
const c0=G('S.coach.conf'),sid=nx.sid;
G(`for(const fx of allFixtures().filter(x=>x.playable&&!S.done[x.key]&&x.date<=SERIES.get(${JSON.stringify(sid)}).end))simFixture(fx)`);
const o=G(`S.coach.objs.find(o=>o.sid===${JSON.stringify(sid)})`);
ok(o.status==='met'||o.status==='failed','series target judged: '+o.status+' ('+o.text+')');
ok(G('S.coach.conf')!==c0,'board confidence moved ('+c0+' -> '+G('S.coach.conf')+')');
ok(G(`Object.keys(S.form.ODI).length`)>20,'form tracked');
// fatigue
const pace=G(`(()=>{const E=S.matches.filter(m=>m.teams.includes(4)).pop();const I=E.inns.find(i=>i.bowl===4);return I.bw.sort((a,b)=>b[1]-a[1])[0][0];})()`);
ok(G(`fatigueOf(${pace},careerDate())`)>0,'a bowler who just bowled carries fatigue');
// the sack
G(`S.coach.conf=8`);   // low enough to be sacked even after a win (+4) and the drift towards 55
const loss=G(`(()=>{const E=S.matches.filter(m=>m.teams.includes(4)).pop();return coachAfter(E);})()`);
ok(G('S.coach.team')===0&&G(`S.coach.history.at(-1).why`)==='sacked','sacked below the threshold');
ok(G('S.coach.offers.length')>0,'job offers after the sack');
w.go('coach');ok($('#view').innerHTML.includes('Out of work')&&w.document.querySelector('[data-take]'),'offers on the coach screen');
w.document.querySelector('[data-take]').click();
const t2=G('S.coach.team');
ok(t2>0&&t2!==4&&G('S.settings.myTeam')===t2,'took a new job ('+G(`teamName(${t2})`)+')');
// contract renewal
G(`S.coach.until=careerDate();S.coach.conf=70`);
G(`coachAfter(S.matches[S.matches.length-1])`);
ok(G('S.coach.until')>G('careerDate()')&&G('S.coach.team')===t2,'contract renewed with confidence 70');
// sim to my next match stops before it
const mine=G('coachNext()');
w.simToMyMatch();
let waited=0;
const iv=setInterval(()=>{if(w.document.querySelector('#sim-bar')&&(waited+=100)<60000)return;clearInterval(iv);done();},100);
function done(){
  const left=G(`allFixtures().filter(x=>x.playable&&!S.done[x.key]&&x.date<${JSON.stringify(mine.date)}&&x.a!==${t2}&&x.b!==${t2}).map(x=>x.date+' '+x.key)`);
  ok(!left.length,'everything before your next match has been simmed ('+left.length+' left: '+left.slice(0,3).join(', ')+'; stop='+G('S.coach.stop')+', sim modal '+!!w.document.querySelector('#sim-bar')+')');
  ok(!G(`S.done[${JSON.stringify(mine.key)}]`),'your match is left for you');
  console.log(fail?`e2e12: ${fail} failing`:'e2e12 ok');
  process.exit(fail?1:0);
}
