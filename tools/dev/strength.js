// Dev: sim every ODI once and report balance: full member v associate wins, first-innings averages by
// match type, and win% by team. node tools/dev/strength.js [dist/first-xi.html] [batColours player|position]
const {JSDOM}=require('jsdom'),fs=require('fs');
const w=new JSDOM(fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8'),{runScripts:'dangerously',url:'http://localhost/',beforeParse(w){w.FXI_NO_INIT=true;w.scrollTo=()=>{};}}).window;
console.log(w.eval(`(()=>{S=newCareer();S.settings.batColours=${JSON.stringify(process.argv[3]||'player')};
for(const fx of allFixtures())if(fx.playable&&fx.fmt==='ODI')simFixture(fx);
const full=new Set(WORLD.teams.filter(t=>t.full).map(t=>t.id));let fa=0,fw=0;const inn={ff:[],fa:[],af:[],aa:[]};
for(const E of S.matches){const[a,b]=E.teams;if(full.has(a)!==full.has(b)){fa++;const f=full.has(a)?a:b;if(E.result.winner===f)fw++;}
  const I=E.inns[0];inn[(full.has(I.bat)?'f':'a')+(full.has(I.bowl)?'f':'a')].push(I.runs);}
const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):'-';
const T=Object.entries(S.teams.ODI).filter(([t,x])=>x.p>=40).map(([t,x])=>[teamShort(+t),Math.round(100*x.w/x.p)]).sort((a,b)=>b[1]-a[1]);
return 'full member v associate: '+fa+' games, full members won '+(100*fw/fa).toFixed(0)+'%'+
 '\\n1st-innings avg  full v full '+avg(inn.ff)+' | full v assoc '+avg(inn.fa)+' | assoc v full '+avg(inn.af)+' | assoc v assoc '+avg(inn.aa)+
 '\\nwin% by team: '+T.map(x=>x.join(' ')).join(', ');})()`));
