// e2e63: the ODI colour blend (03-engine batColour, ODI_LEVEL, WORLD.oavg from tools/odi_averages.py): a batter whose
// real ODI average sits between two colours plays some innings as each, so over time he averages what he really did;
// the top order no longer all play BLUE (real top six average 34), a 24-average No.7 isn't always GREEN. Settings ->
// "Colours only" puts the old rules back; players with no real record keep the colour rules.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
ok(G(`Object.keys(WORLD.oavg).length>700`),'real era averages in the data');
ok(G(`S.settings.odiBlend`)==='on','on in a new career');
// colours over many innings for three kinds of batter, against the same side
const share=(name,date,pos,blend)=>G(`(()=>{const p=+Object.keys(WORLD.players).find(k=>WORLD.players[k][0]===${JSON.stringify(name)});
  const n={B:0,G:0,R:0};for(let i=0;i<400;i++){const M={id:'x'+i,fmt:'ODI',date:'${date}',teams:[3,4],inns:[],mods:{bat:{}},odiBlend:${blend}};n[batColour(M,p,${pos},4)]++;}
  return{avg:odiAvgAt(p,'${date}'),...n};})()`);
const top=share('MS Dhoni','2008-06-01',5,true);          // real average ~44-47: BLUE nearly always
ok(top.avg>=40&&top.B>=380,'a 45-average batter plays BLUE ('+JSON.stringify(top)+')');
const mid=G(`(()=>{for(const k in WORLD.oavg){const L=WORLD.oavg[k],e=L.find(e=>e[0]===2010);if(e&&e[1]>=25&&e[1]<=29&&WORLD.players[k][5]&&WORLD.players[k][5][0]!=='R')return WORLD.players[k][0];}return null;})()`);
const m=share(mid,'2010-06-01',3,true);
ok(m.B>80&&m.G>80&&m.B+m.G>=390,'a '+m.avg+'-average No.3 ('+mid+') plays BLUE some innings, GREEN others ('+JSON.stringify(m)+')');
const off=share(mid,'2010-06-01',3,false);
ok(off.B===400,'with the blend off he is BLUE every time at 3 (the position lift) ('+JSON.stringify(off)+')');
// one colour all innings long, and the same on a replay
ok(G(`(()=>{const p=+Object.keys(WORLD.oavg)[5],M={id:'abc',fmt:'ODI',date:'2010-06-01',teams:[3,4],inns:[{}],mods:{bat:{}}};const c=batColour(M,p,3,4);return[1,2,3,4].every(()=>batColour(M,p,3,4)===c);})()`),'the same colour all innings');
// a player with no real record keeps the colour rules
ok(G(`(()=>{const ks=Object.keys(WORLD.players).filter(k=>!WORLD.oavg[k]).slice(0,300),M=b=>({id:'q',fmt:'ODI',date:'2010-06-01',teams:[3,4],inns:[],mods:{bat:{}},odiBlend:b});
  return ks.every(k=>[1,3,7,9,11].every(pos=>batColour(M(true),+k,pos,4)===batColour(M(false),+k,pos,4)));})()`),'no real record: exactly the colour rules as before');
// over real ODIs the top six average near the real 34 (it was ~39)
const sim=G(`(()=>{let r=0,o=0;const L=ODI_FX.filter(x=>x.playable&&!EXTRA_FX.includes(x.key)&&x.date>'2004');for(let i=0;i<120;i++){const fx=L[(i*37)%L.length];const M=buildMatch(fx);M.sim=true;doToss(M);simMatch(M);
  for(const I of M.inns)I.order.slice(0,6).forEach(p=>{const b=I.bt[p];if(b){r+=b.r;if(b.out)o++;}});}return r/o;})()`);
ok(sim>30&&sim<38,'top six average '+sim.toFixed(1)+' over 120 real ODIs (real 34)');
// the setting reaches the match
G(`S.settings.odiBlend='off'`);ok(G(`buildMatch(ODI_FX.find(x=>x.playable)).odiBlend`)===false,'Settings -> Colours only reaches the match');
console.log(fail?`e2e63: ${fail} failing`:'e2e63 ok');process.exit(fail?1:0);
