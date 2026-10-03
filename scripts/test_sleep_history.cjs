const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
    constructor() { this.children=[]; this.dataset={}; this.attrs={}; this.listeners={}; this.hidden=true; }
    setAttribute(k,v) { this.attrs[k]=v; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(k,v) { this.listeners[k]=v; }
    append(...items) { this.children.push(...items); }
    replaceChildren() { this.children=[]; }
    focus() { this.focused=true; }
    contains(target) { return target === this || this.children.includes(target); }
}
(async () => {
    const elements = new Map();
    const $ = key => { if (!elements.has(key)) elements.set(key,new Element()); return elements.get(key); };
    const snapshots = [0,1,2].map(i=>({id:`id-${i}`,captured_at:i===0?'2026-10-01':'2026-10-03',file:`snapshot-${i}`}));
    const document = new Element();
    let displayed;
    const context = vm.createContext({$, document, URLSearchParams, window:{location:{search:''}},
        node:(_,cls,text)=>Object.assign(new Element(),{className:cls,textContent:text}),
        dateLabel:date=>date, dialog:{open:false}, selectedMon:null, activeSnapshotId:null,
        applyRoster:data=>{displayed=data.captured_at;}, applyInventory:()=>{},
        fetch:async path=>({ok:!path.endsWith('snapshot-1'), json:async()=>path.endsWith('history.json')?{snapshots}:{roster:{captured_at:path.endsWith('snapshot-0')?'2026-10-01':'2026-10-03'},inventory:{captured_at:path.endsWith('snapshot-0')?'2026-10-01':'2026-10-03'}}})});
    vm.runInContext(fs.readFileSync('pokemon-sleep/history.js','utf8'),context);
    await new Promise(resolve=>setImmediate(resolve));
    const entries=$('#snapshot-entries').children;
    assert.equal(entries.length,3);
    assert.equal(entries[0].dataset.index,'2');
    assert.equal(entries[0].attrs['aria-pressed'],'true');
    assert.equal(entries[0].children[0].textContent,'2026-10-03 · Update 2');
    assert.equal($('#snapshot-latest').hidden,false);
    $('#history-trigger').listeners.click();
    assert.equal($('#snapshot-menu').hidden,false);
    document.listeners.keydown({key:'Escape',preventDefault(){}});
    assert.equal($('#snapshot-menu').hidden,true);
    assert.equal($('#history-trigger').focused,true);
    await entries[2].listeners.click();
    assert.equal(displayed,'2026-10-01');
    assert.equal(entries[2].attrs['aria-pressed'],'true');
    assert.equal($('#snapshot-latest').hidden,true);
    await entries[1].listeners.click();
    assert.equal(displayed,'2026-10-01');
    assert.equal(entries[2].attrs['aria-pressed'],'true');
    assert.equal($('#history-status').hidden,false);
    assert.equal($('#history-trigger').attrs['aria-busy'],undefined);
    $('#history-trigger').listeners.click();
    document.listeners.click({target:{closest:()=>null}});
    assert.equal($('#snapshot-menu').hidden,true);
    console.log('Snapshot ordering, same-day updates, selection, failed-load preservation, Escape, and outside dismissal verified.');
})().catch(error=>{console.error(error);process.exitCode=1;});
