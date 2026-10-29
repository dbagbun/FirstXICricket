// Bundles src/ + data/world.json into one self-contained first-xi.html
// node tools/build.js [out.html] [world.json]
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),out=process.argv[2]||path.join(root,'dist','first-xi.html');
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const js=fs.readdirSync(path.join(root,'src/js')).filter(f=>f.endsWith('.js')).sort().map(f=>fs.readFileSync(path.join(root,'src/js',f),'utf8')).join('\n');
const data=fs.readFileSync(process.argv[3]||path.join(root,'data/world.json'),'utf8').trim().replace(/<\//g,'<\\/');
let t=fs.readFileSync(path.join(root,'src/template.html'),'utf8');
t=t.replace('/*@@CSS@@*/',()=>css).replace('/*@@DATA@@*/',()=>'const WORLD='+data+';').replace('/*@@JS@@*/',()=>js);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,t);
console.log('built',out,Math.round(t.length/1024)+'KB');
