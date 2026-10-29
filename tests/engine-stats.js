// Engine sanity: simulate real fixtures (ODI) and Tests headless and print scoring/wicket distributions.
// node tests/engine-stats.js [nODI] [nTest]
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const ctx={console,Math,Date,JSON,Map,Set,isFinite,String,Number,Array,Object,parseInt};vm.createContext(ctx);
vm.runInContext('const WORLD='+fs.readFileSync(path.join(root,'data/world.json'),'utf8')+';',ctx);
for(const f of['01-util.js','02-world.js','03-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,'src/js',f),'utf8').replace("'use strict';",''),ctx);
const nO=+process.argv[2]||400,nT=+process.argv[3]||150;
const out=vm.runInContext(`(function(nO,nT){
  const st={odi:{inn1:[],inn2:[],wk1:[],chaseW:0,n:0,ties:0,top:[],fifties:0,hundreds:0,ext:0,ov:[]},test:{inns:[],res:{},n:0,overs:[],decl:0,fo:0,hundreds:0}};
  const fx=FIX.filter(f=>WORLD.xi[f.cid]&&Object.keys(WORLD.xi[f.cid]).length===2);
  for(let k=0;k<nO;k++){
    const f=fx[Math.floor(Math.random()*fx.length)];
    const M=newMatch({fmt:'ODI',a:f.a,b:f.b,date:f.date,cid:f.cid,xiA:fixtureXI(f.cid,f.a),xiB:fixtureXI(f.cid,f.b)});
    doToss(M);simMatch(M);
    const [a,b]=M.inns;st.odi.n++;st.odi.inn1.push(a.runs);st.odi.wk1.push(a.wkts);st.odi.inn2.push(b.runs);st.odi.ov.push(a.lb/6);
    if(M.result.type==='wkts')st.odi.chaseW++;if(M.result.type==='tie')st.odi.ties++;
    for(const I of M.inns){st.odi.ext+=I.ex.b+I.ex.lb+I.ex.wd+I.ex.nb;for(const p in I.bt){const r=I.bt[p].r;if(r>=100)st.odi.hundreds++;else if(r>=50)st.odi.fifties++;}
      st.odi.top.push(I.bt[I.order[0]].r);}
  }
  const full=[1,3,4,5,6,7,8,9];
  for(let k=0;k<nT;k++){
    const a=full[Math.floor(Math.random()*8)];let b=a;while(b===a)b=full[Math.floor(Math.random()*8)];
    const d='2010-06-01';
    const M=newMatch({fmt:'TEST',a,b,date:d,xiA:nearestXI(a,d),xiB:nearestXI(b,d)});
    doToss(M);simMatch(M);st.test.n++;
    for(const I of M.inns){st.test.inns.push(I.runs);if(I.why==='declared')st.test.decl++;for(const p in I.bt)if(I.bt[p].r>=100)st.test.hundreds++;}
    st.test.overs.push(testBallsBowled(M)/6);if(M.followOn)st.test.fo++;
    st.test.res[M.result.type]=(st.test.res[M.result.type]||0)+1;
  }
  return st;})(${nO},${nT})`,ctx);
const avg=a=>(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1),q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(p*(s.length-1))];};
const o=out.odi;
console.log(`ODI x${o.n}: inn1 avg ${avg(o.inn1)} (p10 ${q(o.inn1,.1)}, p90 ${q(o.inn1,.9)}), wkts ${avg(o.wk1)}, overs ${avg(o.ov)}; inn2 avg ${avg(o.inn2)}; chasing wins ${(100*o.chaseW/o.n).toFixed(0)}%, ties ${o.ties}`);
console.log(`     per match: 50s ${(o.fifties/o.n).toFixed(2)}, 100s ${(o.hundreds/o.n).toFixed(2)}, extras ${(o.ext/o.n).toFixed(1)}, opener avg ${avg(o.top)}`);
const t=out.test;
console.log(`TEST x${t.n}: innings avg ${avg(t.inns)} (p10 ${q(t.inns,.1)}, p90 ${q(t.inns,.9)}), overs/match ${avg(t.overs)}, results ${JSON.stringify(t.res)}, follow-ons ${t.fo}, declarations ${t.decl}, 100s/match ${(t.hundreds/t.n).toFixed(2)}`);
