function frequencyLabel(days){
  days=Number(days||0); if(days===7) return "Weekly"; if(days===14) return "Every 2 weeks"; if(days===30) return "Monthly"; if(days===60) return "Occasionally"; return "No schedule";
}
function latestInteraction(p){
  const a=p.interactions||[];
  return a.length?[...a].sort((x,y)=>(y.date||"").localeCompare(x.date||"") || (y.createdAt||"").localeCompare(x.createdAt||""))[0]:null;
}
function latestInteractionByMethod(p,method){
  const a=(p.interactions||[]).filter(x=>(x.method||"").toLowerCase()===method.toLowerCase());
  return a.length?[...a].sort((x,y)=>(y.date||"").localeCompare(x.date||"") || (y.createdAt||"").localeCompare(x.createdAt||""))[0]:null;
}
function latestContactDate(p){
  const latest=latestInteraction(p);
  return parseLocalDate(latest?.date || p.lastContact);
}
function relativeContactLabel(d){
  if(!d) return "Not logged";
  const age=daysBetween(d,new Date());
  if(age===0) return "Today";
  if(age===1) return "Yesterday";
  if(age>1) return `${age} days ago`;
  return fmtDate(d);
}
function nextContactDate(p){
  const freq=Number(p.frequency||0), last=latestContactDate(p);
  if(!freq || !last) return null;
  return addDays(last,freq);
}
function personTiming(p){
  const freq=Number(p.frequency||0), last=latestContactDate(p);
  if(!freq) return {class:"flex",label:"Flexible",text:"No schedule — reach out whenever it feels right."};
  if(!last) return {class:"soon",label:"Start anytime",text:"No contact logged yet — start whenever you want."};
  const age=daysBetween(last,new Date()), remaining=freq-age;
  if(remaining>3) return {class:"good",label:"Recent",text:`Connected ${relativeContactLabel(last).toLowerCase()}.`};
  if(remaining>=0) return {class:"soon",label:"Coming up",text:remaining===0?"Around your usual check-in time.":`Usual rhythm is coming up in ${remaining} day${remaining===1?"":"s"}.`};
  return {class:"due",label:"Reconnect",text:"Haven’t connected in a bit. A small hello is enough."};
}
function renderCircle(){
  const list=document.getElementById("circleList"); list.innerHTML="";list.style.display="block";
  const rank=x=>x.class==="due"?0:x.class==="soon"?1:x.class==="good"?2:3;
  const people=[...state.people].sort((a,b)=>rank(personTiming(a))-rank(personTiming(b)));
  const radar=people.filter(p=>["due","soon"].includes(personTiming(p).class));
  document.getElementById("circleSummary").textContent=people.length?`${people.length} people · ${radar.length?radar.length+" gently on your radar":"nothing pressing"}`:"A small, intentional circle";
  const focus=radar[0],focusEl=document.getElementById("circleFocus");
  if(focus){const t=personTiming(focus);focusEl.innerHTML=`<div class="circle-focus"><div class="focus-eyebrow">A connection in view</div>${personIdentityHTML(focus,t)}<div class="circle-focus-detail">${escapeHTML(t.text)}</div>${personSnapshotHTML(focus,t)}<div class="circle-card-actions"><button class="primary-soft" onclick="openContactModal('${jsEscape(focus.id)}')">💬 Contact</button><button onclick="openPersonNote('${jsEscape(focus.id)}')">＋ Note</button><button onclick="openPersonDetail('${jsEscape(focus.id)}')">Details</button></div></div>`}else if(people.length){focusEl.innerHTML=`<div class="focus-done"><strong style="color:var(--text)">Your Circle is quiet.</strong><br>No relationship needs to be turned into a task right now.</div>`}else{focusEl.innerHTML=""}
  const remaining=people.filter(p=>!focus||p.id!==focus.id);
  document.getElementById("circlePeopleTitle").textContent=focus?"Other people":"Your people";
  document.getElementById("circlePeopleHead").style.display=remaining.length||!people.length?"flex":"none";
  remaining.forEach(p=>{const t=personTiming(p);const card=document.createElement("div");card.className="circle-person-card";card.innerHTML=`${personIdentityHTML(p,t)}${personSnapshotHTML(p,t)}<div class="circle-card-actions"><button class="primary-soft" onclick="openContactModal('${jsEscape(p.id)}')">💬 Contact</button><button onclick="openPersonNote('${jsEscape(p.id)}')">＋ Note</button><button onclick="openPersonDetail('${jsEscape(p.id)}')">Details</button></div>`;list.appendChild(card)});
  if(!people.length)list.innerHTML=`<div class="empty-card">No people yet. Add one person you want to keep in view.</div>`;
  else if(!remaining.length)list.style.display="none";else list.style.display="block";
}

function personIdentityHTML(p,t=personTiming(p)){return `<div class="circle-person-head">${visualHTML(p,"avatar","person")}<div class="circle-person-identity"><div class="circle-person-name">${escapeHTML(p.name)}</div>${relationPillHTML(p.relation)}</div><span class="circle-status ${t.class}">${escapeHTML(t.label)}</span></div>`}
function personSnapshotHTML(p,t=personTiming(p)){const last=latestContactDate(p),seen=parseLocalDate(latestInteractionByMethod(p,"In person")?.date);return `<div class="person-snapshot"><div class="snapshot-item"><div class="snapshot-label">Last contact</div><div class="snapshot-value">${escapeHTML(relativeContactLabel(last))}</div></div><div class="snapshot-item"><div class="snapshot-label">Last seen</div><div class="snapshot-value">${escapeHTML(relativeContactLabel(seen))}</div></div><div class="snapshot-item"><div class="snapshot-label">Status</div><div class="snapshot-value">${escapeHTML(t.label)}</div></div></div>`}

let detailPersonId=null,detailCalendarMonth=null;const personDetailModal=document.getElementById("personDetailModal");
function contactCalendarHTML(p,month=detailCalendarMonth||new Date()){
  const start=new Date(month.getFullYear(),month.getMonth(),1),days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate(),events=new Map();
  (p.interactions||[]).forEach(item=>{const d=parseLocalDate(item.date);if(!d||d.getFullYear()!==start.getFullYear()||d.getMonth()!==start.getMonth())return;const day=d.getDate(),items=events.get(day)||[];items.push(item);events.set(day,items)});
  if(!(p.interactions||[]).length&&p.lastContact){const d=parseLocalDate(p.lastContact);if(d&&d.getFullYear()===start.getFullYear()&&d.getMonth()===start.getMonth())events.set(d.getDate(),[{date:p.lastContact,method:"Contact"}])}
  const cells=[];for(let i=0;i<start.getDay();i++)cells.push('<span class="calendar-day" aria-hidden="true"></span>');for(let day=1;day<=days;day++){const items=events.get(day)||[],inPerson=items.some(x=>(x.method||"").toLowerCase()==="in person"),isToday=dateKey(new Date(start.getFullYear(),start.getMonth(),day))===dateKey(),methods=[...new Set(items.map(x=>x.method||"Contact"))].join(", ");cells.push(`<span class="calendar-day ${items.length?"contact":""} ${inPerson?"in-person":""} ${isToday?"today":""}" ${items.length?`title="${escapeAttr(`${methods} · ${items.length} contact${items.length===1?"":"s"}`)}"`:""}>${day}${items.length>1?`<span class="contact-count">${items.length}</span>`:""}</span>`)}
  const current=new Date(),atCurrent=start.getFullYear()===current.getFullYear()&&start.getMonth()===current.getMonth(),label=new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(start);
  return `<div class="calendar-head"><div><div class="calendar-title">Contact calendar</div><div class="calendar-month">${escapeHTML(label)}</div></div><div class="calendar-nav"><button onclick="shiftPersonCalendar(-1)" aria-label="Previous month">‹</button><button onclick="shiftPersonCalendar(1)" aria-label="Next month" ${atCurrent?"disabled":""}>›</button></div></div><div class="calendar-grid">${["S","M","T","W","T","F","S"].map(x=>`<span class="calendar-weekday">${x}</span>`).join("")}${cells.join("")}</div><div class="calendar-legend"><span><i class="legend-mark"></i>Contact</span><span><i class="legend-mark in-person"></i>In person</span></div>`
}
function renderPersonCalendar(){const p=state.people.find(x=>x.id===detailPersonId),el=document.getElementById("personContactCalendar");if(p&&el)el.innerHTML=contactCalendarHTML(p)}
function shiftPersonCalendar(delta){if(!detailCalendarMonth)return;const next=new Date(detailCalendarMonth.getFullYear(),detailCalendarMonth.getMonth()+delta,1),current=new Date(),currentStart=new Date(current.getFullYear(),current.getMonth(),1);detailCalendarMonth=next>currentStart?currentStart:next;renderPersonCalendar()}
function openPersonDetail(id){
  detailPersonId=id;const p=state.people.find(x=>x.id===id);if(!p)return;const t=personTiming(p),latest=latestInteraction(p),last=latestContactDate(p),inPerson=parseLocalDate(latestInteractionByMethod(p,"In person")?.date),next=nextContactDate(p);detailCalendarMonth=last?new Date(last.getFullYear(),last.getMonth(),1):new Date(new Date().getFullYear(),new Date().getMonth(),1);
  const notes=[...(p.notes||[])].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  const notesHTML=notes.length?`<div class="note-list">${notes.map(n=>`<div class="memory-note"><div class="memory-note-type">${escapeHTML(n.type||"Remember")}</div><div class="memory-note-text">${escapeHTML(n.text||"")}</div><div class="memory-note-date">${n.createdAt?escapeHTML(fmtDate(new Date(n.createdAt))):""}</div></div>`).join("")}</div>`:`<div class="empty-notes">No personal notes yet. Save a memory, gift idea, life update, or follow-up when it naturally comes up.</div>`;
  document.getElementById("personDetailTitle").textContent=p.name;
  document.getElementById("personDetailBody").innerHTML=`<div class="person-detail-hero">${visualHTML(p,"avatar","person")}<div><div class="person-name">${escapeHTML(p.name)}</div><div class="person-chips">${relationPillHTML(p.relation,"person-chip relation")}<span class="person-chip ${t.class}">${escapeHTML(t.label)}</span></div></div></div><div class="detail-facts"><div class="detail-fact"><span>💬</span><span class="detail-fact-copy"><span class="detail-fact-label">Last contact</span><span class="detail-fact-value">${escapeHTML(relativeContactLabel(last))}${latest?.method?` · ${escapeHTML(latest.method)}`:""}</span></span></div><div class="detail-fact"><span>👥</span><span class="detail-fact-copy"><span class="detail-fact-label">Last seen in person</span><span class="detail-fact-value">${escapeHTML(relativeContactLabel(inPerson))}</span></span></div><div class="detail-fact"><span>📅</span><span class="detail-fact-copy"><span class="detail-fact-label">Usual rhythm</span><span class="detail-fact-value">${escapeHTML(frequencyLabel(p.frequency))}${next?` · around ${escapeHTML(fmtDate(next))}`:""}</span></span></div></div><div class="contact-calendar" id="personContactCalendar">${contactCalendarHTML(p)}</div>${latest?.note?`<div class="detail-note"><strong>Latest contact note</strong><br>${escapeHTML(latest.note)}</div>`:""}<div class="notes-section"><div class="notes-head"><div class="notes-title">Notes to remember</div><button class="tiny-btn" onclick="openPersonNote('${jsEscape(p.id)}',true)">＋ Add</button></div>${notesHTML}</div>`;
  personDetailModal.classList.add("show");
}
function closePersonDetail(){personDetailModal.classList.remove("show");detailPersonId=null;detailCalendarMonth=null}
document.getElementById("closePersonDetail").addEventListener("click",closePersonDetail);personDetailModal.addEventListener("click",e=>{if(e.target===personDetailModal)closePersonDetail()});document.getElementById("logFromDetailBtn").addEventListener("click",()=>{const id=detailPersonId;closePersonDetail();if(id)openContactModal(id)});document.getElementById("editFromDetailBtn").addEventListener("click",()=>{const id=detailPersonId;closePersonDetail();if(id)openPersonModal(id)});document.getElementById("noteFromDetailBtn").addEventListener("click",()=>{const id=detailPersonId;if(id)openPersonNote(id,true)});

let notePersonId=null,noteReturnToDetail=false;const personNoteModal=document.getElementById("personNoteModal");
function openPersonNote(id,fromDetail=false){notePersonId=id;noteReturnToDetail=fromDetail;const p=state.people.find(x=>x.id===id);document.getElementById("personNoteTitle").textContent=`Note · ${p?.name||""}`;document.getElementById("personNoteType").value="Remember";document.getElementById("personNoteText").value="";if(fromDetail)personDetailModal.classList.remove("show");personNoteModal.classList.add("show");setTimeout(()=>document.getElementById("personNoteText").focus(),50)}
function closePersonNote(reopen=false){const id=notePersonId;personNoteModal.classList.remove("show");notePersonId=null;const shouldReturn=reopen&&noteReturnToDetail;noteReturnToDetail=false;if(shouldReturn&&id)openPersonDetail(id)}
document.getElementById("closePersonNote").addEventListener("click",()=>closePersonNote(true));document.getElementById("cancelPersonNote").addEventListener("click",()=>closePersonNote(true));personNoteModal.addEventListener("click",e=>{if(e.target===personNoteModal)closePersonNote(true)});
document.getElementById("savePersonNote").addEventListener("click",()=>{const text=document.getElementById("personNoteText").value.trim();if(!text){document.getElementById("personNoteText").focus();return}const p=state.people.find(x=>x.id===notePersonId);if(!p)return;const before=structuredClone(state),returnToDetail=noteReturnToDetail,id=p.id;p.notes ||= [];p.notes.push({id:"n-"+Date.now(),type:document.getElementById("personNoteType").value,text,createdAt:new Date().toISOString()});personNoteModal.classList.remove("show");notePersonId=null;noteReturnToDetail=false;saveState();showSaved(`Note saved · ${p.name}`,before);if(returnToDetail)openPersonDetail(id)});

let editingPersonId=null;
const personModal=document.getElementById("personModal");
function openPersonModal(id=null){
  editingPersonId=id; const p=id?state.people.find(x=>x.id===id):null;
  document.getElementById("personModalTitle").textContent=p?"Edit person":"Add person";
  document.getElementById("personIcon").value=safeIcon(p?.icon,"person");document.getElementById("personColor").value=safeTone(p?.color||"rose");updateVisualPreview("person"); document.getElementById("personName").value=p?.name||"";
  document.getElementById("personRelation").value=p?.relation||"";
  document.getElementById("personFrequency").value=String(p?.frequency??14);
  renderSelectedPill("relation");renderSelectedPill("frequency");
  document.getElementById("deletePersonBtn").style.display=p?"inline-block":"none"; personModal.classList.add("show");
}
function closePersonModal(){ personModal.classList.remove("show"); editingPersonId=null; }
document.getElementById("addPersonBtn").addEventListener("click",()=>openPersonModal());
document.getElementById("closePersonModal").addEventListener("click",closePersonModal); document.getElementById("cancelPersonBtn").addEventListener("click",closePersonModal);
document.getElementById("savePersonBtn").addEventListener("click",()=>{ const name=document.getElementById("personName").value.trim(); if(!name){document.getElementById("personName").focus();return;} const payload={name,icon:safeIcon(document.getElementById("personIcon").value,"person"),color:safeTone(document.getElementById("personColor").value),relation:document.getElementById("personRelation").value.trim(),frequency:Number(document.getElementById("personFrequency").value)}; if(editingPersonId) Object.assign(state.people.find(x=>x.id===editingPersonId),payload); else state.people.push({id:"p-"+Date.now(),...payload,lastContact:null,interactions:[],notes:[]}); closePersonModal(); saveState(); });

let tagPickerTarget=null;
const tagPickerModal=document.getElementById("tagPickerModal");
function openTagPicker(target){
  tagPickerTarget=target;
  const isRelation=target==="relation";
  document.getElementById("tagPickerTitle").textContent=isRelation?"Relationship":"Contact frequency";
  document.getElementById("tagPickerHelp").textContent=isRelation?"Choose the option that fits best.":"How often do you usually want to check in?";
  const options=isRelation?RELATIONSHIP_TAGS:FREQUENCY_TAGS;
  const currentValue=document.getElementById(isRelation?"personRelation":"personFrequency").value;
  document.getElementById("tagPickerGrid").innerHTML=options.map(opt=>{
    const selected=String(currentValue)===String(opt.id);
    return `<button class="tag-pill-choice tone-${opt.tone} ${selected?"selected":""}" type="button" role="option" aria-selected="${selected}" data-tag-value="${escapeAttr(opt.id)}" aria-label="Select ${escapeAttr(opt.label)} ${isRelation?"relationship":"frequency"}">${opt.icon?iconSVG(opt.icon):""}<span>${escapeHTML(opt.label)}</span></button>`;
  }).join("");
  document.querySelectorAll("[data-tag-value]").forEach(btn=>btn.addEventListener("click",()=>applyTagChoice(btn.dataset.tagValue)));
  tagPickerModal.classList.add("show");
}
function applyTagChoice(value){
  if(!tagPickerTarget) return;
  const isRelation=tagPickerTarget==="relation";
  document.getElementById(isRelation?"personRelation":"personFrequency").value=value;
  renderSelectedPill(tagPickerTarget);
  closeTagPicker();
}
function closeTagPicker(){tagPickerModal.classList.remove("show");tagPickerTarget=null}
function clearRelationTag(){document.getElementById("personRelation").value="";renderSelectedPill("relation")}
function renderSelectedPill(target){
  const isRelation=target==="relation";
  const value=document.getElementById(isRelation?"personRelation":"personFrequency").value;
  const options=isRelation?RELATIONSHIP_TAGS:FREQUENCY_TAGS;
  const tag=options.find(o=>String(o.id)===String(value));
  const container=document.getElementById(isRelation?"relationPills":"frequencyPills");
  if(!tag){container.innerHTML=`<span class="tag-pill-empty">None selected</span>`;return}
  container.innerHTML=`<span class="tag-pill tone-${tag.tone}">${tag.icon?iconSVG(tag.icon):""}<span>${escapeHTML(tag.label)}</span>${isRelation?`<button type="button" class="tag-pill-remove" aria-label="Clear relationship">✕</button>`:""}</span>`;
  if(isRelation) container.querySelector(".tag-pill-remove")?.addEventListener("click",e=>{e.stopPropagation();clearRelationTag()});
}
document.getElementById("chooseRelationBtn").addEventListener("click",()=>openTagPicker("relation"));
document.getElementById("chooseFrequencyBtn").addEventListener("click",()=>openTagPicker("frequency"));
document.getElementById("closeTagPicker").addEventListener("click",closeTagPicker);
document.getElementById("cancelTagPicker").addEventListener("click",closeTagPicker);
tagPickerModal.addEventListener("click",e=>{if(e.target===tagPickerModal)closeTagPicker()});
document.getElementById("deletePersonBtn").addEventListener("click",()=>{if(editingPersonId&&confirm("Remove this person from Main Circle?")){state.people=state.people.filter(p=>p.id!==editingPersonId);closePersonModal();saveState();}}); personModal.addEventListener("click",e=>{if(e.target===personModal)closePersonModal()});
let contactPersonId=null; const contactModal=document.getElementById("contactModal");
function openContactModal(id=null){
  if(!state.people.length){switchView("circleView");openPersonModal();showSaved("Add someone first");return;}
  contactPersonId=id;
  const p=state.people.find(x=>x.id===id);
  const picker=document.getElementById("contactPerson");
  picker.innerHTML=state.people.map(person=>`<option value="${escapeAttr(person.id)}">${escapeHTML(person.name)}</option>`).join("");
  if(id) picker.value=id;
  document.getElementById("contactPersonRow").style.display=id?"none":"grid";
  document.getElementById("contactModalTitle").textContent=p?`Log contact · ${p.name}`:"Log contact";
  document.getElementById("contactMethod").value=localStorage.getItem(METHOD_KEY)||"Text";
  document.getElementById("contactDate").value=dateKey();document.getElementById("contactNote").value="";contactModal.classList.add("show");
}
function closeContactModal(){contactModal.classList.remove("show");contactPersonId=null;}
document.getElementById("closeContactModal").addEventListener("click",closeContactModal);document.getElementById("cancelContactBtn").addEventListener("click",closeContactModal);
document.getElementById("saveContactBtn").addEventListener("click",()=>{const chosenId=contactPersonId||document.getElementById("contactPerson").value;if(!chosenId)return;const p=state.people.find(x=>x.id===chosenId);if(!p)return;const before=structuredClone(state);const date=document.getElementById("contactDate").value||dateKey();const method=document.getElementById("contactMethod").value;p.interactions ||= [];p.interactions.push({date,method,note:document.getElementById("contactNote").value.trim(),createdAt:new Date().toISOString()});p.lastContact=date;localStorage.setItem(METHOD_KEY,method);closeContactModal();saveState();showSaved(`Contact logged · ${p.name}`,before);}); contactModal.addEventListener("click",e=>{if(e.target===contactModal)closeContactModal()});
const managePeopleModal=document.getElementById("managePeopleModal");
function renderManagePeople(){const list=document.getElementById("managePeopleList");list.innerHTML="";state.people.forEach(p=>{const row=document.createElement("div");row.className="manage-item";row.innerHTML=`${visualHTML(p,"avatar","person")}<div class="grow"><strong>${escapeHTML(p.name)}</strong>${p.relation?relationPillHTML(p.relation,"relationship-label small"):`<small>${escapeHTML(frequencyLabel(p.frequency))}</small>`}</div><button class="tiny-btn" data-person="${escapeAttr(p.id)}">Edit</button>`;list.appendChild(row)});if(!state.people.length)list.innerHTML=`<div class="empty-card">No people added yet.</div>`;list.querySelectorAll("[data-person]").forEach(b=>b.addEventListener("click",()=>{managePeopleModal.classList.remove("show");openPersonModal(b.dataset.person)}));}
document.getElementById("managePeopleBtn").addEventListener("click",()=>{renderManagePeople();managePeopleModal.classList.add("show")});document.getElementById("closeManagePeople").addEventListener("click",()=>managePeopleModal.classList.remove("show"));document.getElementById("managePersonAdd").addEventListener("click",()=>{managePeopleModal.classList.remove("show");openPersonModal()});managePeopleModal.addEventListener("click",e=>{if(e.target===managePeopleModal)managePeopleModal.classList.remove("show")});
