importScripts('../analyzer/engine.js','../upgrades/engine.js?v=2','model.js?v=4','../mints/model.js','seeds.js?v=1','calculate.js?v=2');
self.onmessage=({data})=>{
    try{self.postMessage(calculateSleepIngredients(data,msg=>self.postMessage(msg)));}
    catch(error){self.postMessage({error:error.message});}
};
