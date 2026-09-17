// The time-period model, the "what's next" picker (pickStartHereHabit), and the logging
// entry point (homeLogStatus/homePrimaryTier) live in habits.js — this file only owns how
// Home presents that pick (doNextHTML below) and its two compact summary widgets.
//
// The hero (artwork + greeting + supportive line + accent) is its own single 4-way
// schedule — morning/afternoon/evening/lateNight — kept deliberately separate from
// habits.js's currentTimePeriod (which still drives Start Here's habit pick and has its
// own 4-way split with different boundaries). This is the ONE place the hero's daypart
// is computed so artwork and copy can never disagree about what part of the day it is;
// see getDaypart().
function getDaypart(date=new Date()){
  const hour=date.getHours();
  if(hour>=4&&hour<12) return "morning";
  if(hour>=12&&hour<18) return "afternoon";
  if(hour>=18&&hour<23) return "evening";
  return "lateNight";
}
// One config per daypart so the image, dark-text mode, and CSS crop class can never end
// up mismatched (e.g. morning copy over the evening photo) — renderHome reads all of it
// from whichever entry getDaypart() currently points at.
const HOME_HERO_VARIANTS={
  morning:{artwork:"assets/home-morning.png",isDark:false},
  afternoon:{artwork:"assets/home-afternoon.png",isDark:false},
  evening:{artwork:"assets/home-evening.png",isDark:true},
  lateNight:{artwork:"assets/home-late-night.png",isDark:true}
};

// A curated, fixed pool — never generated. Keeps Home's voice consistent: warm, low-
// pressure, slightly poetic, never coach-y ("crush today", "you got this"). Each period
// picks one greeting, one supportive line, and one handwritten accent; see pickHomeCopy().
const HOME_COPY_POOLS={
  morning:{
    greetings:["Good morning"],
    supportive:["Start small. That’s enough.","One thing first.","You don’t have to do the whole day at once.","A little start still counts.","Begin gently."],
    accents:["A little start is still a start ♡","One thing at a time ♡","Small steps are enough ♡"]
  },
  afternoon:{
    greetings:["Good afternoon"],
    supportive:["You can begin again from here.","Small progress still changes the day.","No need to catch up. Just continue.","A small reset can still help.","The day is not over yet."],
    accents:["Keep a little momentum ♡","Small effort still matters ♡","You can restart from here ♡"]
  },
  evening:{
    greetings:["Good evening"],
    supportive:["You’ve done enough for today.","Rest counts too.","Tomorrow can hold what’s left.","You can stop here.","Leave some room for tomorrow."],
    accents:["Leave a little space for tomorrow ♡","A calmer tomorrow is still possible ♡","Rest is part of the rhythm ♡"]
  },
  lateNight:{
    greetings:["Late night"],
    supportive:["Nothing needs to be fixed tonight.","You made it through today. Rest is also progress.","Tomorrow can hold what’s left.","You can stop here.","The rest can wait."],
    accents:["A calmer tomorrow is still possible ♡","Tomorrow is still there ♡","Rest counts too ♡"]
  }
};
// A light word-overlap check, not NLP — enough to catch a supportive line and accent that
// echo the same phrase back to back (e.g. "leave...room for tomorrow" next to "leave a
// little space for tomorrow ♡"), without hand-listing every conflicting pair.
const HOME_COPY_STOPWORDS=new Set(["a","an","the","is","are","to","can","could","still","too","you","your","today","thats","of","it","so","do","does","dont","have","has","at","in","on","for","from","more","just","no","need","needs","here","there","whats","also","part","this","be","being"]);
function homeCopySignificantWords(phrase){
  return phrase.toLowerCase().replace(/[♡.,!’']/g,"").split(/\s+/).filter(w=>w&&!HOME_COPY_STOPWORDS.has(w));
}
function homeCopyPhrasesConflict(a,b){
  const wordsA=new Set(homeCopySignificantWords(a));
  return homeCopySignificantWords(b).some(w=>wordsA.has(w));
}
const HOME_COPY_KEY="personal_workbench_home_copy_v1";
function pickHomeCopyIndex(poolLength,avoidIndex){
  if(poolLength<=1) return 0;
  let idx=Math.floor(Math.random()*poolLength);
  if(idx===avoidIndex) idx=(idx+1)%poolLength;
  return idx;
}
// Sibling tabs (fixed artwork) get one curated {supporting, accent} PAIR per day, never
// picked independently — a pair is written together so the two lines always agree in
// tone (see philosophy notes per tab below). Same stable once-per-calendar-day mechanism
// as Home's copy (HOME_COPY_KEY/dateKey), just storing a pair index instead of three.
const TAB_HERO_COPY={
  // Habits: consistency without perfection — smaller versions count, missing once
  // doesn't erase progress, capacity is allowed to change. No streak-pressure language.
  habits:[
    {supporting:"A smaller version still counts as showing up.",accent:"Consistency, not perfection ♡"},
    {supporting:"Missing a day doesn’t erase the ones before it.",accent:"Return, don’t restart ♡"},
    {supporting:"Some days call for less, and that’s alright.",accent:"Capacity changes, care doesn’t ♡"},
    {supporting:"Doing it imperfectly still keeps it alive.",accent:"Imperfect still counts ♡"},
    {supporting:"Coming back is the whole practice.",accent:"Returning is the skill ♡"},
    {supporting:"Small and steady beats big and rare.",accent:"Small steps still count ♡"},
    {supporting:"Adjusting the shape still keeps it yours.",accent:"Adapting is part of it ♡"},
    {supporting:"One small rhythm is enough for today.",accent:"Enough, not everything ♡"}
  ],
  // My Circle: intentional relationships without turning people into tasks — no
  // overdue/due/late/obligation language, just ordinary small-moment connection.
  circle:[
    {supporting:"A short hello still means something.",accent:"Small moments build closeness ♡"},
    {supporting:"You don’t need a big gesture to stay close.",accent:"Simple still counts ♡"},
    {supporting:"Ordinary check-ins build closeness.",accent:"Connection grows gently ♡"},
    {supporting:"A little attention goes a long way.",accent:"Presence over perfection ♡"},
    {supporting:"Reaching out can be as simple as one line.",accent:"Keep it simple ♡"},
    {supporting:"A small moment can mean a lot to them.",accent:"Small moments, real closeness ♡"},
    {supporting:"Warmth doesn’t need to be planned.",accent:"Warmth in small doses ♡"},
    {supporting:"A little thought keeps people close.",accent:"Closeness lives in small things ♡"}
  ],
  // Trends: notice patterns without judging yourself — no performance/scoring language,
  // direction and noticing matter more than any single day.
  trends:[
    {supporting:"Patterns say more than any single day.",accent:"Notice the shape, not the score ♡"},
    {supporting:"Progress rarely moves in a straight line.",accent:"Direction over perfection ♡"},
    {supporting:"Zooming out shows what one day can’t.",accent:"The bigger picture is kinder ♡"},
    {supporting:"An uneven week still tells you something true.",accent:"Imperfect weeks count too ♡"},
    {supporting:"Noticing is already useful, no judgment required.",accent:"Just notice, don’t judge ♡"},
    {supporting:"What matters is where you’re heading.",accent:"Trends over totals ♡"},
    {supporting:"A dip doesn’t undo the pattern around it.",accent:"One dip isn’t the story ♡"},
    {supporting:"Small shifts add up more than they seem.",accent:"Small shifts add up ♡"}
  ]
};
function renderTabHeroCopy(kind,supportingElId,accentElId){
  const pool=TAB_HERO_COPY[kind],today=dateKey(),storageKey=`${kind}Copy`;
  let all={};
  try{ all=JSON.parse(localStorage.getItem(HOME_COPY_KEY)||"{}"); }catch{ all={}; }
  const prior=all[storageKey];
  if(!prior||prior.date!==today||prior.i>=pool.length){
    all[storageKey]={date:today,i:pickHomeCopyIndex(pool.length,prior?.i??-1)};
    try{ localStorage.setItem(HOME_COPY_KEY,JSON.stringify(all)); }catch{}
  }
  const pick=pool[all[storageKey].i];
  document.getElementById(supportingElId).textContent=pick.supporting;
  document.getElementById(accentElId).textContent=pick.accent;
}
// Stable for the current (day, time block): re-picks only when the date or the block has
// changed since the last render, and — when it does re-pick — avoids repeating yesterday's
// (or last-shown day's) choice for that SAME block, tracked independently per block so a
// morning visit never gets skipped over by an afternoon or evening one the same day.
function pickHomeCopy(period){
  const pool=HOME_COPY_POOLS[period];
  const today=dateKey();
  let all={};
  try{ all=JSON.parse(localStorage.getItem(HOME_COPY_KEY)||"{}"); }catch{ all={}; }
  const prior=all[period];
  const stillValid=prior&&prior.date===today&&prior.g<pool.greetings.length&&prior.s<pool.supportive.length&&prior.a<pool.accents.length;
  if(stillValid) return {greeting:pool.greetings[prior.g],supportive:pool.supportive[prior.s],accent:pool.accents[prior.a]};

  const avoidG=prior&&prior.g<pool.greetings.length?prior.g:-1;
  const avoidS=prior&&prior.s<pool.supportive.length?prior.s:-1;
  const avoidA=prior&&prior.a<pool.accents.length?prior.a:-1;
  const g=pickHomeCopyIndex(pool.greetings.length,avoidG);
  const s=pickHomeCopyIndex(pool.supportive.length,avoidS);
  let candidates=pool.accents.map((_,i)=>i).filter(i=>i!==avoidA&&!homeCopyPhrasesConflict(pool.supportive[s],pool.accents[i]));
  if(!candidates.length) candidates=pool.accents.map((_,i)=>i).filter(i=>!homeCopyPhrasesConflict(pool.supportive[s],pool.accents[i]));
  if(!candidates.length) candidates=pool.accents.map((_,i)=>i).filter(i=>i!==avoidA);
  if(!candidates.length) candidates=pool.accents.map((_,i)=>i);
  const a=candidates[Math.floor(Math.random()*candidates.length)];

  all[period]={date:today,g,s,a};
  try{ localStorage.setItem(HOME_COPY_KEY,JSON.stringify(all)); }catch{}
  return {greeting:pool.greetings[g],supportive:pool.supportive[s],accent:pool.accents[a]};
}

// The ONE place that touches the hero DOM. All four dayparts flow through this exact
// same code path — nothing here branches on `daypart` except to look up which config
// object to read from, so morning/afternoon/evening/lateNight are structurally
// guaranteed identical geometry (container size, image wrapper, absolute positioning,
// right/bottom offsets, object-fit/position, rounded clipping, fade mask, responsive
// breakpoints all live as fixed classes on #homeHeroBanner/#homeIllustrationImg in
// index.html and are never touched here). Only the artwork src, the is-dark theme
// toggle, and the copy differ per variant — never add a per-daypart class, inline
// style, or special-cased branch here; add another HOME_HERO_VARIANTS entry instead.
function renderHomeHero(daypart,gentle){
  const variant=HOME_HERO_VARIANTS[daypart];
  const copy=pickHomeCopy(daypart);
  document.getElementById("homeGreeting").textContent=copy.greeting;
  document.getElementById("homeSub").textContent=gentle?"Gentle day is on. Smaller still counts.":copy.supportive;
  document.getElementById("homeIllustrationAccent").textContent=copy.accent;

  const img=document.getElementById("homeIllustrationImg");
  if(!img.src.endsWith(variant.artwork)) img.src=variant.artwork; // avoid an unnecessary reload/flicker when nothing changed
  const banner=document.getElementById("homeHeroBanner");
  banner.classList.toggle("is-dark",variant.isDark);
  banner.classList.remove(...Object.keys(HOME_HERO_VARIANTS).map(d=>"period-"+d));
  banner.classList.add("period-"+daypart);
}

function renderHome(){
  const now=new Date(),period=currentTimePeriod(now.getHours());
  document.getElementById("homeDate").textContent=fmtLong(now);
  const gentle=gentleDayOn();

  // getDaypart(now) is read once and is the only thing that decides which hero variant
  // renders, so the artwork and its copy can never disagree about what part of the day
  // it is.
  renderHomeHero(getDaypart(now),gentle);

  // Must match circle.js's own definition of "due" exactly (today >= Next Due Date, not
  // "coming up soon") — otherwise Home's nudge and My Circle's "People to check in with"
  // can disagree about who currently needs a check-in.
  const nudges=state.people.map(p=>({person:p,timing:personTiming(p)})).filter(x=>x.timing.class==="due");

  renderStartHere(period,gentle,nudges);
  renderHomeWidgets(period,nudges);
}
function homeViewActive(){ return document.getElementById("homeView")?.classList.contains("active"); }
function refreshHomeIfActive(){ if(homeViewActive()) renderHome(); }

// Keeps the hero correct across a daypart boundary (e.g. the app left open from 11:59am
// into afternoon, or overnight through midnight) without the user navigating away and
// back. Rather than polling, this schedules exactly one timeout for the next 4:00/12:00/
// 18:00/23:00 boundary and re-derives the next one after it fires — so the local clock
// (via getDaypart) stays the only source of truth and nothing is ever persisted.
let homeDaypartTimer=null;
function msUntilNextDaypartBoundary(now=new Date()){
  const boundaries=[4,12,18,23];
  const next=new Date(now);
  next.setSeconds(0,0);
  const nextHour=boundaries.find(h=>h>now.getHours())??boundaries[0]+24;
  next.setHours(nextHour%24,0,0,0);
  if(nextHour>=24) next.setDate(next.getDate()+1);
  return Math.max(1000,next-now);
}
function scheduleNextHomeDaypartRefresh(){
  if(homeDaypartTimer) clearTimeout(homeDaypartTimer);
  homeDaypartTimer=setTimeout(()=>{
    refreshHomeIfActive();
    scheduleNextHomeDaypartRefresh();
  },msUntilNextDaypartBoundary());
}
scheduleNextHomeDaypartRefresh();
// Covers everything a scheduled boundary timeout can't: the device clock moving while
// the tab is backgrounded/suspended (iOS routinely throttles or freezes timers for a
// backgrounded PWA, so a pending setTimeout can fire late or not at all), the app
// resuming from the background, and returning from another browser tab/app.
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"){ refreshHomeIfActive(); scheduleNextHomeDaypartRefresh(); }
});
window.addEventListener("focus",()=>{ refreshHomeIfActive(); scheduleNextHomeDaypartRefresh(); });
window.addEventListener("pageshow",()=>{ refreshHomeIfActive(); scheduleNextHomeDaypartRefresh(); });

const CHEVRON_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>`;
// Matches the app's outline icon system (stroke-based, currentColor) rather than emoji —
// functional UI (the "Do this next" eyebrow, action buttons) should read the same way
// tab/module icons do; emoji stay reserved for decorative flourishes, not UI chrome.
const TARGET_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"></circle></svg>`;
// Home is a minimal launchpad, not a dashboard: Start Here renders the same shared
// "Do this next" module the mockup calls out as the page's one clear focal point — a
// tight eyebrow + row + two actions, not a tall explanatory card. Habit picking logic
// (pickStartHereHabit, habits.js) and the completion/versions data are unchanged; only
// the presentation here is new.
function renderStartHere(period,gentle,nudges){
  const homeNow=document.getElementById("homeNow");
  homeNow.classList.remove("quiet");
  homeNow.classList.toggle("gentle",gentle);

  const pick=pickStartHereHabit(period);
  if(pick){
    homeNow.innerHTML=doNextHTML(pick,{gentle});
    return;
  }

  // Same ranking circle.js uses for its hero card — most overdue first — so Home ever
  // only ever suggests the same person My Circle would show as "Your next check-in".
  const personNudge=nudges.sort((a,b)=>personOverdueRank(b.person)-personOverdueRank(a.person))[0];
  if(personNudge){
    const p=personNudge.person;
    // personNudge is always genuinely due now (class==="due"), so its own calm, accurate
    // text (personTiming's text field) replaces what used to be a hardcoded "not something
    // overdue" claim — which was simply false once someone actually is overdue.
    homeNow.innerHTML=`<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">${TARGET_SVG}</span>Do this next</span></div><div class="do-next-row">${visualHTML(p,"do-next-icon","person")}<div class="do-next-copy"><div class="do-next-title">A small hello to ${escapeHTML(p.name)}</div><div class="do-next-detail">${escapeHTML(personNudge.timing.text)}</div></div></div><div class="do-next-actions"><button class="do-next-btn primary" onclick="openContactModal('${jsEscape(p.id)}')">${iconSVG("message")}Log a connection</button></div>`;
    return;
  }

  homeNow.classList.add("quiet");
  const empty=doNextEmptyCopy(period);
  const detailHTML=empty.detail?`<div class="do-next-detail">${escapeHTML(empty.detail)}</div>`:"";
  homeNow.innerHTML=`<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">${iconSVG("leaf")}</span>Do this next</span></div><div class="do-next-row"><span class="do-next-icon visual-tone-sage">${iconSVG("leaf")}</span><div class="do-next-copy"><div class="do-next-title">${escapeHTML(empty.title)}</div>${detailHTML}</div></div></div>`;
}
// There is genuinely nothing to recommend — a legitimate, intended state (see CLAUDE.md's
// "being done for now is a legitimate state"), not a gap to explain away. Copy stays calm
// and specific to the daypart rather than a generic "you're all caught up" celebration —
// no streak language, no remaining-count, no productivity framing.
function doNextEmptyCopy(period){
  if(period==="afternoon") return {title:"Nothing you need to do right now.",detail:"Come back when the evening starts."};
  if(period==="evening") return {title:"You’re clear for tonight.",detail:""};
  if(period==="late-night") return {title:"You’re done for today.",detail:""};
  return {title:"Nothing you need to do right now.",detail:""};
}
// Easier version stays a first-class, equally-sized action next to Done — never a small
// text link — since a smaller version is a normal choice, not a fallback.
function doNextHTML(pick,{gentle=false}={}){
  const h=pick.habit,tier=homePrimaryTier(h);
  // A flexible pick (pick.isCurrentBlock===false) doesn't need a "fell back from" note —
  // it's a deliberate, genuinely-anytime suggestion, not a stand-in for a daypart that
  // came up empty (Do This Next no longer walks other dayparts looking for filler; see
  // pickStartHereHabit in habits.js).
  // Gentle Day may only change what's SHOWN, never the status itself — tier.status (from
  // homePrimaryTier, the single source of truth for "does this habit have a real smaller
  // version") already reflects the smallest configured version, so Gentle Day being on is
  // never independent evidence of a smaller completion (see completion-status-integrity
  // regression tests: a bare/full-only habit must still log "done" even on a Gentle Day).
  let detail,primaryStatus=tier.status;
  if(pick.isReturn){ detail=isReduceGoal(h)?"The next choice is a return—not a restart.":"This is a return—not a restart."; }
  else if(gentle&&primaryStatus==="counted"){ detail="Doing less still keeps the connection."; }
  else{ detail=tier.text; }
  const hasVersions=versionRowsForHabit(h).length>1;
  const easierBtn=hasVersions?`<button class="do-next-btn secondary" onclick="openEasierVersion('${jsEscape(h.id)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>Easier version</button>`:"";
  return `<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">${TARGET_SVG}</span>Do this next</span><button type="button" class="do-next-overflow" aria-label="More options for ${escapeAttr(h.name)}" onclick="openStatusModal('${jsEscape(h.id)}')">•••</button></div><div class="do-next-row">${visualHTML(h,"do-next-icon")}<div class="do-next-copy"><div class="do-next-title">${escapeHTML(h.name)}</div><div class="do-next-detail">${escapeHTML(detail)}</div></div></div><div class="do-next-actions"><button class="do-next-btn primary" onclick="homeLogStatus('${jsEscape(h.id)}','${primaryStatus}')">✓ Done</button>${easierBtn}</div>`;
}

// Level 2 of Home's hierarchy — a quiet daily glance, not a second Do This Next. Each
// card is a single derived sentence (see getHabitsTodaySummary/getCircleTodaySummary
// below) plus the existing switchView entry points, so Home never becomes a second place
// habit/person data has to be kept in sync, and never exposes the underlying queue.
function renderHomeWidgets(period,nudges){
  const wrap=document.getElementById("homeWidgets");
  if(!wrap) return;
  wrap.innerHTML=`<div class="home-section-head"><div class="home-section-title">A little for today</div><div class="home-section-hint">Just a glance. No pressure.</div></div>${homeHabitsWidgetHTML(period)}${homeCircleWidgetHTML(nudges)}`;
}
// Late-night isn't one of the three habit blocks (BLOCK_LABEL only covers morning/
// afternoon/evening) — pickStartHereHabit's own currentBlockForPeriod() treats late-night
// as an extension of evening, so the Habits card does the same rather than inventing a
// fourth label.
function homeDisplayBlock(period){ return period==="late-night"?"evening":period; }
// Derives a single "where things stand" sentence from the exact same habit-block data
// pickStartHereHabit already reads (timeBlockOf/habitAppliesToday/habitStillNeedsAttentionToday)
// — never a second scheduling system. Deliberately says nothing about WHICH habits remain;
// that's Do This Next's job, so the two cards never repeat each other's content.
function getHabitsTodaySummary(period){
  const block=homeDisplayBlock(period),label=BLOCK_LABEL[block]||"today";
  const configuredToday=state.habits.filter(h=>habitAppliesToday(h)&&!h.paused&&timeBlockOf(h)===block);
  if(!configuredToday.length) return `Nothing planned for this ${label}.`;
  const remaining=unloggedTodayHabitsInBlock(block);
  if(!remaining.length) return `Nothing else for this ${label}.`;
  if(remaining.length===1) return `One little thing left for this ${label}`;
  return `${remaining.length} small things for this ${label}`;
}
function homeHabitsWidgetHTML(period){
  const support=getHabitsTodaySummary(period);
  return `<button type="button" class="home-widget" onclick="switchView('todayView')"><span class="home-widget-icon sage">${iconSVG("leaf")}</span><span class="home-widget-copy"><span class="home-widget-title">Habits</span><span class="home-widget-support">${escapeHTML(support)}</span></span><span class="home-widget-meta">${CHEVRON_SVG}</span></button>`;
}
// nudges is the same class==="due" list renderHome already built via personTiming — the
// single source of truth My Circle itself uses — so this card can never disagree with
// My Circle's own "People to check in with" about who currently needs a check-in.
function getCircleTodaySummary(nudges){
  if(!state.people.length) return "Your circle can start with one person.";
  if(!nudges.length) return "No one needs a check-in today.";
  if(nudges.length===1) return `${nudges[0].person.name} is ready for a little hello.`;
  return `${nudges.length} people are ready for a check-in.`;
}
function homeCircleWidgetHTML(nudges){
  const support=getCircleTodaySummary(nudges);
  return `<button type="button" class="home-widget" onclick="switchView('circleView')"><span class="home-widget-icon peach">${iconSVG("heart")}</span><span class="home-widget-copy"><span class="home-widget-title">My Circle</span><span class="home-widget-support">${escapeHTML(support)}</span></span><span class="home-widget-meta">${CHEVRON_SVG}</span></button>`;
}
