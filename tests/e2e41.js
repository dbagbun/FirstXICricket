// e2e41: ODI tempo - powerplay, wickets in hand late on and the era move points onto RR_5/RR_6 (never RR_7, the
// wicket card), so full members score ~245 for ~7 wickets in 2004 instead of batting out 50 overs for 210/3.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
// the point moves
const pts=JSON.parse(G(`(()=>{const mk=(d)=>{const M=newMatch({fmt:'ODI',a:1,b:3,date:d,xiA:nearestXI(1,d),xiB:nearestXI(3,d)});doToss(M);M.state='live';return M;};
  const M=mk('2004-01-20'),I=curInn(M),base=()=>[35,30,20,10,4,1];
  const pp=odiTempo(M,base());I.lb=25*6;const mid=odiTempo(M,base());I.lb=42*6;I.wkts=2;const late=odiTempo(M,base());I.wkts=8;const lateW=odiTempo(M,base());
  const M2=mk('2018-01-20');curInn(M2).lb=25*6;const mid18=odiTempo(M2,base());
  return JSON.stringify({pp,mid,late,lateW,mid18});})()`));
const sum=a=>a.reduce((x,y)=>x+y,0);
ok(Object.values(pts).every(W=>sum(W)===100&&W[5]===1),'weights stay 100 and RR_7 is never touched');
ok(pts.pp[0]<pts.mid[0]&&pts.pp[4]>pts.mid[4],'the powerplay moves points onto RR_6');
ok(pts.late[4]>pts.lateW[4],'wickets in hand late on: more RR_6');
ok(pts.mid18[4]>pts.mid[4],'later eras score faster');
// the outcome
const r=JSON.parse(G(`(()=>{let R=0,K=0,n=0;const pairs=[[1,3],[3,1],[5,6],[4,9]];for(let i=0;i<120;i++){const[a,b]=pairs[i%4];const M=buildMatch({fmt:'ODI',custom:true,a,b,date:'2004-01-20',venue:'X',city:'',title:'t',key:'t'+i});M.sim=true;M.friendly=true;M.noWeather=true;doToss(M);simMatch(M);const I=M.inns[0];R+=I.runs;K+=I.wkts;n++;}return JSON.stringify({runs:R/n,wk:K/n});})()`));
ok(r.runs>=232&&r.runs<=262,'2004 full v full first innings: '+r.runs.toFixed(0));
ok(r.wk>=6&&r.wk<=8,'for '+r.wk.toFixed(1)+' wickets');
console.log(fail?`e2e41: ${fail} failing`:'e2e41 ok');
process.exit(fail?1:0);
