let practiceWeekOffset = 0;

function habitAppliesOnDate(h, date){
  const type = h.scheduleType || "daily";
  if(type === "days") return (h.weekdays||[]).map(Number).includes(date.getDay());
  return true;
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
  // A week that isn't in the current calendar year needs the year shown, or "Jan 1–Jan 7"
  // is ambiguous with any other year you can reach via the prev-week button — the previous
  // version computed this (as `sameYear`) but never actually appended it anywhere.
  const showYear = start.getFullYear()!==new Date().getFullYear()||end.getFullYear()!==new Date().getFullYear();
  const fmtRange = d=>new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",...(showYear?{year:"numeric"}:{})}).format(d);
  document.getElementById("practiceWeekLabel").textContent = practiceWeekOffset===0
    ? `This Week · ${fmtRange(start)}–${fmtRange(end)}`
    : `${fmtRange(start)}–${fmtRange(end)}`;
  document.getElementById("practiceNextWeek").disabled = practiceWeekOffset>=0;

  // "returned" here is only the legacy bucket (records written before engagement version
  // and return context were split into separate fields — their real version is unknown).
  // returnsCount is the true, version-independent tally used for the Returns metric.
  let done=0, counted=0, miss=0, returned=0, returnsCount=0, engaged=0, possible=0;

  days.forEach(date=>{
    const key = dateKey(date);
    state.habits.forEach(h=>{
      const applies = !h.paused && habitAppliesOnDate(h, date);
      const entry = getLogEntry(h.id, key);
      const status = entry?.status || "";
      if(status){
        if(status==="done") done++;
        if(status==="counted") counted++;
        if(status==="miss") miss++;
        if(status==="returned") returned++;
        if(isReturnDay(entry,h,key)) returnsCount++;
        if(["done","counted","returned"].includes(status)) engaged++;
      }
      // A weekly-rhythm habit doesn't have a daily opportunity to log — counting it as
      // "possible" on all 7 days would inflate the denominator (e.g. a 3x/week habit
      // reading as 3/7 instead of 3/3). Its weekly-target contribution is added once,
      // after this per-day loop, instead.
      if(applies && h.scheduleType!=="weekly") possible++;
    });
  });
  renderPracticeHistoryList(days);

  // Weekly-rhythm habits contribute their target once for the whole week (see the note in
  // the loop above), not once per day — added here rather than inside days.forEach.
  state.habits.forEach(h=>{ if(!h.paused && h.scheduleType==="weekly") possible+=Number(h.weeklyTarget||1); });
  const engagementPct = possible ? Math.min(100,Math.round((engaged/possible)*100)) : 0;
  document.getElementById("metricEngagement").textContent = possible ? `${engagementPct}%` : "—";
  document.getElementById("metricEngagementNote").textContent = possible ? `${engaged} / ${possible} possible` : "Nothing logged yet";
  document.getElementById("metricReturns").textContent = String(returnsCount);

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

// Which days' event lists are expanded, kept separate from Habit Log's own
// habitLogOpenDays (habits.js) — the two views share dateKeys but not open/closed state.
let practiceHistoryOpenDays = new Set();
// Reuses reviewHabitEvent/historyItemHTML/reviewDateLabel from habits.js (loaded first) —
// same "what happened, skip what didn't" per-day list as Habit Log, just scoped to one
// week instead of the whole archive. A day with nothing logged and no note collapses to a
// single quiet line instead of repeating three empty time-block columns.
function renderPracticeHistoryList(days){
  const list = document.getElementById("practiceHistoryList"); if(!list) return;
  list.innerHTML = days.map(date=>{
    const key = dateKey(date);
    const events = state.habits.map(h=>{const entry=getLogEntry(h.id,key); return entry?.status?reviewHabitEvent(h,entry,key):null}).filter(Boolean);
    const note = getDayNote(key);
    const label = reviewDateLabel(date);
    if(!events.length && !note){
      return `<div class="history-quiet-day"><span class="history-quiet-day-date">${escapeHTML(label)}</span><span class="history-quiet-day-note">Nothing logged</span><button type="button" class="note-btn" data-day-note="${escapeAttr(key)}">+ Note</button></div>`;
    }
    const open = practiceHistoryOpenDays.has(key);
    const bodyId = `practiceHistoryBody-${key}`;
    const rows = events.map(historyItemHTML).join("");
    const noteRow = note
      ? `<button type="button" class="history-day-note" data-day-note="${escapeAttr(key)}">${escapeHTML(note)}</button>`
      : `<button type="button" class="history-day-note add" data-day-note="${escapeAttr(key)}">+ Add note</button>`;
    return `<details class="history-day" data-day-key="${escapeAttr(key)}" ${open?"open":""}><summary aria-expanded="${open}" aria-controls="${escapeAttr(bodyId)}"><span class="history-day-label">${escapeHTML(label)}</span>${events.length?`<span class="history-day-count">${events.length}</span>`:""}</summary><div class="history-day-body" id="${escapeAttr(bodyId)}">${rows}${noteRow}</div></details>`;
  }).join("");
  list.querySelectorAll(".history-day").forEach(details=>details.addEventListener("toggle",()=>{
    const key = details.dataset.dayKey; if(!key) return;
    if(details.open) practiceHistoryOpenDays.add(key); else practiceHistoryOpenDays.delete(key);
    details.querySelector("summary")?.setAttribute("aria-expanded", String(details.open));
  }));
  list.querySelectorAll("[data-day-note]").forEach(btn=>btn.addEventListener("click", e=>{ e.preventDefault(); openDayNote(btn.dataset.dayNote); }));
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
      const entry = getLogEntry(h.id, key), status = entry?.status || "";
      if(["done","counted","returned"].includes(status)) dayEngaged = true;
      if(isReturnDay(entry,h,key)){
        const dist = lastMissDistance(h, date);
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
    document.getElementById("metricReturnTime").textContent = formatReturnDays(avg);
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
  // Paused habits are a deliberate break, not a failure state (see CLAUDE.md's "no guilt
  // mechanics") — a habit the user already paused shouldn't turn around and nudge them
  // about its miss streak.
  const streaks = state.habits.filter(h=>!h.paused).map(h=>({habit:h, streak:habitCurrentMissStreak(h)}));
  const top = streaks.sort((a,b)=>b.streak-a.streak)[0] || {streak:0};
  const n = Math.min(top.streak, 9);
  const card = document.getElementById("practiceSystemLock");
  const ready = top.streak>=3;
  card.innerHTML = `
    <div class="lock-card-head"><span>Coming up, gently</span><strong>${top.streak} / 3</strong></div>
    <div class="progress-track"><div class="progress-fill lock" style="width:${Math.min(100, Math.round((n/3)*100))}%"></div></div>
    <div class="settings-help">${ready
      ? `${escapeHTML(top.habit?.name||"A habit")} keeps coming up. Worth a gentle look — maybe a smaller version.`
      : "Taking shape. Nothing to act on yet."}</div>
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
// Reuses the same habit-picker → statusModal flow as Habit Log's "+ Add past log"
// (habits.js) rather than a second backfill implementation — Weekly Detail just needed
// its own low-friction entry point into it.
document.getElementById("practiceAddPastLogBtn")?.addEventListener("click", ()=>openPastLogPicker());
