// ═══ APP: install when hosted, backups, auto-save to a file, storage ═══
// Opened from disk (file://) the page can't be installed or use a service worker - browsers only allow that on
// a website. Served over http(s) (e.g. GitHub Pages with manifest.webmanifest, sw.js and icon.svg next to the
// page - tools/build.js writes them) it links the manifest and registers the service worker for offline play.
const BACKUP_EVERY=100;
function appInit(){
  if(typeof location==='undefined'||!/^https?:/.test(location.protocol))return;
  try{
    const l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);
    const i=document.createElement('link');i.rel='apple-touch-icon';i.href='icon.svg';document.head.appendChild(i);
    if(navigator.serviceWorker)navigator.serviceWorker.register('sw.js').catch(()=>{});
  }catch(e){}
}
// Settings -> Check for updates: ask for a new offline cache, drop the cached page and reload (saves are in IndexedDB /
// localStorage, which this doesn't touch). Online the page is network-first anyway; this is for a stuck home-screen app.
async function checkForUpdate(){
  try{if(typeof STORE!=='undefined'&&STORE.ok)await storeFlush();}catch(e){}
  try{const r=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(r)await r.update();}catch(e){}
  try{if(typeof caches!=='undefined')for(const k of await caches.keys())await caches.delete(k);}catch(e){}
  location.reload();
}
// Ask the browser not to clear our storage when space runs low (best effort, no prompt in most browsers).
function askPersist(){try{if(navigator.storage&&navigator.storage.persist&&!askPersist.done){askPersist.done=true;navigator.storage.persist();}}catch(e){}}
function backupNow(){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([exportCareer()],{type:'application/json'}));
  a.download=`first-xi-${(S.name||'career').replace(/[^\w-]+/g,'-').toLowerCase()}-${careerDate()}.json`;a.click();
  S.backupAt=S.matches.length;saveGame();
}
const backupDue=()=>S&&S.matches.length-(S.backupAt||0)>=BACKUP_EVERY;
function backupBanner(){
  if(!backupDue())return'';
  return`<div class="banner" style="margin-bottom:14px"><div class="spread"><span>💾 ${S.matches.length-(S.backupAt||0)} matches since your last backup. Browser storage can be cleared - keep a copy.</span><button class="btn sm gold" id="bk-now">Back up now</button></div></div>`;
}
// Auto-save to a file you choose (Chrome/Edge desktop: File System Access API). The handle lives for this session.
let FILE_HANDLE=null,FILE_BUSY=false;
const canSaveToFile=()=>typeof window!=='undefined'&&!!window.showSaveFilePicker;
async function chooseSaveFile(){
  if(!canSaveToFile()){toast('This browser can\'t save to a file automatically - use Back up now.','warn');return false;}
  try{FILE_HANDLE=await window.showSaveFilePicker({suggestedName:'first-xi-career.json',types:[{description:'First XI career',accept:{'application/json':['.json']}}]});
    await writeSaveFile();toast('Saving to '+FILE_HANDLE.name+' after every match.');return true;}catch(e){return false;}
}
async function writeSaveFile(){
  if(!FILE_HANDLE||FILE_BUSY)return;FILE_BUSY=true;
  try{const w=await FILE_HANDLE.createWritable();await w.write(exportCareer());await w.close();S.backupAt=S.matches.length;}
  catch(e){FILE_HANDLE=null;toast('Lost access to the save file - choose it again in Settings.','warn');}
  FILE_BUSY=false;
}
async function storageLine(){
  try{if(!navigator.storage||!navigator.storage.estimate)return'';
    const e=await navigator.storage.estimate(),p=navigator.storage.persisted?await navigator.storage.persisted():false;
    return`Browser storage: ${(e.usage/1048576).toFixed(1)} MB used of ${(e.quota/1048576).toFixed(0)} MB${p?' · protected from clean-up':''}`;}catch(e){return'';}
}
document.addEventListener('click',e=>{if(e.target.closest('#bk-now'))backupNow();});
