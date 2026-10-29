// e2e2: a whole career - every ODI 2002-2026 plus a Test series a year - then save size, reload,
// records and every screen on a full archive.
const {JSDOM}=require('jsdom'),fs=require('fs');
const file=process.argv[2]||'dist/first-xi.html';
const html=fs.readFileSync(file,'utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
    w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const w=boot(),G=k=>w.eval(k);
w.document.querySelector('#sp-go').click();
const t0=Date.now();
G(`for(let y=2003;y<=2025;y++)createTestSeries({a:TEST_TEAMS[y%TEST_TEAMS.length],b:TEST_TEAMS[(y*3+1)%TEST_TEAMS.length]===TEST_TEAMS[y%TEST_TEAMS.length]?TEST_TEAMS[(y+2)%TEST_TEAMS.length]:TEST_TEAMS[(y*3+1)%TEST_TEAMS.length],n:3,start:y+'-07-15'})`);
const n=G(`(()=>{let n=0;for(const fx of allFixtures())if(fx.playable&&!S.done[fx.key]){simFixture(fx);n++;}return n;})()`);
const secs=(Date.now()-t0)/1000;
console.log(`simmed ${n} matches in ${secs.toFixed(0)}s`);
ok(n>2500,'whole career simmed');
ok(!G('nextFixture()'),'nothing left to play');
ok(G(`S.matches.filter(m=>m.fmt==='TEST').length`)===69,'all Tests played');
ok(G('saveGame()'),'career saves');
const raw=w.localStorage.getItem('fxi_save_1');
console.log(`save ${(raw.length/1024).toFixed(0)}K chars (json ${(G('JSON.stringify(S).length')/1024).toFixed(0)}K)`);
ok(raw.length<4.5e6,'save fits in localStorage');
// sanity of the whole archive
const bad=G(`S.matches.filter(E=>E.inns.some(I=>I.runs!==I.bt.reduce((a,r)=>a+r[1],0)+I.ex.reduce((a,b)=>a+b,0)||I.bw.reduce((a,b)=>a+b[1],0)!==I.lb)).length`);
ok(bad===0,'every scorecard adds up ('+bad+' bad)');
ok(G(`S.matches.filter(E=>E.fmt==='ODI').every(E=>E.inns.every(I=>I.lb<=300&&I.bw.every(b=>b[1]<=60)))`),'ODI over limits respected');
ok(G(`S.matches.filter(E=>E.fmt==='TEST').every(E=>E.inns.length<=4)`),'Tests have at most four innings');
const r=G(`(()=>{const D=recordsData('ODI');return{runs:D.runs[0],hs:D.hs[0],wk:D.wkts[0],tot:D.tot[0],low:D.low[0],p:D.part[0]};})()`);
console.log('ODI records:',JSON.stringify(r));
ok(r.runs&&r.runs.v>5000,'a 5,000-run ODI career exists');
ok(r.tot&&r.tot.v<550&&r.low&&r.low.v>=20,'team totals plausible');
const ms=G('S.ms.length');console.log('milestones',ms);ok(ms>300,'milestones logged');
ok(G(`new Set(S.ms.map(m=>m.fmt+m.pid+m.cat+m.thr)).size===S.ms.length`),'no milestone awarded twice');
// tournaments: every edition table renders
for(const v of['home','fixtures','tour','records','players','history','miles','settings']){w.go(v);ok(!w.document.querySelector('#view').innerHTML.includes('Something went wrong'),'view '+v);}
const tourErr=G(`TOURNEYS.filter(s=>{try{go('tour',s.sid);return document.querySelector('#view').innerHTML.includes('Something went wrong');}catch(e){return true;}}).map(s=>s.title)`);
ok(tourErr.length===0,'every tournament centre renders '+tourErr.join(', '));
const wc=G(`S.matches.filter(m=>m.stage==='Final'&&/World Cup/.test(m.series)&&!/Qualifier|League/.test(m.series)).map(m=>m.series+': '+teamName(m.result.winner))`);
console.log(wc.join('\n'));
// reload
const t1=Date.now();
const w2=boot({fxi_save_1:raw,fxi_slot:'0'});
console.log(`reload ${(Date.now()-t1)}ms`);
ok(w2.eval('S.matches.length')===G('S.matches.length'),'reload keeps the whole career');
w2.eval('rebuildStats()');
ok(w2.eval('S.stats.ODI['+r.runs.pid+'].r')===r.runs.v,'rebuilt stats match');
console.log(fail?`e2e2: ${fail} failing`:'e2e2 ok');
process.exit(fail?1:0);
