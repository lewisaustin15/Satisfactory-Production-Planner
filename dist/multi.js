const additionalTargets=[];
let targetSequence=0;
const automaticItems=[...new Set(recipes.filter(r=>!r.manual).map(r=>r.item))].sort();
function currentProductionTargets(root,target){
  const batch=$('mode').value==='batch',minutes=Number($('minutes').value);
  if(batch&&(!Number.isFinite(minutes)||minutes<=0))throw Error('Enter a completion time greater than zero.');
  return[{recipe:root,target,clock:Number($('clock').value)},...additionalTargets.map(t=>{
    const recipe=recipes.find(r=>r.id===t.recipeId),amount=Number(t.amount);
    if(t.amount===''||!Number.isFinite(amount)||amount<0||amount>1e9)throw Error('Enter a valid amount for every additional output (0–1 billion).');
    return{recipe,target:amount/(batch?minutes:1),clock:Number(t.clock)};
  })];
}
function updateTargetLabels(){
  document.querySelectorAll('[data-target-label]').forEach(label=>{const t=additionalTargets.find(t=>t.key===label.dataset.targetLabel);if(t)label.textContent=$('mode').value==='batch'?(unit(t.item)==='m³'?'Total volume (m³)':'Total items'):unit(t.item)+' / min';});
  $('multiTargetHint').textContent=$('mode').value==='batch'?'All output quantities use the shared completion time above.':'Each output has its own target rate. Shared inputs are combined in the full production chain.';
  $('mainOnlyNote').hidden=true;
}
function renderAdditionalTargets(){
  const list=$('additionalTargetRows');list.replaceChildren();
  for(const [index,t] of additionalTargets.entries()){
    const row=document.createElement('div');row.className='additional-target';
    const image=document.createElement('img');image.width=48;image.height=48;image.alt='';if(wikiImages[t.item])image.src=wikiImages[t.item].path;else image.hidden=true;row.append(image);
    const field=(labelText,control)=>{const box=document.createElement('div'),label=document.createElement('label');label.textContent=labelText;label.htmlFor=control.id;box.append(label,control);row.append(box);return label;};
    const item=document.createElement('select');item.id='target-item-'+t.key;automaticItems.forEach(n=>item.add(new Option(n,n)));item.value=t.item;item.setAttribute('aria-label','Additional output '+(index+1));field('Output item',item);
    const recipe=document.createElement('select');recipe.id='target-recipe-'+t.key;recipes.filter(r=>r.item===t.item&&!r.manual).forEach(r=>recipe.add(new Option((r.alternate?'Alternate: ':'Standard: ')+r.name,r.id)));recipe.value=t.recipeId;field('Recipe',recipe);
    const amount=document.createElement('input');amount.id='target-amount-'+t.key;amount.type='number';amount.min='0';amount.max='1000000000';amount.step='any';amount.value=t.amount;const label=field('Target',amount);label.dataset.targetLabel=t.key;
    const clock=document.createElement('input');clock.id='target-clock-'+t.key;clock.type='number';clock.min='1';clock.max='250';clock.step='0.0001';clock.value=t.clock;clock.disabled=!recipes.find(r=>r.id===t.recipeId).overclockable;if(clock.disabled)clock.value='100';field('Clock speed (%)',clock);clock.addEventListener('input',()=>{t.clock=clock.value;render();});
    const remove=document.createElement('button');remove.type='button';remove.className='remove-target';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+t.item+' output');row.append(remove);
    item.addEventListener('change',()=>{t.item=item.value;t.recipeId=recipes.find(r=>r.item===t.item&&!r.manual).id;renderAdditionalTargets();render();});
    recipe.addEventListener('change',()=>{t.recipeId=recipe.value;renderAdditionalTargets();render();});
    amount.addEventListener('input',()=>{t.amount=amount.value;render();});
    remove.addEventListener('click',()=>{additionalTargets.splice(additionalTargets.indexOf(t),1);renderAdditionalTargets();render();});
    list.append(row);
  }
  updateTargetLabels();
}
function initMultipleOutputs(){
  $('addOutput').addEventListener('click',()=>{const used=new Set([$('item').value,...additionalTargets.map(t=>t.item)]);const item=['Modular Frame','Rotor',...automaticItems].find(n=>!used.has(n))||'Iron Plate';const r=recipes.find(r=>r.item===item&&!r.manual);additionalTargets.push({key:String(++targetSequence),item,recipeId:r.id,amount:'1',clock:'100'});renderAdditionalTargets();render();});
  renderAdditionalTargets();
}
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'set_additional_outputs',description:'Replace the additional production targets alongside the main output. Amounts are per minute in continuous mode, or quantities over the shared completion time in batch mode. An empty list removes all additional outputs.',inputSchema:{type:'object',properties:{outputs:{type:'array',items:{type:'object',properties:{item:{type:'string'},recipe:{type:'string'},amount:{type:'number',minimum:0,maximum:1e9},clock:{type:'number',minimum:1,maximum:250,description:'Clock speed percent for this output; defaults to 100.'}},required:['item','recipe','amount'],additionalProperties:false}}},required:['outputs'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!Array.isArray(input.outputs))throw Error('Provide an outputs array.');const root=getRecipe();if(!window.currentResult||root.manual||root.name==='Custom recipe')throw Error('Select a valid automated main output first.');const pending=input.outputs.map(o=>{const recipe=recipes.find(r=>r.item===o.item&&r.name===o.recipe&&!r.manual);if(!recipe||!Number.isFinite(o.amount)||o.amount<0||o.amount>1e9)throw Error('Unknown recipe or invalid output amount');return{recipe,target:o.amount/($('mode').value==='batch'?Number($('minutes').value):1),amount:o.amount,clock:o.clock??100};});planMultipleOutputs([{recipe:root,target:window.currentResult.target,clock:Number($('clock').value)},...pending],chainSettings(),upstreamChoices);additionalTargets.splice(0,additionalTargets.length,...pending.map(t=>({key:String(++targetSequence),item:t.recipe.item,recipeId:t.recipe.id,amount:String(t.amount),clock:String(t.clock)})));renderAdditionalTargets();render();return compactChain(window.currentChain);}})).catch(()=>{});}catch{}}
