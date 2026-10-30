// e2e39: associate tiers - the weakest associates bat a colour lower against Test nations only (by era), win
// a few in a hundred against them, play other associates as before, and Settings can switch it off.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
ok(G(`weakAssoc(18,'2003-02-20')&&weakAssoc(12,'2011-01-01')&&!weakAssoc(12,'2003-02-20')&&weakAssoc(13,'2005-01-01')&&!weakAssoc(13,'2011-01-01')&&!weakAssoc(14,'2011-01-01')`),'the tiers by era: Namibia, Kenya from 2008, Ireland before 2007, not the Netherlands');
// colours: a Namibian opener is a colour lower against Test nations, the same against associates
const col=G(`(()=>{const d='2003-02-20',p=nearestXI(18,d).bat[0],M=t=>({teams:[18,t],date:d,batMode:'player',mods:{bat:{}}});
  return[batColour(M(4),p,1,4),batColour(M(14),p,1,14),batColour({...M(4),assocTiers:false},p,1,4)];})()`);
ok(col[0]==='R'&&col[1]==='B'&&col[2]==='G','Namibia\'s opener: RED v England, BLUE v the Netherlands, GREEN with tiers off ('+col.join(',')+')');
const rate=(a,b,d,n)=>G(`(()=>{let wn=0,t=0;for(let i=0;i<${n};i++){const M=buildMatch({fmt:'ODI',custom:true,a:${a},b:${b},date:'${d}',venue:'X',city:'',title:'t',key:'r${a}${b}'+i});M.sim=true;M.friendly=true;doToss(M);simMatch(M);if(!M.result.winner)continue;t++;if(M.result.winner===${a})wn++;}return wn/t;})()`);
const nzim=rate(18,10,'2003-02-20',120);ok(nzim<=.08,'Namibia v Zimbabwe: '+Math.round(100*nzim)+'%');
const nned=rate(18,14,'2003-02-20',120);ok(nned>=.25,'Namibia v the Netherlands still a contest: '+Math.round(100*nned)+'%');
const ire=rate(13,11,'2007-03-17',120);ok(ire>=.04,'Ireland 2007 v Bangladesh can win: '+Math.round(100*ire)+'%');
w.go('settings');$('[data-set="assocTiers"][data-val="off"]').click();
ok(G(`S.settings.assocTiers`)==='off'&&G(`buildMatch({fmt:'ODI',custom:true,a:18,b:10,date:'2003-02-20',venue:'X',city:'',title:'t',key:'off'}).assocTiers`)===false,'switched off for new matches');
const off=rate(18,10,'2003-02-20',120);ok(off>nzim,'and Namibia win more often without it: '+Math.round(100*off)+'%');
console.log(fail?`e2e39: ${fail} failing`:'e2e39 ok');
process.exit(fail?1:0);
