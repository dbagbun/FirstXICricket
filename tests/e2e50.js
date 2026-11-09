// e2e50: ratings and batting colours by format (tools/format_ratings.py -> WORLD.fx): a Test uses Test ratings, a
// T20I T20I ones, an ODI the workbook's own; the engine bowls and bats on them; a Test series you schedule picks the
// nearest real Test XI; profiles show all three; Settings -> Ratings 'career' uses the career values.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
w.document.querySelector('#sp-go').click();
if(!G('WORLD.fx')){console.log('e2e50 skipped (no format ratings in this build)');process.exit(0);}
const pid=n=>+G(`Object.keys(WORLD.players).find(k=>WORLD.players[k][0]===${JSON.stringify(n)})`);
const at=(n,d,f)=>G(`pAttr(${pid(n)},'${d}',${f?JSON.stringify(f):'undefined'})`);
// the right man for the format
ok(at('A Kumble','2007-07-01','TEST').rating<at('A Kumble','2007-07-01').rating,'Kumble rates better in Tests than in ODIs');
ok(at('A Kumble','2007-07-01','TEST').rating<at('V Sehwag','2011-07-01','TEST').rating,'Kumble out-rates Sehwag in Tests');
ok(at('SK Warne','2006-07-01','TEST').rating===1,'Warne a Test 1');
ok(at('SP Narine','2016-07-01','T20').rating<=2&&at('SP Narine','2016-07-01','TEST').rating>=4,'Narine: a T20 bowler, not a Test one');
ok(at('M Muralitharan','2005-07-01','TEST').bat==='R'&&at('JH Kallis','2008-07-01','TEST').bat[0]==='B','Test colours: Murali RED, Kallis BLUE');
ok(JSON.stringify(at('A Kumble','2007-07-01','ODI'))===JSON.stringify(at('A Kumble','2007-07-01')),'ODIs keep the workbook ratings');
ok(at('A Kumble','2007-07-01','TEST').src==='f','marked as format ratings');
// the engine uses them
const eng=G(`(()=>{const fx=REAL_TEST_FX.find(x=>x.date>'2007-06'&&[x.a,x.b].includes(${G(`[...TEAMS.values()].find(t=>t.short==='IND').id`)}));const M=buildMatch(fx);doToss(M);
  const I=startInnings?null:null;simMatch(M);const out=[];for(const I of M.inns)for(const b of I.eng.B)out.push([b.pid,b.rating-((M.mods&&M.mods.bowl[b.pid])||0),pAttr(b.pid,M.date,'TEST').rating,b.pt]);return out;})()`);
ok(eng.length>8&&eng.every(([p,r,t,pt])=>pt||r===Math.min(6,t)),'Test bowlers bowl on their Test ratings');
// a scheduled Test series picks a Test side
const sq=G(`(()=>{const id=c=>[...TEAMS.values()].find(t=>t.short===c).id;const x=nearestXI(id('IND'),'2007-07-01',{fmt:'TEST'}),o=nearestXI(id('IND'),'2007-07-01');return[x.bat.map(pName),o.bat.map(pName)];})()`);
ok(sq[0].includes('A Kumble')&&!sq[1].includes('A Kumble'),'India 2007: the Test side has Kumble, the ODI side does not');
// profiles show the formats; the career setting
G(`openPlayer(${pid('A Kumble')})`);ok(/By format: ODI r\d.*Test r\d.*T20I/.test($('#modal-box').textContent),'the profile shows all three formats');
G(`closeModal();S.settings.ratings='career'`);
ok(at('A Kumble','2003-07-01','TEST').rating===G(`WORLD.fx[${pid('A Kumble')}].Tc[0]`),'career ratings use the career values');
G(`S.settings.ratings='era'`);
console.log(fail?`e2e50: ${fail} failing`:'e2e50 ok');process.exit(fail?1:0);
