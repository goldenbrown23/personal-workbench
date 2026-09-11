// The time-period model, the "what's next" picker (pickStartHereHabit), and the logging
// entry point (homeLogStatus/homePrimaryTier) live in habits.js — this file only owns how
// Home presents that pick (doNextHTML below) and its two compact summary widgets.
//
// The illustration follows its OWN 3-way schedule (morning/afternoon/evening), separate
// from currentTimePeriod's 4-way greeting split (which keeps "Still up" for late-night
// instead of forcing "Good evening") — evening's illustration and warm accent cover both.
function illustrationPeriod(hour=new Date().getHours()){
  if(hour>=5&&hour<12) return "morning";
  if(hour>=12&&hour<18) return "afternoon";
  return "evening";
}
const HOME_ILLUSTRATION={
  morning:{src:"attachments/home-morning.jpg",accent:"You got this ♡"},
  afternoon:{src:"attachments/home-afternoon.jpg",accent:"Small effort, big future ♡"},
  evening:{src:"attachments/home-evening.jpg",accent:"A calmer tomorrow is still possible ♡"}
};
function renderHome(){
  const now=new Date(),period=currentTimePeriod(now.getHours());
  document.getElementById("homeDate").textContent=fmtLong(now);
  document.getElementById("homeGreeting").textContent=PERIOD_GREETING[period];
  const gentle=gentleDayOn();
  document.getElementById("homeSub").textContent=gentle?"Gentle day is on. Smaller still counts.":PERIOD_COPY[period];

  const illus=HOME_ILLUSTRATION[illustrationPeriod(now.getHours())];
  document.getElementById("homeIllustrationAccent").textContent=illus.accent;
  const img=document.getElementById("homeIllustrationImg");
  if(!img.src.endsWith(illus.src)) img.src=illus.src; // avoid an unnecessary reload/flicker when nothing changed

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
    homeNow.innerHTML=`<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">🎯</span>Do this next</span></div><div class="do-next-row">${visualHTML(p,"do-next-icon","person")}<div class="do-next-copy"><div class="do-next-title">A small hello to ${escapeHTML(p.name)}</div><div class="do-next-detail">An opportunity to reconnect—not something overdue.</div></div></div><div class="do-next-actions"><button class="do-next-btn primary" onclick="openContactModal('${jsEscape(p.id)}')">💬 Log a connection</button></div>`;
    return;
  }

  homeNow.classList.add("quiet");
  homeNow.innerHTML=`<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">🍃</span>Do this next</span></div><div class="do-next-row"><span class="do-next-icon">🍃</span><div class="do-next-copy"><div class="do-next-title">Nothing urgent right now.</div><div class="do-next-detail">You can close the app.</div></div></div>`;
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
  return `<div class="do-next-eyebrow"><span class="do-next-eyebrow-label"><span class="do-next-eyebrow-icon" aria-hidden="true">🎯</span>Do this next</span><button type="button" class="do-next-overflow" aria-label="More options for ${escapeAttr(h.name)}" onclick="openStatusModal('${jsEscape(h.id)}')">•••</button></div><div class="do-next-row">${visualHTML(h,"do-next-icon")}<div class="do-next-copy"><div class="do-next-title">${escapeHTML(h.name)}</div><div class="do-next-detail">${escapeHTML(detail)}</div></div></div>${blockNote}<div class="do-next-actions"><button class="do-next-btn primary" onclick="homeLogStatus('${jsEscape(h.id)}','${primaryStatus}')">✓ Done</button>${easierBtn}</div>`;
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
  const meta=nudges.length?`${nudges.length} to reach out`:personTiming(top).label;
  const row=`<div class="home-widget-row">${visualHTML(top,"home-widget-avatar","person")}<span class="home-widget-row-name">${escapeHTML(top.name)}</span></div>`;
  return `<button type="button" class="home-widget" onclick="switchView('circleView')"><div class="home-widget-head"><span class="home-widget-title"><span class="home-widget-icon peach">${iconSVG("heart")}</span>My Circle</span><span class="home-widget-meta">${escapeHTML(meta)}${CHEVRON_SVG}</span></div>${row}</button>`;
}
