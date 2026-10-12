const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../pokemon-sleep/ingredients/cache.js'),I=require('../pokemon-sleep/ingredients/model.js'),D=require('../pokemon-sleep/analyzer/data.json'),L=require('../pokemon-sleep/upgrades/levels.json'),E=require('../pokemon-sleep/ingredients/evolutions.json');
const root=path.resolve(__dirname,'..'),read=async url=>fs.readFileSync(path.join(root,url),'utf8');
(async()=>{
 const snapshot='snapshots/2026-10-11-216ba00d4db6.json',data=await C.load(read,snapshot);assert.ok(data);
 const paired=JSON.parse(await read('/pokemon-sleep/'+snapshot)),mon=paired.roster.records.find(m=>m.id==='mon-72');
 assert.deepEqual(data.rows.find(r=>r.id===mon.id),I.owned(D,mon,70,L,undefined,E),'cached evolution results equal the actual calculator at every level');
 for(const file of C.dependencies){assert.equal(await C.load(async url=>await read(url)+(url==='/pokemon-sleep/'+file?'\n':''),snapshot),null,'invalidate '+file);}
 assert.equal(await C.load(async url=>await read(url)+(url.endsWith(snapshot)?'\n':''),snapshot),null,'invalidate changed snapshot');
 assert.equal(await C.load(async url=>url.includes('/cache/')&&!url.endsWith('index.json')?'{}':read(url),snapshot),null,'reject corrupt result');
 assert.equal(await C.load(async url=>{if(url.endsWith('index.json'))throw Error('offline');return read(url);},snapshot),null,'missing cache permits fallback');
 const older=await C.load(read,'snapshots/2026-10-04-1c3647d40662.json');assert.ok(older);assert.notDeepEqual(data,older,'snapshots isolated');
 console.log('Cache: actual-model equality, all code/data/snapshot invalidations, corruption, missing cache, and snapshot isolation pass.');
})().catch(e=>{console.error(e);process.exitCode=1;});
