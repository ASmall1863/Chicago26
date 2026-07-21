
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='chicago26-state-v2';
const OLD='chicago26-state-v1';
let state=loadState();
let tab='today';

function loadState(){
  let current=JSON.parse(localStorage.getItem(KEY)||'null');
  if(current) return current;
  let old=JSON.parse(localStorage.getItem(OLD)||'null');
  if(old){
    old.itinerary=(old.itinerary||window.SEED_ITINERARY).map(d=>({...d,items:d.items.filter(q=>q.id!=='legacy')}));
    localStorage.setItem(KEY,JSON.stringify(old));
    return old;
  }
  return {itinerary:window.SEED_ITINERARY,done:{},journal:{},xp:0};
}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const flat=()=>state.itinerary.flatMap(d=>d.items.map(i=>({...i,date:d.date,dayLabel:d.label})));
const fmtDate=s=>new Date(s+'T12:00:00').toLocaleDateString([], {weekday:'long',month:'short',day:'numeric'});
const totalXP=()=>flat().reduce((a,b)=>a+Number(b.xp||0),0);
const level=()=>state.xp<150?'Tourist':state.xp<350?'L Rider':state.xp<650?'Neighborhood Regular':state.xp<900?'Second City Expert':'Chicago Legend';
function nextQuest(){
 const today=new Date().toISOString().slice(0,10);
 return flat().filter(q=>!state.done[q.id]).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).find(q=>q.date>=today)||flat().find(q=>!state.done[q.id]);
}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
function questCard(q){
 return `<article class="card quest ${state.done[q.id]?'done':''}" data-id="${q.id}">
 <div class="quest-icon">${q.icon||'📍'}</div><div><span class="pill ${q.type}">${q.type==='main'?'Main quest':'Side quest'} · ${q.xp} XP</span>
 <h3>${q.time} · ${q.title}</h3><p>${q.area}</p></div>
 <button class="check" data-check="${q.id}">${state.done[q.id]?'✓':'○'}</button></article>`;
}
function renderHero(){
 const n=nextQuest(), pct=Math.round(state.xp/Math.max(totalXP(),1)*100)||0;
 $('#hero').innerHTML=n?`<div class="kicker">NEXT QUEST · ${fmtDate(n.date)}</div><h2>${n.icon||'📍'} ${n.title}</h2>
 <div class="meta">${n.time} · ${n.area}</div><div class="progress"><i style="width:${pct}%"></i></div>
 <small>${state.xp} / ${totalXP()} XP · ${level()}</small>
 <div class="hero-actions"><button data-open="${n.id}">Open quest</button><button class="secondary" data-map="${encodeURIComponent(n.map||n.title)}">Directions</button></div>`:
 `<div class="kicker">TRIP COMPLETE</div><h2>🏆 Chicago Legend</h2><p>Every current quest is complete.</p>`;
}
function render(){
 renderHero(); $$('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 const s=$('#screen');
 if(tab==='today'){
   const n=nextQuest(), date=n?.date||state.itinerary[0]?.date, day=state.itinerary.find(d=>d.date===date)||state.itinerary[0];
   s.innerHTML=`<div class="section-title"><h2>${fmtDate(day.date)}</h2><small>${day.label}</small></div>
   <div class="note">Tap a quest for details. Use ＋ to add a stop; edit and delete are inside each quest.</div>${day.items.map(q=>questCard({...q,date:day.date})).join('')}`;
 } else if(tab==='trip'){
   s.innerHTML=state.itinerary.map(d=>`<section><div class="day-head"><h3>${fmtDate(d.date)}</h3><p>${d.label}</p></div>${d.items.map(q=>questCard({...q,date:d.date})).join('')}</section>`).join('');
 } else if(tab==='quests'){
   const qs=flat(); s.innerHTML=`<div class="section-title"><h2>Quest log</h2><small>${Object.keys(state.done).length}/${qs.length} complete</small></div>
   ${qs.sort((a,b)=>(state.done[a.id]?1:0)-(state.done[b.id]?1:0)).map(questCard).join('')}`;
 } else if(tab==='journal'){
   const entries=Object.entries(state.journal);
   s.innerHTML=`<div class="section-title"><h2>Trip journal</h2><small>${entries.length} entries</small></div>`+
   (entries.length?entries.map(([id,j])=>{const q=flat().find(x=>x.id===id);return `<article class="card journal-entry"><h3>${q?.icon||'📍'} ${q?.title||id}</h3><p>${j.note||''}</p>${j.spend?`<span class="pill">$${j.spend}</span>`:''}</article>`}).join(''):`<div class="empty">Complete a quest or open one to add a memory.</div>`);
 } else {
   const done=Object.keys(state.done).length, qs=flat();
   s.innerHTML=`<div class="section-title"><h2>Player profile</h2><small>${level()}</small></div>
   <div class="stats"><div class="card stat"><strong>${state.xp}</strong>XP</div><div class="card stat"><strong>${done}</strong>Quests</div><div class="card stat"><strong>${new Set(qs.filter(q=>state.done[q.id]).map(q=>q.area)).size}</strong>Areas</div><div class="card stat"><strong>${Math.round(done/Math.max(qs.length,1)*100)||0}%</strong>Complete</div></div>
   <div class="section-title"><h2>Trip controls</h2></div>
   <div class="card settings-grid"><button class="primary" id="exportBtn">Export backup</button><button class="primary" id="importBtn">Import backup</button><button class="primary" id="resetSeedBtn">Restore Version 2 itinerary</button><button class="primary danger" id="resetBtn">Reset progress</button><input id="fileInput" type="file" accept="application/json" hidden></div>`;
 }
 bind();
}
function bind(){
 $$('[data-check]').forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.check,q=flat().find(x=>x.id===id);if(state.done[id]){delete state.done[id];state.xp=Math.max(0,state.xp-Number(q.xp||0))}else{state.done[id]=true;state.xp+=Number(q.xp||0);toast(`Quest complete! +${q.xp} XP`)}save();render()});
 $$('[data-id]').forEach(el=>el.onclick=()=>openQuest(el.dataset.id));
 $$('[data-open]').forEach(b=>b.onclick=()=>openQuest(b.dataset.open));
 $$('[data-map]').forEach(b=>b.onclick=()=>location.href=`https://maps.apple.com/?q=${b.dataset.map}`);
 $('#exportBtn')?.addEventListener('click',exportData);
 $('#importBtn')?.addEventListener('click',()=>$('#fileInput').click());
 $('#fileInput')?.addEventListener('change',importData);
 $('#resetSeedBtn')?.addEventListener('click',()=>{if(confirm('Restore the Version 2 itinerary? Journal and completed quests stay unless their quest was removed.')){state.itinerary=structuredClone(window.SEED_ITINERARY);save();render();toast('Itinerary restored')}});
 $('#resetBtn')?.addEventListener('click',()=>{if(confirm('Reset all progress and journal entries?')){state.done={};state.journal={};state.xp=0;save();render()}});
}
function openQuest(id){
 const q=flat().find(x=>x.id===id), j=state.journal[id]||{};
 $('#modalBody').innerHTML=`<h2>${q.icon||'📍'} ${q.title}</h2><p><b>${fmtDate(q.date)} · ${q.time}</b><br>${q.area}</p><p>${q.notes||''}</p>
 <div class="row-actions"><button type="button" class="tiny" id="mapModal">Directions</button><button type="button" class="tiny" id="editQuest">Edit</button><button type="button" class="tiny danger" id="deleteQuest">Delete</button></div><hr>
 <label>Favorite detail or memory</label><textarea id="jNote" rows="4">${j.note||''}</textarea><label>Spent ($)</label><input id="jSpend" inputmode="decimal" value="${j.spend||''}">`;
 $('#mapModal').onclick=()=>location.href=`https://maps.apple.com/?q=${encodeURIComponent(q.map||q.title)}`;
 $('#editQuest').onclick=()=>{ $('#modal').close(); setTimeout(()=>openEditor(q),50); };
 $('#deleteQuest').onclick=()=>{ if(confirm(`Delete “${q.title}”?`)){deleteQuest(id);$('#modal').close();} };
 $('#saveModal').onclick=()=>{state.journal[id]={note:$('#jNote').value,spend:$('#jSpend').value};save();setTimeout(render,10);toast('Journal saved')};
 $('#modal').showModal();
}
function deleteQuest(id){
 state.itinerary.forEach(d=>d.items=d.items.filter(q=>q.id!==id));
 delete state.done[id]; delete state.journal[id];
 recalcXP(); save(); render(); toast('Quest deleted');
}
function recalcXP(){state.xp=flat().filter(q=>state.done[q.id]).reduce((a,q)=>a+Number(q.xp||0),0)}
function openEditor(existing=null){
 const dates=state.itinerary.map(d=>d.date);
 const defaultDate=existing?.date||dates[0]||new Date().toISOString().slice(0,10);
 $('#modalBody').innerHTML=`<h2>${existing?'Edit quest':'Add quest'}</h2>
 <label>Date</label><input id="eDate" type="date" value="${defaultDate}">
 <label>Day label</label><input id="eDay" value="${existing?.dayLabel||state.itinerary.find(d=>d.date===defaultDate)?.label||''}" placeholder="Museum Campus">
 <label>Time</label><input id="eTime" type="time" value="${existing?.time||'12:00'}">
 <label>Title</label><input id="eTitle" value="${existing?.title||''}" placeholder="Quest title">
 <label>Area</label><input id="eArea" value="${existing?.area||''}" placeholder="Neighborhood">
 <label>Type</label><select id="eType"><option value="main">Main quest</option><option value="side">Side quest</option></select>
 <label>XP</label><input id="eXP" type="number" min="0" value="${existing?.xp||50}">
 <label>Icon</label><input id="eIcon" value="${existing?.icon||'📍'}">
 <label>Notes</label><textarea id="eNotes" rows="3">${existing?.notes||''}</textarea>
 <label>Maps search</label><input id="eMap" value="${existing?.map||existing?.title||''}">`;
 $('#eType').value=existing?.type||'main';
 $('#saveModal').onclick=e=>{
   const date=$('#eDate').value,title=$('#eTitle').value.trim();
   if(!date||!title){e.preventDefault();alert('Date and title are required.');return}
   const id=existing?.id||`q-${Date.now()}`;
   const item={id,time:$('#eTime').value,title,area:$('#eArea').value.trim()||'Chicago',type:$('#eType').value,xp:Number($('#eXP').value)||0,icon:$('#eIcon').value||'📍',notes:$('#eNotes').value,map:$('#eMap').value||title};
   if(existing) state.itinerary.forEach(d=>d.items=d.items.filter(q=>q.id!==existing.id));
   let day=state.itinerary.find(d=>d.date===date);
   if(!day){day={date,label:$('#eDay').value||'Chicago Day',items:[]};state.itinerary.push(day)}
   else if($('#eDay').value.trim()) day.label=$('#eDay').value.trim();
   day.items.push(item); day.items.sort((a,b)=>a.time.localeCompare(b.time));
   state.itinerary=state.itinerary.filter(d=>d.items.length).sort((a,b)=>a.date.localeCompare(b.date));
   recalcXP();save();setTimeout(render,10);toast(existing?'Quest updated':'Quest added')
 };
 $('#modal').showModal();
}
function exportData(){
 const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download='chicago26-backup.json';a.click();URL.revokeObjectURL(a.href);
}
function importData(e){
 const file=e.target.files[0];if(!file)return;
 const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!data.itinerary)throw Error();state=data;recalcXP();save();render();toast('Backup imported')}catch{alert('That file is not a Chicago ’26 backup.')}};r.readAsText(file);
}
$$('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
$('#addBtn').onclick=()=>openEditor();
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
render();
