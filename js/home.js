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
function mostRecentPersonId(){
  if(!state.people.length) return null;
  return [...state.people].sort((a,b)=>(b.lastContact||"").localeCompare(a.lastContact||""))[0].id;
}

function renderHome(){
  const now=new Date(),period=currentTimePeriod(now.getHours());
  document.getElementById("homeDate").textContent=fmtLong(now);
  document.getElementById("homeGreeting").textContent=PERIOD_GREETING[period];
  const gentle=gentleDayOn();
  document.getElementById("homeSub").textContent=gentle?"Gentle day is on. Smaller still counts.":PERIOD_COPY[period];

  const scheduled=state.habits.filter(h=>habitAppliesToday(h)),logged=scheduled.filter(h=>getStatus(h.id)).length;
  document.getElementById("habitHomeMeta").textContent=scheduled.length?`${logged} of ${scheduled.length} checked in today`:state.habits.length?"Nothing scheduled today":"No habits yet";
  document.getElementById("habitHomeProgress").style.width=scheduled.length?`${Math.round(logged/scheduled.length*100)}%`:"0%";
  const peopleMeta=state.people.map(p=>({person:p,timing:personTiming(p)}));
  const nudges=peopleMeta.filter(x=>["due","soon"].includes(x.timing.class));
  document.getElementById("circleHomeMeta").textContent=state.people.length?(nudges.length?`${nudges.length} gentle check-in${nudges.length===1?"":"s"} on your radar`:`${state.people.length} people · nothing pressing`):"Add only the people you intentionally want to keep close";

  const shown=renderStartHere(period,gentle,nudges);
  renderHomeQuickActions(period);
  document.getElementById("backupNudge").classList.toggle("show",backupIsDue()&&shown!=="backup");
}

function renderStartHere(period,gentle,nudges){
  const homeNow=document.getElementById("homeNow");
  homeNow.classList.remove("quiet");
  homeNow.classList.toggle("gentle",gentle);

  const pick=pickStartHereHabit(period);
  if(pick){
    const h=pick.habit,countText=whatCountsText(h)||"A tiny check-in counts.",labels=focusActionLabels(h);
    const blockNote=pick.isCurrentBlock?"":`<div class="home-now-block-note">Nothing left from ${escapeHTML(BLOCK_LABEL[period]||"now")}, so here’s one from ${escapeHTML(BLOCK_LABEL[pick.block]||"elsewhere")} instead.</div>`;
    let detail;
    if(pick.isReturn) detail=isReduceGoal(h)?"The next choice is a return—not a restart.":"This is a return—not a restart.";
    else if(gentle) detail="Doing less still keeps the connection.";
    else detail=h.full||goalCue(h,false);
    const actionsHTML=gentle
      ? `<button class="home-now-action" onclick="setStatus('${jsEscape(h.id)}','counted')">${labels.primary}</button>`
      : `<div class="focus-actions"><button class="btn primary" onclick="setStatus('${jsEscape(h.id)}','counted')">${labels.primary}</button><div class="focus-secondary-row"><button class="btn" onclick="setStatus('${jsEscape(h.id)}','done')">${labels.done}</button><button class="btn" onclick="setStatus('${jsEscape(h.id)}','miss')">${labels.miss}</button><button class="btn focus-more-btn" aria-label="More options for ${escapeAttr(h.name)}" onclick="openStatusModal('${jsEscape(h.id)}')">⋯</button></div></div>`;
    homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Start here</span><span class="home-now-state">${isReduceGoal(h)?"Reduce":"Habit"}</span></div><div class="home-now-main">${visualHTML(h,"home-now-icon")}<div class="home-now-copy"><div class="home-now-title">${escapeHTML(h.name)}</div><div class="home-now-detail">${escapeHTML(detail)}</div></div></div>${blockNote}<div class="home-now-count-line"><strong>What counts right now:</strong> ${escapeHTML(countText)}</div>${actionsHTML}`;
    return "habit";
  }

  const personNudge=nudges.sort((a,b)=>(a.timing.class==="due"?0:1)-(b.timing.class==="due"?0:1))[0];
  if(personNudge){
    const p=personNudge.person;
    homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Start here</span><span class="home-now-state">Circle</span></div><div class="home-now-main">${visualHTML(p,"home-now-icon","person")}<div class="home-now-copy"><div class="home-now-title">A small hello to ${escapeHTML(p.name)}</div><div class="home-now-detail">An opportunity to reconnect—not something overdue.</div></div></div><button class="home-now-action" onclick="openContactModal('${jsEscape(p.id)}')">💬 Log a connection</button>`;
    return "circle";
  }

  const weeklyHabit=state.habits.find(h=>(h.scheduleType||"daily")==="weekly"&&weeklyProgress(h)<Number(h.weeklyTarget||1));
  if(weeklyHabit){
    homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Start here</span><span class="home-now-state">This week</span></div><div class="home-now-main">${visualHTML(weeklyHabit,"home-now-icon")}<div class="home-now-copy"><div class="home-now-title">${escapeHTML(weeklyHabit.name)}</div><div class="home-now-detail">${escapeHTML(scheduleLabel(weeklyHabit))}. There is still room in the week.</div></div></div><button class="home-now-action" onclick="openHabitScope('week')">View this week</button>`;
    return "weekly";
  }

  if(backupIsDue()){
    homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Start here</span><span class="home-now-state">Backup</span></div><div class="home-now-main"><span class="home-now-icon">☁️</span><div class="home-now-copy"><div class="home-now-title">Keep a copy of your Workbench</div><div class="home-now-detail">A quick backup protects what you’ve added on this device.</div></div></div><div class="home-now-empty-actions"><button class="btn" onclick="document.getElementById('backupLaterBtn').click()">Later</button><button class="btn primary" onclick="exportBackup()">Back up</button></div>`;
    return "backup";
  }

  homeNow.classList.add("quiet");
  const dumpId=mostRecentPersonId();
  homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Start here</span><span class="home-now-state">Quiet</span></div><div class="home-now-main"><span class="home-now-icon">🍃</span><div class="home-now-copy"><div class="home-now-title">Nothing urgent right now.</div><div class="home-now-detail">You can close the app.</div></div></div><div class="home-now-empty-actions"><button class="btn" onclick="switchView('todayView')">View habits</button>${dumpId?`<button class="btn" onclick="openPersonNote('${jsEscape(dumpId)}')">📝 Dump thought</button>`:""}</div>`;
  return "empty";
}

function renderHomeQuickActions(period){
  const dock=document.getElementById("homeActionDock");
  if(!dock) return;
  const gentle=gentleDayOn();
  const buttons=[];
  if(period==="morning"){
    buttons.push({icon:"🌅",label:"Morning habits",note:"",action:"switchView('todayView')"});
    const tiny=pickHabitForBlock("morning")?.habit;
    if(tiny) buttons.push({icon:"🌱",label:"Count a tiny win",note:escapeHTML(tiny.name),action:`setStatus('${jsEscape(tiny.id)}','counted')`});
    buttons.push({icon:"💬",label:"Log contact",note:"",action:"openContactModal()"});
  }else if(period==="afternoon"){
    buttons.push({icon:"☀️",label:"Afternoon habits",note:"",action:"switchView('todayView')"});
    buttons.push({icon:"🌿",label:gentle?"Gentle day is on":"Reset with Gentle Day",note:"",action:`setGentleDay(${!gentle})`});
    buttons.push({icon:"💬",label:"Log contact",note:"",action:"openContactModal()"});
  }else{
    buttons.push({icon:"🌙",label:period==="late-night"?"Tonight’s habits":"Evening habits",note:"",action:"switchView('todayView')"});
    const dumpId=mostRecentPersonId();
    if(dumpId) buttons.push({icon:"📝",label:"Dump thought",note:"Quick note",action:`openPersonNote('${jsEscape(dumpId)}')`});
    buttons.push({icon:"💬",label:"Log contact",note:"",action:"openContactModal()"});
  }
  dock.innerHTML=buttons.map(b=>`<button class="dock-action" onclick="${b.action}">${b.icon} ${b.label}${b.note?`<span>${b.note}</span>`:""}</button>`).join("");
}

function openHabitScope(scope){habitScope=scope;localStorage.setItem("personal_workbench_habit_filter",scope);switchView("todayView");renderToday()}
