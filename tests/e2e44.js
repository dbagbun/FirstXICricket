// e2e44: flags - national sides show a small SVG flag beside their code (West Indies and Ireland their cricket
// flags, England St George's cross); composite XIs and franchises keep the colour chip; Settings -> Team badges
// switches everything back to colours, and an old save without the setting gets flags.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-go').click();
const id=c=>w.eval(`[...TEAMS.values()].find(t=>t.short===${JSON.stringify(c)})?.id`);
const nat=['AUS','IND','ENG','RSA','PAK','SL','WI','NZ','ZIM','BAN','KEN','IRE','NED','SCO','CAN','UAE','NAM','USA','NEP','OMA','PNG','HK','BER','JER'];
for(const c of nat){const t=id(c);if(t==null)continue;const b=w.eval(`badge(${t})`);
  ok(/<svg class="flag"/.test(b)&&b.includes('>'+c+'</span>'),c+' shows a flag and its code');}
ok(w.eval(`Object.keys(FLAG_SVG).length`)===nat.length,'a flag for every national side');
ok(/#CE1124/.test(w.eval(`FLAG_SVG.ENG`))&&!/#012169/.test(w.eval(`FLAG_SVG.ENG`)),'England: St George, not the Union Jack');
ok(/#7A1F2B/.test(w.eval(`FLAG_SVG.WI`)),'West Indies: the maroon cricket flag');
for(const c of['AFR','ASIA','WXI','BAY']){const t=id(c);if(t==null){ok(false,c+' team exists');continue;}
  const b=w.eval(`badge(${t})`);ok(!/svg/.test(b)&&/background:/.test(b),c+' keeps the colour chip');}
// every flag is well-formed SVG
for(const c of nat){const d=new w.DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${w.eval(`FLAG_SVG.${c}`)}</svg>`,'image/svg+xml');
  ok(!d.querySelector('parsererror'),c+' flag parses');}
// on screen: the next fixture and the tables
w.eval(`for(let i=0;i<10;i++)simFixture(nextFixture());go('home')`);
ok($$('#view .tbadge.fl svg.flag').length>=2,'flags on the dashboard');
w.eval(`go('rank')`);ok($$('#view .tbadge.fl').length>=3,'flags in the rankings');
// the setting
ok(w.eval(`S.settings.badges`)==='flags','flags by default');
w.eval(`go('settings')`);const btn=$('[data-set="badges"][data-val="colours"]');ok(btn,'Team badges setting');
btn&&btn.click();
w.eval(`go('rank')`);ok($$('#view .tbadge.fl').length===0&&$$('#view .tbadge').length>=3,'Colours: no flags');
ok(w.eval(`readSlot(SLOT).settings.badges`)==='colours','the choice is saved');
w.eval(`delete S.settings.badges`);ok(/svg/.test(w.eval(`badge(${id('IND')})`)),'an old save without the setting gets flags');
console.log(fail?`e2e44: ${fail} failing`:'e2e44 ok');process.exit(fail?1:0);
