// e2e22: franchise league - found it, bid in the auction (you can win a lot, AI owners bid with budgets), full
// squads within the overseas rule, a season in its own LEAGUE format, retention and the next auction.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),click=s=>$(s).click();
click('#sp-go');
G(`for(const fx of allFixtures().filter(x=>x.playable&&x.date<'2008-03-01'))simFixture(fx)`);
w.go('league');$('#lg-host').value='3';$('#lg-mine').value='105';$('#lg-y').value='2008';click('#lg-go');
ok(G('league()&&league().auction'),'league founded, auction open');
ok($('#au-bid')&&$('#au-pass'),'auction controls');
// bid on the first lot until it's settled
const first=G('league().auction.lot.pid');
for(let i=0;i<40&&G('league().auction&&league().auction.lot&&league().auction.lot.pid')===first;i++){if($('#au-bid').disabled)break;click('#au-bid');}
const got=G(`league().teams[105].squad.includes(${first})`),log=G(`league().auction.log.find(x=>x[0]===${first})`);
ok(log&&(got?log[1]===105:log[1]!==105),'first lot settled ('+(got?'you won it':'outbid')+')');
click('#au-sim');
ok(!G('league().auction'),'auction finished');
const T=G('Object.values(league().teams)');
ok(T.every(t=>t.squad.length===15),'every franchise has 15');
ok(T.every(t=>G(`overseasCount(league().teams[${t.id}])`)<=6),'at most six overseas');
ok(T.every(t=>t.purse>=0),'nobody overspent');
ok(new Set(T.flatMap(t=>t.squad)).size===120,'no player in two squads');
ok(G(`cupById(league().seasons[2008].cup).fix.length`)===31,'a 31-match season scheduled');
G(`simCup(cupById(league().seasons[2008].cup));ensureLeague()`);
ok(G(`league().seasons[2008].champ`)>0,'champions crowned');
const lm=G(`S.matches.filter(E=>E.fmt==='LEAGUE')`);
ok(lm.length===31&&!G(`S.matches.some(E=>E.fmt==='T20'&&E.teams.some(isFranchise))`),'league matches kept in their own format');
ok(lm.every(E=>E.teams.every(t=>E.xi[t].slice(0,11).filter(p=>G(`overseas(${t},${p})`)).length<=4)),'at most four overseas in an XI');
w.go('league');ok($('#view').innerHTML.includes('Retain up to four'),'retention offered when the season ends');
const keep=G('league().teams[105].squad.slice(0,3)');
w.document.querySelectorAll('[data-keep]').forEach(c=>{if(keep.includes(+c.dataset.keep)){c.checked=true;c.dispatchEvent(new w.Event('change'));}});
click('#lg-auction');
ok(G('league().auction&&league().auction.year')===2009,'2009 auction open');
ok(keep.every(p=>G(`league().teams[105].squad.includes(${p})`))&&G('league().teams[105].squad.length')===3,'your three kept players stay');
ok(Math.abs(G('league().teams[105].purse')-(100-12-9-7))<.01,'retention cost comes off the purse');
w.eval(`REC_F.fmt='LEAGUE';go('records')`);ok(!$('#view').innerHTML.includes('Something went wrong'),'league records');
console.log(fail?`e2e22: ${fail} failing`:'e2e22 ok');
process.exit(fail?1:0);
