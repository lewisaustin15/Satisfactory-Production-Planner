// Import the official wiki's Docs JSON snapshots. No hand-maintained recipe list.
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=process.argv[2]||path.resolve(__dirname,'../source-data'),root=path.resolve(__dirname,'../dist');
const read=name=>JSON.parse(fs.readFileSync(path.join(source,'docs-'+name+'.json'),'utf8'));
const raw=read('recipes'),items=read('items'),buildings=read('buildings');
const stable=x=>x?.find(v=>v.stable);
const entity=id=>{const v=stable(items[id])||stable(buildings[id]);assert(v,'Unmapped wiki entity '+id);return v;};
const units={},recipes=[];
const eligible=Object.values(raw).flat().filter(r=>r.stable&&r.products.length>0&&!r.inBuildGun&&!r.inCustomizer&&(r.producedIn.length||r.inCraftBench||r.inWorkshop));
for(const r of eligible){
  assert(r.duration>0&&r.products.length,'Invalid recipe '+r.className);
  const rates=entries=>Object.fromEntries(entries.map(e=>{const item=entity(e.item);units[item.name]=['liquid','gas'].includes(item.form)?'m³':'items';return[item.name,e.amount*60/r.duration];}));
  const inputs=rates(r.ingredients),outputs=rates(r.products);
  for(const machineId of (r.producedIn.length?r.producedIn:[null]))for(const product of r.products){
    const item=entity(product.item),machine=machineId?entity(machineId):null;
    recipes.push({id:r.className+'::'+product.item+'::'+(machineId||'manual'),recipeId:r.className,item:item.name,name:r.name,machine:machine?.name||(r.inWorkshop?'Equipment Workshop':'Crafting Bench'),rate:outputs[item.name],inputs,outputs,alternate:r.alternate,manual:!machineId,overclockable:machine?.overclockable??false,seasons:r.seasons,duration:r.duration,primary:product===r.products[0],unlock:r.unlockedBy.replace(/<br\s*\/?\s*>/gi,' · ').replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g,'$1')});
  }
}
recipes.sort((a,b)=>a.item.localeCompare(b.item)||Number(a.manual)-Number(b.manual)||Number(b.name===b.item)-Number(a.name===a.item)||Number(a.alternate)-Number(b.alternate)||Number(b.primary)-Number(a.primary)||a.name.localeCompare(b.name));
assert.equal(new Set(recipes.map(r=>r.recipeId)).size,eligible.length);
assert.equal(new Set(recipes.filter(r=>r.alternate).map(r=>r.recipeId)).size,Object.values(raw).flat().filter(r=>r.stable&&r.alternate).length);
const metadata={checked:new Date().toISOString().slice(0,10),total:eligible.length,machine:eligible.filter(r=>r.producedIn.length).length,manual:eligible.filter(r=>!r.producedIn.length).length,alternate:eligible.filter(r=>r.alternate).length,standard:eligible.filter(r=>!r.alternate).length,items:new Set(recipes.map(r=>r.item)).size,sources:['Recipes','Items','Buildings'].map(x=>'https://satisfactory.wiki.gg/wiki/Template:Docs'+x+'.json'),excluded:'Build Gun construction, Customizer recipes and fuel burning with no item output; this catalog covers crafting recipes, including manual-only and FICSMAS recipes.'};
fs.writeFileSync(root+'/recipes.js','const recipeMetadata='+JSON.stringify(metadata)+';\nconst itemUnits='+JSON.stringify(units)+';\nconst recipes='+JSON.stringify(recipes)+';\n');
fs.mkdirSync(root+'/data',{recursive:true});
const sourceSha256=Object.fromEntries(['recipes','items','buildings'].map(n=>[n,require('crypto').createHash('sha256').update(fs.readFileSync(path.join(source,'docs-'+n+'.json'))).digest('hex')]));
fs.writeFileSync(root+'/data/catalog-audit.json',JSON.stringify({...metadata,sourceSha256,recipeIds:eligible.map(r=>r.className).sort()},null,2));
console.log(JSON.stringify({...metadata,selectorEntries:recipes.length},null,2));

