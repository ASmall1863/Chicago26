
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='chicago26-state-v1';
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{itinerary:window.SEED_ITINERARY,done:{},journal:{},xp:0};
let tab='today';
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const flat=()=>state.itinerary.flatMap(d=>d.items.map(i=>({...i,date:d.date,dayLabel:d.label})));
const fmtDate=s=>new Date(s+'T12:00:00').toLocaleDateString([], {weekday:'long',month:'short',day:'numeric'});
const totalXP=()=>flat().reduce((a,b)=>a+b.xp,0);
const level=()=>state.xp<150?'Tourist':state.xp<350?'L Rider':state.xp<650?'Neighborhood Regular':state.xp<900?'Second City Expert':'Chicago Legend';
function nextQuest(){
 const now=new Date(), today=now.toISOString().slice(0,10);
 return flat().filter(q=>!state.done[q.id]).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).find(q=>q.date>=today)||flat().find(q=>!state.done[q.id]);
}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
function questCard(q){
 return `<article class="card quest ${state.done[q.id]?'done':''}" data-id="${q.id}">
 <div class="quest-icon">${q.icon}</div><div><span class="pill ${q.type}">${q.type==='main'?'Main quest':'Side quest'} · ${q.xp} XP</span>
 <h3>${q.time} · ${q.title}</h3><p>${q.area}</p></div>
 <button class="check" data-check="${q.id}">${state.done[q.id]?'✓':'○'}</button></article>`;
}
function renderHero(){
 const n=nextQuest(), pct=Math.round(state.xp/totalXP()*100)||0;
 $('#hero').innerHTML=n?`<div class="kicker">NEXT QUEST · ${fmtDate(n.date)}</div><h2>${n.icon} ${n.title}</h2>
 <div class="meta">${n.time} · ${n.area}</div><div class="progress"><i style="width:${pct}%"></i></div>
 <small>${state.xp} / ${totalXP()} XP · ${level()}</small>
 <div class="hero-actions"><button data-open="${n.id}">Open quest</button><button class="secondary" data-map="${encodeURIComponent(n.map)}">Directions</button></div>`:
 `<div class="kicker">TRIP COMPLETE</div><h2>🏆 Chicago Legend</h2><p>Every current quest is complete.</p>`;
}
function render(){
 renderHero(); $$('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 const s=$('#screen');
 if(tab==='today'){
   const n=nextQuest(), date=n?.date||state.itinerary[0].date, day=state.itinerary.find(d=>d.date===date);
   s.innerHTML=`<div class="section-title"><h2>${fmtDate(day.date)}</h2><small>${day.label}</small></div>
   <div class="note">Tap a quest for details, notes, directions, and a trip-journal entry.</div>${day.items.map(q=>questCard({...q,date:day.date})).join('')}`;
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
   <div class="stats"><div class="card stat"><strong>${state.xp}</strong>XP</div><div class="card stat"><strong>${done}</strong>Quests</div><div class="card stat"><strong>${new Set(qs.filter(q=>state.done[q.id]).map(q=>q.area)).size}</strong>Areas</div><div class="card stat"><strong>${Math.round(done/qs.length*100)||0}%</strong>Complete</div></div>
   <div class="section-title"><h2>Inventory</h2></div><div class="inventory"><span class="badge">🎟️ Tickets</span><span class="badge">🚆 Amtrak</span><span class="badge">⚾ Cubs</span><span class="badge">📀 Records</span><span class="badge">🍕 Pizza</span><span class="badge">📷 Memories</span></div>
   <article class="card"><button class="primary" id="exportBtn">Export trip data</button> <button class="primary" id="resetBtn">Reset progress</button></article>`;
 }
 bind();
}
function bind(){
 $$('[data-check]').forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.check,q=flat().find(x=>x.id===id);if(state.done[id]){delete state.done[id];state.xp=Math.max(0,state.xp-q.xp)}else{state.done[id]=true;state.xp+=q.xp;toast(`Quest complete! +${q.xp} XP`)}save();render()});
 $$('[data-id]').forEach(el=>el.onclick=()=>openQuest(el.dataset.id));
 $$('[data-open]').forEach(b=>b.onclick=()=>openQuest(b.dataset.open));
 $$('[data-map]').forEach(b=>b.onclick=()=>location.href=`https://maps.apple.com/?q=${b.dataset.map}`);
 $('#exportBtn')?.addEventListener('click',exportData);
 $('#resetBtn')?.addEventListener('click',()=>{if(confirm('Reset all progress and journal entries?')){state.done={};state.journal={};state.xp=0;save();render()}});
}
function openQuest(id){
 const q=flat().find(x=>x.id===id), j=state.journal[id]||{};
 $('#modalBody').innerHTML=`<h2>${q.icon} ${q.title}</h2><p><b>${fmtDate(q.date)} · ${q.time}</b><br>${q.area}</p><p>${q.notes}</p>
 <button type="button" class="primary" id="mapModal">Open Apple Maps</button><hr>
 <label>Favorite detail or memory</label><textarea id="jNote" rows="4">${j.note||''}</textarea><label>Spent ($)</label><input id="jSpend" inputmode="decimal" value="${j.spend||''}">`;
 $('#mapModal').onclick=()=>location.href=`https://maps.apple.com/?q=${encodeURIComponent(q.map)}`;
 $('#saveModal').onclick=()=>{state.journal[id]={note:$('#jNote').value,spend:$('#jSpend').value};save();setTimeout(render,10);toast('Journal saved')};
 $('#modal').showModal();
}
function editItinerary(){
 $('#modalBody').innerHTML=`<h2>Edit itinerary data</h2><p class="note">Advanced mode: edit the JSON below. This lets you replace placeholders with the exact earlier-chat itinerary.</p>
 <textarea id="jsonEdit" rows="18">${JSON.stringify(state.itinerary,null,2)}</textarea>`;
 $('#saveModal').onclick=e=>{try{state.itinerary=JSON.parse($('#jsonEdit').value);save();setTimeout(render,10);toast('Itinerary updated')}catch(err){e.preventDefault();alert('That JSON is not valid yet.')}};
 $('#modal').showModal();
}
function exportData(){
 const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download='chicago26-trip-data.json';a.click();URL.revokeObjectURL(a.href);
}
$$('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
$('#editBtn').onclick=editItinerary;
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
render();
