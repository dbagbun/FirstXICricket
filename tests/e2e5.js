// e2e5: era ratings & colours - a player's rating and batting colour follow the match date; Settings -> Ratings
// 'career' uses whole-career values; edits still win; the engine reads the match date, not the career date.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
const pid=n=>G(`+Object.keys(WORLD.players).find(k=>WORLD.players[k][0]===${JSON.stringify(n)})`);
const kohli=pid('V Kohli'),kumble=pid('A Kumble'),tendulkar=pid('SR Tendulkar');
ok(G(`pAttr(${kohli},'2008-09-01').bat`)==='G','Kohli is GREEN as a newcomer in 2008');
ok(G(`pAttr(${kohli},'2013-01-01').bat`)==='B','...and BLUE by 2013');
ok(G(`pAttr(${tendulkar},'2002-07-01').bat`)==='B','established players are BLUE from the start of the data');
const r1=G(`pAttr(${kumble},'2002-07-01').rating`),r2=G(`pAttr(${kumble},'2007-06-01').rating`);
ok(r1<r2,'Kumble declines with age ('+r1+' -> '+r2+')');
G(`S.settings.ratings='career'`);
ok(G(`pAttr(${kohli},'2008-09-01').bat`)===G(`WORLD.players[${kohli}][5]`),'career mode ignores the era');
ok(G(`pAttr(${kumble},'2002-07-01').rating`)===G(`WORLD.players[${kumble}][2]`),'career mode rating');
G(`S.settings.ratings='era'`);
G(`S.attrEdits[${kohli}]={bat:'R'}`);ok(G(`pAttr(${kohli},'2013-01-01').bat`)==='R','an edit beats the era');G(`delete S.attrEdits[${kohli}]`);
// the engine uses the match date: a 2007 innings rates Kumble as of 2007 although the career is in 2002
const m=G(`(()=>{const fx=allFixtures().find(x=>x.fmt==='ODI'&&x.date>'2007-01-01'&&x.playable&&fixtureXI(x.f.cid,3)&&fixtureXI(x.f.cid,3).bat.includes(${kumble}));
  const M=buildMatch(fx);const opp=M.teams.find(t=>t!==3);doToss(M,opp,'bat');const b=curInn(M).eng.B.find(b=>b.pid===${kumble});return{date:M.date,r:b&&b.rating};})()`);
ok(m.r===G(`pAttr(${kumble},${JSON.stringify(m.date)}).rating`)&&m.r!==r1,'engine rates Kumble as of the match ('+m.date+': '+m.r+', 2002: '+r1+')');
ok(G('careerDate()').startsWith('2002'),'career date is still 2002');
w.openPlayer(kohli);ok($('#modal-box').innerHTML.includes('By season'),'player card shows the seasons');w.closeModal();
w.go('settings');ok($('[data-set="ratings"]'),'ratings setting present');
console.log(fail?`e2e5: ${fail} failing`:'e2e5 ok');
process.exit(fail?1:0);
