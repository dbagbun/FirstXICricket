// e2e40: stumpings - the workbook cards have none, so keepers' wickets off spinners become stumpings part of the
// time: they happen in ODIs and Tests, only off spin, the keeper gets the credit, and they reach the records.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`for(let i=0;i<150;i++)simFixture(nextFixture())`);
const r=JSON.parse(G(`(()=>{let st=0,all=0,spin=0,wk=0;for(const E of S.matches)for(const I of E.inns)for(const b of I.bt){if(!b[5])continue;all++;if(b[5]==='st'){st++;if(pAttr(b[6],E.date).style==='S')spin++;if(b[7]===E.xi[I.bowl][11])wk++;}}return JSON.stringify({st,all,spin,wk});})()`));
ok(r.st>0,'stumpings happen in ODIs: '+r.st+' of '+r.all+' dismissals');
ok(r.st/r.all>=.01&&r.st/r.all<=.05,'a realistic share: '+(100*r.st/r.all).toFixed(1)+'%');
ok(r.spin===r.st,'all off spinners');
ok(r.wk===r.st,'all credited to the keeper');
const keeperSt=G(`Object.values(S.stats.ODI).reduce((a,s)=>a+s.st,0)`);ok(keeperSt===r.st,'in the fielding stats ('+keeperSt+')');
console.log(fail?`e2e40: ${fail} failing`:'e2e40 ok');
process.exit(fail?1:0);
