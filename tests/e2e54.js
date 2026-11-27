// e2e54: catches add up. A catch in the field (ct) and a catch as the keeper (ctk) are kept apart in the stats, as the
// records keep them; bowled / lbw carry no fielder; the records' Most catches equals the players' Ct and Most
// keeping dismissals their WkCt + St; keeping dismissals have their own milestone; an older save is recounted once.
// The "nth player to get there": the first 10 at every milestone.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
let w=boot();const G=k=>w.eval(k);
w.document.querySelector('#sp-go').click();
G(`for(let i=0;i<500;i++)simFixture(nextFixture())`);
ok(G(`S.matches.every(E=>E.inns.every(I=>I.bt.every(r=>!(r[5]==='b'||r[5]==='lbw')||!r[7])))`),'no fielder on a bowled or lbw');
const cmp=G(`(()=>{const out=[];for(const f of['ODI','TEST']){const D=recordsData(f),ST=S.stats[f];
  for(const x of D.ct)out.push([f,'ct',pName(x.pid),x.v,ST[x.pid].ct]);
  for(const x of D.wkd)out.push([f,'wk',pName(x.pid),x.v,(ST[x.pid].ctk||0)+ST[x.pid].st]);}return out;})()`);
const bad=cmp.filter(x=>x[3]!==x[4]);
ok(cmp.length>30&&!bad.length,'the records match the players\' stats ('+cmp.length+' checked'+(bad.length?'; '+bad.slice(0,3).map(x=>x.join(' ')).join(' | '):'')+')');
ok(G(`Object.values(S.stats.ODI).some(s=>s.ctk>20)`),'keepers have catches as keeper');
const wk=G(`(()=>{const D=recordsData('ODI'),ST=S.stats.ODI;return{list:D.wkct.map(x=>[x.v,ST[x.pid].ctk]),sorted:D.wkct.every((x,i,a)=>!i||a[i-1].v>=x.v)};})()`);
ok(wk.list.length>=5&&wk.list.every(([a,b])=>a===b)&&wk.sorted,'Most catches (wicketkeeper): the keepers\' WkCt, top first');
G(`openPlayer(${G(`recordsData('ODI').ro[0].pid`)})`);ok(/RO/.test(w.document.querySelector('#modal-box').textContent),'the player page shows run outs');G(`closeModal()`);
ok(G(`S.ms.some(m=>m.cat==='Keeping dismissals')`),'keeping dismissals milestones');
// the order: only for the big milestones
ok(G(`S.ms.filter(m=>/player to get there/.test(m.text)).every(m=>m.nth<=10)`),'the order for the first 10');
ok(G(`S.ms.filter(m=>m.cat==='Career Catches'&&m.thr===25).every(m=>/player to get there/.test(m.text)===(m.nth<=10))`),'25 catches: the first ten told, not the 11th');
// an older save: catches as keeper counted in with the rest, no ctk, no ctSplit
const want=G(`(()=>{const o={};for(const f of['ODI','TEST'])for(const[p,s]of Object.entries(S.stats[f]))o[f+p]=[s.ct,s.ctk];return o;})()`);
G(`for(const f of FORMATS)for(const s of Object.values(S.stats[f]||{})){s.ct+=s.ctk||0;delete s.ctk;}delete S.ctSplit;
  for(const k of Object.keys(S.msKeys))if(k.includes('Keeping dismissals'))delete S.msKeys[k];S.ms=S.ms.filter(m=>m.cat!=='Keeping dismissals');delete S.msN;saveGame();`);
const st={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);st[k]=w.localStorage.getItem(k);}
w=boot(st);w.eval(`if(document.querySelector('#ti-go'))document.querySelector('#ti-go').click()`);
const got=w.eval(`(()=>{const o={};for(const f of['ODI','TEST'])for(const[p,s]of Object.entries(S.stats[f]))o[f+p]=[s.ct,s.ctk];return o;})()`);
ok(Object.keys(want).every(k=>JSON.stringify(want[k])===JSON.stringify(got[k])),'an older save is recounted to the same split');
ok(w.eval('S.ctSplit')===1&&w.eval(`S.ms.every(m=>m.cat!=='Keeping dismissals')`)&&w.eval(`Object.keys(S.msKeys).some(k=>k.includes('Keeping dismissals'))`),'keeping milestones already passed are marked, not back-dated');
console.log(fail?`e2e54: ${fail} failing`:'e2e54 ok');process.exit(fail?1:0);
