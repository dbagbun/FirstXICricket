// ═══ START HERE & KEYBOARD SHORTCUTS ═══
// A new career gets a "Start here" checklist on the dashboard (S.tour {seen:{view:1}, did:{...}, hidden}).
// Each step reads real state or a flag set as you go; careers already past 20 matches start with it hidden.
function tourState(){if(!S.tour)S.tour={seen:{},did:{},hidden:S.matches.length>20};return S.tour;}
function tourSeen(v){if(S&&!S.sandbox)tourState().seen[v]=1;}
function tourDid(k){if(S&&!S.sandbox&&!tourState().did[k]){S.tour.did[k]=1;}}
const TOUR_STEPS=[
  ['play','Play your first match','Toss, then bowl it ball by ball or an over at a time.',()=>S.matches.length>0||!!(S.live&&S.live.inns&&S.live.inns.length),()=>{const n=nextFixture();if(n)startFixture(n.key);}],
  ['card','Look at the run-rate card','Each over picks a card; one roll of 1-100 reads all six balls across a row.',()=>!!tourState().did.rrcard,()=>{MATCH_TAB='rr';go(S.live&&S.live.state!=='done'?'match':'home');if(!(S.live&&S.live.state!=='done'))toast('Start a match first - the Run-rate card is a tab on the match screen.','warn');}],
  ['watch','Watch an over, or captain one','Watch mode bowls it for you; Settings → Captaincy → Me lets you choose bowlers and attack or defend.',()=>!!(tourState().did.watch||S.settings.captain==='manual'),()=>go('settings')],
  ['tour','Open the Tournament Centre','Pools, net run rate and knockout brackets for every series and cup.',()=>!!tourState().seen.tour,()=>go('tour')],
  ['records','Check the records','Batting, bowling, partnerships and team records, by format.',()=>!!tourState().seen.records,()=>go('records')],
  ['play2','Try a challenge','Start from a famous situation in a sandbox - your career is safe.',()=>!!tourState().seen.play,()=>go('play')],
  ['look','Pick a look','Three broadcast styles, a choice of fonts, sound and a commentator voice in Settings.',()=>!!(S.settings.broadcast!=='standard'||S.settings.font!=='barlow'||S.settings.sound||S.settings.voice),()=>go('settings')],
];
function startHereHTML(){
  if(!S||S.sandbox)return'';
  const T=tourState();if(T.hidden)return'';
  const done=TOUR_STEPS.filter(s=>s[3]()).length;
  if(done===TOUR_STEPS.length){T.hidden=true;return'';}
  return`<div class="card hi" id="start-here" style="margin-bottom:14px"><div class="spread"><h3 style="margin:0">Start here</h3><span class="row"><b class="num">${done}/${TOUR_STEPS.length}</b><button class="btn sm" id="sh-hide">Hide</button></span></div>
    <div class="bar" style="margin:8px 0 10px"><i style="width:${100*done/TOUR_STEPS.length}%"></i></div>
    <div class="stack" style="gap:6px">${TOUR_STEPS.map(([k,t,d,ok],i)=>{const y=ok();return`<div class="spread"><span>${y?'✅':'⬜'} <b class="${y?'muted':''}">${esc(t)}</b><span class="hide-sm"><br><span class="muted" style="font-size:12px">${esc(d)}</span></span></span>${y?'':`<button class="btn sm" data-sh="${i}">Show me</button>`}</div>`;}).join('')}</div>
    <div class="muted" style="font-size:12px;margin-top:8px">Press <b>?</b> any time for keyboard shortcuts. Settings → How to play has the rules.</div></div>`;
}
function startHereWire(){
  $('#sh-hide')&&($('#sh-hide').onclick=()=>{tourState().hidden=true;saveGame();rerender();toast('Hidden - bring it back from Settings → How to play.');});
  $$('[data-sh]').forEach(b=>b.onclick=()=>TOUR_STEPS[+b.dataset.sh][4]());
}
// ---------- keyboard ----------
const KEYS=[['Space or N','Next ball'],['O','Bowl the over'],['F','Five overs'],['I','To the end of the innings'],['W','Watch / pause'],['Shift+S','Sim the match'],
  ['R / A','Review / accept the umpire\'s decision'],['E / B','Enforce the follow-on / bat again'],['1-5','Match tabs: scorecard, ball by ball, charts, field, run-rate card'],
  ['H','Dashboard'],['M','Match'],['?','This list'],['Esc','Close a window']];
function openKeys(){openModal(`<h2>Keyboard shortcuts</h2><table>${KEYS.map(([k,d])=>`<tr><td><span class="kbd">${esc(k)}</span></td><td>${esc(d)}</td></tr>`).join('')}</table>
  <p class="muted" style="font-size:12px">Typing in a box (a dice roll, a name) never triggers them.</p>`);}
function keyHandler(e){
  if(e.ctrlKey||e.metaKey||e.altKey||!S)return;
  const tag=(e.target&&e.target.tagName)||'';if(/INPUT|SELECT|TEXTAREA/.test(tag)||e.target.isContentEditable)return;
  if(/BUTTON|A/.test(tag)&&(e.key===' '||e.key==='Enter'))return;   // a focused button presses itself
  if(!$('#modal').classList.contains('hidden')){return;}
  const k=e.key,click=sel=>{const b=$(sel);if(b&&!b.disabled){b.click();return true;}return false;};
  let used=false;
  if(k==='?'){openKeys();used=true;}
  else if(k==='h'||k==='H'){go('home');used=true;}
  else if((k==='m'||k==='M')&&S.live&&S.live.state!=='done'){go('match');used=true;}
  else if(VIEW==='match'){
    if(k===' '||k==='n'||k==='N')used=click('#c-ball');
    else if(k==='o'||k==='O')used=click('#c-over');
    else if(k==='f'||k==='F')used=click('#c-5');
    else if(k==='i'||k==='I')used=click('#c-inn');
    else if(k==='w'||k==='W')used=click('#c-watch');
    else if(k==='S'&&e.shiftKey)used=click('#c-sim');
    else if(k==='r'||k==='R')used=click('#rv-yes');
    else if(k==='a'||k==='A')used=click('#rv-no');
    else if(k==='e'||k==='E')used=click('#fo-yes');
    else if(k==='b'||k==='B')used=click('#fo-no');
    else if(/^[1-5]$/.test(k)){const t=['card','comm','charts','field','rr'][+k-1];used=click(`[data-tab="${t}"]`);}
  }
  if(used)e.preventDefault();
}
document.addEventListener('keydown',keyHandler);
