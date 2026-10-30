// ═══ COMMENTATOR'S VOICE — the browser's own speech synthesis (offline, no audio files) ═══
// Calls wickets, boundaries, milestones, innings and results when you step ball by ball, an over at a time or
// watch (FX.allow) - never while simming. Settings -> Commentator voice; S.settings.voice / voiceName / voiceRate.
const SPEECH=typeof window!=='undefined'&&window.speechSynthesis?window.speechSynthesis:null;
const surname=pid=>bugName(pid);
const VOICE_LINES={
  4:['Four! {b} finds the gap.','That races away for four.','Shot! Four more for {b}.','Beautifully timed, four runs.'],
  6:['Six! {b} has launched that into the crowd!','That is huge! Six!','Gone, all the way! Six for {b}.'],
  w:{b:['Bowled him! {b} has to go.','Timber! {b} is bowled.'],lbw:['That looks out... and the finger goes up! {b} is leg before.','Plumb! {b} lbw.'],
    ct:['Caught! {b} has to walk.','In the air... and taken! {b} is gone.'],ctof:['Up in the air... and caught in the deep! {b} is out.'],
    ctwk:['Edged and taken behind! {b} departs.','Thin edge, the keeper does the rest.'],st:['Stumped! {b} was miles out.'],ro:['Run out! {b} is short of his ground.','Direct hit! {b} has to go.']},
};
function voices(){
  if(!SPEECH)return[];
  return SPEECH.getVoices().filter(v=>/^en/i.test(v.lang)).sort((a,b)=>(/GB|AU|IN|ZA|NZ/.test(b.lang)-/GB|AU|IN|ZA|NZ/.test(a.lang))||a.name.localeCompare(b.name));
}
function say(text,big){
  if(!SPEECH||!S||!S.settings.voice||!FX.allow)return false;
  try{
    if(big)SPEECH.cancel();else if(SPEECH.speaking||SPEECH.pending)return false;
    const u=new SpeechSynthesisUtterance(text);
    const v=voices().find(v=>v.name===S.settings.voiceName)||voices()[0];if(v){u.voice=v;u.lang=v.lang;}
    u.rate=S.settings.voiceRate||1.05;u.pitch=1;
    SPEECH.speak(u);return true;
  }catch(e){return false;}
}
const fill=(t,o)=>t.replace(/\{(\w)\}/g,(_,k)=>o[k]||'');
function voiceBall(M,b){
  if(!b||b.need||b.w)return;   // wickets are called from the event, with the dismissal
  const h=hashBall(b);
  if(b.bat===6)say(fill(VOICE_LINES[6][h%3],{b:surname(b.st)}),true);
  else if(b.bat===4)say(fill(VOICE_LINES[4][h%4],{b:surname(b.st)}));
}
function voiceEvent(M,e){
  if(!S||!S.settings.voice||M.sim)return;
  const I=M.inns.find(i=>i.no===e.inn)||curInn(M);
  switch(e.t){
    case'w':{const l=VOICE_LINES.w[e.how]||VOICE_LINES.w.b,B=I.bt[e.pid];say(fill(l[(B.b+B.r)%l.length],{b:surname(e.pid)})+` For ${B.r}.`,true);break;}
    case'50':say(`Fifty for ${surname(e.pid)}, off ${e.balls} balls.`,true);break;
    case'100':say(`That's his hundred! What an innings from ${surname(e.pid)}.`,true);break;
    case'200':say(`Double hundred for ${surname(e.pid)}! Extraordinary.`,true);break;
    case'5w':say(`Five wickets for ${surname(e.pid)}!`,true);break;
    case'drs':if(e.rev)say(e.code==='O'?`And it's been overturned! ${e.out?'He has to go.':'He survives.'}`:e.code==='U'?"Umpire's call. The decision stands.":'The decision stands. Review lost.',true);break;
    case'hat':say(`Hat-trick! ${surname(e.pid)} has a hat-trick!`,true);break;
    case'innsEnd':say(`That's the end of the innings. ${teamName(e.bat)}, ${e.runs}${e.wkts<10?' for '+e.wkts:' all out'}.`,true);break;
    case'result':say(e.text+'.',true);break;
    case'rainlo':say('The rain has arrived and the covers are coming on.',true);break;
  }
}
function voiceTest(){FX.allow=true;return say('Good afternoon, and welcome to the cricket. A lovely day for it.',true);}
