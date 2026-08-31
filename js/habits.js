function getStatus(habitId, key=dateKey()){ return state.logs?.[key]?.[habitId] || ""; }
function setStatus(habitId, status){
  const before=structuredClone(state);
  const key=dateKey();
  state.logs[key] ||= {};
  if(!getStatus(habitId,key)&&["done","counted"].includes(status)&&wasMissedPreviousRecordedDay(habitId))status="returned";
  if(getStatus(habitId,key)===status) delete state.logs[key][habitId];
  else state.logs[key][habitId]=status;
  saveState();
  showSaved("Habit updated",before);
}
function wasMissedPreviousRecordedDay(habitId){
  // most recent earlier day that has a status for this habit
  for(let i=1;i<=30;i++){
    const k=dateKey(addDays(new Date(),-i));
    const s=getStatus(habitId,k);
    if(s) return s==="miss";
  }
  return false;
}
function lastMissDistance(habitId, returnDate){
  // count calendar days back to the most recent miss before a returned log
  for(let i=1;i<=60;i++){
    const k=dateKey(addDays(returnDate,-i));
    const s=getStatus(habitId,k);
    if(s==="miss") return i;
    if(s==="done" || s==="counted" || s==="returned") return null;
  }
  return null;
}
function startOfWeek(d=new Date()){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()),day=x.getDay()||7;x.setDate(x.getDate()-day+1);return x}
function weeklyProgress(h){let count=0;const start=startOfWeek();for(let i=0;i<7;i++){const s=getStatus(h.id,dateKey(addDays(start,i)));if(["done","counted","returned"].includes(s))count++}return count}
function habitAppliesToday(h){const type=h.scheduleType||"daily";return type==="daily"||(type==="days"&&(h.weekdays||[]).map(Number).includes(new Date().getDay()))}
function scheduleLabel(h){
  const type=h.scheduleType||"daily";
  if(type==="daily")return "Daily";
  if(type==="flexible")return "Flexible";
  if(type==="weekly"){const target=Number(h.weeklyTarget||1),progress=weeklyProgress(h);return `${progress}/${target} this week`}
  const names=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return (h.weekdays||[]).map(Number).sort((a,b)=>(a||7)-(b||7)).map(d=>names[d]).join(" · ")||"Specific days";
}
function isReduceGoal(h){return h?.goalType==="reduce"}
function smallerVersions(h){return [h?.small,h?.small2].map(x=>(x||"").trim()).filter(Boolean)}
function goalCue(h,gentle=false){const smaller=smallerVersions(h);if(gentle&&smaller.length)return dailyCopy(`small-${h.id}`,smaller);if(h.full)return h.full;if(isReduceGoal(h))return "Stay within the plan you chose for today.";return scheduleLabel(h)}
function habitActionLabel(h,mode){if(isReduceGoal(h))return mode==="return"?"↩ Back to plan":mode==="gentle"?"○ Reduced":"✓ Within plan";return mode==="return"?"↩ Make contact":mode==="gentle"?"○ Do smaller version":"✓ Mark done"}
function statusOptions(h){return isReduceGoal(h)?[["done","✓ Within plan"],["counted","○ Reduced"],["miss","— Over plan"],["returned","↩ Back to plan"]]:[["done","✓ Full version"],["counted","○ Smaller version"],["miss","— Not today"],["returned","↩ Returned"]]}
function gentleDayOn(){try{const value=JSON.parse(localStorage.getItem(GENTLE_KEY)||"{}");return value.date===dateKey()&&value.on===true}catch{return false}}
function setGentleDay(on){localStorage.setItem(GENTLE_KEY,JSON.stringify({date:dateKey(),on}));renderToday();showSaved(on?"Gentle day on":"Standard day on")}
function quickCompleteHabit(id){const current=getStatus(id);if(current){openStatusModal(id);return}const next=wasMissedPreviousRecordedDay(id)?"returned":gentleDayOn()?"counted":"done";setStatus(id,next)}
function habitStatusIcon(status){return ({done:"✓",counted:"○",miss:"—",returned:"↩"})[status]||""}

function renderToday(){
  document.getElementById("todayDate").textContent=fmtLong(new Date());
  const list=document.getElementById("habitList");
  list.innerHTML="";list.style.display="block";
  const gentle=gentleDayOn();
  document.getElementById("habitOverview").classList.toggle("gentle",gentle);
  const gentleBtn=document.getElementById("gentleModeBtn");gentleBtn.classList.toggle("active",gentle);gentleBtn.textContent=gentle?"🌿 Gentle day · On":"🌿 Gentle day";
  const meta=state.habits.map(h=>({habit:h,status:getStatus(h.id),suggestReturn:wasMissedPreviousRecordedDay(h.id)&&!getStatus(h.id)}));
  const base=meta.filter(x=>habitScope==="all"||(habitScope==="today"&&habitAppliesToday(x.habit))||(habitScope==="week"&&(x.habit.scheduleType||"daily")==="weekly"));
  const visible=base.filter(x=>habitStatusFilter==="any"||(habitStatusFilter==="unlogged"&&!x.status)||(habitStatusFilter==="logged"&&x.status)||(habitStatusFilter==="return"&&x.suggestReturn));
  const scopes={today:"Today",week:"Week",all:"All"};
  document.getElementById("habitScope").innerHTML=Object.entries(scopes).map(([key,label])=>`<button class="scope-btn ${habitScope===key?"active":""}" data-habit-scope="${key}">${label}</button>`).join("");
  document.querySelectorAll("[data-habit-scope]").forEach(button=>button.addEventListener("click",()=>{habitScope=button.dataset.habitScope;localStorage.setItem("personal_workbench_habit_filter",habitScope);renderToday()}));
  const filterLabels={any:"Everything",unlogged:"Not logged",logged:"Logged",return:"Return opportunities"};
  const filterBtn=document.getElementById("habitFilterBtn");filterBtn.classList.toggle("active",habitStatusFilter!=="any");filterBtn.textContent=habitStatusFilter==="any"?"☰ Filter":`☰ ${filterLabels[habitStatusFilter]}`;
  const filterNote=document.getElementById("activeFilterNote");filterNote.style.display=habitStatusFilter==="any"?"none":"block";filterNote.textContent=`Showing ${filterLabels[habitStatusFilter].toLowerCase()} · tap Filter to change`;
  let complete,total;
  if(habitScope==="week"){total=base.reduce((sum,x)=>sum+Number(x.habit.weeklyTarget||1),0);complete=base.reduce((sum,x)=>sum+Math.min(weeklyProgress(x.habit),Number(x.habit.weeklyTarget||1)),0)}else{total=base.length;complete=base.filter(x=>x.status).length}
  const scopeLabel=habitScope==="today"?"Today":habitScope==="week"?"This week":"All habits";
  document.getElementById("habitOverviewLabel").textContent=scopeLabel;
  document.getElementById("habitProgressText").textContent=total?`${complete} of ${total} checked in`:"Nothing asking for you";
  document.getElementById("habitProgressBar").style.width=total?`${Math.min(100,Math.round(complete/total*100))}%`:"0%";

  const focus=visible.find(x=>!x.status&&(!(x.habit.scheduleType==="weekly")||weeklyProgress(x.habit)<Number(x.habit.weeklyTarget||1)));
  const focusEl=document.getElementById("habitFocus");
  if(focus){const h=focus.habit,mode=focus.suggestReturn?"return":gentle?"gentle":"done";const cue=focus.suggestReturn?(isReduceGoal(h)?"The next choice is a return—not a restart.":"This is a return—not a restart."):goalCue(h,gentle);focusEl.innerHTML=`<div class="focus-card"><div class="focus-eyebrow">${isReduceGoal(h)?"Reduce goal":"Up next"}</div><div class="focus-main">${visualHTML(h,"emoji")}<div class="focus-copy"><div class="focus-name">${escapeHTML(h.name)}</div><div class="focus-cue">${escapeHTML(cue)}</div></div></div><div class="focus-actions"><button class="btn primary" onclick="quickCompleteHabit('${jsEscape(h.id)}')">${habitActionLabel(h,mode)}</button><button class="btn" onclick="openStatusModal('${jsEscape(h.id)}')">Options</button></div></div>`}else if(base.length&&habitStatusFilter==="any"){focusEl.innerHTML=`<div class="focus-done"><strong style="color:var(--text)">You’ve checked in with what’s here.</strong><br>Nothing needs to be compensated for or perfected.</div>`}else{focusEl.innerHTML=""}

  const remaining=visible.filter(x=>!focus||x.habit.id!==focus.habit.id);
  document.getElementById("habitListTitle").textContent=focus?"Later":"Habits";
  remaining.forEach(({habit:h,status,suggestReturn})=>{const row=document.createElement("div");row.className=`habit-row ${status?"logged":""}`;const small=smallerVersions(h)[0],gentleCue=gentle&&!status&&small?` · ${small}`:"",typeCue=isReduceGoal(h)?"Reduce · ":"";row.innerHTML=`<button class="habit-check" aria-label="${status?"Change":"Log"} ${escapeAttr(h.name)}" onclick="${status?`openStatusModal('${jsEscape(h.id)}')`:`quickCompleteHabit('${jsEscape(h.id)}')`}">${status?habitStatusIcon(status):""}</button><div class="habit-row-main"><div class="habit-row-name">${escapeHTML(h.name)}</div><div class="habit-row-meta">${escapeHTML(typeCue+scheduleLabel(h)+gentleCue)}${suggestReturn?" · Return opportunity":""}</div></div><button class="habit-more" aria-label="More options for ${escapeAttr(h.name)}" onclick="openStatusModal('${jsEscape(h.id)}')">•••</button>`;list.appendChild(row)});
  if(!state.habits.length)list.innerHTML=`<div class="empty-card">No habits yet. Add one thing you want to practice returning to.</div>`;
  else if(!base.length)list.innerHTML=`<div class="empty-card">Nothing is asking for you in this view.</div>`;
  else if(!remaining.length&&!focus&&habitStatusFilter!=="any")list.innerHTML=`<div class="empty-card">Nothing matches this filter right now.</div>`;
  else if(!remaining.length)list.style.display="none";else list.style.display="block";
}
function statusLabel(status){return ({done:"✓ Done",counted:"○ Counted",miss:"— Not today",returned:"↩ Returned"})[status]||""}
function statusButton(id,key,label,current){
  return `<button class="status ${key} ${current===key?"active":""}" onclick="setStatus('${jsEscape(id)}','${key}');closeStatusModal()">${label}</button>`;
}

let loggingHabitId=null;
const statusModal=document.getElementById("statusModal");
function openStatusModal(id){
  loggingHabitId=id;const h=state.habits.find(x=>x.id===id);const current=getStatus(id);
  document.getElementById("statusModalTitle").textContent=h?`Log · ${h.name}`:"Log habit";
  document.getElementById("statusModalHelp").textContent=isReduceGoal(h)?"Choose what is true today. Going over the plan is information—not a failed streak.":"Choose what is true for today. Each valid form of engagement counts.";
  const small=smallerVersions(h),plan=document.getElementById("statusPlan");plan.classList.toggle("show",Boolean(h?.full||small.length));plan.innerHTML=`${h?.full?`<div class="status-plan-label">${isReduceGoal(h)?"Your plan":"Full version"}</div><div class="status-plan-main">${escapeHTML(h.full)}</div>`:""}${small.length?`<div class="status-plan-small"><strong>${isReduceGoal(h)?"Smaller wins":"Smaller versions"}:</strong> ${small.map(escapeHTML).join(" · ")}</div>`:""}`;
  document.getElementById("statusChoices").innerHTML=statusOptions(h).map(([key,label])=>statusButton(id,key,label,current)).join("");
  document.getElementById("clearStatusBtn").style.display=current?"block":"none";statusModal.classList.add("show");
}
function closeStatusModal(){statusModal.classList.remove("show");loggingHabitId=null}
document.getElementById("closeStatusModal").addEventListener("click",closeStatusModal);document.getElementById("cancelStatusBtn").addEventListener("click",closeStatusModal);statusModal.addEventListener("click",e=>{if(e.target===statusModal)closeStatusModal()});
document.getElementById("clearStatusBtn").addEventListener("click",()=>{if(loggingHabitId&&getStatus(loggingHabitId))setStatus(loggingHabitId,getStatus(loggingHabitId));closeStatusModal()});

const habitFilterModal=document.getElementById("habitFilterModal");
function openHabitFilter(){
  const options={any:["Everything","No extra filter"],unlogged:["Not logged","Only habits you haven’t checked in with"],logged:["Logged","Only today’s recorded habits"],return:["Return opportunities","Habits after a recorded Not today"]};
  document.getElementById("habitFilterOptions").innerHTML=Object.entries(options).map(([key,[label,note]])=>`<button class="filter-option ${habitStatusFilter===key?"active":""}" data-status-filter="${key}">${label}<span class="setting-note" style="display:block">${note}</span></button>`).join("");
  document.querySelectorAll("[data-status-filter]").forEach(button=>button.addEventListener("click",()=>{habitStatusFilter=button.dataset.statusFilter;habitFilterModal.classList.remove("show");renderToday()}));habitFilterModal.classList.add("show");
}
document.getElementById("habitFilterBtn").addEventListener("click",openHabitFilter);document.getElementById("closeHabitFilter").addEventListener("click",()=>habitFilterModal.classList.remove("show"));habitFilterModal.addEventListener("click",e=>{if(e.target===habitFilterModal)habitFilterModal.classList.remove("show")});
document.getElementById("gentleModeBtn").addEventListener("click",()=>setGentleDay(!gentleDayOn()));

function getLast7Days(){
  const arr=[]; const today=new Date();
  for(let i=6;i>=0;i--) arr.push(addDays(today,-i));
  return arr;
}
function renderWeek(){
  const days=getLast7Days();
  const grid=document.getElementById("weekGrid");
  grid.innerHTML="";
  let engaged=0, considered=0, returns=0, returnDistances=[],activeDays=0;
  const dayStats=[];
  days.forEach(d=>{
    const k=dateKey(d);
    let dayEngaged=0,dayReturns=0,dayRecorded=0;
    state.habits.forEach(h=>{
      const s=getStatus(h.id,k);
      if(s){
        considered++;dayRecorded++;
        if(["done","counted","returned"].includes(s)){engaged++;dayEngaged++}
        if(s==="returned"){
          returns++;dayReturns++;
          const dist=lastMissDistance(h.id,d);
          if(dist) returnDistances.push(dist);
        }
      }
    });
    if(dayEngaged)activeDays++;
    dayStats.push({date:d,engaged:dayEngaged,returns:dayReturns,recorded:dayRecorded});
  });
  dayStats.forEach(day=>{const el=document.createElement("div");const hasReturn=day.returns>0;el.className=`rhythm-day ${day.engaged?"active":""} ${hasReturn?"returned":""} ${dateKey(day.date)===dateKey()?"today":""}`;el.innerHTML=`<div class="rhythm-name">${fmtShort(day.date).slice(0,2)}</div><div class="rhythm-orb">${hasReturn?"↩":day.engaged||day.recorded?String(day.engaged||"—"):""}</div>`;grid.appendChild(el)});
  document.getElementById("engagementMetric").textContent = considered ? String(engaged) : "—";
  document.getElementById("returnsMetric").textContent = String(returns);
  document.getElementById("returnTimeMetric").textContent = returnDistances.length ? (Math.round((returnDistances.reduce((a,b)=>a+b,0)/returnDistances.length)*10)/10)+" d" : "—";
  const headline=document.getElementById("trendHeadline"),copy=document.getElementById("trendCopy"),pattern=document.getElementById("trendPattern");
  if(!considered){headline.textContent="No story yet—and that is neutral.";copy.textContent="The week does not need to be reconstructed from memory. New check-ins will appear here when they happen.";pattern.textContent="There is not enough information to name a pattern yet."}
  else if(returns){headline.textContent=returns===1?"You came back.":`You came back ${returns} times.`;copy.textContent="That is the signal worth strengthening. A return matters more than an uninterrupted streak.";pattern.textContent=`You engaged on ${activeDays} of the last 7 days, and ${returns} of your check-ins represented a return.`}
  else{headline.textContent=activeDays>=4?"You kept the thread going.":"You made contact.";copy.textContent=`You recorded ${engaged} valid check-in${engaged===1?"":"s"} across ${activeDays} day${activeDays===1?"":"s"}. Smaller versions count here too.`;const strongest=[...dayStats].sort((a,b)=>b.engaged-a.engaged)[0];pattern.textContent=engaged>=3&&strongest.engaged?`${fmtLong(strongest.date)} held the most habit contact this week. Treat that as a clue, not a rule.`:"A few more check-ins will make the weekly rhythm easier to read."}
  renderReviewHistory(days);
}

let reviewFilter="all";
function reviewDateLabel(date){const today=dateKey(),key=dateKey(date),yesterday=dateKey(addDays(new Date(),-1));if(key===today)return "Today";if(key===yesterday)return "Yesterday";return fmtLong(date)}
function reviewHabitEvent(h,status){const labels={done:"Full version",counted:"Smaller version",miss:"Not today",returned:"Returned"};const icons={done:"✓",counted:"○",miss:"—",returned:"↩"};return {type:"habit",status,title:h.name,note:labels[status],icon:icons[status]}}
function renderReviewHistory(days=getLast7Days()){
  const list=document.getElementById("reviewHistory");if(!list)return;list.innerHTML="";
  [...days].reverse().forEach(date=>{
    const key=dateKey(date),events=[];
    state.habits.forEach(h=>{const status=getStatus(h.id,key);if(status)events.push(reviewHabitEvent(h,status))});
    state.people.forEach(person=>{const interactions=(person.interactions||[]).filter(item=>item.date===key);interactions.forEach(item=>events.push({type:"circle",title:`Connected with ${person.name}`,note:item.method||"Contact",icon:"💬"}));if(!interactions.length&&person.lastContact===key)events.push({type:"circle",title:`Connected with ${person.name}`,note:"Contact",icon:"💬"})});
    const visible=events.filter(event=>reviewFilter==="all"||event.type===reviewFilter);
    const day=document.createElement("section");day.className="history-day";day.innerHTML=`<div class="history-day-label">${escapeHTML(reviewDateLabel(date))}<span> · ${visible.length?`${visible.length} ${visible.length===1?"entry":"entries"}`:"Quiet day"}</span></div>`;
    if(visible.length){visible.forEach(event=>{const row=document.createElement("div");row.className=`history-item ${event.type} ${event.status==="miss"?"miss":""}`;row.innerHTML=`<span class="history-item-icon">${escapeHTML(event.icon)}</span><span class="history-item-copy"><span class="history-item-title">${escapeHTML(event.title)}</span><span class="history-item-note">${escapeHTML(event.note)}</span></span>`;day.appendChild(row)})}else{const quiet=document.createElement("div");quiet.className="history-quiet";quiet.textContent=events.length?"Nothing from this view." : "Nothing logged. That day is complete.";day.appendChild(quiet)}
    list.appendChild(day);
  });
}
document.querySelectorAll("[data-review-filter]").forEach(button=>button.addEventListener("click",()=>{reviewFilter=button.dataset.reviewFilter;document.querySelectorAll("[data-review-filter]").forEach(item=>item.classList.toggle("active",item.dataset.reviewFilter===reviewFilter));button.closest("details").removeAttribute("open");renderReviewHistory()}));

function renderManage(){
  const list=document.getElementById("manageList");
  list.innerHTML="";
  state.habits.forEach(h=>{
    const row=document.createElement("div");
    row.className="manage-item";
    row.innerHTML=`
      ${visualHTML(h,"emoji")}
      <div class="grow"><strong>${escapeHTML(h.name)}</strong><small>${escapeHTML((isReduceGoal(h)?"Reduce · ":"")+scheduleLabel(h))}</small></div>
      <button class="tiny-btn" data-edit="${escapeAttr(h.id)}">Edit</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>openHabitModal(btn.dataset.edit)));
}

let editingId=null;
const habitModal=document.getElementById("habitModal");
function openHabitModal(id=null){
  editingId=id;
  const h=id?state.habits.find(x=>x.id===id):null;
  document.getElementById("modalTitle").textContent=h?"Edit habit":"Add habit";
  document.getElementById("habitEmoji").value=h?.emoji||"🌱";
  document.getElementById("habitIcon").value=h?.icon||"";
  document.getElementById("habitColor").value=safeTone(h?.color||"sage");
  updateVisualPreview("habit");
  document.getElementById("habitName").value=h?.name||"";
  document.getElementById("habitGoalType").value=h?.goalType||"practice";
  document.getElementById("habitFull").value=h?.full||"";
  document.getElementById("habitSmall").value=h?.small||"";
  document.getElementById("habitSmall2").value=h?.small2||"";
  document.getElementById("goalPlanDetails").open=Boolean(h?.full||h?.small||h?.small2||h?.goalType==="reduce");
  document.getElementById("habitScheduleType").value=h?.scheduleType||"daily";
  document.getElementById("habitWeeklyTarget").value=String(h?.weeklyTarget||1);
  document.querySelectorAll('[name="habitDay"]').forEach(input=>input.checked=(h?.weekdays||[]).map(Number).includes(Number(input.value)));
  updateHabitScheduleFields();
  updateGoalPlanFields();
  document.getElementById("deleteHabitBtn").style.display=h?"inline-block":"none";
  habitModal.classList.add("show");
  setTimeout(()=>document.getElementById("habitName").focus(),50);
}
function closeHabitModal(){ habitModal.classList.remove("show"); editingId=null; }
function updateHabitScheduleFields(){
  const type=document.getElementById("habitScheduleType").value;
  document.getElementById("habitDaysRow").style.display=type==="days"?"grid":"none";
  document.getElementById("habitWeeklyRow").style.display=type==="weekly"?"grid":"none";
  if(type==="days"&&![...document.querySelectorAll('[name="habitDay"]')].some(x=>x.checked)){const today=document.querySelector(`[name="habitDay"][value="${new Date().getDay()}"]`);if(today)today.checked=true}
}
function updateGoalPlanFields(){
  const reduce=document.getElementById("habitGoalType").value==="reduce";
  if(reduce)document.getElementById("goalPlanDetails").open=true;
  document.getElementById("goalPlanHelp").textContent=reduce?"Set a realistic boundary, then name smaller wins for days when staying fully within it is hard.":"Define the versions once so you do not have to renegotiate what counts each day.";
  document.getElementById("habitFullLabel").innerHTML=reduce?'Your limit or plan <span style="font-weight:500">(optional)</span>':'Full version <span style="font-weight:500">(optional)</span>';
  document.getElementById("habitSmallLabel").textContent=reduce?"Smaller win":"Smaller valid version";
  document.getElementById("habitFull").placeholder=reduce?"e.g. No more than 1 can today":"e.g. Wash face for 60 seconds";
  document.getElementById("habitSmall").placeholder=reduce?"e.g. Drink water before a second soda":"e.g. A quick 30-second wash";
  document.getElementById("habitSmall2").placeholder=reduce?"e.g. Choose a mini can or pour half":"e.g. Rinse and moisturize";
}
document.getElementById("habitScheduleType").addEventListener("change",updateHabitScheduleFields);
document.getElementById("habitGoalType").addEventListener("change",updateGoalPlanFields);

document.getElementById("addHabitBtn").addEventListener("click",()=>openHabitModal());
document.getElementById("manageAdd").addEventListener("click",()=>{document.getElementById("manageModal").classList.remove("show");openHabitModal();});
document.getElementById("closeModal").addEventListener("click",closeHabitModal);
document.getElementById("cancelHabitBtn").addEventListener("click",closeHabitModal);
habitModal.addEventListener("click",e=>{if(e.target===habitModal) closeHabitModal();});
document.getElementById("saveHabitBtn").addEventListener("click",()=>{
  const name=document.getElementById("habitName").value.trim();
  if(!name){document.getElementById("habitName").focus();return;}
  const emoji=document.getElementById("habitEmoji").value.trim()||"🌱";
  const icon=document.getElementById("habitIcon").value||null;
  const color=safeTone(document.getElementById("habitColor").value);
  const goalType=document.getElementById("habitGoalType").value;
  const full=document.getElementById("habitFull").value.trim();
  const small=document.getElementById("habitSmall").value.trim();
  const small2=document.getElementById("habitSmall2").value.trim();
  const scheduleType=document.getElementById("habitScheduleType").value;
  const weekdays=[...document.querySelectorAll('[name="habitDay"]:checked')].map(input=>Number(input.value));
  const weeklyTarget=Number(document.getElementById("habitWeeklyTarget").value||1);
  const schedule={scheduleType,weekdays:scheduleType==="days"?weekdays:[],weeklyTarget:scheduleType==="weekly"?weeklyTarget:1};
  if(editingId){
    const h=state.habits.find(x=>x.id===editingId);
    Object.assign(h,{name,emoji,icon,color,goalType,full,small,small2,...schedule});
  }else{
    state.habits.push({id:"h-"+Date.now(),name,emoji,icon,color,goalType,full,small,small2,...schedule});
  }
  closeHabitModal();saveState();
});
document.getElementById("deleteHabitBtn").addEventListener("click",()=>{
  if(!editingId) return;
  if(confirm("Delete this habit? Existing history for it will stay in local storage but will no longer be shown.")){
    state.habits=state.habits.filter(h=>h.id!==editingId);
    closeHabitModal();saveState();
  }
});

const manageModal=document.getElementById("manageModal");
document.getElementById("manageBtn").addEventListener("click",()=>{renderManage();manageModal.classList.add("show");});
document.getElementById("closeManage").addEventListener("click",()=>manageModal.classList.remove("show"));
manageModal.addEventListener("click",e=>{if(e.target===manageModal)manageModal.classList.remove("show");});
