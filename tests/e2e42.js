// e2e42: the title screen - continue the last career, load another save, or start a new career in a chosen slot
// (an occupied slot is wiped after a warning); Settings can skip it.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
let confirms=0;
const boot=(store,conf=true)=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>{confirms++;return conf;};w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const dump=w=>{const s={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);s[k]=w.localStorage.getItem(k);}return s;};
// first launch: the new-career form
let w=boot();
ok(w.document.querySelector('#sp-go')&&!w.document.querySelector('#title-screen'),'first launch: new career');
w.document.querySelector('#sp-name').value='Alpha';w.document.querySelector('#sp-team').value='4';w.document.querySelector('#sp-go').click();
w.eval(`for(let i=0;i<20;i++)simFixture(nextFixture());saveGame()`);
// relaunch: the title screen with Continue
w=boot(dump(w));const $=s=>w.document.querySelector(s);
ok($('#title-screen')&&/Alpha/.test($('#title-screen').textContent)&&/Following England · 20 matches/.test($('#title-screen').textContent),'the title screen shows the save');
ok($('#nav').innerHTML==='','no menu on the title screen');
ok(w.eval('S&&S.matches.length')===20,'the career is loaded behind it');
$('#ti-go').click();ok(w.eval('VIEW')==='home'&&$('#nav').innerHTML!=='','Continue opens the dashboard');
// a second career in an empty slot
w=boot(dump(w));w.document.querySelector('#ti-new').click();
ok(w.document.querySelector('#sp-slot').value==='1'&&!/wipes/.test(w.document.querySelector('#sp-warn').textContent),'New career defaults to an empty slot');
w.document.querySelector('#sp-name').value='Bravo';w.document.querySelector('#sp-go').click();
ok(w.eval('SLOT')===1&&w.eval('S.name')==='Bravo'&&w.eval('S.matches.length')===0,'Bravo starts fresh in slot 2');
w.eval(`simFixture(nextFixture());saveGame()`);
// relaunch: Bravo continues, Alpha is listed
w=boot(dump(w));
ok(/Bravo/.test(w.document.querySelector('#title-screen h2').textContent)&&w.document.querySelector('[data-ti="0"]'),'the last career continues, the other is listed');
w.document.querySelector('[data-ti="0"]').click();ok(w.eval('S.name')==='Alpha'&&w.eval('SLOT')===0,'load the other');
// start fresh over Alpha: warned, confirmed, wiped
w=boot(dump(w));w.document.querySelector('#ti-new').click();
const sel=w.document.querySelector('#sp-slot');sel.value='0';sel.dispatchEvent(new w.Event('change'));
ok(/wipes "Alpha" - its 20 matches/.test(w.document.querySelector('#sp-warn').textContent),'a warning before wiping a save');
confirms=0;w.document.querySelector('#sp-name').value='Charlie';w.document.querySelector('#sp-go').click();
ok(confirms===1&&w.eval('S.name')==='Charlie'&&w.eval('S.matches.length')===0&&w.eval('SLOT')===0,'Alpha wiped, Charlie starts from scratch');
ok(JSON.parse(w.localStorage.getItem('fxi_save_1_meta')).name==='Charlie'&&w.eval('Object.keys(S.stats.ODI).length')===0,'stats and summary reset');
// declining the confirm keeps it
const st=dump(w);const w3=boot(st,false);w3.document.querySelector('#ti-new').click();const s3=w3.document.querySelector('#sp-slot');s3.value='0';s3.dispatchEvent(new w3.Event('change'));
w3.document.querySelector('#sp-go').click();ok(JSON.parse(w3.localStorage.getItem('fxi_save_1_meta')).name==='Charlie','say no and nothing is wiped');
// skip the title screen
w.go('settings');w.document.querySelector('[data-intro="skip"]').click();
const w4=boot(dump(w));ok(!w4.document.querySelector('#title-screen')&&w4.eval('VIEW')==='home','straight into the career when skipped');
console.log(fail?`e2e42: ${fail} failing`:'e2e42 ok');
process.exit(fail?1:0);
