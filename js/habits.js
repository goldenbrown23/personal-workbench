function getLogEntry(habitId, key=dateKey()){
  const raw=state.logs?.[key]?.[habitId];
  if(!raw) return null;
  if(typeof raw==="string") return {status:raw,timeBlock:null,note:"",createdAt:null,updatedAt:null};
  return {status:"",timeBlock:null,note:"",createdAt:null,updatedAt:null,...raw};
}
function getStatus(habitId, key=dateKey()){ return getLogEntry(habitId,key)?.status || ""; }
// Engagement version (done/counted/miss) and return context are separate dimensions:
// a return is derived automatically from history, never a status the user picks, and it
// no longer overwrites which version was actually logged. isReturn is a flag alongside
// the real status. Legacy records that collapsed both into status:"returned" are left
// exactly as they were written — see isReturnDay() below for the compatibility shim.
function setStatus(habitId, status){
  const before=structuredClone(state);
  const key=dateKey();
  state.logs[key] ||= {};
  const hadEntry=Boolean(getStatus(habitId,key));
  if(getStatus(habitId,key)===status){ delete state.logs[key][habitId]; }
  else{
    const isReturn=!hadEntry&&["done","counted"].includes(status)&&wasMissedPreviousRecordedDay(habitId);
    if(isReturn){
      const existing=getLogEntry(habitId,key),now=new Date().toISOString();
      state.logs[key][habitId]={status,isReturn:true,timeBlock:existing?.timeBlock||null,note:existing?.note||"",createdAt:existing?.createdAt||now,updatedAt:now};
    }else{
      state.logs[key][habitId]=status;
    }
  }
  saveState();
  showSaved("Habit updated",before);
}
function saveHabitLogEntry(habitId,{date,timeBlock,status,note}){
  const before=structuredClone(state);
  const targetDate=parseLocalDate(date)||new Date();
  const key=dateKey(targetDate);
  const existing=getLogEntry(habitId,key);
  const isReturn=!existing?.status&&["done","counted"].includes(status)&&wasMissedPreviousRecordedDay(habitId,targetDate);
  state.logs[key] ||= {};
  const now=new Date().toISOString();
  state.logs[key][habitId]={status,isReturn,timeBlock:timeBlock||null,note:(note||"").trim(),createdAt:existing?.createdAt||now,updatedAt:now};
  saveState();
  showSaved(key===dateKey()?"Habit updated":"Added. Your timeline is more accurate now.",before);
}
function saveHabitLogEntriesBatch(habitId,dates,{timeBlock,status,note}){
  const before=structuredClone(state);
  const now=new Date().toISOString();
  const sorted=[...dates].sort();
  let created=0,updated=0;
  sorted.forEach(key=>{
    const targetDate=parseLocalDate(key)||new Date();
    const existing=getLogEntry(habitId,key);
    const isReturn=!existing?.status&&["done","counted"].includes(status)&&wasMissedPreviousRecordedDay(habitId,targetDate);
    state.logs[key] ||= {};
    state.logs[key][habitId]={status,isReturn,timeBlock:timeBlock||null,note:(note||"").trim(),createdAt:existing?.createdAt||now,updatedAt:now};
    if(existing?.status) updated++; else created++;
  });
  saveState();
  showSaved(`${sorted.length} ${sorted.length===1?"entry":"entries"} logged${updated?` · ${updated} updated`:""}. Your timeline is more accurate now.`,before);
  return {created,updated};
}
function clearHabitLogEntry(habitId,date){
  const before=structuredClone(state);
  const key=dateKey(parseLocalDate(date)||new Date());
  if(state.logs[key]) delete state.logs[key][habitId];
  saveState();
  showSaved("Log cleared",before);
}
// True whether a return is stored as the new {status,isReturn:true} shape or the
// legacy status:"returned" shape — callers should use this instead of comparing
// entry.status==="returned" directly, since a new-style return keeps its real
// engagement status (done/counted) and flags isReturn separately.
function isReturnDay(entry){ return Boolean(entry)&&(entry.isReturn===true||entry.status==="returned"); }
function wasMissedPreviousRecordedDay(habitId, fromDate=new Date()){
  // most recent earlier day that has a status for this habit
  for(let i=1;i<=30;i++){
    const k=dateKey(addDays(fromDate,-i));
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
function statusOptions(h){return isReduceGoal(h)?[["done","✓ Within plan"],["counted","○ Reduced"],["miss","— Over plan"],["returned","↩ Back to plan"]]:[["done","✓ Full version"],["counted","○ Smaller version"],["miss","— Not today"],["returned","↩ Returned"]]}
function gentleDayOn(){try{const value=JSON.parse(localStorage.getItem(GENTLE_KEY)||"{}");return value.date===dateKey()&&value.on===true}catch{return false}}
function setGentleDay(on){localStorage.setItem(GENTLE_KEY,JSON.stringify({date:dateKey(),on}));renderToday();showSaved(on?"Gentle day on":"Standard day on")}
function quickCompleteHabit(id){const current=getStatus(id);if(current){openStatusModal(id);return}setStatus(id,gentleDayOn()?"counted":"done")}
function habitStatusIcon(status){return ({done:"✓",counted:"○",miss:"—",returned:"↩"})[status]||""}
function statusLabel(status){return ({done:"✓ Done",counted:"○ Counted",miss:"— Not today",returned:"↩ Returned"})[status]||""}

// ---- Shared "what should I do right now" engine ----
// Home's Start Here and the Habits tab's Now section both call this so there is exactly
// one definition of "next" — never two independently maintained recommendation rules.
function currentTimePeriod(hour=new Date().getHours()){
  if(hour>=5&&hour<12) return "morning";
  if(hour>=12&&hour<17) return "afternoon";
  if(hour>=17&&hour<24) return "evening";
  return "late-night";
}
const PERIOD_GREETING={morning:"Good morning",afternoon:"Good afternoon",evening:"Good evening","late-night":"Still up"};
const PERIOD_COPY={
  morning:"Only what helps you begin. The rest can wait.",
  afternoon:"Only what helps you reset. The rest can wait.",
  evening:"Only what supports tonight. The rest can wait.",
  "late-night":"Only tiny closing steps. Nothing to prove."
};
const BLOCK_LABEL={morning:"morning",afternoon:"afternoon",evening:"evening"};
const LATER_LABEL={morning:"This morning",afternoon:"This afternoon",evening:"Tonight"};
const BLOCK_SEARCH_ORDER={
  morning:["morning","afternoon","evening"],
  afternoon:["afternoon","evening","morning"],
  evening:["evening","afternoon","morning"],
  "late-night":["evening","morning","afternoon"]
};
function unloggedTodayHabitsInBlock(block){return state.habits.filter(h=>habitAppliesToday(h)&&!h.paused&&timeBlockOf(h)===block&&!getStatus(h.id))}
function pickHabitForBlock(block){
  const candidates=unloggedTodayHabitsInBlock(block);
  if(!candidates.length) return null;
  const returnPick=candidates.find(h=>wasMissedPreviousRecordedDay(h.id));
  if(returnPick) return {habit:returnPick,isReturn:true};
  const withSmaller=candidates.find(h=>(h.small2||h.small||"").trim());
  if(withSmaller) return {habit:withSmaller,isReturn:false};
  return {habit:candidates[0],isReturn:false};
}
// Deterministic, config-driven pick: search the current time block first, then fall back
// through the other blocks in an order chosen per period. At late-night this looks at
// evening habits before morning ones, so a stale morning habit never gets surfaced as if
// it were suddenly relevant again merely because it was never completed.
function pickStartHereHabit(period){
  const order=BLOCK_SEARCH_ORDER[period]||BLOCK_SEARCH_ORDER.morning;
  for(let i=0;i<order.length;i++){
    const pick=pickHabitForBlock(order[i]);
    if(pick) return {...pick,block:order[i],isCurrentBlock:period!=="late-night"&&i===0};
  }
  return null;
}
function laterTodayLabel(h){ return LATER_LABEL[timeBlockOf(h)]||"Anytime today"; }
// Everything else applicable today, not yet logged, not the current pick — previews for
// "Later today," not competing calls to action, ordered by how soon their block comes up.
function laterTodayHabits(excludeId){
  const order=BLOCK_SEARCH_ORDER[currentTimePeriod()]||BLOCK_SEARCH_ORDER.morning;
  return state.habits
    .filter(h=>habitAppliesToday(h)&&!h.paused&&!getStatus(h.id)&&h.id!==excludeId)
    .sort((a,b)=>order.indexOf(timeBlockOf(a))-order.indexOf(timeBlockOf(b)));
}
// The smallest configured version is what the Now card presents and what "I did it" must
// log — never a hardcoded status. Full only counts as "done" when it's the ONLY configured
// version (nothing smaller exists to present instead).
function homePrimaryTier(h){
  const bareMin=(h.small2||"").trim(),smaller=(h.small||"").trim(),full=(h.full||"").trim();
  if(bareMin) return {text:bareMin,status:"counted"};
  if(smaller) return {text:smaller,status:"counted"};
  if(full) return {text:full,status:"done"};
  return {text:"A tiny check-in counts.",status:"counted"};
}
// Debounce guard for the shared logging action: setStatus() is fully synchronous, but iOS
// occasionally dispatches a duplicate/"ghost" tap as a separate event shortly after the
// real one, which this timestamp check absorbs without affecting normal taps.
let lastHomeActionAt=0;
function homeLogStatus(habitId,status){
  const now=Date.now();
  if(now-lastHomeActionAt<600) return;
  lastHomeActionAt=now;
  setStatus(habitId,status);
}
// The single dominant action card, shared verbatim by Home's "Start here" and the Habits
// tab's "Now" — one completion interaction, not two independently maintained ones.
function nowCardHTML(pick,{label="Now",gentle=false,blockPeriod=null}={}){
  const h=pick.habit,tier=homePrimaryTier(h);
  const blockNote=pick.isCurrentBlock?"":`<div class="home-now-block-note">Nothing left from ${escapeHTML(BLOCK_LABEL[blockPeriod]||"now")}, so here’s one from ${escapeHTML(BLOCK_LABEL[pick.block]||"elsewhere")} instead.</div>`;
  let detail,primaryStatus;
  if(pick.isReturn){ detail=isReduceGoal(h)?"The next choice is a return—not a restart.":"This is a return—not a restart."; primaryStatus=tier.status; }
  else if(gentle){ detail="Doing less still keeps the connection."; primaryStatus="counted"; }
  else{ detail=tier.text; primaryStatus=tier.status; }
  const hasVersions=Boolean(versionRowsForHabit(h).length);
  const secondaryRow=`<div class="home-now-secondary-row">${hasVersions?`<button class="home-now-link" onclick="openEasierVersion('${jsEscape(h.id)}')">Need an easier version?</button>`:"<span></span>"}<button class="home-now-overflow" aria-label="More options for ${escapeAttr(h.name)}" onclick="openStatusModal('${jsEscape(h.id)}')">•••</button></div>`;
  return `<div class="home-now-label">${escapeHTML(label)}</div><div class="home-now-main">${visualHTML(h,"home-now-icon")}<div class="home-now-copy"><div class="home-now-title">${escapeHTML(h.name)}</div><div class="home-now-detail">${escapeHTML(detail)}</div></div></div>${blockNote}<button class="home-now-action" onclick="homeLogStatus('${jsEscape(h.id)}','${primaryStatus}')">✓ I did it</button>${secondaryRow}`;
}

// ---- Habits tab: SEE → START → LOG → MOVE ON, not a database view ----
function renderToday(){
  document.getElementById("todayDate").textContent=fmtLong(new Date());
  const gentle=gentleDayOn();
  const gentleBtn=document.getElementById("gentleModeBtn");
  gentleBtn.classList.toggle("active",gentle);
  gentleBtn.setAttribute("aria-label",gentle?"Gentle day · On":"Gentle day");
  const period=currentTimePeriod();
  const pick=pickStartHereHabit(period);
  const laterList=laterTodayHabits(pick?pick.habit.id:null);
  renderHabitsNow(pick,gentle,period,laterList);
  renderHabitsLater(laterList);
  renderHabitsDone();
  renderHabitsPaused();
}
function renderHabitsNow(pick,gentle,period,laterList){
  const el=document.getElementById("habitsNow");
  el.classList.remove("quiet");
  el.classList.toggle("gentle",gentle);
  if(!state.habits.length){
    el.classList.add("quiet");
    el.innerHTML=`<div class="home-now-label">Now</div><div class="home-now-main"><span class="home-now-icon">🌱</span><div class="home-now-copy"><div class="home-now-title">No habits yet.</div><div class="home-now-detail">Add one tiny habit to start.</div></div></div>`;
    return;
  }
  if(pick){
    el.innerHTML=nowCardHTML(pick,{label:"Now",gentle,blockPeriod:period});
    return;
  }
  el.classList.add("quiet");
  if(laterList.length){
    const next=laterList[0];
    el.innerHTML=`<div class="home-now-label">Now</div><div class="home-now-main"><span class="home-now-icon">🍃</span><div class="home-now-copy"><div class="home-now-title">Nothing needs you right now.</div><div class="home-now-detail">Later today: ${escapeHTML(next.name)} · ${escapeHTML(laterTodayLabel(next))}</div></div></div>`;
  }else{
    el.innerHTML=`<div class="home-now-label">Now</div><div class="home-now-main"><span class="home-now-icon">🍃</span><div class="home-now-copy"><div class="home-now-title">You’re good for now.</div></div></div>`;
  }
}
function laterRowHTML(h,timeText){
  return `<button type="button" class="later-row" onclick="openStatusModal('${jsEscape(h.id)}')">${visualHTML(h,"later-row-icon")}<span class="later-row-copy"><span class="later-row-name">${escapeHTML(h.name)}</span><span class="later-row-time">${escapeHTML(timeText)}</span></span></button>`;
}
function renderHabitsLater(laterList){
  const wrap=document.getElementById("habitsLater"),labelEl=document.getElementById("habitsLaterLabel");
  if(!laterList.length){ wrap.innerHTML="";labelEl.style.display="none";return; }
  labelEl.style.display="block";
  wrap.innerHTML=laterList.map(h=>laterRowHTML(h,laterTodayLabel(h))).join("");
}
function renderHabitsDone(){
  const details=document.getElementById("habitsDoneDetails");
  const done=state.habits.filter(h=>Boolean(getStatus(h.id)));
  document.getElementById("habitsDoneCount").textContent=String(done.length);
  details.style.display=done.length?"block":"none";
  document.getElementById("habitsDoneList").innerHTML=done.map(h=>{
    const entry=getLogEntry(h.id);
    const label=statusLabel(entry.status)+(isReturnDay(entry)&&entry.status!=="returned"?" · Return":"");
    return laterRowHTML(h,label);
  }).join("");
}
function renderHabitsPaused(){
  const details=document.getElementById("habitsPausedDetails");
  const paused=state.habits.filter(h=>h.paused);
  document.getElementById("habitsPausedCount").textContent=String(paused.length);
  details.style.display=paused.length?"block":"none";
  document.getElementById("habitsPausedList").innerHTML=paused.map(h=>`<button type="button" class="later-row" onclick="openHabitModal('${jsEscape(h.id)}')">${visualHTML(h,"later-row-icon")}<span class="later-row-copy"><span class="later-row-name">${escapeHTML(h.name)}</span><span class="later-row-time">Paused</span></span></button>`).join("");
}

let loggingHabitId=null,loggingSelectedDate=dateKey(),loggingDateIsCustom=false;
let loggingMode="single",loggingMultiDates=new Set(),loggingMultiMonth=new Date(),loggingRangeArmed=false,loggingRangeAnchor=null,loggingPendingStatus=null;
const statusModal=document.getElementById("statusModal");
function openStatusModal(id,presetDate=null){
  loggingHabitId=id;
  loggingSelectedDate=presetDate||dateKey();
  loggingDateIsCustom=false;
  loggingMode="single";
  loggingMultiDates=new Set();
  loggingMultiMonth=parseLocalDate(loggingSelectedDate)||new Date();
  loggingRangeArmed=false;loggingRangeAnchor=null;loggingPendingStatus=null;
  document.getElementById("statusDateDetails").open=false;
  renderStatusSharedFields();
  setLoggingMode("single");
  statusModal.classList.add("show");
}
function setLoggingMode(mode){
  loggingMode=mode;
  document.getElementById("statusModeSingleBtn").classList.toggle("active",mode==="single");
  document.getElementById("statusModeSingleBtn").setAttribute("aria-selected",String(mode==="single"));
  document.getElementById("statusModeMultiBtn").classList.toggle("active",mode==="multi");
  document.getElementById("statusModeMultiBtn").setAttribute("aria-selected",String(mode==="multi"));
  document.getElementById("statusSingleDateWrap").style.display=mode==="single"?"block":"none";
  document.getElementById("statusMultiDateWrap").style.display=mode==="multi"?"block":"none";
  document.getElementById("multiLogBtn").style.display=mode==="multi"?"inline-block":"none";
  if(mode==="multi"){ renderMultiCalendar();renderMultiSummary(); }
  renderStatusModalForDate();
}
function renderStatusSharedFields(){
  const h=state.habits.find(x=>x.id===loggingHabitId);
  document.getElementById("statusModalTitle").textContent=h?h.name:"Log habit";
  document.getElementById("statusTimeBlock").value=timeBlockOf(h);
}
// Engagement versions render as the same large tappable cards used by the Home
// "easier version" sheet — only what's actually configured for this habit, never a
// placeholder example. "Not today" lives outside this list as a quiet tertiary action
// (see statusNotTodayBtn) since it isn't a version of engagement, it's the absence of one.
function renderStatusChoices(){
  const h=state.habits.find(x=>x.id===loggingHabitId);
  const key=dateKey(parseLocalDate(loggingSelectedDate)||new Date());
  const active=loggingMode==="multi"?loggingPendingStatus:getStatus(loggingHabitId,key);
  let rows=versionRowsForHabit(h);
  if(!rows.length) rows=[{status:"counted",label:"Check-in",text:"A tiny check-in counts."}];
  document.getElementById("statusVersionList").innerHTML=rows.map(r=>`<button type="button" class="version-option ${active===r.status?"active":""}" onclick="handleLogStatusClick('${jsEscape(r.status)}')"><span class="version-option-label">${escapeHTML(r.label)}</span><span class="version-option-text">${escapeHTML(r.text)}</span></button>`).join("");
  document.getElementById("statusNotTodayBtn").classList.toggle("active",active==="miss");
}
function renderStatusModalForDate(){
  const id=loggingHabitId,h=state.habits.find(x=>x.id===id);
  const key=dateKey(parseLocalDate(loggingSelectedDate)||new Date());
  const current=getStatus(id,key),entry=getLogEntry(id,key);
  renderStatusChoices();
  document.getElementById("clearStatusBtn").style.display=loggingMode==="single"&&current?"block":"none";
  document.getElementById("statusTimeBlock").value=entry?.timeBlock||timeBlockOf(h);
  document.getElementById("statusNote").value=entry?.note||"";
  renderStatusDatePicker();
}
function renderStatusDatePicker(){
  setupDatePicker({
    chipsId:"statusDateChips",customId:"statusDateCustom",summaryId:"statusDateSummary",
    getState:()=>({date:loggingSelectedDate,isCustom:loggingDateIsCustom}),
    setState:(d,isCustom)=>{loggingSelectedDate=d;loggingDateIsCustom=isCustom;renderStatusModalForDate();}
  });
}
function renderMultiCalendar(){
  const month=loggingMultiMonth||new Date();
  const start=new Date(month.getFullYear(),month.getMonth(),1);
  const daysInMonth=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const today=new Date();
  const currentStart=new Date(today.getFullYear(),today.getMonth(),1);
  const atCurrent=start.getFullYear()===currentStart.getFullYear()&&start.getMonth()===currentStart.getMonth();
  const label=new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(start);
  const cells=[];
  for(let i=0;i<start.getDay();i++) cells.push('<span class="calendar-day" aria-hidden="true"></span>');
  for(let day=1;day<=daysInMonth;day++){
    const d=new Date(start.getFullYear(),start.getMonth(),day);
    const key=dateKey(d);
    const isFuture=d>today;
    const selected=loggingMultiDates.has(key);
    const hasEntry=Boolean(getStatus(loggingHabitId,key));
    const isAnchor=loggingRangeAnchor===key;
    const isToday=key===dateKey();
    cells.push(`<button type="button" class="calendar-day selectable ${selected?"selected":""} ${hasEntry?"has-entry":""} ${isAnchor?"range-anchor":""} ${isToday?"today":""}" data-multi-date="${key}" aria-pressed="${selected}" aria-label="${escapeAttr(fmtLong(d))}${hasEntry?", already has an entry":""}" ${isFuture?"disabled":""}>${day}</button>`);
  }
  document.getElementById("statusMultiCalendar").innerHTML=`<div class="calendar-head"><div><div class="calendar-title">Select dates</div><div class="calendar-month">${escapeHTML(label)}</div></div><div class="calendar-nav"><button type="button" data-multi-month="-1" aria-label="Previous month">‹</button><button type="button" data-multi-month="1" aria-label="Next month" ${atCurrent?"disabled":""}>›</button></div></div><div class="calendar-grid">${["S","M","T","W","T","F","S"].map(x=>`<span class="calendar-weekday">${x}</span>`).join("")}${cells.join("")}</div><div class="calendar-legend"><span><i class="legend-mark" style="background:#c99a4a"></i>Already has an entry</span></div>`;
  document.querySelectorAll("[data-multi-date]").forEach(btn=>btn.addEventListener("click",()=>toggleMultiDate(btn.dataset.multiDate)));
  document.querySelectorAll("[data-multi-month]").forEach(btn=>btn.addEventListener("click",()=>shiftMultiMonth(Number(btn.dataset.multiMonth))));
}
function shiftMultiMonth(delta){
  const base=loggingMultiMonth||new Date();
  const next=new Date(base.getFullYear(),base.getMonth()+delta,1);
  const today=new Date(),currentStart=new Date(today.getFullYear(),today.getMonth(),1);
  loggingMultiMonth=next>currentStart?currentStart:next;
  renderMultiCalendar();
}
function toggleMultiDate(key){
  if(loggingRangeArmed){
    if(!loggingRangeAnchor){
      loggingRangeAnchor=key;
    }else{
      let a=parseLocalDate(loggingRangeAnchor),b=parseLocalDate(key);
      if(a>b){const t=a;a=b;b=t;}
      for(let d=new Date(a);d<=b;d.setDate(d.getDate()+1)) loggingMultiDates.add(dateKey(d));
      loggingRangeAnchor=null;loggingRangeArmed=false;
      const rangeBtn=document.getElementById("statusMultiRangeBtn");rangeBtn.classList.remove("primary");rangeBtn.textContent="Select range";
    }
  }else{
    if(loggingMultiDates.has(key)) loggingMultiDates.delete(key); else loggingMultiDates.add(key);
  }
  renderMultiCalendar();
  renderMultiSummary();
}
function renderMultiSummary(){
  const dates=[...loggingMultiDates].sort();
  const n=dates.length;
  const existingCount=dates.filter(d=>getStatus(loggingHabitId,d)).length;
  document.getElementById("statusMultiSummary").textContent=n===0?"No dates selected yet.":`${n} date${n===1?"":"s"} selected${existingCount?` · ${existingCount} of these already ${existingCount===1?"has":"have"} an entry`:""}`;
  const btn=document.getElementById("multiLogBtn");
  btn.textContent=n<=1?"Log entry":`Log ${n} entries`;
  btn.disabled=n===0||!loggingPendingStatus;
}
function handleLogStatusClick(status){
  if(!loggingHabitId) return;
  if(loggingMode==="multi"){
    loggingPendingStatus=status;
    renderStatusChoices();
    renderMultiSummary();
    return;
  }
  const h=state.habits.find(x=>x.id===loggingHabitId);
  const key=dateKey(parseLocalDate(loggingSelectedDate)||new Date());
  const existing=getLogEntry(loggingHabitId,key);
  if(existing?.status&&existing.status!==status){
    const newLabel=(statusOptions(h).find(([k])=>k===status)||[])[1]||status;
    const oldLabel=(statusOptions(h).find(([k])=>k===existing.status)||[])[1]||existing.status;
    if(!confirm(`That day already has "${oldLabel}" logged. Replace it with "${newLabel}"?`)) return;
  }
  const timeBlock=document.getElementById("statusTimeBlock").value;
  const note=document.getElementById("statusNote").value;
  saveHabitLogEntry(loggingHabitId,{date:loggingSelectedDate,timeBlock,status,note});
  closeStatusModal();
}
function closeStatusModal(){statusModal.classList.remove("show");loggingHabitId=null}
document.getElementById("closeStatusModal").addEventListener("click",closeStatusModal);statusModal.addEventListener("click",e=>{if(e.target===statusModal)closeStatusModal()});
document.getElementById("statusNotTodayBtn").addEventListener("click",()=>handleLogStatusClick("miss"));
document.getElementById("clearStatusBtn").addEventListener("click",()=>{if(loggingHabitId)clearHabitLogEntry(loggingHabitId,loggingSelectedDate);closeStatusModal()});
document.getElementById("statusModeSingleBtn").addEventListener("click",()=>setLoggingMode("single"));
document.getElementById("statusModeMultiBtn").addEventListener("click",()=>setLoggingMode("multi"));
document.getElementById("statusMultiClearBtn").addEventListener("click",()=>{loggingMultiDates=new Set();loggingRangeArmed=false;loggingRangeAnchor=null;const rangeBtn=document.getElementById("statusMultiRangeBtn");rangeBtn.classList.remove("primary");rangeBtn.textContent="Select range";renderMultiCalendar();renderMultiSummary();});
document.getElementById("statusMultiRangeBtn").addEventListener("click",()=>{
  loggingRangeArmed=!loggingRangeArmed;loggingRangeAnchor=null;
  const btn=document.getElementById("statusMultiRangeBtn");
  btn.classList.toggle("primary",loggingRangeArmed);
  btn.textContent=loggingRangeArmed?"Tap start date…":"Select range";
  renderMultiCalendar();
});
document.getElementById("multiLogBtn").addEventListener("click",()=>{
  if(!loggingHabitId||!loggingPendingStatus||!loggingMultiDates.size) return;
  const dates=[...loggingMultiDates].sort();
  const h=state.habits.find(x=>x.id===loggingHabitId);
  const existingCount=dates.filter(d=>getStatus(loggingHabitId,d)).length;
  if(existingCount){
    const label=(statusOptions(h).find(([k])=>k===loggingPendingStatus)||[])[1]||loggingPendingStatus;
    if(!confirm(`${existingCount} of these ${dates.length} dates already ${existingCount===1?"has":"have"} an entry. Replace ${existingCount===1?"it":"them"} with "${label}"? The rest will be added safely.`)) return;
  }
  const timeBlock=document.getElementById("statusTimeBlock").value;
  const note=document.getElementById("statusNote").value;
  saveHabitLogEntriesBatch(loggingHabitId,dates,{timeBlock,status:loggingPendingStatus,note});
  closeStatusModal();
});

// Only the versions a habit actually has configured — never a placeholder for an
// empty field. small/small2 both log as "counted" (the data model doesn't distinguish
// two tiers of smaller-than-full), so picking either just records which text was shown.
function versionRowsForHabit(h){
  const reduce=isReduceGoal(h);
  const full=(h.full||"").trim(),small=(h.small||"").trim(),small2=(h.small2||"").trim();
  const rows=[];
  if(full) rows.push({status:"done",label:reduce?"Your plan":"Full version",text:full});
  if(small) rows.push({status:"counted",label:reduce?"Smaller win":"Smaller version",text:small});
  if(small2) rows.push({status:"counted",label:reduce?"Another smaller win":"Minimum version",text:small2});
  return rows;
}
let easierVersionHabitId=null;
const easierVersionModal=document.getElementById("easierVersionModal");
function openEasierVersion(habitId){
  const h=state.habits.find(x=>x.id===habitId);
  if(!h) return;
  easierVersionHabitId=habitId;
  const period=currentTimePeriod();
  document.getElementById("easierVersionTitle").textContent=period==="morning"?"What works this morning?":period==="afternoon"?"What works this afternoon?":"What works tonight?";
  const rows=versionRowsForHabit(h);
  document.getElementById("easierVersionList").innerHTML=rows.map((r,i)=>`<button type="button" class="version-option" data-version-index="${i}"><span class="version-option-label">${escapeHTML(r.label)}</span><span class="version-option-text">${escapeHTML(r.text)}</span></button>`).join("");
  document.querySelectorAll("#easierVersionList [data-version-index]").forEach(btn=>btn.addEventListener("click",()=>{
    const row=rows[Number(btn.dataset.versionIndex)];
    if(row) homeLogStatus(easierVersionHabitId,row.status);
    closeEasierVersion();
  }));
  easierVersionModal.classList.add("show");
}
function closeEasierVersion(){easierVersionModal.classList.remove("show");easierVersionHabitId=null}
document.getElementById("closeEasierVersion").addEventListener("click",closeEasierVersion);
easierVersionModal.addEventListener("click",e=>{if(e.target===easierVersionModal)closeEasierVersion()});

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
      const entry=getLogEntry(h.id,k),s=entry?.status||"";
      if(s){
        considered++;dayRecorded++;
        if(["done","counted","returned"].includes(s)){engaged++;dayEngaged++}
        if(isReturnDay(entry)){
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
  if(!considered){headline.textContent="Not enough check-ins yet.";copy.textContent="Patterns will show up after a few days.";pattern.textContent="Not enough information yet."}
  else if(returns){headline.textContent=returns===1?"You came back once.":`You came back ${returns} times.`;copy.textContent=`${engaged} check-in${engaged===1?"":"s"} across ${activeDays} day${activeDays===1?"":"s"}.`;pattern.textContent=`You engaged on ${activeDays} of the last 7 days, and ${returns} of your check-ins were a return.`}
  else{headline.textContent=activeDays>=4?"You kept the thread going.":"You made contact.";copy.textContent=`${engaged} check-in${engaged===1?"":"s"} across ${activeDays} day${activeDays===1?"":"s"}.`;const strongest=[...dayStats].sort((a,b)=>b.engaged-a.engaged)[0];pattern.textContent=engaged>=3&&strongest.engaged?`${fmtLong(strongest.date)} had the most habit contact this week.`:"A few more check-ins will make the weekly rhythm easier to read."}
  renderReviewHistory(days);
}

let reviewFilter="all";
function reviewDateLabel(date){const today=dateKey(),key=dateKey(date),yesterday=dateKey(addDays(new Date(),-1));if(key===today)return "Today";if(key===yesterday)return "Yesterday";return fmtLong(date)}
function reviewHabitEvent(h,entry){
  const labels={done:"Full version",counted:"Smaller version",miss:"Not today",returned:"Returned"};
  const isReturn=isReturnDay(entry),baseLabel=labels[entry.status]||entry.status;
  // A new-style return keeps its real version label ("Full version · Return") instead of
  // collapsing to a generic "Returned" that hides which version was actually logged.
  const label=isReturn&&entry.status!=="returned"?`${baseLabel} · Return`:baseLabel;
  const icon=isReturn?"↩":({done:"✓",counted:"○",miss:"—",returned:"↩"})[entry.status];
  const note=label+(entry.note?` · ${entry.note}`:"");
  return {type:"habit",status:entry.status,title:h.name,note,icon};
}
function renderReviewHistory(days=getLast7Days()){
  const list=document.getElementById("reviewHistory");if(!list)return;list.innerHTML="";
  [...days].reverse().forEach(date=>{
    const key=dateKey(date),events=[];
    state.habits.forEach(h=>{const entry=getLogEntry(h.id,key);if(entry?.status)events.push(reviewHabitEvent(h,entry))});
    state.people.forEach(person=>{const interactions=(person.interactions||[]).filter(item=>item.date===key);interactions.forEach(item=>events.push({type:"circle",title:`Connected with ${person.name}`,note:item.method||"Contact",icon:"💬"}));if(!interactions.length&&person.lastContact===key)events.push({type:"circle",title:`Connected with ${person.name}`,note:"Contact",icon:"💬"})});
    const visible=events.filter(event=>reviewFilter==="all"||event.type===reviewFilter);
    const day=document.createElement("section");day.className="history-day";day.innerHTML=`<div class="history-day-label">${escapeHTML(reviewDateLabel(date))}<span> · ${visible.length?`${visible.length} ${visible.length===1?"entry":"entries"}`:"Quiet day"}</span></div>`;
    if(visible.length){visible.forEach(event=>{const row=document.createElement("div");row.className=`history-item ${event.type} ${event.status==="miss"?"miss":""}`;row.innerHTML=`<span class="history-item-icon">${escapeHTML(event.icon)}</span><span class="history-item-copy"><span class="history-item-title">${escapeHTML(event.title)}</span><span class="history-item-note">${escapeHTML(event.note)}</span></span>`;day.appendChild(row)})}else{const quiet=document.createElement("div");quiet.className="history-quiet";quiet.textContent=events.length?"Nothing from this view." : "Nothing logged. That day is complete.";day.appendChild(quiet)}
    list.appendChild(day);
  });
}
document.querySelectorAll("[data-review-filter]").forEach(button=>button.addEventListener("click",()=>{reviewFilter=button.dataset.reviewFilter;document.querySelectorAll("[data-review-filter]").forEach(item=>item.classList.toggle("active",item.dataset.reviewFilter===reviewFilter));button.closest("details").removeAttribute("open");renderReviewHistory()}));

function toggleHabitPaused(id){
  const h=state.habits.find(x=>x.id===id);
  if(!h) return;
  const before=structuredClone(state);
  h.paused=!h.paused;
  saveState();
  showSaved(h.paused?"Paused":"Reactivated",before);
  renderManage();
}
function renderManage(){
  const list=document.getElementById("manageList");
  list.innerHTML="";
  state.habits.forEach(h=>{
    const row=document.createElement("div");
    row.className="manage-item";
    row.innerHTML=`
      ${visualHTML(h,"emoji")}
      <div class="grow"><strong>${escapeHTML(h.name)}</strong><small>${escapeHTML((isReduceGoal(h)?"Reduce · ":"")+scheduleLabel(h))}${h.paused?" · Paused":""}</small></div>
      <button class="tiny-btn" data-pause="${escapeAttr(h.id)}">${h.paused?"Resume":"Pause"}</button>
      <button class="tiny-btn" data-edit="${escapeAttr(h.id)}">Edit</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>openHabitModal(btn.dataset.edit)));
  list.querySelectorAll("[data-pause]").forEach(btn=>btn.addEventListener("click",()=>toggleHabitPaused(btn.dataset.pause)));
}

let editingId=null;
const habitModal=document.getElementById("habitModal");
function openHabitModal(id=null){
  editingId=id;
  const h=id?state.habits.find(x=>x.id===id):null;
  document.getElementById("modalTitle").textContent=h?"Edit habit":"Add habit";
  document.getElementById("habitIcon").value=safeIcon(h?.icon,"leaf");
  document.getElementById("habitColor").value=safeTone(h?.color||"sage");
  updateVisualPreview("habit");
  document.getElementById("habitName").value=h?.name||"";
  document.getElementById("habitGoalType").value=h?.goalType||"practice";
  document.getElementById("habitTimeBlock").value=timeBlockOf(h);
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
  const icon=safeIcon(document.getElementById("habitIcon").value,"leaf");
  const color=safeTone(document.getElementById("habitColor").value);
  const goalType=document.getElementById("habitGoalType").value;
  const timeBlock=document.getElementById("habitTimeBlock").value;
  const full=document.getElementById("habitFull").value.trim();
  const small=document.getElementById("habitSmall").value.trim();
  const small2=document.getElementById("habitSmall2").value.trim();
  const scheduleType=document.getElementById("habitScheduleType").value;
  const weekdays=[...document.querySelectorAll('[name="habitDay"]:checked')].map(input=>Number(input.value));
  const weeklyTarget=Number(document.getElementById("habitWeeklyTarget").value||1);
  const schedule={scheduleType,weekdays:scheduleType==="days"?weekdays:[],weeklyTarget:scheduleType==="weekly"?weeklyTarget:1};
  if(editingId){
    const h=state.habits.find(x=>x.id===editingId);
    Object.assign(h,{name,icon,color,goalType,timeBlock,full,small,small2,...schedule});
  }else{
    state.habits.push({id:"h-"+Date.now(),name,icon,color,goalType,timeBlock,full,small,small2,...schedule});
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
document.getElementById("manageWeeklyDetailBtn").addEventListener("click",()=>{manageModal.classList.remove("show");switchView("practiceView");});
