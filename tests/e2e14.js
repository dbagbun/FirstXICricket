// e2e14: build your own tournament - each structure produces the right fixtures, knockout slots resolve from
// your tables and results, champions are crowned, Tests play a league, and the screens work.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
const T16=G(`ALL_TEAMS.filter(t=>!COMPOSITE.has(t)).slice(0,16)`);
const mk=(fmt,format,n,start)=>G(`createCup({fmt:'${fmt}',format:'${format}',host:4,start:'${start}',teams:${JSON.stringify(T16.slice(0,n))}})`);
const count=(c,st)=>c.fix.filter(f=>st?f.stage===st:true).length;
const rr=mk('ODI','rr',6,'2003-05-01');ok(count(rr,'group')===15&&count(rr)===18,'round robin of 6: 15 league games + 2 semis + final');
const g2=mk('ODI','groups2',8,'2003-06-01');ok(count(g2,'group')===12&&count(g2)===15&&Object.keys(g2.groups).length===2,'two groups of 4: 12 + 3');
const g4=mk('T20','groups4',16,'2006-01-01');ok(count(g4,'group')===24&&count(g4,'quarter')===4&&count(g4)===31,'four groups of 4: 24 + 4 + 2 + 1');
const ko=mk('ODI','ko',8,'2003-08-01');ok(count(ko)===7&&count(ko,'final')===1,'knockout of 8: 7 games');
const tst=mk('TEST','groups2',4,'2003-09-01');ok(tst.format==='rr'&&count(tst)===6&&!tst.fix.some(f=>f.stage!=='group'),'Test cups play a league only');
ok(Object.values(g2.groups).map(g=>g.length).join()==='4,4','snake seeding gives even groups');
ok(!G(`fixtureByKey('${rr.fix[15].key}').playable`),'semi-finals wait for the league');
// play the round robin cup out
const sim=c=>G(`simCup(cupById('${c.id}'))`);
sim(rr);
const tab=G(`tableFrom(cupMatches(cupById('${rr.id}')).filter(E=>/^League/.test(E.stage)),cupById('${rr.id}').teams).map(r=>r.team)`);
const semis=G(`cupMatches(cupById('${rr.id}')).filter(E=>/Semi/.test(E.stage))`);
ok(semis.length===2,'two semi-finals played');
ok(semis.some(E=>E.teams.includes(tab[0])&&E.teams.includes(tab[3]))&&semis.some(E=>E.teams.includes(tab[1])&&E.teams.includes(tab[2])),'semis are 1v4 and 2v3 from your table');
const fin=G(`cupMatches(cupById('${rr.id}')).find(E=>E.stage==='Final')`);
ok(fin&&fin.teams.every(t=>semis.some(s=>s.result.winner===t||(!s.result.winner&&s.teams.includes(t)))),'final is between the semi-final winners');
ok(G(`cupChampion(cupById('${rr.id}'))`)===fin.result.winner||!fin.result.winner,'champion crowned');
ok(fin.result.type!=='tie','knockout ties go to a super over (no tied final)');
for(const c of[g2,g4,ko,tst])sim(c);
ok(G(`cupById('${g4.id}').fix.every(f=>S.done[f.key])`),'T20 four-group cup completes');
ok(G(`cupChampion(cupById('${ko.id}'))`)>0&&G(`cupChampion(cupById('${tst.id}'))`)>0,'knockout and Test league have champions');
ok(G(`S.matches.filter(m=>m.sid==='${g4.id}').every(m=>m.fmt==='T20')`),'cup matches carry the cup format');
ok(G(`Object.keys(R_().pos).includes('${rr.id}')`),'player of the tournament crowned');
// screens
w.go('tour',rr.id);ok($('#view').innerHTML.includes('Champions')&&$('#view').innerHTML.includes('Knockouts'),'tournament centre shows the cup');
w.go('fixtures');w.eval(`FX_F.year='2003';FX_F.status='all';rerender()`);ok($('#view').innerHTML.includes(G(`cupById('${rr.id}').name`)),'cup fixtures in the fixture list');
// create through the dialog
w.go('tour');$('#tc-new').click();$('[data-pick="8"]').click();$('#cu-format').value='groups2';$('#cu-go').click();
ok(G(`S.cups.filter(c=>!/ICC T20/.test(c.name)).length`)===6&&G('VIEW')==='tour','tournament created from the dialog');   // (the real T20 World Cups are cups too)
$('[data-playkey]')&&$('[data-playkey]').click();
ok(G('VIEW')==='match'&&G('LM.sid')===G('S.cups.at(-1).id'),'play the first match of your tournament');
console.log(fail?`e2e14: ${fail} failing`:'e2e14 ok');
process.exit(fail?1:0);
