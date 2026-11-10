// Fast static checks:
// 1. no top-level name is declared twice across src/js (the files share one global scope)
// 2. the concatenated game script compiles
// 3. the playable copy at the repo root matches a fresh build (pass --root to check it)
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),dir=path.join(root,'src/js');
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort();
const src=files.map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
let bad=0;
const seen={};
for(const f of files)for(const m of fs.readFileSync(path.join(dir,f),'utf8').matchAll(/^(?:function\s+(\w+)|(?:const|let|var|class)\s+(\w+))/gm)){
  const n=m[1]||m[2];(seen[n]=seen[n]||[]).push(f);
}
Object.entries(seen).filter(([,v])=>v.length>1).forEach(([n,v])=>{bad++;console.log(`duplicate top-level name ${n}: ${v.join(', ')}`);});
try{new vm.Script(src,{filename:'game.js'});}catch(e){bad++;console.log('game script does not compile:',e.message);}
if(process.argv.includes('--root')){
  const built=path.join(root,'dist','first-xi.html'),copy=path.join(root,'first-xi.html');
  if(!fs.existsSync(built))console.log('(no dist build to compare - run npm run build first)'),bad++;
  else if(!fs.existsSync(copy)||fs.readFileSync(built,'utf8')!==fs.readFileSync(copy,'utf8')){bad++;console.log('first-xi.html is out of date: run npm run build and copy dist/first-xi.html to the repo root');}
  // the offline cache, manifest and icon GitHub Pages serves next to it (an old sw.js keeps installed copies on an old version)
  for(const f of['sw.js','manifest.webmanifest','icon.svg']){const b=path.join(root,'dist',f),c=path.join(root,f);
    if(fs.existsSync(b)&&(!fs.existsSync(c)||fs.readFileSync(b,'utf8')!==fs.readFileSync(c,'utf8'))){bad++;console.log(f+' is out of date: copy dist/'+f+' to the repo root');}}
}
console.log(bad?`${bad} problem(s)`:`ok - ${files.length} files, ${Object.keys(seen).length} top-level names`);
process.exit(bad?1:0);
