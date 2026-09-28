const minedResources=new Set(['Iron Ore','Copper Ore','Caterium Ore','Coal','Limestone','Raw Quartz','Sulfur','Bauxite','Uranium','SAM']);
const upstreamChoices={},resourcePurities={};
function extractionFor(item,settings){
  const purity=Number(settings.purities?.[item]||settings.purity||1);
  if(minedResources.has(item))return{machine:'Miner Mk.'+settings.miner,rate:60*2**(settings.miner-1)*purity,purity,source:'Miner'};
  if(item==='Water')return{machine:'Water Extractor',rate:120,source:'Water_Extractor'};
  if(item==='Crude Oil')return{machine:'Oil Extractor',rate:120*purity,purity,source:'Oil_Extractor'};
  if(item==='Nitrogen Gas')return{machine:'Resource Well Extractor',rate:60*purity,purity,source:'Resource_Well_Pressurizer'};
  return null;
}
function preferredRecipe(item){
  const candidates=recipes.filter(r=>r.item===item&&!r.manual);
  const rank=r=>(/^Unpackage/.test(r.name)?100:0)+(r.alternate?10:0)+(r.name===item?0:r.primary?1:2);
  return candidates.sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name))[0];
}
function planProductionChain(root,target,settings,choices={}){return planMultipleOutputs([{recipe:root,target}],settings,choices);}
function planMultipleOutputs(targets,settings,choices={}){
  if(!Array.isArray(targets)||!targets.length)throw Error("Add at least one production target.");
  const roots=new Map();
  for(const {recipe:r,target} of targets){if(!r||r.manual||!Number.isFinite(target)||target<0||target>1e9)throw Error("Each output needs an automated recipe and a valid non-negative amount.");const previous=roots.get(r.item);if(previous&&previous.recipe.id!==r.id)throw Error("Choose the same recipe for duplicate "+r.item+" targets, or remove the duplicate.");roots.set(r.item,{recipe:r,target:(previous?.target||0)+target});}
  const target=targets[0].target;
  if(!Number.isFinite(target)||target<0||![1,2,3].includes(settings.miner)||!Number.isFinite(settings.clock)||settings.clock<1||settings.clock>250||!Number.isFinite(settings.extractionClock)||settings.extractionClock<1||settings.extractionClock>250||!Number.isInteger(settings.satellites)||settings.satellites<1||settings.satellites>100)throw Error('Use clock speeds from 1% to 250% and a whole number of satellites per well.');
  if(![.5,1,2].includes(settings.purity)||Object.values(settings.purities||{}).some(v=>![.5,1,2].includes(Number(v))))throw Error('Choose a valid resource purity.');
  const nodes=new Map(),active=new Set(),warnings=new Set();
  function build(item,forced){
    forced=roots.get(item)?.recipe||forced;
    if(nodes.has(item))return nodes.get(item);
    const extraction=extractionFor(item,settings),choice=choices[item];
    let r=forced||((choice&&choice!=='extract'&&choice!=='external')?recipes.find(r=>r.id===choice&&r.item===item):null);
    if(!forced&&!r&&choice!=='external'&&!(extraction&&(!choice||choice==='extract')))r=preferredRecipe(item);
    const ext=!forced&&choice!=='external'&&extraction&&(!choice||choice==='extract');
    const node={item,recipe:ext?null:r,extraction:ext?extraction:null,edges:[],demand:0,incoming:0,final:!!forced};nodes.set(item,node);active.add(item);
    if(!ext&&r&&!r.manual){for(const [input,rate] of Object.entries(r.inputs)){
      if(active.has(input)){
        const key='External cycle: '+input;
        if(!nodes.has(key))nodes.set(key,{item:input,external:true,cycle:true,edges:[],demand:0,incoming:0});
        node.edges.push({key,ratio:rate/r.rate});nodes.get(key).incoming++;
        warnings.add(`Recipe loop: ${r.name} needs ${input} from outside this chain. Change a stage recipe to remove the loop.`);
      }else{const child=build(input);node.edges.push({key:input,ratio:rate/r.rate});child.incoming++;}
    }}
    active.delete(item);return node;
  }
  for(const [item,entry] of roots){const node=build(item,entry.recipe);node.demand+=entry.target;node.exportDemand=entry.target;}
  const queue=[...nodes.entries()].filter(([,n])=>!n.incoming).map(([key])=>key),ordered=[];
  for(let i=0;i<queue.length;i++){const key=queue[i],n=nodes.get(key);ordered.push(n);for(const edge of n.edges){const child=nodes.get(edge.key);child.demand+=n.demand*edge.ratio;if(--child.incoming===0)queue.push(edge.key);}}
  const totals={},surplus={};let pressurizers=0;
  for(const n of ordered){const r=n.recipe;n.machine=n.extraction?.machine||(r&&!r.manual?r.machine:null);n.rate=n.extraction?.rate||r?.rate||0;n.clock=n.extraction?settings.extractionClock:r?.overclockable?settings.clock:100;
    if(!n.machine){n.external=true;n.count=0;if(n.demand>0)warnings.add(`${n.item}: ${n.cycle?'loop input':'manual or externally supplied resource'}; no automated machine count included.`);continue;}
    const result=calculate(n.rate,n.demand,n.clock,true);Object.assign(n,{count:result.count,balanced:result.balanced,capacity:result.capacity});totals[n.machine]=(totals[n.machine]||0)+n.count;
    if(n.item==='Nitrogen Gas'&&n.extraction)pressurizers+=Math.ceil(n.count/settings.satellites);
    if(r)for(const [item,rate] of Object.entries(r.outputs)){if(item!==n.item)surplus[item]=(surplus[item]||0)+rate*n.demand/r.rate;}
  }
  if(pressurizers)totals['Resource Well Pressurizer']=pressurizers;
  return{targets:[...roots.entries()].map(([item,entry])=>({item,recipe:entry.recipe.name,target:entry.target})),stages:ordered.reverse(),totals,total:Object.values(totals).reduce((a,b)=>a+b,0),upstream:ordered.filter(n=>!n.final).reduce((sum,n)=>sum+n.count,0)+pressurizers,external:ordered.some(n=>n.external&&n.demand>0),warnings:[...warnings],surplus,pressurizers};
}
function chainSettings(){return{miner:Number($('minerTier').value),purity:Number($('nodePurity').value),purities:resourcePurities,clock:Number($('clock').value),extractionClock:Number($('extractionClock').value),satellites:Number($('wellSatellites').value)};}
function renderProductionChain(root,target){
  const panel=$('productionChain');panel.hidden=!!root.manual||root.name==='Custom recipe';$('multiTargetError').textContent=panel.hidden&&additionalTargets.length?'Choose an automated main output to calculate the combined plan.':'';if(panel.hidden){window.currentChain=null;return null;}
  try{
    const settings=chainSettings(),plan=planMultipleOutputs(currentProductionTargets(root,target),settings,upstreamChoices);window.currentChain=plan;$('chainError').textContent='';
    $('combinedTargets').textContent=plan.targets.map(t=>t.item+': '+fmt(t.target)+' '+unit(t.item)+'/min').join(' · ');$('chainTotal').textContent=fmt(plan.total);$('upstreamCount').textContent=fmt(plan.upstream);$('chainStatus').textContent=plan.external?'External supply required for the items marked below.':'Includes final production, every input stage, and resource extraction.';
    $('machineTotals').replaceChildren();for(const [name,count] of Object.entries(plan.totals).sort(([a],[b])=>a.localeCompare(b))){const chip=document.createElement('div');const strong=document.createElement('strong');strong.textContent=fmt(count);chip.append(strong,document.createTextNode(' '+machineName(name,count)));$('machineTotals').append(chip);}
    const body=$('chainRows');body.replaceChildren();
    for(const n of plan.stages){
      const tr=document.createElement('tr');if(n.final)tr.className='final-stage';
      const itemCell=document.createElement('td'),title=document.createElement('div');title.className='stage-title';
      if(wikiImages[n.item]){const img=document.createElement('img');img.src=wikiImages[n.item].path;img.alt='';img.width=32;img.height=32;title.append(img);}
      const name=document.createElement('strong');name.textContent=n.item;title.append(name);itemCell.append(title);
      if(n.final){const label=document.createElement('p');label.className='hint';label.textContent='Target: '+fmt(n.exportDemand)+' '+unit(n.item)+'/min · '+n.recipe.name+(n.demand>n.exportDemand+1e-8?' · also supplies other stages':'');itemCell.append(label);}
      else if(n.cycle){const label=document.createElement('p');label.className='hint';label.textContent='External supply to break recipe loop';itemCell.append(label);}
      else{
        const select=document.createElement('select');select.setAttribute('aria-label','Production recipe for '+n.item);select.className='stage-select';
        if(extractionFor(n.item,settings))select.add(new Option('Extract from resource source','extract'));
        recipes.filter(r=>r.item===n.item&&!r.manual).forEach(r=>select.add(new Option((r.alternate?'Alternate: ':'')+r.name,r.id)));
        select.add(new Option('Supply externally','external'));select.value=n.extraction?'extract':n.recipe&&!n.recipe.manual?n.recipe.id:'external';
        select.addEventListener('change',()=>{upstreamChoices[n.item]=select.value;renderProductionChain(getRecipe(),window.currentResult.target);});itemCell.append(select);
      }
      if(n.extraction?.purity){const select=document.createElement('select');select.className='purity-select';select.setAttribute('aria-label','Resource purity for '+n.item);for(const [value,label] of [[.5,'Impure node'],[1,'Normal node'],[2,'Pure node']])select.add(new Option(label,String(value)));select.value=String(n.extraction.purity);select.addEventListener('change',()=>{resourcePurities[n.item]=Number(select.value);renderProductionChain(getRecipe(),window.currentResult.target);});itemCell.append(select);}
      const rate=document.createElement('td');rate.textContent=fmt(n.demand)+' '+unit(n.item)+'/min';
      const machines=document.createElement('td');const quantity=document.createElement('strong');quantity.textContent=n.external?'External':fmt(n.count);machines.append(quantity);const machine=document.createElement('div');machine.className='hint';machine.textContent=n.machine||'Supplied separately';machines.append(machine);
      const clock=document.createElement('td');clock.textContent=n.external?'—':n.count===0?'—':n.item==='Nitrogen Gas'&&n.extraction?fmt(n.clock)+'% at pressurizer':n.balanced<1?'1% intermittently':fmt(n.balanced)+'%';
      tr.append(itemCell,rate,machines,clock);body.append(tr);
    }
    $('chainWarnings').replaceChildren();for(const warning of plan.warnings){const p=document.createElement('p');p.textContent=warning;$('chainWarnings').append(p);}
    $('chainSurplus').hidden=!Object.keys(plan.surplus).length;rows($('chainSurplusRows'),plan.surplus,1,true);
    $('wellSettings').hidden=!plan.stages.some(n=>n.item==='Nitrogen Gas'&&n.extraction);$('wellNote').hidden=!plan.pressurizers;
    return plan;
  }catch(e){$('chainError').textContent=e.message;$('combinedTargets').textContent='';$('chainRows').replaceChildren();$('machineTotals').replaceChildren();$('chainTotal').textContent='—';$('upstreamCount').textContent='—';$('chainStatus').textContent='Correct the settings to calculate the chain.';$('chainWarnings').replaceChildren();$('chainSurplus').hidden=true;window.currentChain=null;return null;}
}
function initProductionChain(){for(const id of ['minerTier','nodePurity','extractionClock','wellSatellites'])$(id).addEventListener('input',()=>{if(id==='nodePurity')for(const key of Object.keys(resourcePurities))delete resourcePurities[key];if(window.currentResult&&!window.currentResult.manual)renderProductionChain(getRecipe(),window.currentResult.target);});$('resetChain').addEventListener('click',()=>{for(const key of Object.keys(upstreamChoices))delete upstreamChoices[key];for(const key of Object.keys(resourcePurities))delete resourcePurities[key];if(window.currentResult&&!window.currentResult.manual)renderProductionChain(getRecipe(),window.currentResult.target);});}
function compactChain(plan){return plan?{targets:plan.targets,totalMachines:plan.total,upstreamMachines:plan.upstream,byMachine:plan.totals,externalSupplyRequired:plan.external,warnings:plan.warnings,stages:plan.stages.map(n=>({item:n.item,requiredPerMinute:n.demand,machine:n.machine||null,count:n.count,recipe:n.recipe?.name||null,balancedClock:n.balanced||null}))}:null;}
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'configure_production_chain',description:'Update extraction settings and input recipes for the currently selected final product, then return its full production chain.',inputSchema:{type:'object',properties:{minerTier:{type:'integer',enum:[1,2,3]},purity:{type:'number',enum:[0.5,1,2]},extractionClock:{type:'number',minimum:1,maximum:250},satellitesPerWell:{type:'integer',minimum:1,maximum:100},inputRecipes:{type:'array',items:{type:'object',properties:{item:{type:'string'},recipe:{type:'string',description:'Exact recipe name, extract, or external.'}},required:['item','recipe'],additionalProperties:false}}},additionalProperties:false},annotations:{readOnlyHint:false},execute(input){const root=getRecipe();if(!window.currentResult||root.manual||root.name==='Custom recipe')throw Error('Select a valid automated output recipe first.');const settings=chainSettings(),choices={...upstreamChoices};if(input.minerTier!==undefined)settings.miner=input.minerTier;if(input.purity!==undefined){settings.purity=input.purity;settings.purities={};}if(input.extractionClock!==undefined)settings.extractionClock=input.extractionClock;if(input.satellitesPerWell!==undefined)settings.satellites=input.satellitesPerWell;for(const change of input.inputRecipes||[]){if(currentProductionTargets(root,window.currentResult.target).some(t=>t.recipe.item===change.item))throw Error('Use the main recipe selector for the final output.');if(change.recipe==='extract'){if(!extractionFor(change.item,settings))throw Error('This resource cannot be extracted');choices[change.item]='extract';}else if(change.recipe==='external'){choices[change.item]='external';}else{const r=recipes.find(r=>r.item===change.item&&r.name===change.recipe&&!r.manual);if(!r)throw Error('Unknown input recipe');choices[change.item]=r.id;}}planMultipleOutputs(currentProductionTargets(root,window.currentResult.target),settings,choices);$('minerTier').value=settings.miner;$('nodePurity').value=settings.purity;$('extractionClock').value=settings.extractionClock;$('wellSatellites').value=settings.satellites;if(input.purity!==undefined)for(const key of Object.keys(resourcePurities))delete resourcePurities[key];Object.assign(upstreamChoices,choices);return compactChain(renderProductionChain(root,window.currentResult.target));}})).catch(()=>{});}catch{}}
