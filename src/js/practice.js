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

// Detailed History reads as a log, not a calendar week: each window is the 7 days ending
// at an anchor (today, for offset 0), newest first, so paging never shows unlogged future
// days and never resets to a Monday mid-window. Overview reuses the same `days` array so
// its totals stay in sync with whatever window History is currently showing.
function practiceWindowAnchor(){ return addDays(new Date(), practiceWeekOffset*7); }
function practiceWeekDays(){ const anchor=practiceWindowAnchor(); return Array.from({length:7},(_, i)=>addDays(anchor,-i)); }

function renderPracticeGrid(){
  const days = practiceWeekDays();
  const newest = days[0], oldest = days[days.length-1];
  // A window that isn't in the current calendar year needs the year shown, or "Jan 1–Jan 7"
  // is ambiguous with any other year you can reach via the prev-window button — the previous
  // version computed this (as `sameYear`) but never actually appended it anywhere.
  const showYear = oldest.getFullYear()!==new Date().getFullYear()||newest.getFullYear()!==new Date().getFullYear();
  const fmtRange = d=>new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",...(showYear?{year:"numeric"}:{})}).format(d);
  document.getElementById("practiceWeekLabel").textContent = practiceWeekOffset===0
    ? `Last 7 Days · ${fmtRange(oldest)}–${fmtRange(newest)}`
    : `${fmtRange(oldest)}–${fmtRange(newest)}`;
  document.getElementById("practiceNextWeek").disabled = practiceWeekOffset>=0;

  // Return is context on a completion, not a fourth completion type — a returned "done" is
  // still Regular and a returned "counted" is still Smaller (see isReturnDay(), habits.js).
  // `returns` is therefore tallied separately from the three primary buckets, using the
  // same modern-aware isReturnDay() check the Insights "Returns" metric below already
  // uses, so it reflects live-derived returns, not just the legacy status:"returned" bucket.
  // Legacy status:"returned" records (written before engagement version and return context
  // were split into separate fields, see habits.js) carry no recoverable info on whether the
  // original completion was Regular or Smaller — isReturnDay() still counts them toward
  // `returns` so that real historical activity isn't erased, but they're deliberately never
  // guessed into `done` or `counted`.
  let done=0, counted=0, miss=0, returns=0, anyLogged=false, engaged=0, possible=0;

  days.forEach(date=>{
    const key = dateKey(date);
    state.habits.forEach(h=>{
      const applies = !h.paused && habitAppliesOnDate(h, date);
      const entry = getLogEntry(h.id, key);
      const status = entry?.status || "";
      if(status){
        anyLogged = true;
        if(status==="done") done++;
        if(status==="counted") counted++;
        if(status==="miss") miss++;
        if(isReturnDay(entry,h,key)) returns++;
        if(["done","counted","returned"].includes(status)) engaged++;
      }
      // A weekly-rhythm habit doesn't have a daily opportunity to log — counting it as
      // "possible" on all 7 days would inflate the denominator (e.g. a 3x/week habit
      // reading as 3/7 instead of 3/3). Its weekly-target contribution is added once,
      // after this per-day loop, instead. (Feeds the separate Insights "Engagement" tile
      // below the fold, not this card — this card no longer shows a possible/opportunity
      // count of its own.)
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
  document.getElementById("metricReturns").textContent = String(returns);

  // Bar-segment widths are a purely visual proportion of the three primary buckets — never
  // shown as a number, so there's no percentage to misread as a score.
  const primaryTotal = done+counted+miss;
  const seg = (n)=> primaryTotal ? Math.round((n/primaryTotal)*100) : 0;
  const overview = document.getElementById("practiceOverview");
  if(!anyLogged){
    overview.innerHTML = `<div class="overview-empty">No check-ins logged this week yet.</div>`;
  } else {
    const returnsLine = returns ? `<div class="overview-returns">↩ ${returns} return${returns===1?"":"s"}</div>` : "";
    overview.innerHTML = `
      <div class="overview-bar-track">
        ${done?`<span class="overview-bar-seg done" style="width:${seg(done)}%"></span>`:""}
        ${counted?`<span class="overview-bar-seg counted" style="width:${seg(counted)}%"></span>`:""}
        ${miss?`<span class="overview-bar-seg miss" style="width:${seg(miss)}%"></span>`:""}
      </div>
      <div class="overview-legend">
        <span class="overview-legend-row"><span class="overview-dot done"></span>Regular<span class="grow"></span>${done}</span>
        <span class="overview-legend-row"><span class="overview-dot counted"></span>Smaller<span class="grow"></span>${counted}</span>
        <span class="overview-legend-row"><span class="overview-dot miss"></span>Not today<span class="grow"></span>${miss}</span>
      </div>
      ${returnsLine}
    `;
  }
}

// Which days' event lists are expanded, kept separate from Habit Log's own
// habitLogOpenDays (habits.js) — the two views share dateKeys but not open/closed state.
let practiceHistoryOpenDays = new Set();
// Reuses reviewHabitEvent/historyItemHTML/reviewDateLabel from habits.js (loaded first) —
// same "what happened, skip what didn't" per-day list as Habit Log, just scoped to a 7-day
// window instead of the whole archive. `days` already arrives newest-first (see
// practiceWeekDays above), so this just renders them in the order given — Today and
// Yesterday lead, older days descend below. A day with nothing logged and no note collapses
// to a single quiet line instead of repeating three empty time-block columns.
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
  const section = document.getElementById("practiceInsightSection");
  const card = document.getElementById("practiceSystemLock");
  // "3+ repeated problems in a row" (see the "Why we track this way" copy above) is the
  // one pattern this data can genuinely support today. Below that threshold there isn't
  // a specific, grounded observation to make, so the section stays hidden rather than
  // filling the space with a vague placeholder or a count the user has to interpret.
  if(top.streak < 3){
    section.style.display = "none";
    card.innerHTML = "";
    return;
  }
  section.style.display = "";
  // Detection can be quantitative (habitCurrentMissStreak, the >=3 threshold above); the
  // copy stays human. The streak count is what decides whether this renders at all — it
  // never appears in the sentence itself, so this doesn't read as a failure tally.
  card.innerHTML = `
    <div class="lock-card-head">${escapeHTML(top.habit.name)} keeps coming up</div>
    <div class="settings-help">This one's been harder to get to lately. Maybe the smaller version fits better right now.</div>
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
