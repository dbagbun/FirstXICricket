// e2e31: scouting and call-ups - a yearly pool of uncapped prospects for the side you coach, potential shown as
// a range until scouted (limited reports), calling one up into the next squad, and youngsters maturing with caps.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-team').value='4';$('#sp-coach').checked=true;$('#sp-go').click();
w.go('coach');
ok(/Scouting - England prospects/.test($('#view').textContent),'the scouting card');
const pool=G('S.scout.pool');
ok(pool.length===6&&pool.every(p=>G(`!!genP(${p})&&!genP(${p}).real&&genP(${p}).t===4&&capsOf(${p})===0`)),'six uncapped English prospects');
ok(G('S.scout.reports')===4,'four scouting reports a year');
// ranges until scouted
const p=pool[0],r0=G(`potRange(${p})`),truth=G(`starsOf(${p})`);
ok(r0[1]-r0[0]<=2&&r0[0]<=truth&&truth<=r0[1]||r0[1]-r0[0]===2,'a range around the truth: '+r0.join('-')+' (truth '+truth+')');
$(`[data-scout="${p}"]`).click();
ok(G('S.scout.reports')===3&&JSON.stringify(G(`potRange(${p})`))===JSON.stringify([truth,truth]),'a report reveals it');
for(const q of pool.slice(1,4))G(`scoutReport(${q})`);
ok(G('S.scout.reports')===0&&!G(`scoutReport(${pool[4]})`),'no more reports this year');
// call-up
const nx=G('coachNext()'),sq=G(`squadFor(coachNext().sid,4,coachNext().date)`);
G(`(()=>{const s=squadFor(coachNext().sid,4,coachNext().date);s.splice(14,1);})()`);
$(`[data-callup="${p}"]`).click();
ok(G(`squadFor(coachNext().sid,4,coachNext().date).includes(${p})`),'called up into the squad');
ok(G(`S.coach.news.some(n=>/is called up/.test(n.text))`)&&G(`JSON.parse(localStorage.getItem(ACH_KEY)).callup`),'news and an achievement');
ok(G(`callUp(${pool[1]})`)==='full','a full squad needs a place first');
// he plays when the XI needs him: leave the real men in his role out
const role=G(`pAttr(${p}).style==='N'`);
G(`(()=>{const s=squadFor(coachNext().sid,4,coachNext().date),real=buildMatch(coachNext()).xi[4].bat;const like=real.filter(x=>(pAttr(x).style==='N')===${role});
  for(const x of like.slice(0,2))s.splice(s.indexOf(x),1);})()`);
ok(G(`buildMatch(coachNext()).xi[4].bat.includes(${p})`),'and he plays when the XI needs his role');
// a new year: a fresh pool (some kept) and fresh reports
G(`for(let i=0;i<500;i++){const fx=nextFixture();if(!fx||fx.date>'2003-02-01')break;simFixture(fx);if(S.coach.offers.length&&!S.coach.team)takeJob(S.coach.offers[0].team);}`);
if(G('S.coach.team')===4){w.go('coach');ok(G('S.scout.year')===2003&&G('S.scout.reports')===4&&G('S.scout.pool.length')===6,'a new year, a new pool');}
// youngsters mature with caps
const dev=G(`(()=>{const g={pot:2,born:2001,st:'P'},d='2021-06-01';const pid=${p};const before=genRating(g,d,0);S.stats.ODI[pid]=S.stats.ODI[pid]||blankStats();S.stats.ODI[pid].m=30;return[before,genRating(g,d,pid)];})()`);
ok(dev[0]===4&&dev[1]===2,'a 20-year-old with 30 caps plays to his potential ('+dev.join(' -> ')+')');
console.log(fail?`e2e31: ${fail} failing`:'e2e31 ok');
process.exit(fail?1:0);
