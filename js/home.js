// The time-period model, the "what's next" picker (pickStartHereHabit), and the logging
// entry point (homeLogStatus/homePrimaryTier) live in habits.js — this file only owns how
// Home presents that pick (doNextHTML below) and its two compact summary widgets.
//
// The illustration follows its OWN 3-way schedule (morning/afternoon/evening) — there's no
// separate late-night artwork — while the copy pools below follow currentTimePeriod's full
// 4-way split, so late-night gets its own distinct greeting/line/accent instead of quietly
// reusing evening's. The afternoon→evening boundary below MUST match currentTimePeriod's
// (habits.js) — they used to diverge (18 here vs 17 there), so from 5-6pm the banner got
// evening's dark (.is-dark) text color over the light afternoon photo, nearly illegible.
function illustrationPeriod(hour=new Date().getHours()){
  if(hour>=5&&hour<12) return "morning";
  if(hour>=12&&hour<17) return "afternoon";
  return "evening";
}
const HOME_ILLUSTRATION_SRC={
  morning:"attachments/home-morning.jpg",
  afternoon:"attachments/home-afternoon.jpg",
  evening:"attachments/home-evening.jpg"
};

// A curated, fixed pool — never generated. Keeps Home's voice consistent: warm, low-
// pressure, slightly poetic, never coach-y ("crush today", "you got this"). Each period
// picks one greeting, one supportive line, and one handwritten accent; see pickHomeCopy().
const HOME_COPY_POOLS={
  morning:{
    greetings:["Good morning","Morning"],
    supportive:["Start small. That’s enough.","One thing first.","You don’t have to do the whole day at once.","A little start still counts.","Begin gently."],
    accents:["A little start is still a start ♡","One thing at a time ♡","Small steps are enough ♡"]
  },
  afternoon:{
    greetings:["Good afternoon","Keep going"],
    supportive:["You can begin again from here.","Small progress still changes the day.","No need to catch up. Just continue.","A small reset can still help.","The day is not over yet."],
    accents:["Keep a little momentum ♡","Small effort still matters ♡","You can restart from here ♡"]
  },
  evening:{
    greetings:["Good evening","You made it through"],
    supportive:["You’ve done enough for today.","Rest counts too.","Tomorrow can hold what’s left.","You can stop here.","Leave some room for tomorrow."],
    accents:["Leave a little space for tomorrow ♡","A calmer tomorrow is still possible ♡","Rest is part of the rhythm ♡"]
  },
  "late-night":{
    greetings:["Still up","Late night"],
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

function renderHome(){
  const now=new Date(),period=currentTimePeriod(now.getHours());
  document.getElementById("homeDate").textContent=fmtLong(now);
  const gentle=gentleDayOn();
  const copy=pickHomeCopy(period);
  document.getElementById("homeGreeting").textContent=copy.greeting;
  document.getElementById("homeSub").textContent=gentle?"Gentle day is on. Smaller still counts.":copy.supportive;
  document.getElementById("homeIllustrationAccent").textContent=copy.accent;

  const imgPeriod=illustrationPeriod(now.getHours());
  const illusSrc=HOME_ILLUSTRATION_SRC[imgPeriod];
  const img=document.getElementById("homeIllustrationImg");
  if(!img.src.endsWith(illusSrc)) img.src=illusSrc; // avoid an unnecessary reload/flicker when nothing changed
  const banner=document.getElementById("homeHeroBanner");
  // The evening/late-night photo is dark, so the overlaid header text flips to light.
  banner.classList.toggle("is-dark",period==="evening"||period==="late-night");
  // Each source photo frames its character differently, so the crop focal point (which
  // part of the image survives the cinematic cover-crop) is tuned per photo, not uniform.
  banner.classList.remove("period-morning","period-afternoon","period-evening");
  banner.classList.add("period-"+imgPeriod);

  const nudges=state.people.map(p=>({person:p,timing:personTiming(p)})).filter(x=>["due","soon"].includes(x.timing.class));

  renderStartHere(period,gentle,nudges);
  renderHomeWidgets(nudges);
}
// Keeps the greeting/illustration correct across a period boundary (e.g. the app left
// open from 11:58am into the afternoon) without needing the user to navigate away and
// back — renderHome is cheap enough to just re-run on a slow interval.
setInterval(()=>{
  if(document.getElementById("homeView")?.classList.contains("active")) renderHome();
},60000);

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
    homeNow.innerHTML=doNextHTML(pick,{gentle,blockPeriod:period});
    return;
  }

  const personNudge=nudges.sort((a,b)=>(a.timing.class==="due"?0:1)-(b.timing.class==="due"?0:1))[0];
  if(personNudge){
    const p=personNudge.person;
    homeNow.innerHTML=`<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">${TARGET_SVG}</span>Do this next</span></div><div class="do-next-row">${visualHTML(p,"do-next-icon","person")}<div class="do-next-copy"><div class="do-next-title">A small hello to ${escapeHTML(p.name)}</div><div class="do-next-detail">An opportunity to reconnect—not something overdue.</div></div></div><div class="do-next-actions"><button class="do-next-btn primary" onclick="openContactModal('${jsEscape(p.id)}')">${iconSVG("message")}Log a connection</button></div>`;
    return;
  }

  homeNow.classList.add("quiet");
  homeNow.innerHTML=`<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">${iconSVG("leaf")}</span>Do this next</span></div><div class="do-next-row"><span class="do-next-icon visual-tone-sage">${iconSVG("leaf")}</span><div class="do-next-copy"><div class="do-next-title">Nothing urgent right now.</div><div class="do-next-detail">You can close the app.</div></div></div>`;
}
// Easier version stays a first-class, equally-sized action next to Done — never a small
// text link — since a smaller version is a normal choice, not a fallback.
function doNextHTML(pick,{gentle=false,blockPeriod=null}={}){
  const h=pick.habit,tier=homePrimaryTier(h);
  const blockNote=pick.isCurrentBlock?"":`<div class="do-next-block-note">Nothing left from ${escapeHTML(BLOCK_LABEL[blockPeriod]||"now")}, so here’s one from ${escapeHTML(BLOCK_LABEL[pick.block]||"elsewhere")} instead.</div>`;
  let detail,primaryStatus;
  if(pick.isReturn){ detail=isReduceGoal(h)?"The next choice is a return—not a restart.":"This is a return—not a restart."; primaryStatus=tier.status; }
  else if(gentle){ detail="Doing less still keeps the connection."; primaryStatus="counted"; }
  else{ detail=tier.text; primaryStatus=tier.status; }
  const hasVersions=versionRowsForHabit(h).length>1;
  const easierBtn=hasVersions?`<button class="do-next-btn secondary" onclick="openEasierVersion('${jsEscape(h.id)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>Easier version</button>`:"";
  return `<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">${TARGET_SVG}</span>Do this next</span><button type="button" class="do-next-overflow" aria-label="More options for ${escapeAttr(h.name)}" onclick="openStatusModal('${jsEscape(h.id)}')">•••</button></div><div class="do-next-row">${visualHTML(h,"do-next-icon")}<div class="do-next-copy"><div class="do-next-title">${escapeHTML(h.name)}</div><div class="do-next-detail">${escapeHTML(detail)}</div></div></div>${blockNote}<div class="do-next-actions"><button class="do-next-btn primary" onclick="homeLogStatus('${jsEscape(h.id)}','${primaryStatus}')">✓ Done</button>${easierBtn}</div>`;
}

// Level 2 of Home's hierarchy — compact, fully-tappable summary cards, not a second copy
// of the Habits/Circle screens: one header line (icon, title, one-glance meta, chevron)
// plus at most one preview row, the single most relevant item. Tapping anywhere on the
// card routes through the existing switchView/openPersonDetail entry points, so this
// never becomes a second place habit/person data has to be kept in sync.
function renderHomeWidgets(nudges){
  const wrap=document.getElementById("homeWidgets");
  if(!wrap) return;
  wrap.innerHTML=[homeHabitsWidgetHTML(),homeCircleWidgetHTML(nudges)].filter(Boolean).join("");
}
function homeHabitsWidgetHTML(){
  if(!state.habits.length) return "";
  const today=state.habits.filter(h=>habitAppliesToday(h)&&!h.paused);
  if(!today.length) return "";
  const done=today.filter(h=>["done","counted","returned"].includes(getStatus(h.id)));
  const next=today.find(h=>!["done","counted","returned"].includes(getStatus(h.id)))||today[0];
  const status=getStatus(next.id);
  const dotClass=status==="done"?"done":status==="counted"?"counted":status==="returned"?"returned":status==="miss"?"miss":"";
  const row=`<div class="home-widget-row"><span class="home-widget-dot ${dotClass}"></span><span class="home-widget-row-name">${escapeHTML(next.name)}</span></div>`;
  return `<button type="button" class="home-widget" onclick="switchView('todayView')"><div class="home-widget-head"><span class="home-widget-title"><span class="home-widget-icon sage">${iconSVG("leaf")}</span>Habits</span><span class="home-widget-meta">${done.length} of ${today.length} today${CHEVRON_SVG}</span></div>${row}</button>`;
}
function homeCircleWidgetHTML(nudges){
  if(!state.people.length) return "";
  const top=(nudges[0]&&nudges[0].person)||state.people[0];
  const meta=nudges.length?`${nudges.length} check-in${nudges.length===1?"":"s"}`:personTiming(top).label;
  const row=`<div class="home-widget-row">${visualHTML(top,"home-widget-avatar","person")}<span class="home-widget-row-name">${escapeHTML(top.name)}</span></div>`;
  return `<button type="button" class="home-widget" onclick="switchView('circleView')"><div class="home-widget-head"><span class="home-widget-title"><span class="home-widget-icon peach">${iconSVG("heart")}</span>My Circle</span><span class="home-widget-meta">${escapeHTML(meta)}${CHEVRON_SVG}</span></div>${row}</button>`;
}
