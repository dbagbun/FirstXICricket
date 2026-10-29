// e2e21: legends - retirements are noticed, the Hall of Fame votes each year (75%, at most three, eligible two
// years after retiring), teams of the decade and all-time XIs pick 6 batters + keeper + 4 bowlers, career stories.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`(()=>{let fx;while((fx=nextFixture())&&fx.date<'2016-01-01')simFixture(fx);})()`);
const H=G('hof()');
ok(Object.keys(H.retired).length>20,'retirements noticed ('+Object.keys(H.retired).length+')');
ok(Object.values(H.retired).every(d=>d>='2004-01-01'),'nobody retires in the first two years');
const ind=Object.entries(H.inducted);
ok(ind.length>0,'Hall of Fame inductions ('+ind.length+')');
ok(ind.every(([p,x])=>x.pct>=75&&G(`daysBetween(hof().retired[${p}],'${x.year}-12-31')>=730`)),'inducted with 75%+, two years after retiring');
const perYear={};for(const[,x]of ind)perYear[x.year]=(perYear[x.year]||0)+1;
ok(Object.values(perYear).every(n=>n<=3),'at most three a year');
ok(G(`Object.keys(hof().ballots).length`)>=10,'a ballot every year');
const T=G('decadeTeams(2000).ODI');
ok(T&&T.batters.length===6&&T.bowlers.length===4&&T.keeper&&new Set([...T.batters,T.keeper,...T.bowlers]).size===11,'team of the 2000s: 6 + keeper + 4, all different');
const X=G('allTimeXI(1,"ODI")');
ok(X&&[...X.batters,X.keeper,...X.bowlers].every(p=>G(`S.stats.ODI[${p}].teams.includes(1)`)),'all-time Australia XI is all Australians');
w.eval(`RK_F.tab='legends';go('rank')`);
ok($('#view').innerHTML.includes('Hall of Fame')&&$('#view').innerHTML.includes('All-time XI')&&!$('#view').innerHTML.includes('Something went wrong'),'Legends tab');
const p=+ind[0][0];w.openPlayer(p);ok($('#modal-box').innerHTML.includes('Career story')&&$('#modal-box').innerHTML.includes('Hall of Fame'),'player card tells his story');
console.log(fail?`e2e21: ${fail} failing`:'e2e21 ok');
process.exit(fail?1:0);
