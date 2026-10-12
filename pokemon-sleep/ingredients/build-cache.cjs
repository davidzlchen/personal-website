// Deterministic public artifacts from sanitized immutable snapshots only.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'pokemon-sleep/ingredients/cache');
const C=require('./cache.js'),calculate=require('./calculate.js'),U=require('../upgrades/engine.js');
const read=async url=>fs.readFileSync(path.join(root,url),'utf8'),json=file=>JSON.parse(fs.readFileSync(path.join(root,'pokemon-sleep',file),'utf8'));
(async()=>{
 const check=process.argv.includes('--check'),entries={},catalog=json('analyzer/data.json'),levels=json('upgrades/levels.json'),evolutions=json('ingredients/evolutions.json');
 const old=fs.existsSync(path.join(dir,'index.json'))?JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8')).entries:{};
 if(!check)fs.mkdirSync(dir,{recursive:true});
 for(const snapshot of json('history.json').snapshots){
    const key=await C.key(read,snapshot.file),previous=old[snapshot.file];
    if(previous?.key===key&&fs.existsSync(path.join(dir,previous.file))&&await C.digest(fs.readFileSync(path.join(dir,previous.file),'utf8'))===previous.digest){entries[snapshot.file]=previous;continue;}
    if(check)throw Error('Stale ingredient cache: '+snapshot.id+'; run node scripts/build_sleep_ingredient_cache.cjs');
    const paired=json(snapshot.file),roster=paired.roster.records,cap=U.capForRank(paired.inventory.researcher_rank,levels.cap);
    if(paired.roster.captured_at!==snapshot.captured_at||paired.inventory.captured_at!==snapshot.captured_at||roster.some(m=>m.level>cap))throw Error('Invalid paired snapshot: '+snapshot.id);
    console.log('Calculating '+snapshot.id);
    const text=JSON.stringify(calculate({catalog,roster,cap,levels,evolutions}))+'\n',file=snapshot.id+'-'+key.slice(0,16)+'.json';
    fs.writeFileSync(path.join(dir,file),text);entries[snapshot.file]={key,file,digest:await C.digest(text)};
 }
 const text=JSON.stringify({entries},null,2)+'\n';
 if(check){if(fs.readFileSync(path.join(dir,'index.json'),'utf8')!==text)throw Error('Stale cache manifest');}
 else{fs.writeFileSync(path.join(dir,'index.json'),text);const keep=new Set(['index.json',...Object.values(entries).map(e=>e.file)]);for(const file of fs.readdirSync(dir))if(!keep.has(file)&&file.endsWith('.json'))fs.unlinkSync(path.join(dir,file));}
 console.log('Ingredient cache '+(check?'verified':'ready')+': '+Object.keys(entries).length+' snapshots');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
