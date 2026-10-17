(function(root){
'use strict';
// Hash the actual inputs and implementation, not a manually maintained version.
const dependencies=['analyzer/engine.js','analyzer/data.json','upgrades/engine.js','upgrades/levels.json','ingredients/model.js','ingredients/evolutions.json','ingredients/calculate.js','mints/model.js','ingredients/cache.js'];
async function digest(text){
    const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
}
async function key(read,snapshot){
    const hashes=await Promise.all([...dependencies,snapshot].map(async path=>[path,await digest(await read('/pokemon-sleep/'+path))]));
    return digest(JSON.stringify(hashes));
}
async function load(read,snapshot){
    try{
        const fingerprint=await key(read,snapshot),manifest=JSON.parse(await read('/pokemon-sleep/ingredients/cache/index.json'));
        const entry=manifest.entries[snapshot];
        if(!entry||entry.key!==fingerprint)return null;
        const text=await read('/pokemon-sleep/ingredients/cache/'+entry.file);
        if(await digest(text)!==entry.digest)return null;
        const result=JSON.parse(text);
        if(!Array.isArray(result.rows)||!Array.isArray(result.references)||!Array.isArray(result.excluded)||!Number.isInteger(result.total))return null;
        return result;
    }catch{return null;} // Missing/stale/unavailable caches fall back to the real calculator.
}
const api={dependencies,digest,key,load};
if(typeof module==='object')module.exports=api;else root.SleepIngredientCache=api;
})(typeof self==='object'?self:globalThis);
