// e2e58: rankings like the real ones. Team rating = points per match over the last 3-4 years (07b TEAM RATINGS):
// the points rule (within 40: opponent's rating +-50; 40+ apart: own +10/-90 for the stronger side, +90/-10 for the
// weaker), matches since the May before the last 1 May update in full and the two years before at half, the oldest
// year dropped each May; no-results not rated. Both tables are released weekly (Wednesdays) and show the places
// moved since last week (rankMv, ▲▼ on the Rankings page). An older save gains the team ratings once (rankSteady 2).
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
let w=boot();const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
// the points rule
ok(G(`[teamMatchPts(110,100,1),teamMatchPts(110,100,0),teamMatchPts(110,100,.5)].join()`)==='150,50,100','close sides: opponent +50 / -50 / level');
ok(G(`[teamMatchPts(130,80,1),teamMatchPts(130,80,.5),teamMatchPts(130,80,0)].join()`)==='140,90,40','the stronger side: own +10 / -40 / -90');
ok(G(`[teamMatchPts(5,60,0),teamMatchPts(20,30,0)].join()`)==='0,0','never below 0');
ok(G(`[teamMatchPts(80,130,1),teamMatchPts(80,130,.5),teamMatchPts(80,130,0)].join()`)==='170,120,70','the weaker side: own +90 / +40 / -10');
// the window and the annual update
ok(G(`[teamWt('2006-06-01','2007-12-11'),teamWt('2006-04-30','2007-12-11'),teamWt('2004-05-01','2007-12-11'),teamWt('2004-04-30','2007-12-11')].join()`)==='1,0.5,0.5,0','in full since May the year before the update, half for two years before, then dropped');
ok(G(`[teamWt('2005-06-01','2007-04-30'),teamWt('2005-06-01','2007-05-01')].join()`)==='1,0.5','on 1 May the next year halves');
ok(G(`rankWeek('2007-12-11')`)==='2007-12-05'&&G(`rankWeek('2007-12-05')`)==='2007-12-05','weeks run from Wednesday');
G(`for(let i=0;i<700;i++)simFixture(nextFixture())`);
// the table = points / matches from the stored results
const chk=G(`(()=>{const now=careerDate(),L=teamRanking('ODI',now);let bad=0;
  for(const r of L){let p=0,wt=0,n=0;for(const[d,t,x,seed]of S.rk.icc.ODI)if(t===r.team){const k=teamWt(d,now);p+=x*k;wt+=k;if(!seed&&k)n++;}if(Math.round(p/wt)!==r.pts||n!==r.p)bad++;}
  return{n:L.length,bad,sorted:L.every((r,i)=>!i||L[i-1].r>=r.r),old:S.rk.icc.ODI.every(x=>teamWt(x[0],now)>0)};})()`);
ok(chk.n>=10&&!chk.bad,'rating = points per match over the window ('+chk.n+' sides, '+chk.bad+' wrong)');
ok(chk.sorted,'best first');ok(chk.old,'results older than the window are dropped');
ok(G(`teamRanking('ODI').every(r=>rankPtsOf(r.team,'ODI')===r.pts)`),'the rest of the game reads the same ratings');
ok(G(`(()=>{const full=teamRanking('ODI').filter(r=>TEAMS.get(r.team).full),as=teamRanking('ODI').filter(r=>!TEAMS.get(r.team).full);return full.reduce((a,r)=>a+r.pts,0)/full.length>as.reduce((a,r)=>a+r.pts,0)/as.length+20;})()`),'full members above associates');
// no result: not rated
ok(G(`(()=>{const tab=S.rk.icc.ODI,n=tab.length,E=S.matches.findLast(x=>x.fmt==='ODI');teamRateMatch({...E,result:{type:'nr'}});const k=tab.length-n;tab.length=n;return k;})()`)===0,'a no-result is not rated');
// weekly release: last week's places and the moves since
const rel=G(`(()=>{const R=S.rk,P=R.wk.prev.ODI,L=teamRanking('ODI'),B=playerRanking('ODI','bat',30);
  return{k:R.wk.k===rankWeek(careerDate()),team:L.every((r,i)=>{const m=rankMv('ODI','team',r.team,i+1);return m==='new'||m===P.team.indexOf(r.team)-i;}),
    bat:B.every((r,i)=>{const m=rankMv('ODI','bat',r.pid,i+1);return m==='new'||m===P.bat.indexOf(r.pid)-i;})};})()`);
ok(rel.k&&rel.team&&rel.bat,'moves are against last week\'s release '+JSON.stringify(rel));
// a new week: the release is the table as it stood
const wk=G(`(()=>{const before=teamRanking('ODI').map(r=>r.team);let E;for(let i=0;i<400;i++){const fx=nextFixture();const k=rankWeek(fx.date);simFixture(fx);if(k!==S.rk.wk.k)continue;E=S.matches.at(-1);break;}
  return{same:JSON.stringify(S.rk.wk.prev.ODI.team)===JSON.stringify(before)||S.matches.at(-2).date.slice(0,10)>=S.rk.wk.k};})()`);
ok(wk.same,'a new week starts from the table at the end of the last one');
// the Rankings page
G(`go('rank')`);
ok(/Updated after every match/.test($('#view').textContent)&&/1 May/.test($('#view').textContent),'the team table explains itself');
ok($('#view').querySelectorAll('.rk-mv').length>=10,'a move column');
G(`RK_F.tab='bat';rerender()`);ok($('#view').querySelectorAll('.rk-mv').length>=10&&/since last week/.test($('#view').textContent),'players too');
// an older save: no team ratings, no releases -> worked out once from the scorecards
const snap=`JSON.stringify(['ODI','TEST','T20'].map(f=>[S.rk.icc[f],S.rk.wk.prev[f]]).concat([S.rk.wk.k,S.rk.wk.last]))`,want=G(snap);
G(`delete S.rk.icc;delete S.rk.wk;S.rkSteady=1;saveGame();`);
const st={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);st[k]=w.localStorage.getItem(k);}
w=boot(st);w.eval(`if(document.querySelector('#ti-go'))document.querySelector('#ti-go').click()`);
ok(w.eval('S.rkSteady')===2&&w.eval(snap)===want,'an older save gains the same ratings and releases');
console.log(fail?`e2e58: ${fail} failing`:'e2e58 ok');process.exit(fail?1:0);
