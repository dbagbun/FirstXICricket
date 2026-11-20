// e2e57: steadier player rankings (07b RANK_CFG). One big score no longer takes a man from 11th to 1st: each match moves
// the average by RANK_CFG.alpha, the zero start is corrected and newcomers are held back until RANK_CFG.ramp matches;
// a save from before is recounted once (rankSteady) without touching team ratings or awards.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
let w=boot();const G=k=>w.eval(k);
w.document.querySelector('#sp-go').click();
ok(G('S.rkSteady')===2,'a new career is already at the new weight');
G(`for(let i=0;i<600;i++)simFixture(nextFixture())`);
// how far the top 20 ODI batters move after an innings
const m=G(`(()=>{const mv=[];let top3=0;
  for(let i=0;i<500&&mv.length<300;i++){const fx=nextFixture();if(fx.fmt!=='ODI'){simFixture(fx);continue;}
    const a=playerRanking('ODI','bat',300).map(r=>r.pid);simFixture(fx);const b=playerRanking('ODI','bat',300).map(r=>r.pid);
    const E=S.matches[S.matches.length-1];for(const t of E.teams)for(const p of E.xi[t].slice(0,7)){const x=a.indexOf(p)+1,y=b.indexOf(p)+1;
      if(!x||!y||x>20)continue;mv.push(Math.abs(x-y));if(y<=3&&x>=10)top3++;}}
  mv.sort((p,q)=>p-q);return{n:mv.length,med:mv[mv.length>>1],big:mv.filter(x=>x>=5).length/mv.length,top3};})()`);
ok(m.n>=100,'enough innings by top-20 batters ('+m.n+')');
ok(m.med<=3,'a top-20 batter usually moves a place or two (median '+m.med+')');
ok(m.big<.35,'few move 5+ places ('+(100*m.big).toFixed(0)+'%)');
ok(m.top3<=8,'10th or lower to the top 3 in one go is rare ('+m.top3+'; about 25 at the old weight)');
// the hold-back: the same average counts for less until a proper record
ok(G(`(()=>{const p=40,v=n=>rankVal({p:p*(1-Math.pow(1-RANK_CFG.alpha,n)),n},'ODI');return v(5)<v(10)&&v(10)<v(20)&&Math.abs(v(20)-p)<1e-9&&Math.abs(v(40)-p)<1e-9;})()`),'newcomers held back until 20 ODIs, then the plain average');
ok(G(`rankVal({p:10,n:10},'TEST')>rankVal({p:10*(1-Math.pow(.95,10)),n:10},'ODI')`),'a Test record counts sooner (10 matches)');
// an older save: averages built at the old weight are recounted once
const want=G(`JSON.stringify({bat:S.rk.bat,bowl:S.rk.bowl})`),team=G(`JSON.stringify([S.rk.team,S.rk.awards])`);
G(`for(const k of['bat','bowl'])for(const f of FORMATS)for(const x of Object.values(S.rk[k][f]))x.p*=1.7;delete S.rkSteady;saveGame();`);
const st={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);st[k]=w.localStorage.getItem(k);}
w=boot(st);w.eval(`if(document.querySelector('#ti-go'))document.querySelector('#ti-go').click()`);
ok(w.eval('S.rkSteady')===2,'the save is marked');
ok(w.eval(`JSON.stringify({bat:S.rk.bat,bowl:S.rk.bowl})`)===want,'player averages recounted from the scorecards');
ok(w.eval(`JSON.stringify([S.rk.team,S.rk.awards])`)===team,'team ratings and awards untouched');
console.log(fail?`e2e57: ${fail} failing`:'e2e57 ok');process.exit(fail?1:0);
