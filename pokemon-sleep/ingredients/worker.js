importScripts('../analyzer/engine.js','../upgrades/engine.js?v=2','model.js?v=3','../mints/model.js','calculate.js');
self.onmessage=({data})=>{
    try{self.postMessage(calculateSleepIngredients(data,msg=>self.postMessage(msg)));}
    catch(error){self.postMessage({error:error.message});}
};
