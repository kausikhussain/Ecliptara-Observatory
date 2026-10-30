import { fetchNearEarthObjects, saveApiKey, getApiKey, formatDistance, formatVelocity, formatDiameter, formatLunarDistance, formatDateTime, shortName } from './neo-client.js';
import { calculateEnergy, formatEnergy, formatMass } from './impact-model.js';

const $ = (id) => document.getElementById(id);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const utcToday = () => new Date().toISOString().slice(0, 10);
const formatPrettyDate = (value, opts = {}) => {
  if (!value) return '—';
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', year:'numeric', timeZone:'UTC', ...opts }).format(d);
};
const escapeText = (value) => String(value ?? '');
const make = (tag, className, text) => { const node=document.createElement(tag); if(className)node.className=className; if(text!==undefined)node.textContent=text; return node; };
const safeHref = (value) => { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : null; } catch { return null; } };
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const state = {
  date: utcToday(), objects: [], selectedId: null, compareIds: [], sourceState: 'pending',
  fetchedAt: null, returnedCount: 0, error: null, requestController: null, scene: null,
  currentView: 'observatory', inspector: 'object', reducedMotion: false, gridVisible: true,
  catalogQuery: '', commandIndex: 0, commands: [], apod: null, launch: null, launchTimer: null, satellites: null, satelliteFetchedAt: null, satelliteState: 'pending', selectedSatelliteId: null
};

function toast(message, kind='') {
  const region=$('toast-region'); const item=make('div',`toast ${kind}`,message); region.append(item);
  setTimeout(()=>{item.style.opacity='0';item.style.transform='translateY(6px)';setTimeout(()=>item.remove(),220);},3900);
}
function setBoot(status, index, progress) {
  $('boot-status').textContent=status; $('boot-status-index').textContent=index; $('boot-progress-fill').style.width=`${progress}%`;
}
function finishBoot(){
  $('boot-screen').classList.add('is-done'); $('app-frame').classList.add('is-ready'); $('app-frame').setAttribute('aria-hidden','false');
  setTimeout(()=>{ $('boot-screen').remove(); },850);
}
function setSourceState(sourceState, detail='') {
  state.sourceState=sourceState;
  const label = { live:'NASA FEED / LIVE', cached:'LOCAL CACHE / CACHED', error:'SOURCE UNAVAILABLE', loading:'CONNECTING TO NASA', pending:'AWAITING SOURCE' }[sourceState] || sourceState.toUpperCase();
  $('top-data-state').textContent=label;
  const dot=$('top-data-state').previousElementSibling;
  if(dot){dot.classList.remove('live','cached','error');if(sourceState==='live')dot.classList.add('live');else if(sourceState==='cached'||sourceState==='loading')dot.classList.add('cached');else if(sourceState==='error')dot.classList.add('error');}
  $('source-state').textContent=sourceState.toUpperCase(); $('source-state').className=`source-state ${sourceState==='live'?'live':sourceState==='cached'?'cached':sourceState==='error'?'error':''}`;
  $('footer-feed-state').textContent=`SOURCE STATUS: ${sourceState.toUpperCase()}`;
  $('feed-integrity-dot').className=`feed-status-dot ${sourceState==='live'?'live':sourceState==='error'?'error':''}`;
  $('feed-integrity-title').textContent=sourceState==='live'?'Source response received':sourceState==='cached'?'Showing cached observations':sourceState==='error'?'Live data unavailable':sourceState==='loading'?'Connecting to source':'Waiting for source data';
  $('feed-integrity-copy').textContent=detail || (sourceState==='live'?'The selected date returned successfully from NASA NeoWs.':sourceState==='cached'?'A previously retrieved response is being shown and may not reflect the latest source state.':sourceState==='error'?'No live response or usable cached response is available.':'The source state will be shown after a request completes.');
}

async function loadDate(date, {force=false}={}) {
  state.date=date; $('date-picker').value=date; $('top-date-label').textContent=formatPrettyDate(date,{month:'short'}).toUpperCase()+' / UTC';
  $('source-date').textContent=date; $('source-updated').textContent='Requesting…';
  if(state.requestController) state.requestController.abort();
  const controller=new AbortController();state.requestController=controller;
  setSourceState('loading','Requesting the selected UTC observation window from NASA NeoWs.');
  $('list-summary-text').textContent='Requesting observations';$('object-count').textContent='…';$('timeline-count').textContent='Loading…';
  $('object-list').replaceChildren(...Array.from({length:5},()=>make('div','skeleton')));
  try {
    const result=await fetchNearEarthObjects(date,{signal:controller.signal});
    if(controller.signal.aborted || date!==state.date)return;
    state.objects=result.objects;state.fetchedAt=result.fetchedAt;state.returnedCount=result.returnedCount;state.error=result.error;
    state.selectedId=state.objects.some(x=>x.id===state.selectedId)?state.selectedId:(state.objects[0]?.id||null);
    state.compareIds=state.compareIds.filter(id=>state.objects.some(x=>x.id===id));
    setSourceState(result.state,result.state==='cached' ? `Live request unavailable; cached data from ${new Date(result.fetchedAt).toLocaleString()}.` : `Response received from NASA NeoWs at ${new Date(result.fetchedAt).toLocaleTimeString()}.`);
    $('source-updated').textContent=new Date(result.fetchedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    if(result.rateLimitRemaining!==null && Number.isFinite(result.rateLimitRemaining)) $('source-updated').title=`API requests remaining in the current window: ${result.rateLimitRemaining}`;
    renderAll();
  } catch(error) {
    if(controller.signal.aborted || error.name==='AbortError')return;
    state.objects=[];state.selectedId=null;state.error=error.message;state.fetchedAt=null;state.returnedCount=0;
    setSourceState('error',error.message);$('source-updated').textContent='Unavailable';
    renderAll();renderError(error.message);
  }
}
function renderError(message){
  const list=$('object-list');list.replaceChildren();const box=make('div','list-error');box.append(make('b','', 'Observation feed unavailable'),make('p','',message));
  const retry=make('button','small-button primary','Retry request');retry.type='button';retry.addEventListener('click',()=>loadDate(state.date,{force:true}));box.append(retry);list.append(box);
  $('object-count').textContent='—';$('list-summary-text').textContent='No source response';$('timeline-count').textContent='Unavailable';$('timeline-date-full').textContent=formatPrettyDate(state.date);renderEmptyInspector();
}
function getVisibleObjects(queryOverride=null){
  let q=(queryOverride===null?$('object-search').value:queryOverride).trim().toLowerCase();
  let list=state.objects.filter(o=>(!q||`${o.name} ${o.designation} ${o.nasaId}`.toLowerCase().includes(q))&&(!$('pha-only').checked||o.potentiallyHazardous));
  const sort=$('sort-select').value;
  if(sort==='velocity')list.sort((a,b)=>(b.velocityKmh??-Infinity)-(a.velocityKmh??-Infinity));
  else if(sort==='diameter')list.sort((a,b)=>(b.avgDiameter??-Infinity)-(a.avgDiameter??-Infinity));
  else if(sort==='date')list.sort((a,b)=>(a.timestamp??Infinity)-(b.timestamp??Infinity));
  else list.sort((a,b)=>(a.missKm??Infinity)-(b.missKm??Infinity));
  return list;
}
function renderList() {
  const root=$('object-list');root.replaceChildren();
  const list=getVisibleObjects();
  $('object-count').textContent=state.objects.length;
  $('list-summary-text').textContent=`${list.length} OF ${state.objects.length} OBJECTS`;
  $('list-summary-right').textContent='UTC';
  if(!state.objects.length){const placeholder=make('div','list-placeholder');placeholder.append(make('span','placeholder-orbit'),make('b','',state.error?'No current response':'No objects returned'),make('p','',state.error?'Retry the request or configure a NASA API key.':'The source returned no near-Earth objects for this date. This is not a general impact-risk assessment.'));root.append(placeholder);return;}
  if(!list.length){const placeholder=make('div','list-placeholder');placeholder.append(make('span','placeholder-orbit'),make('b','','No matches'),make('p','','Try another search term or disable the PHA-only filter.'));root.append(placeholder);return;}
  list.forEach((neo,index)=>{
    const row=make('div',`object-row ${neo.id===state.selectedId?'active':''}`);row.setAttribute('role','button');row.tabIndex=0;row.setAttribute('aria-pressed',String(neo.id===state.selectedId));row.dataset.id=neo.id;
    row.append(make('span','row-index',String(index+1).padStart(2,'0')));
    const main=make('span','row-main');main.append(make('span','row-name',shortName(neo.name,26)),make('span','row-meta',neo.closeDateFull?formatDateTime(neo):neo.closeDate||'Approach time unavailable'));
    if(neo.potentiallyHazardous){const badges=make('span','row-badges');badges.append(make('span','pha-tag','PHA · SOURCE FLAG'));main.append(badges);}
    row.append(main);
    const distance=make('span','row-distance');distance.append(make('strong','',formatLunarDistance(neo.missKm)),make('small','',formatDistance(neo.missKm)));row.append(distance);
    const compare=make('button',`row-compare ${state.compareIds.includes(neo.id)?'is-added':''}`,state.compareIds.includes(neo.id)?'✓':'+');compare.type='button';compare.title=state.compareIds.includes(neo.id)?'Remove from comparison':'Add to comparison';compare.setAttribute('aria-label',compare.title);compare.dataset.compareId=neo.id;row.append(compare);
    row.addEventListener('click',(event)=>{if(event.target.closest('[data-compare-id]'))return;selectObject(neo.id);});
    row.addEventListener('keydown',(event)=>{if((event.key==='Enter'||event.key===' ') && event.target===row){event.preventDefault();selectObject(neo.id);}});
    compare.addEventListener('click',(event)=>{event.stopPropagation();toggleCompare(neo.id);});
    root.append(row);
  });
}
function renderEmptyInspector(){
  const root=$('object-inspector');root.replaceChildren();const empty=make('div','inspector-empty');const orbit=make('div','empty-orbit');orbit.append(make('span'),make('i'));empty.append(orbit,make('p','overline','NO ACTIVE SELECTION'),make('h3','','Choose an encounter.'),make('p','','Select an object from the index or click its marker in the celestial field to open a data-grounded object file.'));
  const hints=make('div','empty-hint');[['01','Designation & approach time'],['02','Miss distance & velocity'],['03','Source & data context']].forEach(([n,t])=>{hints.append(make('span','',n),make('span','',t));});empty.append(hints);root.append(empty);
}
function renderObjectInspector(neo){
  const root=$('object-inspector');root.replaceChildren();if(!neo){renderEmptyInspector();return;}
  const article=make('article','object-file');const top=make('div','file-topline');top.append(make('span','file-id',`NEO REF / ${neo.nasaId||neo.id}`),make('span',`hazard-badge ${neo.potentiallyHazardous?'flagged':''}`,neo.potentiallyHazardous?'SOURCE FLAG: PHA':'SOURCE FLAG: NOT PHA'));article.append(top);
  article.append(make('h2','file-name',neo.name),make('p','file-time',`CLOSE APPROACH · ${formatDateTime(neo)} UTC`));
  article.append(make('p','file-status-note',neo.potentiallyHazardous?'The source flags this object as potentially hazardous. This label is not a prediction that it will impact Earth.':'The source does not flag this object as a potentially hazardous asteroid. This is not a guarantee of zero risk.'));
  const metrics=make('div','metric-stack');
  const metric=(label,value,sub='')=>{const r=make('div','metric-row');r.append(make('span','',label));const right=make('div','');right.append(make('b','',value));if(sub)right.append(make('small','',sub));r.append(right);metrics.append(r);};
  metric('NOMINAL MISS DISTANCE',formatDistance(neo.missKm),formatLunarDistance(neo.missKm));
  metric('RELATIVE VELOCITY',formatVelocity(neo.velocityKmh,neo.velocityKms),Number.isFinite(neo.velocityKmh)?`${Math.round(neo.velocityKmh).toLocaleString('en-IN')} km/h`:'' );
  metric('ESTIMATED DIAMETER',neo.minDiameter!==null&&neo.maxDiameter!==null?`${formatDiameter(neo.minDiameter)} – ${formatDiameter(neo.maxDiameter)}`:'Not reported','Source estimate range');
  metric('ABSOLUTE MAGNITUDE',Number.isFinite(neo.absoluteMagnitude)?`H ${neo.absoluteMagnitude.toFixed(2)}`:'Not reported','Brightness-related catalog value');
  article.append(metrics);
  const actions=make('div','file-actions');const cmp=make('button',`small-button ${state.compareIds.includes(neo.id)?'primary':''}`,state.compareIds.includes(neo.id)?'✓ In comparison':'+ Compare');cmp.type='button';cmp.addEventListener('click',()=>toggleCompare(neo.id));
  const impact=make('button','small-button primary','Impact lab ↗');impact.type='button';impact.addEventListener('click',()=>{openView('impact');if(Number.isFinite(neo.avgDiameter)){$('impact-diameter').value=Math.max(1,Math.min(500,neo.avgDiameter));updateImpact();}toast('Impact lab uses a hypothetical scenario; no collision is implied.');});actions.append(cmp,impact);article.append(actions);
  const source=make('div','file-source');source.append(make('span','','SOURCE / NASA NEOWS'));const href=safeHref(neo.nasaUrl);if(href){const a=make('a','','JPL record ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';source.append(a);}article.append(source);
  root.append(article);
}
function renderCompareInspector(){
  const root=$('compare-inspector');root.replaceChildren();const objects=state.compareIds.map(id=>state.objects.find(o=>o.id===id)).filter(Boolean);
  if(!objects.length){root.append(make('div','compare-empty-small','No objects selected. Use the + control on an encounter row to add up to three objects for comparison.'));return;}
  objects.forEach(o=>{const item=make('div','compare-item-small');item.append(make('b','',o.name),make('span','',`${formatLunarDistance(o.missKm)} · ${formatVelocity(o.velocityKmh,o.velocityKms)}`));const remove=make('button','','REMOVE FROM COMPARISON ×');remove.type='button';remove.addEventListener('click',()=>toggleCompare(o.id));item.append(remove);root.append(item);});
  const go=make('button','small-button primary','Open comparison workspace ↗');go.type='button';go.style.margin='12px';go.addEventListener('click',()=>openView('compare'));root.append(go);
}
function renderAll(){
  renderList();const selected=state.objects.find(o=>o.id===state.selectedId);renderObjectInspector(selected);renderCompareInspector();renderComparePage();
  if(state.scene)state.scene.setObjects(state.objects,state.selectedId);
  if(selected){$('scene-object-label').classList.add('visible');$('scene-object-name').textContent=shortName(selected.name,24).toUpperCase();$('scene-object-distance').textContent=`${formatLunarDistance(selected.missKm)} / ${formatVelocity(selected.velocityKmh,selected.velocityKms)}`;}
  else {$('scene-object-label').classList.remove('visible');$('scene-object-name').textContent='NO OBJECT SELECTED';$('scene-object-distance').textContent='SELECT AN ENCOUNTER TO INSPECT';}
  $('timeline-date-full').textContent=formatPrettyDate(state.date);$('timeline-date-left').textContent=formatPrettyDate(state.date,{day:'2-digit',month:'short'});$('timeline-date-right').textContent='UTC';$('timeline-count').textContent=`${state.objects.length} objects`;
  $('catalog-count').textContent=`${state.objects.length} objects`;$('catalog-count').title='Objects returned for the selected UTC date';renderCatalog();
}
function selectObject(id){const neo=state.objects.find(o=>o.id===id);if(!neo)return;state.selectedId=id;renderAll();if(window.innerWidth<1180)$('inspector-panel').scrollIntoView({behavior:state.reducedMotion?'auto':'smooth',block:'nearest'});}
function toggleCompare(id){
  if(state.compareIds.includes(id))state.compareIds=state.compareIds.filter(x=>x!==id);
  else {if(state.compareIds.length>=3){toast('Compare up to three objects at once. Remove one to add another.');return;}if(!state.objects.some(x=>x.id===id)){toast('This object is not in the current observation window.');return;}state.compareIds.push(id);}
  $('compare-count').textContent=state.compareIds.length;renderList();renderCompareInspector();renderComparePage();const selected=state.objects.find(o=>o.id===state.selectedId);if(selected)renderObjectInspector(selected);
  toast(state.compareIds.includes(id)?'Added to encounter comparison.':'Removed from encounter comparison.','success');
}
function renderComparePage(){
  const root=$('compare-workspace');if(!root)return;root.replaceChildren();const objects=state.compareIds.map(id=>state.objects.find(o=>o.id===id)).filter(Boolean);
  if(!objects.length){const empty=make('div','compare-empty');empty.append(make('span','','03'),make('h3','','Build your comparison.'),make('p','','Add objects from the encounter index using the + control on each result. The table compares reported values, not a composite risk score.'));const button=make('button','primary-button','Open encounter index ↗');button.type='button';button.dataset.view='encounters';button.addEventListener('click',()=>openView('encounters'));empty.append(button);root.append(empty);return;}
  const wrap=make('div','compare-table-wrap');const table=make('table','compare-table');const thead=make('thead');const header=make('tr');header.append(make('th','','Measurement'));
  objects.forEach(o=>{const th=make('th');const name=make('span','',o.name);const remove=make('button','compare-remove','×');remove.type='button';remove.title=`Remove ${o.name}`;remove.setAttribute('aria-label',`Remove ${o.name} from comparison`);remove.addEventListener('click',()=>toggleCompare(o.id));th.append(name,remove);header.append(th);});
  thead.append(header);table.append(thead);const tbody=make('tbody');
  const rows=[['Closest approach',o=>formatDateTime(o)],['Miss distance',o=>formatDistance(o.missKm)],['Moon distance',o=>formatLunarDistance(o.missKm)],['Relative velocity',o=>formatVelocity(o.velocityKmh,o.velocityKms)],['Diameter range',o=>o.minDiameter!==null&&o.maxDiameter!==null?`${formatDiameter(o.minDiameter)} – ${formatDiameter(o.maxDiameter)}`:'Not reported'],['Source PHA label',o=>o.potentiallyHazardous?'Flagged':'Not flagged']];
  rows.forEach(([label,fn])=>{const tr=make('tr');tr.append(make('td','',label));objects.forEach(o=>tr.append(make('td','',fn(o))));tbody.append(tr);});
  table.append(tbody);wrap.append(table);root.append(wrap);
  const note=make('p','','Values are taken from the current observation response. Missing fields are shown as “Not reported”; classification is not equivalent to an impact probability.');note.style.cssText='font-size:9px;line-height:1.8;color:var(--quiet);margin-top:13px';root.append(note);
}
function oName(o){return o?.name||'object';}
function renderCatalog(){
  const root=$('catalog-grid');if(!root)return;const q=$('catalog-search')?.value?.trim().toLowerCase()||'';root.replaceChildren();const list=state.objects.filter(o=>!q||`${o.name} ${o.designation} ${o.nasaId}`.toLowerCase().includes(q)).sort((a,b)=>(a.missKm??Infinity)-(b.missKm??Infinity));
  if(!list.length){const p=make('p','list-error',state.objects.length?'No objects match the search.':'No observations loaded for this date.');root.append(p);return;}
  list.forEach((o,i)=>{const card=make('article','catalog-row');card.append(make('span','catalog-number',String(i+1).padStart(2,'0')));const content=make('div');content.append(make('h3','',o.name),make('p','',`${o.closeDate||'Approach date unavailable'} · ${o.potentiallyHazardous?'PHA source flag':'No PHA source flag'}`));card.append(content);const rhs=make('div','catalog-values');rhs.append(make('b','',formatLunarDistance(o.missKm)),make('small','',formatDistance(o.missKm)));const controls=make('div','catalog-controls');const view=make('button','small-button','Inspect');view.type='button';view.addEventListener('click',()=>{selectObject(o.id);openView('observatory');});const cmp=make('button','small-button',state.compareIds.includes(o.id)?'Added':'Compare +');cmp.type='button';cmp.addEventListener('click',()=>toggleCompare(o.id));controls.append(view,cmp);rhs.append(controls);card.append(rhs);root.append(card);});
}
function openView(view){
  const names=['observatory','encounters','compare','satellites','impact','spacebrief'];if(!names.includes(view))return;
  state.currentView=view;all('.view').forEach(el=>el.classList.remove('active'));$(`view-${view}`).classList.add('active');all('.rail-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  if(view==='compare')renderComparePage();if(view==='encounters')renderCatalog();if(view==='satellites'){loadSatellites();setTimeout(drawSatelliteMap,80);}if(view==='impact')updateImpact();if(view==='spacebrief'){if(!state.apod)loadApod();loadLaunchBrief();}
  if(view==='observatory'&&state.scene){setTimeout(()=>window.dispatchEvent(new Event('resize')),50);}
}
function switchInspector(tab){state.inspector=tab;all('.inspector-tab').forEach(b=>b.classList.toggle('active',b.dataset.inspector===tab));$('object-inspector').classList.toggle('hidden',tab!=='object');$('compare-inspector').classList.toggle('hidden',tab!=='compare');if(tab==='compare')renderCompareInspector();}
function shiftDate(days){const d=new Date(`${state.date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);loadDate(d.toISOString().slice(0,10));}

async function loadSatellites(force=false){
  const list=$('satellite-list');
  if(state.satellites && !force){renderSatelliteList();return;}
  $('satellite-state').textContent='REQUESTING';$('satellite-state').className='source-state cached';$('satellite-updated').textContent='Retrieving latest station TLEs';list.replaceChildren(...Array.from({length:5},()=>make('div','skeleton')));
  try{
    const response=await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON',{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`CelesTrak returned HTTP ${response.status}.`);
    const raw=await response.json();if(!Array.isArray(raw))throw new Error('The station endpoint did not return a JSON array.');
    const library=await import('https://cdn.jsdelivr.net/npm/satellite.js@6.0.1/+esm');
    const now=new Date();const propagated=[];
    for(const item of raw){
      const line1=item.TLE_LINE1||item.TLE_LINE_1||item.line1;const line2=item.TLE_LINE2||item.TLE_LINE_2||item.line2;
      if(!line1||!line2)continue;
      try{
        const satrec=library.twoline2satrec(line1,line2);const position=library.propagate(satrec,now);if(!position?.position)continue;
        const gmst=library.gstime(now);const geo=library.eciToGeodetic(position.position,gmst);
        if(!geo||!Number.isFinite(geo.latitude)||!Number.isFinite(geo.longitude))continue;
        const tleYear=Number(line1.slice(18,20));const tleDay=Number(line1.slice(20,32));const parsedTleEpoch=Number.isFinite(tleYear)&&Number.isFinite(tleDay)?new Date(Date.UTC(tleYear<57?2000+tleYear:1900+tleYear,0,1)+(tleDay-1)*86400000):null;const epoch=item.EPOCH||item.epoch||parsedTleEpoch;const epochDate=epoch instanceof Date?epoch:(epoch?new Date(epoch):null);
        propagated.push({id:String(item.NORAD_CAT_ID||item.NORAD_ID||item.OBJECT_ID||line1.slice(2,7)),name:String(item.OBJECT_NAME||item.name||'Unnamed orbital object'),country:String(item.COUNTRY_CODE||item.country_code||''),objectType:String(item.OBJECT_TYPE||item.object_type||'Unknown'),latitude:library.degreesLat(geo.latitude),longitude:library.degreesLong(geo.longitude),altitudeKm:Number(geo.height),epoch:epochDate&&!Number.isNaN(epochDate.getTime())?epochDate.toISOString():null,tleLine1:line1,tleLine2:line2});
      }catch{/* skip malformed or decayed records */}
    }
    if(!propagated.length)throw new Error('No valid TLE records could be propagated from the response.');
    state.satellites=propagated;state.satelliteFetchedAt=Date.now();state.satelliteState='live';
    $('satellite-state').textContent='SOURCE RECEIVED';$('satellite-state').className='source-state live';$('satellite-updated').textContent=`Updated ${new Date(state.satelliteFetchedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} · UTC positions`;
    $('sat-map-time').textContent=`UTC / ${new Date().toISOString().slice(11,19)}`;
    renderSatelliteList();drawSatelliteMap();
  }catch(error){
    state.satelliteState='error';$('satellite-state').textContent='UNAVAILABLE';$('satellite-state').className='source-state error';$('satellite-updated').textContent=error.message;list.replaceChildren();const box=make('div','list-error');box.append(make('b','','Orbital catalog unavailable'),make('p','',error.message));const retry=make('button','small-button primary','Retry catalog');retry.type='button';retry.addEventListener('click',()=>loadSatellites(true));box.append(retry);list.append(box);toast('Satellite catalog could not be loaded. Check connectivity and try again.','error');
  }
}
function renderSatelliteList(){
  const root=$('satellite-list');root.replaceChildren();const q=$('satellite-search').value.trim().toLowerCase();const data=(state.satellites||[]).filter(s=>!q||`${s.name} ${s.id} ${s.country} ${s.objectType}`.toLowerCase().includes(q));
  $('satellite-count').textContent=`${data.length} / ${(state.satellites||[]).length} objects`;
  if(!data.length){root.append(make('div','list-error',state.satellites?.length?'No catalog objects match the search.':'No propagated objects are available.'));return;}
  data.forEach((sat,i)=>{const b=make('button',`satellite-row ${state.selectedSatelliteId===sat.id?'active':''}`);b.type='button';b.dataset.id=sat.id;b.append(make('span','satellite-index',String(i+1).padStart(2,'0')));const main=make('span','satellite-row-main');main.append(make('b','',sat.name),make('small','',`${sat.id} · ${sat.country||'country not reported'}`));b.append(main);const rhs=make('span','satellite-row-value');rhs.append(make('b','',`${sat.latitude.toFixed(1)}°`),make('small','',`${sat.longitude.toFixed(1)}°`));b.append(rhs);b.addEventListener('click',()=>selectSatellite(sat.id));root.append(b);});
}
function drawSatelliteMap(){
  const canvas=$('satellite-map-canvas');if(!canvas)return;const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;const dpr=Math.min(window.devicePixelRatio||1,1.7);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='rgba(235,242,246,.21)';ctx.lineWidth=.65;
  for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*h;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  for(let lon=-180;lon<=180;lon+=30){const x=(lon+180)/360*w;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  (state.satellites||[]).forEach(s=>{const x=(s.longitude+180)/360*w,y=(90-s.latitude)/180*h;const selected=s.id===state.selectedSatelliteId;ctx.beginPath();ctx.fillStyle=selected?'#e7bb83':'#83d7e0';ctx.shadowColor=selected?'rgba(231,187,131,.8)':'rgba(131,215,224,.55)';ctx.shadowBlur=selected?12:5;ctx.arc(x,y,selected?3.6:2.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;});
}
function selectSatellite(id){const sat=(state.satellites||[]).find(x=>x.id===id);if(!sat)return;state.selectedSatelliteId=id;renderSatelliteList();drawSatelliteMap();const root=$('satellite-selected');root.replaceChildren();const grid=make('div','satellite-detail-grid');const head=make('div','satellite-detail-head');head.append(make('p','overline','SELECTED ORBITAL OBJECT'),make('h3','',sat.name),make('p','',`NORAD / ${sat.id} · ${sat.objectType}`));root.append(head);[["SUBPOINT LATITUDE",`${sat.latitude.toFixed(3)}°`],["SUBPOINT LONGITUDE",`${sat.longitude.toFixed(3)}°`],["ALTITUDE",`${Math.round(sat.altitudeKm).toLocaleString('en-IN')} km`],["TLE EPOCH",sat.epoch?new Date(sat.epoch).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC':'Not reported']].forEach(([k,v])=>{const item=make('div','satellite-metric');item.append(make('small','',k),make('b','',v));grid.append(item);});root.append(grid);if(sat.tleLine1&&sat.tleLine2){const details=make('details','tle-details');details.append(make('summary','','View propagated source elements'));details.append(make('code','',`${sat.tleLine1}\n${sat.tleLine2}`));root.append(details);}}

function updateImpact(){
  const d=Number($('impact-diameter').value),v=Number($('impact-velocity').value),density=Number($('impact-density').value);
  $('impact-diameter-value').textContent=`${d} m`;$('impact-velocity-value').textContent=`${v} km/s`;
  try{const result=calculateEnergy({diameterMeters:d,velocityKmS:v,densityKgM3:density});$('impact-energy').replaceChildren(document.createTextNode(formatEnergy(result.megatonsTnt)),make('small','','TNT EQUIVALENT · ESTIMATE'));$('impact-joules').textContent=`${result.joules.toExponential(2)} J`;$('impact-mass').textContent=formatMass(result.massKg);$('impact-equivalent').textContent=`${result.reference15kt.toLocaleString('en-IN',{maximumFractionDigits:0})} × 15 kt reference`;}
  catch(error){toast(error.message,'error');}
}
async function loadApod(){
  const key=getApiKey();$('apod-title').textContent='Connecting to NASA…';$('apod-explanation').textContent='Requesting the astronomy picture and description.';$('apod-date').textContent='REQUESTING';$('apod-media').replaceChildren(make('div','apod-placeholder','Requesting the daily image…'));
  const url=new URL('https://science.nasa.gov/wp-json/wp/v2/apod-basic/');url.searchParams.set('api_key',key);
  try{
    const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`NASA APOD returned HTTP ${response.status}.`);const data=await response.json();state.apod=data;
    $('apod-title').textContent=data.title||'Astronomy Picture of the Day';$('apod-explanation').textContent=data.explanation||'No explanation was supplied.';$('apod-date').textContent=data.date||'DATE UNAVAILABLE';
    $('apod-media').replaceChildren();if(data.media_type==='image'&&safeHref(data.hdurl||data.image_url)){const img=document.createElement('img');img.src=data.hdurl||data.image_url;img.alt=data.title||'NASA astronomy image';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{img.replaceWith(make('div','apod-placeholder','Image could not be loaded. Open the NASA source instead.'));});$('apod-media').append(img);}else if(data.media_type==='video'&&safeHref(data.url)){const link=make('a','apod-placeholder','Open NASA video ↗');link.href=data.url;link.target='_blank';link.rel='noopener noreferrer';$('apod-media').append(link);}else $('apod-media').append(make('div','apod-placeholder','No displayable media was returned.'));
    const source=safeHref(data.url)||'https://science.nasa.gov/';$('apod-source').href=source;$('apod-source').textContent='Open original NASA record ↗';$('feed-integrity-copy').textContent='APOD loaded from the NASA API for the returned date; imagery and description remain attributable to the original source.';
  }catch(error){$('apod-title').textContent='Space brief unavailable';$('apod-explanation').textContent=error.message;$('apod-date').textContent='SOURCE OFFLINE';$('apod-media').replaceChildren(make('div','apod-placeholder','No image loaded'));$('apod-source').href='https://science.nasa.gov/';$('apod-source').textContent='Visit NASA Science ↗';toast('NASA APOD could not be loaded. Check the API key or try again later.','error');}
}

async function loadLaunchBrief(){
  if(state.launchTimer){clearInterval(state.launchTimer);state.launchTimer=null;}
  const stateNode=$('launch-brief-state');
  stateNode.textContent='REQUESTING';$('launch-brief-name').textContent='Loading upcoming launches…';$('launch-brief-provider').textContent='Connecting to Launch Library 2';
  try{
    const response=await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=20&mode=list&ordering=net',{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`Launch Library 2 returned HTTP ${response.status}.`);
    const json=await response.json();const now=Date.now();
    const items=(json.results||[]).map(x=>({name:x.name||'Unnamed mission',net:x.net||x.window_start||null,provider:x.launch_service_provider?.name||x.lsp_name||'Provider not reported',url:x.url||null})).filter(x=>x.net&&new Date(x.net).getTime()>now).sort((a,b)=>new Date(a.net)-new Date(b.net));
    if(!items.length)throw new Error('No upcoming launch was returned for the current query.');
    const item=items[0];state.launch=item;$('launch-brief-name').textContent=item.name;$('launch-brief-provider').textContent=item.provider;$('launch-brief-date').textContent=new Date(item.net).toLocaleString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' UTC';
    const href=safeHref(item.url);if(href)$('launch-brief-link').href=href;$('launch-brief-link').textContent='Open launch record ↗';stateNode.textContent='SOURCE RECEIVED';stateNode.style.color='var(--green)';
    const renderCountdown=()=>{const seconds=Math.max(0,Math.floor((new Date(item.net).getTime()-Date.now())/1000));const days=Math.floor(seconds/86400),hours=Math.floor((seconds%86400)/3600),minutes=Math.floor((seconds%3600)/60),secs=seconds%60;$('launch-brief-countdown').textContent=days?`T− ${days}d ${hours}h ${minutes}m`:`T− ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;};
    renderCountdown();if(state.launchTimer)clearInterval(state.launchTimer);state.launchTimer=setInterval(renderCountdown,1000);
  }catch(error){stateNode.textContent='UNAVAILABLE';stateNode.style.color='var(--red)';$('launch-brief-name').textContent='Launch manifest unavailable';$('launch-brief-provider').textContent=error.message;$('launch-brief-countdown').textContent='—';$('launch-brief-date').textContent='—';}
}

function openModal(id){$(id).classList.remove('hidden');const field=$(id).querySelector('input:not([type=checkbox])');if(field)setTimeout(()=>field.focus(),40);}
function closeModal(id){$(id).classList.add('hidden');}
const commandItems=[
  {label:'Open observatory',hint:'VIEW / 01',action:()=>openView('observatory'),words:'home earth globe'},
  {label:'Open encounter index',hint:'VIEW / 02',action:()=>openView('encounters'),words:'asteroid objects list search'},
  {label:'Compare encounters',hint:'VIEW / 03',action:()=>openView('compare'),words:'compare objects metrics'},
  {label:'Open orbital assets',hint:'VIEW / 04',action:()=>openView('satellites'),words:'satellites spacecraft celestrak orbital'},
  {label:'Open impact laboratory',hint:'VIEW / 05',action:()=>openView('impact'),words:'impact energy simulator hypothetical'},
  {label:'Open Space Brief',hint:'VIEW / 06',action:()=>openView('spacebrief'),words:'nasa apod picture space'},
  {label:'Reset celestial camera',hint:'SCENE',action:()=>{state.scene?.reset();openView('observatory');},words:'camera reset zoom'},
  {label:'Switch to orbital field',hint:'SCENE',action:()=>{state.scene?.changeView('orbit');$('view-orbit').classList.add('active');$('view-earth').classList.remove('active');openView('observatory');},words:'orbit overview'},
  {label:'Open settings',hint:'PREFERENCES',action:()=>openModal('settings-modal'),words:'api key data preferences'},
  {label:'Open field guide',hint:'HELP',action:()=>openModal('help-modal'),words:'help guide shortcuts'}
];
function renderCommands(query=''){
  const root=$('command-results');root.replaceChildren();const q=query.toLowerCase();state.commands=commandItems.filter(c=>`${c.label} ${c.words}`.toLowerCase().includes(q));state.commandIndex=Math.min(state.commandIndex,Math.max(0,state.commands.length-1));
  state.commands.forEach((cmd,i)=>{const b=make('button',`command-item ${i===state.commandIndex?'active':''}`);b.type='button';b.append(make('span','',cmd.label),make('span','',cmd.hint));b.addEventListener('mouseenter',()=>{state.commandIndex=i;renderCommands($('command-input').value);});b.addEventListener('click',()=>{closeModal('command-modal');cmd.action();});root.append(b);});if(!state.commands.length)root.append(make('div','list-error','No matching command.'));
}
function setReducedMotion(value){state.reducedMotion=value;document.documentElement.classList.toggle('reduce-motion',value);state.scene?.setReducedMotion(value);try{localStorage.setItem('ecliptara:reduced-motion',value?'1':'0');}catch{}}
function attachEvents(){
  all('.rail-item[data-view]').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.view)));
  all('[data-view]').forEach(b=>{if(!b.classList.contains('rail-item'))b.addEventListener('click',()=>openView(b.dataset.view));});
  $('date-picker').addEventListener('change',e=>{if(e.target.value)loadDate(e.target.value);});
  $('date-prev').addEventListener('click',()=>shiftDate(-1));$('date-next').addEventListener('click',()=>shiftDate(1));$('timeline-prev').addEventListener('click',()=>shiftDate(-1));$('timeline-next').addEventListener('click',()=>shiftDate(1));
  $('object-search').addEventListener('input',renderList);$('sort-select').addEventListener('change',renderList);$('pha-only').addEventListener('change',renderList);$('catalog-search').addEventListener('input',renderCatalog);$('satellite-search').addEventListener('input',renderSatelliteList);$('satellite-refresh').addEventListener('click',()=>loadSatellites(true));$('refresh-data').addEventListener('click',()=>loadDate(state.date,{force:true}));
  $('view-earth').addEventListener('click',()=>{state.scene?.changeView('earth');$('view-earth').classList.add('active');$('view-orbit').classList.remove('active');$('scene-scale').textContent='EARTH CENTRED';});
  $('view-orbit').addEventListener('click',()=>{state.scene?.changeView('orbit');$('view-orbit').classList.add('active');$('view-earth').classList.remove('active');$('scene-scale').textContent='RELATIVE FIELD';});
  $('reset-view').addEventListener('click',()=>{state.scene?.reset();$('view-earth').classList.add('active');$('view-orbit').classList.remove('active');$('scene-scale').textContent='EARTH CENTRED';});
  $('zoom-in').addEventListener('click',()=>state.scene?.zoomIn());$('zoom-out').addEventListener('click',()=>state.scene?.zoomOut());
  $('fullscreen-view').addEventListener('click',async()=>{try{const scene=$('scene-container');if(!document.fullscreenElement)await scene.requestFullscreen();else await document.exitFullscreen();}catch{toast('Fullscreen is not available in this browser context.');}});
  $('learn-visuals').addEventListener('click',()=>openModal('help-modal'));
  all('.inspector-tab').forEach(b=>b.addEventListener('click',()=>switchInspector(b.dataset.inspector)));
  $('command-open').addEventListener('click',()=>{openModal('command-modal');$('command-input').value='';renderCommands('');});
  $('settings-open').addEventListener('click',()=>{ $('api-key-input').value=getApiKey()==='DEMO_KEY'?'':getApiKey();openModal('settings-modal');});
  $('save-settings').addEventListener('click',()=>{try{saveApiKey($('api-key-input').value);closeModal('settings-modal');toast('API preference saved in this browser.','success');loadDate(state.date,{force:true});}catch(e){toast(e.message,'error');}});
  $('help-open').addEventListener('click',()=>openModal('help-modal'));
  all('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  all('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target===backdrop)backdrop.classList.add('hidden');}));
  $('impact-diameter').addEventListener('input',updateImpact);$('impact-velocity').addEventListener('input',updateImpact);$('impact-density').addEventListener('change',updateImpact);
  $('reduced-motion').addEventListener('change',e=>setReducedMotion(e.target.checked));$('show-grid').addEventListener('change',e=>{state.gridVisible=e.target.checked;state.scene?.toggleGrid(state.gridVisible);});
  $('command-input').addEventListener('input',()=>{state.commandIndex=0;renderCommands($('command-input').value);});
  $('command-input').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();state.commandIndex=Math.min(state.commands.length-1,state.commandIndex+1);renderCommands($('command-input').value);}else if(e.key==='ArrowUp'){e.preventDefault();state.commandIndex=Math.max(0,state.commandIndex-1);renderCommands($('command-input').value);}else if(e.key==='Enter'&&state.commands[state.commandIndex]){closeModal('command-modal');state.commands[state.commandIndex].action();}});
  window.addEventListener('resize',()=>{if(state.currentView==='satellites')drawSatelliteMap();});
  document.addEventListener('keydown',e=>{
    const active=document.activeElement;const typing=active&&(active.matches('input,textarea,select')||active.isContentEditable);
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openModal('command-modal');$('command-input').value='';renderCommands('');return;}
    if(e.key==='Escape'){const visible=all('.modal-backdrop').find(m=>!m.classList.contains('hidden'));if(visible){visible.classList.add('hidden');return;}if(state.selectedId){state.selectedId=null;renderAll();}return;}
    if(typing)return;
    if(e.key==='/'){e.preventDefault();$('object-search').focus();}
    else if(e.key.toLowerCase()==='r'){state.scene?.reset();}
    else if(e.key==='ArrowLeft')shiftDate(-1);else if(e.key==='ArrowRight')shiftDate(1);
  });
}

function tickClock(){const n=new Date();$('footer-clock').textContent=n.toISOString().slice(11,19);}
function initStoredPreferences(){let reduced=false;try{reduced=localStorage.getItem('ecliptara:reduced-motion')==='1';}catch{}$('reduced-motion').checked=reduced;setReducedMotion(reduced);}

async function boot(){
  setBoot('Preparing the observatory','01 / 03',24);
  // Load WebGL as an optional layer: a CDN/WebGL failure must not block the data interface.
  const sceneStartup=(async()=>{
    try {
      const { createObservatoryScene } = await import('./scene.js');
      state.scene=createObservatoryScene($('scene-container'),{
        onObjectPick:neo=>{selectObject(neo.id);toast(`Inspecting ${shortName(neo.name,35)}.`);},
        onReady:info=>{ $('scene-loader').classList.add('done'); $('scene-loader').textContent='FIELD READY'; $('scene-fallback-earth').classList.remove('visible'); if(info.texture==='procedural fallback')toast('Earth texture source was unavailable; a local procedural globe is being used.'); }
      });
      state.scene.toggleGrid(state.gridVisible);
    } catch(error) {
      $('scene-loader').classList.add('done');$('scene-fallback-earth').classList.add('visible');toast('3D engine unavailable. The encounter data interface remains available.','error');console.error('Scene initialization failed',error);
    }
  })();
  setBoot('Requesting observation data','02 / 03',57);
  attachEvents();initStoredPreferences();$('date-picker').value=state.date;tickClock();setInterval(tickClock,1000);updateImpact();setSourceState('pending');
  const loadPromise=loadDate(state.date);
  await Promise.race([loadPromise,sleep(1100)]);
  setBoot('Opening the observatory','03 / 03',100);await sleep(380);finishBoot();
  Promise.allSettled([sceneStartup,loadPromise]).then(()=>{});
}
boot().catch(error=>{console.error(error);finishBoot();toast('The application encountered an initialization issue. Reload to try again.','error');});
