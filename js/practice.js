let practiceWeekOffset = 0;

function habitAppliesOnDate(h, date){
  const type = h.scheduleType || "daily";
  if(type === "days") return (h.weekdays||[]).map(Number).includes(date.getDay());
  return true;
}
function aggregateBlockStatus(statuses){
  if(!statuses.length) return "";
  if(statuses.includes("returned")) return "returned";
  if(statuses.every(s=>s==="done")) return "done";
  if(statuses.includes("counted")) return "counted";
  if(statuses.every(s=>s==="miss")) return "miss";
  return "counted";
}
function blockBadge(status){
  const map = {
    done: ["✓","Done","done"],
    counted: ["○","Counted","counted"],
    miss: ["—","Not today","miss"],
    returned: ["↩","Returned","returned"],
    "": ["·","—","blank"]
  };
  const [icon,label,cls] = map[status] || map[""];
  return `<span class="status-chip ${cls}">${icon} ${label}</span>`;
}

function getDayNote(key){ return state.dayNotes?.[key] || ""; }
function setDayNote(key, text){
  state.dayNotes ||= {};
  const trimmed = text.trim();
  if(trimmed) state.dayNotes[key] = trimmed; else delete state.dayNotes[key];
  saveState();
}

let editingDayNoteKey = null;
const dayNoteModal = document.getElementById("dayNoteModal");
function openDayNote(key){
  editingDayNoteKey = key;
  document.getElementById("dayNoteTitle").textContent = `Note · ${fmtLong(parseLocalDate(key))}`;
  document.getElementById("dayNoteText").value = getDayNote(key);
  document.getElementById("clearDayNoteBtn").style.display = getDayNote(key) ? "block" : "none";
  dayNoteModal.classList.add("show");
  setTimeout(()=>document.getElementById("dayNoteText").focus(), 50);
}
function closeDayNote(){ dayNoteModal.classList.remove("show"); editingDayNoteKey = null; }
document.getElementById("closeDayNote").addEventListener("click", closeDayNote);
document.getElementById("cancelDayNote").addEventListener("click", closeDayNote);
dayNoteModal.addEventListener("click", e=>{ if(e.target===dayNoteModal) closeDayNote(); });
document.getElementById("saveDayNoteBtn").addEventListener("click", ()=>{
  if(!editingDayNoteKey) return;
  setDayNote(editingDayNoteKey, document.getElementById("dayNoteText").value);
  closeDayNote();
});
document.getElementById("clearDayNoteBtn").addEventListener("click", ()=>{
  if(!editingDayNoteKey) return;
  setDayNote(editingDayNoteKey, "");
  closeDayNote();
});

function practiceWeekStart(){ return startOfWeek(addDays(new Date(), practiceWeekOffset*7)); }
function practiceWeekDays(){ const start=practiceWeekStart(); return Array.from({length:7},(_, i)=>addDays(start,i)); }

function renderPracticeGrid(){
  const days = practiceWeekDays();
  const start = days[0], end = days[6];
  const sameYear = start.getFullYear()===end.getFullYear();
  const fmtRange = d=>new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(d);
  document.getElementById("practiceWeekLabel").textContent = practiceWeekOffset===0
    ? `This Week · ${fmtRange(start)}–${fmtRange(end)}`
    : `${fmtRange(start)}–${fmtRange(end)}${sameYear?"":""}`;
  document.getElementById("practiceNextWeek").disabled = practiceWeekOffset>=0;

  const body = document.getElementById("practiceGridBody");
  body.innerHTML = "";
  let done=0, counted=0, miss=0, returned=0, engaged=0, possible=0;

  days.forEach(date=>{
    const key = dateKey(date);
    const isToday = key===dateKey();
    const blocks = {morning:[], afternoon:[], evening:[]};
    let dayReturns = 0;
    state.habits.forEach(h=>{
      const applies = habitAppliesOnDate(h, date);
      const status = getStatus(h.id, key);
      if(status){
        blocks[timeBlockOf(h)].push(status);
        if(status==="done") done++;
        if(status==="counted") counted++;
        if(status==="miss") miss++;
        if(status==="returned"){ returned++; dayReturns++; }
        if(["done","counted","returned"].includes(status)) engaged++;
      }
      if(applies) possible++;
    });
    const row = document.createElement("tr");
    row.className = isToday ? "today" : "";
    const note = getDayNote(key);
    row.innerHTML = `
      <td data-label="Date">${escapeHTML(fmtRange(date))}</td>
      <td data-label="Day">${escapeHTML(fmtShort(date))}</td>
      <td data-label="🌅 Morning">${blockBadge(aggregateBlockStatus(blocks.morning))}</td>
      <td data-label="☀️ Afternoon">${blockBadge(aggregateBlockStatus(blocks.afternoon))}</td>
      <td data-label="🌙 Evening">${blockBadge(aggregateBlockStatus(blocks.evening))}</td>
      <td data-label="↩ Re-entry">${dayReturns ? `<span class="status-chip returned">↩ ${dayReturns}</span>` : "<span class=\"status-chip blank\">—</span>"}</td>
      <td data-label="Notes"><button class="note-btn" data-day-note="${key}">${note ? escapeHTML(note) : "+ Add note"}</button></td>
    `;
    body.appendChild(row);
  });
  body.querySelectorAll("[data-day-note]").forEach(btn=>btn.addEventListener("click",()=>openDayNote(btn.dataset.dayNote)));

  const engagementPct = possible ? Math.round((engaged/possible)*100) : 0;
  document.getElementById("metricEngagement").textContent = possible ? `${engagementPct}%` : "—";
  document.getElementById("metricEngagementNote").textContent = possible ? `${engaged} / ${possible} possible` : "Nothing logged yet";
  document.getElementById("metricReturns").textContent = String(returned);

  const total = done+counted+miss+returned;
  const seg = (n)=> total ? Math.round((n/total)*100) : 0;
  const overview = document.getElementById("practiceOverview");
  if(!total){
    overview.innerHTML = `<div class="overview-empty">No check-ins logged this week yet.</div>`;
  } else {
    overview.innerHTML = `
      <div class="overview-bar-track">
        ${done?`<span class="overview-bar-seg done" style="width:${seg(done)}%"></span>`:""}
        ${counted?`<span class="overview-bar-seg counted" style="width:${seg(counted)}%"></span>`:""}
        ${miss?`<span class="overview-bar-seg miss" style="width:${seg(miss)}%"></span>`:""}
        ${returned?`<span class="overview-bar-seg returned" style="width:${seg(returned)}%"></span>`:""}
      </div>
      <div class="overview-legend">
        <span class="overview-legend-row"><span class="overview-dot done"></span>Done<span class="grow"></span>${done} (${seg(done)}%)</span>
        <span class="overview-legend-row"><span class="overview-dot counted"></span>Counted<span class="grow"></span>${counted} (${seg(counted)}%)</span>
        <span class="overview-legend-row"><span class="overview-dot miss"></span>Not today<span class="grow"></span>${miss} (${seg(miss)}%)</span>
        <span class="overview-legend-row"><span class="overview-dot returned"></span>Returned<span class="grow"></span>${returned} (${seg(returned)}%)</span>
      </div>
      <div class="overview-total">${total} / ${possible} possible</div>
    `;
  }
}

function renderPracticeMetrics(){
  const WINDOW = 120;
  const activeDays = [];
  const returnEvents = [];
  for(let i=WINDOW-1; i>=0; i--){
    const date = addDays(new Date(), -i);
    const key = dateKey(date);
    let dayEngaged = false;
    state.habits.forEach(h=>{
      const status = getStatus(h.id, key);
      if(["done","counted","returned"].includes(status)) dayEngaged = true;
      if(status==="returned"){
        const dist = lastMissDistance(h.id, date);
        if(dist) returnEvents.push({date, dist});
      }
    });
    activeDays.push(dayEngaged);
  }

  let longest=0, run=0;
  activeDays.forEach(active=>{ run = active ? run+1 : 0; if(run>longest) longest=run; });
  document.getElementById("metricLongestActive").textContent = longest ? `${longest} day${longest===1?"":"s"}` : "—";

  if(returnEvents.length){
    const avg = returnEvents.reduce((sum,e)=>sum+e.dist,0)/returnEvents.length;
    document.getElementById("metricReturnTime").textContent = `${Math.round(avg*10)/10} d`;
    const half = Math.floor(returnEvents.length/2);
    if(half>=2){
      const older = returnEvents.slice(0,half), recent = returnEvents.slice(half);
      const avgOf = arr=>arr.reduce((s,e)=>s+e.dist,0)/arr.length;
      document.getElementById("metricReturnTimeNote").textContent = avgOf(recent)<avgOf(older) ? "Getting faster ↓" : "Averaged across recent returns";
    } else {
      document.getElementById("metricReturnTimeNote").textContent = "Averaged across recent returns";
    }
  } else {
    document.getElementById("metricReturnTime").textContent = "—";
    document.getElementById("metricReturnTimeNote").textContent = "Not enough data yet";
  }

  const recentReturns = returnEvents.slice(-5).reverse();
  const list = document.getElementById("practiceRecentReturns");
  if(!recentReturns.length){
    list.innerHTML = `<div class="overview-empty">No returns logged yet. That’s fine — there’s nothing to catch up on.</div>`;
  } else {
    list.innerHTML = recentReturns.map(e=>`
      <div class="stat-row"><span class="stat-icon">↩</span><span class="stat-copy"><span class="stat-label">${escapeHTML(fmtLong(e.date))}</span><span class="stat-help">Came back after ${e.dist} day${e.dist===1?"":"s"}</span></span></div>
    `).join("");
  }
}

function habitCurrentMissStreak(h){
  let streak = 0;
  for(let i=0; i<=30; i++){
    const key = dateKey(addDays(new Date(), -i));
    const status = getStatus(h.id, key);
    if(status==="miss"){ streak++; continue; }
    if(["done","counted","returned"].includes(status)) break;
  }
  return streak;
}
function renderPracticeSystemLock(){
  const streaks = state.habits.map(h=>({habit:h, streak:habitCurrentMissStreak(h)}));
  const top = streaks.sort((a,b)=>b.streak-a.streak)[0] || {streak:0};
  const n = Math.min(top.streak, 9);
  const card = document.getElementById("practiceSystemLock");
  const ready = top.streak>=3;
  card.innerHTML = `
    <div class="lock-card-head"><span>🔒 Problems in a row</span><strong>${top.streak} / 3</strong></div>
    <div class="progress-track"><div class="progress-fill lock" style="width:${Math.min(100, Math.round((n/3)*100))}%"></div></div>
    <div class="settings-help">${ready
      ? `${escapeHTML(top.habit?.name||"A habit")} has come up ${top.streak} times in a row. This might be worth a gentle look — maybe a smaller version — not a redesign.`
      : "Need 3+ to review system."}</div>
  `;
}

function renderPractice(){
  if(!document.getElementById("practiceView")) return;
  renderPracticeGrid();
  renderPracticeMetrics();
  renderPracticeSystemLock();
}
document.getElementById("practicePrevWeek").addEventListener("click", ()=>{ practiceWeekOffset--; renderPracticeGrid(); });
document.getElementById("practiceNextWeek").addEventListener("click", ()=>{ if(practiceWeekOffset<0){ practiceWeekOffset++; renderPracticeGrid(); } });
