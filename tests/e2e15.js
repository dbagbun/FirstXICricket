// e2e15: stats lab - filtered tables agree with career stats, filters narrow correctly, batter v bowler
// matchups add up to the scorecards, ground records, the player card's head to head.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`for(const fx of allFixtures())if(fx.playable&&fx.date<'2004-01-01')simFixture(fx)`);
// unfiltered query == career stats
const top=G(`queryStats({fmt:'ODI'}).bat[0]`);
ok(top.r===G(`S.stats.ODI[${top.pid}].r`)&&top.inn===G(`S.stats.ODI[${top.pid}].inn`),'unfiltered batting matches career stats');
const tb=G(`queryStats({fmt:'ODI'}).bowl[0]`);
ok(tb.bw===G(`S.stats.ODI[${tb.pid}].bw`),'unfiltered bowling matches career stats');
// filters
const y03=G(`queryStats({fmt:'ODI',from:2003,to:2003}).bat.reduce((a,x)=>a+x.r,0)`),all=G(`queryStats({fmt:'ODI'}).bat.reduce((a,x)=>a+x.r,0)`);
ok(y03>0&&y03<all,'year filter narrows');
const ind=G(`queryStats({fmt:'ODI',team:3}).bat`);
ok(ind.length&&ind.every(x=>G(`S.stats.ODI[${x.pid}].teams.includes(3)`)),'team filter: only India batters');
const openers=G(`queryStats({fmt:'ODI',pos:'top'}).bat.reduce((a,x)=>a+x.inn,0)`),matchesInns=G(`S.matches.filter(E=>E.fmt==='ODI').reduce((a,E)=>a+E.inns.reduce((b,I)=>b+Math.min(3,I.bt.length),0),0)`);
ok(openers===matchesInns,'position filter: top three per innings');
const ko=G(`queryStats({fmt:'ODI',stage:'ko'}).bat.reduce((a,x)=>a+x.r,0)`);
ok(ko>0&&ko<all,'knockouts filter');
// matchups add up
const chk=G(`S.matches.slice(0,40).every(E=>E.inns.every(I=>{const mu=I.mu||[];const runs=mu.reduce((a,u)=>a+u[3],0),bat=I.bt.reduce((a,r)=>a+r[1],0);const outs=mu.reduce((a,u)=>a+u[4],0),credited=I.bw.reduce((a,w)=>a+w[4],0);return runs===bat&&outs===credited;}))`);
ok(chk,"matchup runs = batters' runs, matchup dismissals = bowlers' wickets");
const h=G(`headToHead(${top.pid},0,'ODI')`);
ok(h.reduce((a,x)=>a+x.r,0)===top.r,"a batter's runs against all bowlers = his career runs");
const g=G(`groundStats('ODI')`);
ok(g.length>5&&g[0].m>=g[1].m&&g.every(v=>v.hi&&v.avg1>0),'ground records');
// screens
for(const m of['bat','bowl','h2h','ground']){w.eval(`Q_F.mode='${m}';go('query')`);ok(!$('#view').innerHTML.includes('Something went wrong'),'stats lab '+m);}
w.eval(`Q_F.mode='h2h';Q_F.b1=pName(${top.pid});Q_F.b2='';go('query')`);ok($('#view').innerHTML.includes('Bowler'),'head-to-head for one batter');
w.openPlayer(top.pid);ok($('#modal-box').innerHTML.includes('Head to head')||!h.some(x=>x.o>0),'player card head to head');
console.log(fail?`e2e15: ${fail} failing`:'e2e15 ok');
process.exit(fail?1:0);
