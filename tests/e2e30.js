// e2e30: ICC events - the real T20 World Cups (real hosts, teams in the game) arrive in a career, can be switched
// off and on, play through to a final; the World Test Championship table, its final in England and the champions.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
w.document.querySelector('#sp-team').value='4';$('#sp-go').click();
const wc=JSON.parse(G(`JSON.stringify(S.cups.filter(c=>/T20 World Cup/.test(c.name)).map(c=>({n:c.name,host:c.host,t:c.teams.length,fmt:c.fmt,start:c.start})))`));
ok(wc.length===9,'nine real T20 World Cups: '+wc.map(c=>c.n.slice(-4)).join(','));
ok(wc[0].start==='2007-09-11'&&wc[0].host===5&&wc[0].t===12&&wc[0].fmt==='T20','2007 in South Africa, twelve teams');
ok(wc.every(c=>c.t>=11&&c.t<=16),'every edition with the teams the game has');
// off and on
w.go('settings');$('[data-set="t20wc"][data-val="off"]').click();
ok(G(`S.cups.filter(c=>/T20 World Cup/.test(c.name)).length`)===0,'switched off: gone');
$('[data-set="t20wc"][data-val="on"]').click();
ok(G(`S.cups.filter(c=>/T20 World Cup/.test(c.name)).length`)===9,'switched on: back');
// the 2007 T20 World Cup plays through to a final
G(`for(let i=0;i<4000;i++){const fx=nextFixture();if(!fx||fx.date>'2007-10-10')break;simFixture(fx);}`);
const fin=JSON.parse(G(`JSON.stringify(S.matches.filter(E=>/T20 World Cup 2007/.test(E.series)).map(E=>({st:E.stage,fmt:E.fmt})))`));
ok(fin.length>=15&&fin.every(x=>x.fmt==='T20')&&fin.some(x=>/^final$/i.test(x.st)),'2007 played: '+fin.length+' T20s and a final');
w.go('tour',G(`S.cups.find(c=>/T20 World Cup 2007/.test(c.name)).id`));ok(!$('#view').innerHTML.includes('Something went wrong'),'its Tournament Centre');
// switching off after it started keeps the played edition
w.go('settings');$('[data-set="t20wc"][data-val="off"]').click();
ok(G(`S.cups.some(c=>/T20 World Cup 2007/.test(c.name))&&!S.cups.some(c=>/T20 World Cup 2024/.test(c.name))`),'played editions stay, future ones go');
$('[data-set="t20wc"][data-val="on"]').click();
// WTC: Tests between the nine nations in 2019-21, then the final in England
G(`for(let i=0;i<6000;i++){const fx=nextFixture();if(!fx||fx.date>'2019-07-20')break;simFixture(fx);}`);
const pairs=[[4,1],[3,9],[5,6],[4,3],[1,9],[7,8]];
pairs.forEach(([a,b],k)=>G(`createTestSeries({a:${a},b:${b},n:3,start:'${['2019-08-01','2019-11-10','2020-01-20','2020-08-05','2020-12-01','2021-03-01'][k]}'})`));
G(`for(let i=0;i<9000;i++){const fx=nextFixture();if(!fx||fx.date>'2021-06-01')break;simFixture(fx);}`);
const tbl=JSON.parse(G(`JSON.stringify(wtcTable(wtcCycles(careerDate())[0]))`));
ok(tbl.length>=8&&tbl.every(r=>r.p>=3&&r.pct>=0&&r.pct<=100),'the 2019-21 table: '+tbl.map(r=>G(`teamShort(${r.team})`)+' '+r.pct).join(', '));
ok(tbl.every((r,i)=>i===0||tbl[i-1].pct>=r.pct),'ranked by percentage');
const W=JSON.parse(G(`JSON.stringify(S.wtc[2021]||null)`));
ok(W&&W.key&&W.a===tbl[0].team&&W.b===tbl[1].team,'the top two meet in the final');
const fx=JSON.parse(G(`JSON.stringify(fixtureByKey(S.wtc[2021].key))`));
ok(fx&&fx.fmt==='TEST'&&/World Test Championship Final 2021/.test(fx.title)&&fx.venue==='The Rose Bowl'&&fx.date==='2021-06-18','in Southampton, June 2021');
G(`for(let i=0;i<300;i++){const fx=nextFixture();if(!fx||S.wtc[2021].done)break;simFixture(fx);}`);
ok(G('S.wtc[2021].done')&&G('S.wtc[2021].champ.length')>=1,'champions crowned: '+G('S.wtc[2021].champ.map(teamName).join(" & ")'));
ok(!JSON.parse(G(`JSON.stringify(wtcTable(wtcCycles(careerDate())[0]))`)).some(r=>r.p>tbl.find(x=>x.team===r.team).p),'the final is not in the table');
w.go('rank');$('[data-rkt="wtc"]').click();
ok(/World Test Championship 2019-21/.test($('#view').textContent)&&/win the final|share the title/.test($('#view').textContent),'the Rankings tab shows it');
console.log(fail?`e2e30: ${fail} failing`:'e2e30 ok');
process.exit(fail?1:0);
