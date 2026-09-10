function frequencyLabel(days){
  days=Number(days||0); if(days===7) return "Weekly"; if(days===14) return "Every 2 weeks"; if(days===30) return "Monthly"; if(days===60) return "Occasionally"; return "No schedule";
}
function latestInteraction(p){
  const a=p.interactions||[];
  return a.length?[...a].sort((x,y)=>(y.date||"").localeCompare(x.date||"") || (y.createdAt||"").localeCompare(x.createdAt||""))[0]:null;
}
function latestSeenInteraction(p){
  const a=(p.interactions||[]).filter(x=>x.countsAsSeen===true||(x.countsAsSeen===undefined&&(x.method||"").toLowerCase()==="in person"));
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
// Keeps p.lastContact (a cached mirror used as a fallback when interactions is empty,
// and by the day-count-badge fallback in the review timeline) in sync with the actual
// interaction list — call this after any create/edit/delete so no stale date lingers.
function syncLastContact(p){
  const last=latestContactDate(p);
  p.lastContact=last?dateKey(last):null;
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
// A per-relation low-effort reach-out idea — the "Contact ideas" feature the Guide has
// documented ("a low-effort way to reach out") but nothing previously implemented.
const CONTACT_IDEAS={
  family:"A little hello is enough.",
  partner:"Share your day.",
  "close-friend":"Check in and catch up.",
  friend:"Check in and catch up.",
  coworker:"A short message goes a long way.",
  "work-contact":"A short message goes a long way.",
  pet:"Give them a little extra love today.",
  acquaintance:"A quick hello, nothing more needed.",
  other:"Reach out, even briefly."
};
function contactIdea(p){ return CONTACT_IDEAS[p.relation]||"A quick hello keeps things warm."; }
const CIRCLE_RANK=t=>t.class==="due"?0:t.class==="soon"?1:t.class==="good"?2:3;
let circleSearchQuery="",circleShowAllCheckins=false,circleShowAllRecent=false;
function circleMatches(p){
  if(!circleSearchQuery) return true;
  return p.name.toLowerCase().includes(circleSearchQuery);
}
// Screenshot-style Circle: one featured "next check-in" person, a ranked list of who to
// check in with, and a feed of recent interactions across everyone — rather than the
// single flat list this view used before. Superseded per explicit direction: the flat
// list had replaced an earlier version of this same layout, but the current mockup asks
// for it back.
function renderCircle(){
  const hero=document.getElementById("circleHeroCard");
  const checkinList=document.getElementById("circleCheckinList");
  const recentList=document.getElementById("circleRecentList");
  if(!state.people.length){
    hero.innerHTML="";
    checkinList.innerHTML=`<div class="circle-empty-row">No people yet. Add one person you want to keep in view.</div>`;
    recentList.innerHTML=`<div class="circle-empty-row">Nothing logged yet.</div>`;
    return;
  }
  const matching=state.people.filter(circleMatches);
  const ranked=[...matching].sort((a,b)=>CIRCLE_RANK(personTiming(a))-CIRCLE_RANK(personTiming(b)));
  hero.innerHTML=ranked.length?circleHeroHTML(ranked[0]):`<div class="circle-empty-row">No one matches that search.</div>`;
  const checkinRest=ranked.slice(1);
  const checkinShown=circleShowAllCheckins?checkinRest:checkinRest.slice(0,4);
  checkinList.innerHTML=checkinShown.length?checkinShown.map(circleCheckinRowHTML).join(""):`<div class="circle-empty-row">Everyone's caught up.</div>`;
  document.getElementById("circleCheckinViewAll").style.display=checkinRest.length>4?"":"none";
  document.getElementById("circleCheckinViewAll").textContent=circleShowAllCheckins?"Show less ›":"View all ›";
  const interactions=matching.flatMap(p=>(p.interactions||[]).map(item=>({p,item})))
    .sort((a,b)=>(b.item.date||"").localeCompare(a.item.date||"")||(b.item.createdAt||"").localeCompare(a.item.createdAt||""));
  const recentShown=circleShowAllRecent?interactions:interactions.slice(0,4);
  recentList.innerHTML=recentShown.length?recentShown.map(circleRecentRowHTML).join(""):`<div class="circle-empty-row">No interactions logged yet.</div>`;
  document.getElementById("circleRecentViewAll").style.display=interactions.length>4?"":"none";
  document.getElementById("circleRecentViewAll").textContent=circleShowAllRecent?"Show less ›":"View all ›";
}
function circleHeroHTML(p){
  const t=personTiming(p),last=latestContactDate(p);
  return `<div class="circle-hero-card">
    <div class="circle-hero-eyebrow">✦ Your next check-in</div>
    <div class="circle-hero-main">
      ${visualHTML(p,"avatar","person")}
      <div class="circle-hero-copy">
        <div class="circle-hero-name">${escapeHTML(p.name)}</div>
        <div class="circle-hero-note">${escapeHTML(contactIdea(p))}</div>
        <span class="circle-hero-pill">${last?`Last talked ${escapeHTML(relativeContactLabel(last).toLowerCase())}`:escapeHTML(t.label)}</span>
      </div>
    </div>
    <div class="circle-hero-actions">
      <button type="button" class="circle-hero-btn primary" onclick="openContactModal('${jsEscape(p.id)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.4 15.2c1 1 2.2 1.9 3.5 2.5.4.2.9 0 1.2-.3l1-1.3c.3-.4.9-.6 1.4-.4l3.5 1.4c.5.2.8.7.7 1.2-.4 2.4-2.5 4.1-4.9 3.9C12.8 21.9 4.1 13.2 3.5 6.2c-.2-2.4 1.5-4.5 3.9-4.9.5-.1 1 .2 1.2.7l1.4 3.5c.2.5 0 1.1-.4 1.4L8.3 8c-.3.3-.5.8-.3 1.2.6 1.3 1.5 2.5 2.5 3.5.3.3.6.6.9.5Z"></path></svg>Reach out</button>
      <button type="button" class="circle-hero-btn secondary" onclick="openContactModal('${jsEscape(p.id)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path></svg>Log</button>
    </div>
  </div>`;
}
function circleCheckinRowHTML(p){
  const t=personTiming(p),last=latestContactDate(p),pillText=last?relativeContactLabel(last):t.label;
  return `<button type="button" class="circle-row" onclick="openPersonDetail('${jsEscape(p.id)}')">${visualHTML(p,"avatar","person")}<span class="circle-row-copy"><span class="circle-row-name">${escapeHTML(p.name)}</span><span class="circle-row-note">${escapeHTML(contactIdea(p))}</span></span><span class="circle-row-pill ${t.class}">${escapeHTML(pillText)}</span><span class="circle-row-chevron" aria-hidden="true">›</span></button>`;
}
function circleRecentRowHTML({p,item}){
  const note=item.note||item.method||"Contact";
  const when=relativeContactLabel(parseLocalDate(item.date));
  return `<button type="button" class="circle-row" onclick="openEditInteraction('${jsEscape(p.id)}','${jsEscape(item.id)}')">${visualHTML(p,"avatar","person")}<span class="circle-row-copy"><span class="circle-row-name">${escapeHTML(p.name)}</span><span class="circle-row-note">${escapeHTML(note)} · ${escapeHTML(when)}</span></span><span class="circle-row-chevron" aria-hidden="true">›</span></button>`;
}
document.getElementById("circleSearchBtn").addEventListener("click",()=>{
  const row=document.getElementById("circleSearchRow"),input=document.getElementById("circleSearchInput");
  row.hidden=!row.hidden;
  if(!row.hidden) input.focus(); else { input.value=""; circleSearchQuery=""; renderCircle(); }
});
document.getElementById("circleSearchInput").addEventListener("input",e=>{circleSearchQuery=e.target.value.trim().toLowerCase();renderCircle();});
document.getElementById("circleCheckinViewAll").addEventListener("click",()=>{circleShowAllCheckins=!circleShowAllCheckins;renderCircle();});
document.getElementById("circleRecentViewAll").addEventListener("click",()=>{circleShowAllRecent=!circleShowAllRecent;renderCircle();});

let detailPersonId=null,detailCalendarMonth=null;const personDetailModal=document.getElementById("personDetailModal");
function contactCalendarHTML(p,month=detailCalendarMonth||new Date()){
  const start=new Date(month.getFullYear(),month.getMonth(),1),days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate(),events=new Map();
  (p.interactions||[]).forEach(item=>{const d=parseLocalDate(item.date);if(!d||d.getFullYear()!==start.getFullYear()||d.getMonth()!==start.getMonth())return;const day=d.getDate(),items=events.get(day)||[];items.push(item);events.set(day,items)});
  if(!(p.interactions||[]).length&&p.lastContact){const d=parseLocalDate(p.lastContact);if(d&&d.getFullYear()===start.getFullYear()&&d.getMonth()===start.getMonth())events.set(d.getDate(),[{date:p.lastContact,method:"Contact"}])}
  // Every real day up to today is tappable — not just days with a contact — so a date with
  // nothing logged still opens the day-detail sheet with a ready "+ Add Interaction" for it.
  // Future days are disabled (matching the habit backfill calendar's existing rule): a
  // "what did you do" log has no meaning for a day that hasn't happened yet.
  const today=new Date();
  const cells=[];for(let i=0;i<start.getDay();i++)cells.push('<span class="calendar-day" aria-hidden="true"></span>');for(let day=1;day<=days;day++){const d=new Date(start.getFullYear(),start.getMonth(),day),key=dateKey(d),isFuture=d>today;const items=events.get(day)||[],inPerson=items.some(x=>(x.method||"").toLowerCase()==="in person"),isToday=key===dateKey(),methods=[...new Set(items.map(x=>x.method||"Contact"))].join(", ");cells.push(`<button type="button" class="calendar-day tappable ${items.length?"contact":""} ${inPerson?"in-person":""} ${isToday?"today":""}" ${isFuture?"disabled":`onclick="openDayDetail('${jsEscape(p.id)}','${key}')"`} aria-label="${escapeAttr(fmtLong(d))}${items.length?`, ${methods}, ${items.length} contact${items.length===1?"":"s"}`:""}">${day}${items.length>1?`<span class="contact-count">${items.length}</span>`:""}</button>`)}
  const current=new Date(),atCurrent=start.getFullYear()===current.getFullYear()&&start.getMonth()===current.getMonth(),label=new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(start);
  return `<div class="calendar-head"><div><div class="calendar-title">Contact calendar</div><div class="calendar-month">${escapeHTML(label)}</div></div><div class="calendar-nav"><button onclick="shiftPersonCalendar(-1)" aria-label="Previous month">‹</button><button onclick="shiftPersonCalendar(1)" aria-label="Next month" ${atCurrent?"disabled":""}>›</button></div></div><div class="calendar-grid">${["S","M","T","W","T","F","S"].map(x=>`<span class="calendar-weekday">${x}</span>`).join("")}${cells.join("")}</div><div class="calendar-legend"><span><i class="legend-mark"></i>Contact</span><span><i class="legend-mark in-person"></i>In person</span></div>`
}
function renderPersonCalendar(){const p=state.people.find(x=>x.id===detailPersonId),el=document.getElementById("personContactCalendar");if(p&&el)el.innerHTML=contactCalendarHTML(p)}
function shiftPersonCalendar(delta){if(!detailCalendarMonth)return;const next=new Date(detailCalendarMonth.getFullYear(),detailCalendarMonth.getMonth()+delta,1),current=new Date(),currentStart=new Date(current.getFullYear(),current.getMonth(),1);detailCalendarMonth=next>currentStart?currentStart:next;renderPersonCalendar()}
// Tapping the row opens Edit Interaction directly (the fast path); the ••• menu is a
// secondary, discoverable way to reach the same edit, plus Change date and Delete.
function interactionRowHTML(personId,item){
  const title=`${escapeHTML(fmtDate(parseLocalDate(item.date)))} · ${escapeHTML(item.method||"Contact")}`;
  return `<div class="interaction-row">
    <button type="button" class="interaction-row-main" onclick="openEditInteraction('${jsEscape(personId)}','${jsEscape(item.id)}')">
      <span class="interaction-row-title">${title}</span>
      ${item.note?`<span class="interaction-row-note">${escapeHTML(item.note)}</span>`:""}
    </button>
    <details class="interaction-menu">
      <summary aria-label="More options for this interaction">•••</summary>
      <div class="interaction-menu-list">
        <button type="button" onclick="this.closest('details').removeAttribute('open');openEditInteraction('${jsEscape(personId)}','${jsEscape(item.id)}')">Edit</button>
        <button type="button" onclick="this.closest('details').removeAttribute('open');openEditInteraction('${jsEscape(personId)}','${jsEscape(item.id)}',true)">Change date</button>
        <button type="button" class="danger" onclick="this.closest('details').removeAttribute('open');deleteInteractionConfirm('${jsEscape(personId)}','${jsEscape(item.id)}')">Delete</button>
      </div>
    </details>
  </div>`;
}
function interactionHistoryHTML(p){
  const items=[...(p.interactions||[])].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||"").localeCompare(a.createdAt||""));
  if(!items.length) return `<div class="empty-notes">No interactions logged yet.</div>`;
  return `<div class="interaction-list">${items.map(item=>interactionRowHTML(p.id,item)).join("")}</div>`;
}
function openPersonDetail(id){
  const p=state.people.find(x=>x.id===id);if(!p)return;
  const isRefresh=detailPersonId===id;
  detailPersonId=id;
  const t=personTiming(p),latest=latestInteraction(p),last=latestContactDate(p),inPerson=parseLocalDate(latestSeenInteraction(p)?.date),next=nextContactDate(p);
  // Only jump the calendar to the latest-contact month on a fresh open — refreshing in
  // place after an edit (e.g. from Edit Interaction) shouldn't discard the month the
  // user was already looking at.
  if(!isRefresh||!detailCalendarMonth) detailCalendarMonth=last?new Date(last.getFullYear(),last.getMonth(),1):new Date(new Date().getFullYear(),new Date().getMonth(),1);
  const notes=[...(p.notes||[])].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  const notesHTML=notes.length?`<div class="note-list">${notes.map(n=>`<div class="memory-note"><div class="memory-note-type">${escapeHTML(n.type||"Remember")}</div><div class="memory-note-text">${escapeHTML(n.text||"")}</div><div class="memory-note-date">${n.createdAt?escapeHTML(fmtDate(new Date(n.createdAt))):""}</div></div>`).join("")}</div>`:`<div class="empty-notes">No personal notes yet. Save a memory, gift idea, life update, or follow-up when it naturally comes up.</div>`;
  document.getElementById("personDetailTitle").textContent=p.name;
  document.getElementById("personDetailBody").innerHTML=`<div class="person-detail-hero">${visualHTML(p,"avatar","person")}<div><div class="person-name">${escapeHTML(p.name)}</div><div class="person-chips">${relationPillHTML(p.relation,"person-chip relation")}<span class="person-chip ${t.class}">${escapeHTML(t.label)}</span></div></div></div><div class="detail-facts"><div class="detail-fact"><span>💬</span><span class="detail-fact-copy"><span class="detail-fact-label">Last contact</span><span class="detail-fact-value">${escapeHTML(relativeContactLabel(last))}</span>${latest?.method?`<span class="detail-fact-sub">${escapeHTML(latest.method)}</span>`:""}</span></div><div class="detail-fact"><span>👥</span><span class="detail-fact-copy"><span class="detail-fact-label">Last seen in person</span><span class="detail-fact-value">${escapeHTML(relativeContactLabel(inPerson))}</span></span></div><div class="detail-fact"><span>📅</span><span class="detail-fact-copy"><span class="detail-fact-label">Usual rhythm</span><span class="detail-fact-value">${escapeHTML(frequencyLabel(p.frequency))}</span>${next?`<span class="detail-fact-sub">Around ${escapeHTML(fmtDate(next))}</span>`:""}</span></div></div><div class="contact-calendar" id="personContactCalendar">${contactCalendarHTML(p)}</div><div class="notes-section"><div class="notes-head"><div class="notes-title">Interaction history</div></div>${interactionHistoryHTML(p)}</div><div class="notes-section"><div class="notes-head"><div class="notes-title">Notes to remember</div><button class="tiny-btn" onclick="openPersonNote('${jsEscape(p.id)}',true)">＋ Add</button></div>${notesHTML}</div>`;
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
let contactPersonId=null,contactSelectedDate=dateKey(),contactDateIsCustom=false; const contactModal=document.getElementById("contactModal");
function renderContactDatePicker(){
  setupDatePicker({
    chipsId:"contactDateChips",customId:"contactDateCustom",summaryId:"contactDateSummary",
    getState:()=>({date:contactSelectedDate,isCustom:contactDateIsCustom}),
    setState:(d,isCustom)=>{contactSelectedDate=d;contactDateIsCustom=isCustom;renderContactDatePicker();}
  });
}
function updateContactSeenRow(){
  const method=document.getElementById("contactMethod").value;
  const row=document.getElementById("contactSeenRow"),box=document.getElementById("contactCountsAsSeen");
  const applicable=method==="In person"||method==="Video";
  row.style.display=applicable?"flex":"none";
  box.checked=method==="In person";
}
document.getElementById("contactMethod").addEventListener("change",updateContactSeenRow);
function openContactModal(id=null,presetDate=null){
  if(!state.people.length){switchView("circleView");openPersonModal();showSaved("Add someone first");return;}
  contactPersonId=id;
  const p=state.people.find(x=>x.id===id);
  const picker=document.getElementById("contactPerson");
  picker.innerHTML=state.people.map(person=>`<option value="${escapeAttr(person.id)}">${escapeHTML(person.name)}</option>`).join("");
  if(id) picker.value=id;
  document.getElementById("contactPersonRow").style.display=id?"none":"grid";
  document.getElementById("contactModalTitle").textContent=p?`Log contact · ${p.name}`:"Log contact";
  document.getElementById("contactMethod").value=localStorage.getItem(METHOD_KEY)||"Text";
  document.getElementById("contactNote").value="";
  contactSelectedDate=presetDate||dateKey();
  contactDateIsCustom=Boolean(presetDate&&presetDate!==dateKey());
  // When a date was preselected (tapped from the calendar's day-detail sheet), expand the
  // date row so it's visibly the date being logged for — never a silent, invisible preset.
  document.getElementById("contactDateDetails").open=contactDateIsCustom;
  renderContactDatePicker();
  updateContactSeenRow();
  contactModal.classList.add("show");
}
function closeContactModal(){contactModal.classList.remove("show");contactPersonId=null;returnToPersonDetailIfNeeded();}
document.getElementById("closeContactModal").addEventListener("click",closeContactModal);document.getElementById("cancelContactBtn").addEventListener("click",closeContactModal);
document.getElementById("saveContactBtn").addEventListener("click",()=>{
  const chosenId=contactPersonId||document.getElementById("contactPerson").value;if(!chosenId)return;
  const p=state.people.find(x=>x.id===chosenId);if(!p)return;
  const before=structuredClone(state);
  const date=contactSelectedDate||dateKey();
  const method=document.getElementById("contactMethod").value;
  const note=document.getElementById("contactNote").value.trim();
  const countsAsSeen=document.getElementById("contactSeenRow").style.display!=="none"&&document.getElementById("contactCountsAsSeen").checked;
  p.interactions ||= [];
  const dup=p.interactions.find(item=>item.date===date&&item.method===method);
  if(dup){
    if(!confirm(`That day already has a ${method} contact logged. Update it instead of adding another?`)) return;
    dup.note=note;dup.countsAsSeen=countsAsSeen;dup.updatedAt=new Date().toISOString();
  }else{
    p.interactions.push({id:"i-"+Date.now(),date,method,note,countsAsSeen,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  }
  syncLastContact(p);
  localStorage.setItem(METHOD_KEY,method);
  closeContactModal();saveState();
  showSaved(date===dateKey()?`Contact logged · ${p.name}`:"Added. Your timeline is more accurate now.",before);
});
contactModal.addEventListener("click",e=>{if(e.target===contactModal)closeContactModal()});

// Re-renders Person Detail in place if it's currently the visible sheet for this person —
// covers deleting/editing via the ••• menu directly from the history list, where no other
// sheet was opened on top of it.
function refreshOpenCirclePanels(personId){
  if(detailPersonId===personId&&personDetailModal.classList.contains("show")) openPersonDetail(personId);
}

// IMPORTANT: every .modal-backdrop shares the same z-index, so with two shown at once the
// one that appears LATER in index.html paints on top regardless of which was opened more
// recently — personDetailModal is declared after editInteractionModal/dayDetailModal, so
// simply leaving it "open behind" a newer sheet used to bury that sheet under a stale
// Person Detail. Sheets reached from Person Detail must HIDE it (not just render on top of
// it) and explicitly reopen it via this variable when they close.
let circleReturnPersonId=null;
function returnToPersonDetailIfNeeded(){
  const id=circleReturnPersonId;
  circleReturnPersonId=null;
  if(id) openPersonDetail(id);
}

let dayDetailPersonId=null,dayDetailDate=null;
const dayDetailModal=document.getElementById("dayDetailModal");
function openDayDetail(personId,dateKeyStr){
  const p=state.people.find(x=>x.id===personId);if(!p)return;
  dayDetailPersonId=personId;dayDetailDate=dateKeyStr;
  circleReturnPersonId=personId;
  personDetailModal.classList.remove("show");
  document.getElementById("dayDetailTitle").textContent=new Intl.DateTimeFormat(undefined,{month:"long",day:"numeric"}).format(parseLocalDate(dateKeyStr));
  const items=(p.interactions||[]).filter(x=>x.date===dateKeyStr).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  document.getElementById("dayDetailList").innerHTML=items.length?items.map(item=>interactionRowHTML(personId,item)).join(""):`<div class="empty-notes">Nothing logged for this day yet.</div>`;
  dayDetailModal.classList.add("show");
}
function closeDayDetail(){
  dayDetailModal.classList.remove("show");
  dayDetailPersonId=null;dayDetailDate=null;
  returnToPersonDetailIfNeeded();
}
document.getElementById("closeDayDetail").addEventListener("click",closeDayDetail);
dayDetailModal.addEventListener("click",e=>{if(e.target===dayDetailModal)closeDayDetail()});
document.getElementById("dayDetailAddBtn").addEventListener("click",()=>{
  const personId=dayDetailPersonId,date=dayDetailDate;
  // Going straight to Log Contact, not back to Person Detail yet — circleReturnPersonId
  // (already set when Day Detail opened) carries over so closing/saving that sheet is what
  // brings the user back.
  dayDetailModal.classList.remove("show");
  dayDetailPersonId=null;dayDetailDate=null;
  if(personId) openContactModal(personId,date);
});

let editingInteractionPersonId=null,editingInteractionId=null;
let editInteractionSelectedDate=dateKey(),editInteractionDateIsCustom=false;
const editInteractionModal=document.getElementById("editInteractionModal");
function renderEditInteractionDatePicker(){
  setupDatePicker({
    chipsId:"editInteractionDateChips",customId:"editInteractionDateCustom",summaryId:"editInteractionDateSummary",
    getState:()=>({date:editInteractionSelectedDate,isCustom:editInteractionDateIsCustom}),
    setState:(d,isCustom)=>{editInteractionSelectedDate=d;editInteractionDateIsCustom=isCustom;renderEditInteractionDatePicker();}
  });
}
function updateEditInteractionSeenRow(){
  const method=document.getElementById("editInteractionMethod").value;
  document.getElementById("editInteractionSeenRow").style.display=(method==="In person"||method==="Video")?"flex":"none";
}
document.getElementById("editInteractionMethod").addEventListener("change",updateEditInteractionSeenRow);
// Tapping the interaction itself is the fast path into this sheet; the ••• "Change date"
// option is the same sheet with the date row already expanded (focusDate), not a separate flow.
function openEditInteraction(personId,interactionId,focusDate=false){
  const p=state.people.find(x=>x.id===personId);if(!p)return;
  const item=(p.interactions||[]).find(x=>x.id===interactionId);if(!item)return;
  editingInteractionPersonId=personId;editingInteractionId=interactionId;
  editInteractionSelectedDate=item.date||dateKey();
  editInteractionDateIsCustom=editInteractionSelectedDate!==dateKey();
  document.getElementById("editInteractionMethod").value=item.method||"Text";
  updateEditInteractionSeenRow();
  document.getElementById("editInteractionCountsAsSeen").checked=Boolean(item.countsAsSeen);
  document.getElementById("editInteractionNote").value=item.note||"";
  document.getElementById("editInteractionDateDetails").open=Boolean(focusDate);
  renderEditInteractionDatePicker();
  // Hide whichever sheet this was opened from (never leave it "open behind" — see the
  // stacking note above) and remember to come back to Person Detail, refreshed, on close.
  dayDetailModal.classList.remove("show");
  dayDetailPersonId=null;dayDetailDate=null;
  personDetailModal.classList.remove("show");
  circleReturnPersonId=personId;
  editInteractionModal.classList.add("show");
}
function closeEditInteraction(){
  editInteractionModal.classList.remove("show");
  editingInteractionPersonId=null;editingInteractionId=null;
  returnToPersonDetailIfNeeded();
}
document.getElementById("closeEditInteraction").addEventListener("click",closeEditInteraction);
editInteractionModal.addEventListener("click",e=>{if(e.target===editInteractionModal)closeEditInteraction()});
document.getElementById("saveEditInteractionBtn").addEventListener("click",()=>{
  const p=state.people.find(x=>x.id===editingInteractionPersonId);if(!p)return;
  const item=(p.interactions||[]).find(x=>x.id===editingInteractionId);if(!item)return;
  const before=structuredClone(state);
  const nextDate=editInteractionSelectedDate||item.date;
  const nextMethod=document.getElementById("editInteractionMethod").value;
  let nextNote=document.getElementById("editInteractionNote").value.trim();
  const duplicate=(p.interactions||[]).find(x=>x.id!==item.id&&x.date===nextDate&&x.method===nextMethod);
  if(duplicate){
    if(!confirm(`That day already has a ${nextMethod} contact logged. Replace the existing entry with these changes?`)) return;
    if(duplicate.note&&duplicate.note!==nextNote) nextNote=[nextNote,duplicate.note].filter(Boolean).join(" · ");
    p.interactions=(p.interactions||[]).filter(x=>x.id!==duplicate.id);
  }
  item.date=nextDate;
  item.method=nextMethod;
  item.note=nextNote;
  item.countsAsSeen=document.getElementById("editInteractionSeenRow").style.display!=="none"&&document.getElementById("editInteractionCountsAsSeen").checked;
  item.updatedAt=new Date().toISOString();
  syncLastContact(p);
  saveState();
  showSaved("Interaction updated",before);
  closeEditInteraction();
});
function deleteInteractionConfirm(personId,interactionId){
  if(!confirm("Delete this interaction? This can't be undone.")) return false;
  const p=state.people.find(x=>x.id===personId);if(!p)return false;
  const before=structuredClone(state);
  p.interactions=(p.interactions||[]).filter(x=>x.id!==interactionId);
  syncLastContact(p);
  saveState();
  showSaved("Interaction deleted",before);
  refreshOpenCirclePanels(personId);
  if(dayDetailPersonId===personId&&dayDetailModal.classList.contains("show")) openDayDetail(personId,dayDetailDate);
  return true;
}
document.getElementById("deleteInteractionBtn").addEventListener("click",()=>{
  if(!editingInteractionPersonId||!editingInteractionId) return;
  const personId=editingInteractionPersonId,interactionId=editingInteractionId;
  if(deleteInteractionConfirm(personId,interactionId)){
    editInteractionModal.classList.remove("show");
    editingInteractionPersonId=null;editingInteractionId=null;
    returnToPersonDetailIfNeeded();
  }
});
const managePeopleModal=document.getElementById("managePeopleModal");
function renderManagePeople(){const list=document.getElementById("managePeopleList");list.innerHTML="";state.people.forEach(p=>{const row=document.createElement("div");row.className="manage-item";row.innerHTML=`${visualHTML(p,"avatar","person")}<div class="grow"><strong>${escapeHTML(p.name)}</strong>${p.relation?relationPillHTML(p.relation,"relationship-label small"):`<small>${escapeHTML(frequencyLabel(p.frequency))}</small>`}</div><button class="tiny-btn" data-person="${escapeAttr(p.id)}">Edit</button>`;list.appendChild(row)});if(!state.people.length)list.innerHTML=`<div class="empty-card">No people added yet.</div>`;list.querySelectorAll("[data-person]").forEach(b=>b.addEventListener("click",()=>{managePeopleModal.classList.remove("show");openPersonModal(b.dataset.person)}));}
document.getElementById("managePeopleBtn").addEventListener("click",()=>{renderManagePeople();managePeopleModal.classList.add("show")});document.getElementById("closeManagePeople").addEventListener("click",()=>managePeopleModal.classList.remove("show"));document.getElementById("managePersonAdd").addEventListener("click",()=>{managePeopleModal.classList.remove("show");openPersonModal()});managePeopleModal.addEventListener("click",e=>{if(e.target===managePeopleModal)managePeopleModal.classList.remove("show")});
