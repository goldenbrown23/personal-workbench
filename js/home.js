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
const BLOCK_SEARCH_ORDER={
  morning:["morning","afternoon","evening"],
  afternoon:["afternoon","evening","morning"],
  evening:["evening","afternoon","morning"],
  "late-night":["evening","morning","afternoon"]
};

function unloggedTodayHabitsInBlock(block){return state.habits.filter(h=>habitAppliesToday(h)&&timeBlockOf(h)===block&&!getStatus(h.id))}
function pickHabitForBlock(block){
  const candidates=unloggedTodayHabitsInBlock(block);
  if(!candidates.length) return null;
  const returnPick=candidates.find(h=>wasMissedPreviousRecordedDay(h.id));
  if(returnPick) return {habit:returnPick,isReturn:true};
  const withSmaller=candidates.find(h=>(h.small2||h.small||"").trim());
  if(withSmaller) return {habit:withSmaller,isReturn:false};
  return {habit:candidates[0],isReturn:false};
}
function pickStartHereHabit(period){
  const order=BLOCK_SEARCH_ORDER[period]||BLOCK_SEARCH_ORDER.morning;
  for(let i=0;i<order.length;i++){
    const pick=pickHabitForBlock(order[i]);
    if(pick) return {...pick,block:order[i],isCurrentBlock:period!=="late-night"&&i===0};
  }
  return null;
}
function renderHome(){
  const now=new Date(),period=currentTimePeriod(now.getHours());
  document.getElementById("homeDate").textContent=fmtLong(now);
  document.getElementById("homeGreeting").textContent=PERIOD_GREETING[period];
  const gentle=gentleDayOn();
  document.getElementById("homeSub").textContent=gentle?"Gentle day is on. Smaller still counts.":PERIOD_COPY[period];

  const nudges=state.people.map(p=>({person:p,timing:personTiming(p)})).filter(x=>["due","soon"].includes(x.timing.class));

  renderStartHere(period,gentle,nudges);
  renderHomeQuickActions(period);
}

// Debounce guard for Home's primary logging actions: setStatus() is fully synchronous
// (saveState -> renderAll happen inline), so a genuine double-click can't interleave —
// but iOS occasionally dispatches a duplicate/"ghost" tap as a separate event shortly
// after the real one, which this timestamp check absorbs without affecting normal taps.
let lastHomeActionAt=0;
function homeLogStatus(habitId,status){
  const now=Date.now();
  if(now-lastHomeActionAt<600) return;
  lastHomeActionAt=now;
  setStatus(habitId,status);
}

// The smallest configured version is what Start Here presents and what "I did it"
// must log — never a hardcoded status. Full only counts as "done" when it's the ONLY
// configured version (nothing smaller exists to present instead).
function homePrimaryTier(h){
  const bareMin=(h.small2||"").trim(),smaller=(h.small||"").trim(),full=(h.full||"").trim();
  if(bareMin) return {text:bareMin,status:"counted"};
  if(smaller) return {text:smaller,status:"counted"};
  if(full) return {text:full,status:"done"};
  return {text:"A tiny check-in counts.",status:"counted"};
}

// Home is a minimal launchpad, not a dashboard: Start Here shows exactly one
// natural-language detail line (the smallest defined version of the habit) and
// never falls back to a schedule label like "Daily" — that read as dashboard noise.
function renderStartHere(period,gentle,nudges){
  const homeNow=document.getElementById("homeNow");
  homeNow.classList.remove("quiet");
  homeNow.classList.toggle("gentle",gentle);

  const pick=pickStartHereHabit(period);
  if(pick){
    const h=pick.habit,tier=homePrimaryTier(h);
    const blockNote=pick.isCurrentBlock?"":`<div class="home-now-block-note">Nothing left from ${escapeHTML(BLOCK_LABEL[period]||"now")}, so here’s one from ${escapeHTML(BLOCK_LABEL[pick.block]||"elsewhere")} instead.</div>`;
    let detail,primaryStatus;
    if(pick.isReturn){ detail=isReduceGoal(h)?"The next choice is a return—not a restart.":"This is a return—not a restart."; primaryStatus=tier.status; }
    else if(gentle){ detail="Doing less still keeps the connection."; primaryStatus="counted"; }
    else{ detail=tier.text; primaryStatus=tier.status; }
    const hasVersions=Boolean(versionRowsForHabit(h).length);
    const secondaryRow=`<div class="home-now-secondary-row">${hasVersions?`<button class="home-now-link" onclick="openEasierVersion('${jsEscape(h.id)}')">Need an easier version?</button>`:"<span></span>"}<button class="home-now-overflow" aria-label="More options for ${escapeAttr(h.name)}" onclick="openStatusModal('${jsEscape(h.id)}')">•••</button></div>`;
    homeNow.innerHTML=`<div class="home-now-label">Start here</div><div class="home-now-main">${visualHTML(h,"home-now-icon")}<div class="home-now-copy"><div class="home-now-title">${escapeHTML(h.name)}</div><div class="home-now-detail">${escapeHTML(detail)}</div></div></div>${blockNote}<button class="home-now-action" onclick="homeLogStatus('${jsEscape(h.id)}','${primaryStatus}')">✓ I did it</button>${secondaryRow}`;
    return;
  }

  const personNudge=nudges.sort((a,b)=>(a.timing.class==="due"?0:1)-(b.timing.class==="due"?0:1))[0];
  if(personNudge){
    const p=personNudge.person;
    homeNow.innerHTML=`<div class="home-now-label">Start here</div><div class="home-now-main">${visualHTML(p,"home-now-icon","person")}<div class="home-now-copy"><div class="home-now-title">A small hello to ${escapeHTML(p.name)}</div><div class="home-now-detail">An opportunity to reconnect—not something overdue.</div></div></div><button class="home-now-action" onclick="openContactModal('${jsEscape(p.id)}')">💬 Log a connection</button>`;
    return;
  }

  homeNow.classList.add("quiet");
  homeNow.innerHTML=`<div class="home-now-label">Start here</div><div class="home-now-main"><span class="home-now-icon">🍃</span><div class="home-now-copy"><div class="home-now-title">Nothing urgent right now.</div><div class="home-now-detail">You can close the app.</div></div></div>`;
}

function renderHomeQuickActions(period){
  const dock=document.getElementById("homeActionDock");
  if(!dock) return;
  const habitsLabel=period==="morning"?"☀️ Morning habits":period==="afternoon"?"☀️ Afternoon habits":period==="late-night"?"🌙 Tonight’s habits":"🌙 Evening habits";
  dock.innerHTML=`<button class="dock-action" onclick="switchView('todayView')">${habitsLabel}</button><button class="dock-action" onclick="openContactModal()">💬 Log contact</button>`;
}
