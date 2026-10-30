// ═══ PRESENTATION — the dice roll, TV graphics for big moments, and sound (all synthesised, no assets) ═══
// Graphics and sounds play when you step ball by ball, an over at a time or watch - not when you sim ahead.
const FX={allow:true,lastKey:'',ctx:null,timer:null};
const reduceMotion=()=>!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// ---------- sound ----------
function fxAudio(){
  if(!S||!S.settings.sound)return null;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    FX.ctx=FX.ctx||new AC();if(FX.ctx.state==='suspended')FX.ctx.resume();
    return FX.ctx;
  }catch(e){return null;}
}
function noise(ctx,sec){
  const b=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*sec)),ctx.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const s=ctx.createBufferSource();s.buffer=b;return s;
}
function envGain(ctx,t0,peak,attack,hold,release){
  const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(peak,t0+attack);
  g.gain.setValueAtTime(peak,t0+attack+hold);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+attack+hold+release);
  return g;
}
const SFX={
  crack(v=1){const c=fxAudio();if(!c)return;const t=c.currentTime,n=noise(c,.12),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1900;f.Q.value=1.4;
    const g=envGain(c,t,.55*v,.002,.01,.08);n.connect(f).connect(g).connect(c.destination);n.start(t);n.stop(t+.13);
    const o=c.createOscillator(),og=envGain(c,t,.25*v,.001,0,.05);o.frequency.value=900;o.connect(og).connect(c.destination);o.start(t);o.stop(t+.06);},
  roar(v=1,len=1.4){const c=fxAudio();if(!c)return;const t=c.currentTime,n=noise(c,len+.2),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=950;
    const g=envGain(c,t,.22*v,.25,len*.35,len*.6);n.connect(f).connect(g).connect(c.destination);n.start(t);n.stop(t+len+.2);},
  stumps(){const c=fxAudio();if(!c)return;const t=c.currentTime;
    [0,.06,.13].forEach((d,i)=>{const o=c.createOscillator();o.type='square';o.frequency.value=1300-i*250;const g=envGain(c,t+d,.12,.001,0,.07);o.connect(g).connect(c.destination);o.start(t+d);o.stop(t+d+.09);});},
  applause(len=1.8){const c=fxAudio();if(!c)return;const t=c.currentTime;
    for(let i=0;i<46;i++){const d=Math.random()*len,n=noise(c,.04),f=c.createBiquadFilter();f.type='highpass';f.frequency.value=1200+Math.random()*1500;
      const g=envGain(c,t+d,.05+Math.random()*.05,.002,0,.035);n.connect(f).connect(g).connect(c.destination);n.start(t+d);n.stop(t+d+.05);}
    SFX.roar(.35,len);},
};
function fxBall(M,b){
  if(!b||b.need||!FX.allow)return;
  if(b.w){if(b.how==='b')SFX.stumps();else SFX.crack(.7);SFX.roar(1,1.6);}
  else if(b.bat===6){SFX.crack(1);SFX.roar(.85,1.5);}
  else if(b.bat===4){SFX.crack(.9);SFX.roar(.45,1);}
  else if(b.bat>0)SFX.crack(.35);
}

// ---------- TV graphics ----------
function tvBanner(kind,title,sub,team){
  if(!S||S.settings.tv===false)return;
  let el=$('#tv');
  if(!el){el=document.createElement('div');el.id='tv';el.setAttribute('aria-live','assertive');document.body.appendChild(el);}
  el.className='tv '+kind;el.style.setProperty('--tc',team?TEAM_COL[teamShort(team)]||'#6a2fc0':'#6a2fc0');el.innerHTML=`<div class="tv-k">${esc(title)}</div>${sub?`<div class="tv-s">${sub}</div>`:''}`;
  void el.offsetWidth;el.classList.add('in');
  clearTimeout(FX.timer);FX.timer=setTimeout(()=>el.classList.remove('in'),reduceMotion()?2600:2000);
}
// returns true when it showed a graphic (so the caller can skip the toast)
function fxEvent(M,e){
  if(!FX.allow||M.sim||S.settings.tv===false)return false;
  const I=M.inns.find(i=>i.no===e.inn)||curInn(M);
  switch(e.t){
    case'w':{const B=I.bt[e.pid];tvBanner('wkt','WICKET',`${esc(pName(e.pid))} ${dismissalText(e.how,e.bowler,e.fielder)} <b>${B.r}</b> (${B.b})`,I.bowl);return true;}
    case'50':tvBanner('ms','FIFTY',`${esc(pName(e.pid))} · ${e.balls} balls`,I.bat);SFX.applause(1.4);return true;
    case'100':tvBanner('ms','HUNDRED',`${esc(pName(e.pid))} · ${e.balls} balls`,I.bat);SFX.applause(2.4);return true;
    case'200':tvBanner('ms','DOUBLE HUNDRED',esc(pName(e.pid)),I.bat);SFX.applause(3);return true;
    case'5w':tvBanner('ms','FIVE WICKETS',`${esc(pName(e.pid))} · ${e.w}/${e.r}`,I.bowl);SFX.applause(1.8);return true;
    case'drs':tvBanner(e.code==='M'?'inn':e.code==='O'&&e.out?'wkt':'ms',e.code==='M'?'BAD CALL':e.code==='U'?"UMPIRE'S CALL":e.code==='O'?(e.out?'OUT!':'NOT OUT'):'REVIEW LOST','📺 '+esc(drsText(e)),e.rev?e.side:I.bowl);if(e.code==='O')SFX.roar(.8,1.2);return true;
    case'hat':tvBanner('ms','HAT-TRICK!',esc(pName(e.pid)),I.bowl);SFX.applause(3);return true;
    case'innsEnd':tvBanner('inn','INNINGS',`${esc(teamName(e.bat))} ${e.runs}${e.wkts<10?'/'+e.wkts:''} · ${esc(e.why)}`,e.bat);return true;
    case'result':tvBanner('res','RESULT',esc(e.text),M.result&&M.result.winner);SFX.applause(2.5);return true;
  }
  return false;
}

// ---------- the dice ----------
// A new over's roll tumbles before it lands, then the card row lights up ball by ball.
function fxDice(M){
  const C=M.cur,el=$('#dice-roll');if(!C||!C.roll||!el)return;
  const key=M.id+':'+curInn(M).no+':'+C.over;
  if(key===FX.lastKey)return;
  FX.lastKey=key;
  if(!FX.allow||reduceMotion()||S.settings.ballDelay<100)return;
  const box=el.closest('.dice');box&&box.classList.add('rolling');
  // the tumbling numbers are a fixed sequence, not Math.random, so seeded runs stay repeatable
  let n=0;const iv=setInterval(()=>{el.textContent=1+(C.roll*13+n*37)%100;if(++n>=9){clearInterval(iv);el.textContent=C.roll;box&&box.classList.remove('rolling');}},45);
}
