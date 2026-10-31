// e2e43 (a real browser, via Playwright; skipped where it isn't installed): saves go to IndexedDB, gzipped, in the
// background - fast on a long career, nothing left in localStorage but the summaries, back after a reload; an
// old localStorage save moves across on the first start.
const path=require('path'),fs=require('fs');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('e2e43 skipped (no Playwright)');process.exit(0);}
const file='file://'+path.resolve(process.argv[2]||'dist/first-xi.html');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
(async()=>{
  let b;try{b=await chromium.launch();}catch(e){console.log('e2e43 skipped (no browser)');process.exit(0);}
  const ctx=await b.newContext(),p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('PAGE ERROR',e.message);});
  await p.goto(file);await p.waitForSelector('#sp-go');
  ok(await p.evaluate(()=>STORE.ok),'IndexedDB in use');
  await p.click('#sp-go');
  const r=await p.evaluate(async()=>{for(let i=0;i<1200;i++){const fx=nextFixture();if(!fx)break;simFixture(fx);}
    const t=performance.now();saveGame();const dt=performance.now()-t;await storeFlush();
    return{dt,n:S.matches.length,ls:localStorage.getItem('fxi_save_1'),meta:!!localStorage.getItem('fxi_save_1_meta')};});
  ok(r.dt<1500,'saving '+r.n+' matches returns in '+Math.round(r.dt)+'ms');
  ok(!r.ls&&r.meta,'only the summary in localStorage');
  await p.reload();await p.waitForSelector('#title-screen');
  ok(await p.evaluate(()=>S&&S.matches.length),'the career comes back after a reload ('+r.n+')');
  ok((await p.evaluate(()=>S.matches.length))===r.n,'all of it');
  // an old localStorage save moves across
  const old=await p.evaluate(()=>{const d=JSON.parse(storeGet(SLOT_KEYS[0]));d.name='Old save';return lzPack(JSON.stringify(d));});
  const p2=await (await b.newContext()).newPage();
  await p2.goto(file);await p2.evaluate(o=>{localStorage.setItem('fxi_save_2',o);},old);
  await p2.reload();await p2.waitForSelector('#title-screen');
  const m=await p2.evaluate(()=>({ls:localStorage.getItem('fxi_save_2'),idb:storeHas('fxi_save_2'),name:readSlot(1)&&readSlot(1).name}));
  ok(!m.ls&&m.idb&&m.name==='Old save','an old localStorage save moves into IndexedDB');
  await b.close();
  console.log(fail?`e2e43: ${fail} failing`:'e2e43 ok');process.exit(fail?1:0);
})();
