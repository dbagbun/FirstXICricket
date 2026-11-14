// e2e52: realism of the real matches.
//  - bowler quality and wickets (03-engine BOWL_EDGE): over real ODIs with the real plans, the best-rated bowlers take
//    their wickets cheapest and the part-timers dearest, as in the real figures - the workbook's own rule (Settings
//    'Workbook only') has it the other way round;
//  - batting order: a Test nightwatchman or injured opener goes back to his usual slot (battingOrder);
//  - the real XIs and bowling plans are used as they were.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k);
w.document.querySelector('#sp-go').click();
// bowling by rating over the same real ODIs, with and without the rule
const byRating=edge=>G(`(()=>{S.settings.bowlEdge='${edge}';const by={},n={W:0,N:0};
  for(const fx of ODI_FX.filter((x,i)=>x.playable&&x.date<'2006'&&i%2===0)){const M=buildMatch(fx);doToss(M);simMatch(M);n.N++;n.W+=M.inns[0].wkts;
    for(const I of M.inns)for(const p in I.bw){const r=Math.min(5,pAttr(+p,M.date).rating),b=by[r]=by[r]||[0,0,0];b[0]+=I.bw[p].b;b[1]+=I.bw[p].r;b[2]+=I.bw[p].w;}}
  const avg=r=>by[r]?by[r][1]/Math.max(1,by[r][2]):0;return{a1:avg(1),a2:avg(2),a3:avg(3),a4:avg(4),a5:avg(5),w:n.W/n.N};})()`);
const on=byRating('on'),off=byRating('off');
ok(on.a1<on.a3&&on.a3<on.a5,'real-life: averages rise from elite to part-timer ('+[on.a1,on.a3,on.a5].map(x=>x.toFixed(1)).join(' / ')+')');
ok(on.a5>on.a1*1.4,'part-timers pay ~twice as much per wicket as the best ('+on.a5.toFixed(1)+' v '+on.a1.toFixed(1)+')');
ok(off.a1>off.a5,'workbook only: the old way round ('+off.a1.toFixed(1)+' v '+off.a5.toFixed(1)+')');
ok(on.w>6.5&&on.w<8.5,'wickets in a first innings still '+on.w.toFixed(2));
G(`S.settings.bowlEdge='on'`);
ok(G(`buildMatch(ODI_FX.find(x=>x.playable)).bowlEdge`)===true,'matches carry the setting');
// batting order: Drakes was a nightwatchman at 4 in Antigua 2003; Gayle came in at 9 at Johannesburg 2003
const ord=d=>G(`(()=>{const fx=REAL_TEST_FX.find(x=>x.date==='${d}'&&[x.a,x.b].some(t=>teamShort(t)==='WI'));const t=[fx.a,fx.b].find(t=>teamShort(t)==='WI');return buildMatch(fx).xi[t].bat.map(pName);})()`);
const a=ord('2003-05-09'),b=ord('2003-12-12');
ok(a.indexOf('VC Drakes')>=6,'Drakes no longer bats 4 (now '+(a.indexOf('VC Drakes')+1)+')');
ok(b.indexOf('CH Gayle')<=1,'Gayle opens again (now '+(b.indexOf('CH Gayle')+1)+')');
ok(G(`(()=>{const fx=REAL_T20_FX[5];return JSON.stringify(buildMatch(fx).xi[fx.a].bat)===JSON.stringify(testXI(fx.f.cid,fx.a,fx.date).bat);})()`),'a T20I keeps its real order');
// the real XIs and bowling plans
const r=G(`(()=>{let x=0,n=0,o=0,on=0;for(const fx of ODI_FX.filter((f,i)=>f.playable&&i%40===0)){const M=buildMatch(fx);for(const t of M.teams){n++;if(JSON.stringify(M.xi[t].bat)===JSON.stringify(fixtureXI(fx.f.cid,t).bat))x++;}
  doToss(M);simMatch(M);for(const I of M.inns){const P=M.plans[I.bowl]||[];for(const v of I.overs){const p=P[v.over-1];if(p){on++;if(v.bowler===p)o++;}}}}return[x,n,o,on];})()`);
ok(r[0]===r[1],'ODI XIs and batting orders as they were ('+r[0]+'/'+r[1]+')');
ok(r[2]/r[3]>.99,'the real bowler bowls the over ('+r[2]+'/'+r[3]+')');
console.log(fail?`e2e52: ${fail} failing`:'e2e52 ok');process.exit(fail?1:0);
