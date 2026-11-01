// e2e47: keepers, captains, who bowls in a Test, and Man of the Match.
//  - real Test/T20I XIs without a keeper/captain flag get the man who has kept / led most (Cape Town 2007: Karthik
//    keeps, Dravid captains - not Sehwag at 7 doing both);
//  - the keeper never bowls; the top four bowlers bowl ~88% of a Test innings (real Tests since 2002: 88.8%);
//  - Man of the Match: a hundred in each innings for the winners beats a losing all-round haul.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
w.document.querySelector('#sp-go').click();
const G=k=>w.eval(k);
const pid=n=>+G(`Object.keys(WORLD.players).find(k=>WORLD.players[k][0]===${JSON.stringify(n)})`);
// 1. Cape Town, January 2007
const ct=G(`REAL_TEST_FX.find(x=>/India tour of South Africa 2006/.test(x.title)&&x.label==='3rd Test')`);
if(ct){const ind=G(`teamShort(${ct.a})`)==='IND'?ct.a:ct.b,X=G(`testXI(${JSON.stringify(ct.f.cid)},${ind},'${ct.date}')`);
  ok(X.wk===pid('KD Karthik'),'Cape Town 2007: Karthik keeps (got '+G(`pName(${X.wk})`)+')');
  ok(X.cap===pid('R Dravid'),'Cape Town 2007: Dravid captains (got '+G(`pName(${X.cap})`)+')');}
else ok(false,'Cape Town 2007 in the calendar');
// every real XI: the keeper is a man who has kept, wherever anyone in the XI has
const kk=G(`(()=>{const R=roleIdx();let n=0,bad=0;for(const fx of[...REAL_TEST_FX,...REAL_T20_FX])for(const t of[fx.a,fx.b]){const r=realXIRow(fx.f.cid,t);if(!r)continue;
  const X=testXI(fx.f.cid,t,fx.date),any=X.bat.some(p=>(R.kept.get(p)||0)>=1);if(!any)continue;n++;if((R.kept.get(X.wk)||0)<1)bad++;}return[n,bad];})()`);
ok(kk[0]>4000&&kk[1]/kk[0]<.01,'keepers who have kept ('+kk[1]+' of '+kk[0]+' not)');
// Cricsheet's stumpings set most of them in the data (tools/cricsheet_plans.py)
ok(G(`[...REAL_TEST_FX,...REAL_T20_FX].filter(fx=>[fx.a,fx.b].every(t=>(realXIRow(fx.f.cid,t)||[])[11]>=0)).length`)>2000,'keepers recorded for most real XIs');
// real Tests and T20Is follow the real bowler of each over (tools/cricsheet_plans.py -> WORLD.tplans)
const pl=G(`(()=>{let n=0,same=0,inns=0;for(const fx of REAL_TEST_FX.filter((x,i)=>i%40===0)){const M=buildMatch(fx);if(!M.tplans)continue;doToss(M);simMatch(M);
  for(const I of M.inns){const k=M.inns.filter(J=>J.bowl===I.bowl).indexOf(I),plan=M.tplans[I.bowl]?.[k];if(!plan)continue;inns++;
    for(const o of I.overs){const p=plan[o.over-1];if(!p||!M.xi[I.bowl].bat.includes(p))continue;n++;if(o.bowler===p)same++;}}}return[inns,n,same];})()`);
ok(pl[0]>30&&pl[2]/pl[1]>.97,'real Test bowling plans followed: '+pl[2]+' of '+pl[1]+' overs in '+pl[0]+' innings');
const t2=G(`(()=>{const fx=REAL_T20_FX.find(x=>x.date>'2015');const M=buildMatch(fx);return!!(M.tplans&&M.plans[fx.a]&&M.plans[fx.a].length>=15);})()`);
ok(t2,'real T20Is carry their plans');
// 2. the keeper never bowls; part-timers are changes
const st=G(`(()=>{let tot=0,wk=0,top=0,run=0,wkt=0;for(const fx of REAL_TEST_FX.filter((x,i)=>i%20===0)){const M=buildMatch(fx);doToss(M);simMatch(M);
  for(const I of M.inns){run+=I.runs;wkt+=I.wkts;const x=M.xi[I.bowl];for(const p in I.bw)if(+p===x.wk)wk+=I.bw[p].b;
    const b=Object.values(I.bw).map(v=>v.b).sort((a,c)=>c-a),s=b.reduce((a,c)=>a+c,0);if(s>=300){tot+=s;top+=b.slice(0,4).reduce((a,c)=>a+c,0);}}}
  return{wk,top:top/tot,rpw:run/wkt};})()`);
ok(st.wk===0,'the keeper never bowls in a Test ('+st.wk+' balls)');
ok(st.top>.84&&st.top<.93,'the top four bowl '+(100*st.top).toFixed(1)+'% of a Test innings');
ok(st.rpw>27&&st.rpw<40,'Test runs per wicket '+st.rpw.toFixed(1));
const odiWk=G(`(()=>{let wk=0;for(const fx of ODI_FX.filter(x=>x.playable).filter((x,i)=>i%120===0)){const M=buildMatch(fx);doToss(M);simMatch(M);for(const I of M.inns){const x=M.xi[I.bowl];const plan=(M.plans[I.bowl]||[]);if(!plan.includes(x.wk)&&I.bw[x.wk])wk++;}}return wk;})()`);
ok(odiWk===0,'no keeper bowls in an ODI unless he really did');
// 3. Man of the Match: the screenshot - Amla 113 & 126* for the winners v Jaffer 197 & 69 and Sehwag 60, 6-179 and 8 catches for the losers
const [IND,RSA]=[G(`[...TEAMS.values()].find(t=>t.short==='IND').id`),G(`[...TEAMS.values()].find(t=>t.short==='RSA').id`)];
const ja=pid('W Jaffer'),se=pid('V Sehwag'),am=pid('HM Amla'),xi=t=>Array.from({length:11},(_,i)=>t===IND?[ja,se,...Array(9).fill(0)][i]||900+i:[am][i]||950+i);
const bt=(p,r,b,how,f)=>[p,r,b,0,0,how,0,f||0],bw=(p,balls,md,runs,wk)=>[p,balls,md,runs,wk];
const E={fmt:'TEST',teams:[IND,RSA],xi:{[IND]:xi(IND),[RSA]:xi(RSA)},result:{type:'wkts',winner:RSA},
  inns:[{bat:IND,bowl:RSA,bt:[bt(ja,197,332,'ct'),bt(se,60,87,'')],bw:[]},
        {bat:RSA,bowl:IND,bt:[bt(am,113,208,'lbw',se),...[1,2,3,4,5,6].map(i=>bt(950+i,20,40,'ct',se))],bw:[bw(se,228,9,110,5)]},
        {bat:IND,bowl:RSA,bt:[bt(ja,69,101,'ct')],bw:[]},
        {bat:RSA,bowl:IND,bt:[bt(am,126,202,''),bt(951,3,21,'ct',se)],bw:[bw(se,114,0,69,1)]}]};
ok(G(`pickMOTM(${JSON.stringify(E)})`)===am,'Amla, not Sehwag or Jaffer, is Man of the Match (got '+G(`pName(pickMOTM(${JSON.stringify(E)}))`)+')');
E.result.winner=IND;ok(G(`pickMOTM(${JSON.stringify(E)})`)!==am,'if India had won, an Indian takes it');
// over simulated matches: the award mostly goes to the winners
const mm=G(`(()=>{let n=0,los=0;for(let i=0;i<60;i++){const fx=nextFixture();simFixture(fx);const E=S.matches[S.matches.length-1];if(!E.result.winner||!E.motm)continue;n++;if(!E.xi[E.result.winner].slice(0,11).includes(E.motm))los++;}return[n,los];})()`);
ok(mm[0]>30&&mm[1]/mm[0]<.2,'Man of the Match from the losing side '+mm[1]+' of '+mm[0]);
console.log(fail?`e2e47: ${fail} failing`:'e2e47 ok');process.exit(fail?1:0);
