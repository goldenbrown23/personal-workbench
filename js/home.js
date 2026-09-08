// The time-period model, the "what's next" picker (pickStartHereHabit), the shared
// action card (nowCardHTML), and the logging entry point (homeLogStatus/homePrimaryTier)
// all live in habits.js now — the Habits tab's "Now" section uses the exact same
// functions, so there is exactly one definition of "next" for the whole app.
function renderHome(){
  const now=new Date(),period=currentTimePeriod(now.getHours());
  document.getElementById("homeDate").textContent=fmtLong(now);
  document.getElementById("homeGreeting").textContent=PERIOD_GREETING[period];
  const gentle=gentleDayOn();
  document.getElementById("homeSub").textContent=gentle?"Gentle day is on. Smaller still counts.":PERIOD_COPY[period];

  const nudges=state.people.map(p=>({person:p,timing:personTiming(p)})).filter(x=>["due","soon"].includes(x.timing.class));

  renderStartHere(period,gentle,nudges);
  renderHomeWidgets(nudges);
}

// Home is a minimal launchpad, not a dashboard: Start Here renders the same shared
// action card the Habits tab's "Now" section uses (nowCardHTML, habits.js) — one
// completion interaction, not two independently maintained ones.
function renderStartHere(period,gentle,nudges){
  const homeNow=document.getElementById("homeNow");
  homeNow.classList.remove("quiet");
  homeNow.classList.toggle("gentle",gentle);

  const pick=pickStartHereHabit(period);
  if(pick){
    homeNow.innerHTML=nowCardHTML(pick,{label:"Start here",gentle,blockPeriod:period});
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

// Level 2 of Home's hierarchy — small read-only previews of what's useful right now,
// not a second copy of the Habits/Circle screens. Tapping "View" always routes through
// the existing switchView/openPersonDetail entry points, so this never becomes a second
// place habit/person data has to be kept in sync.
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
  const rows=today.slice(0,3).map(h=>{
    const status=getStatus(h.id);
    const dotClass=status==="done"?"done":status==="counted"?"counted":status==="returned"?"returned":status==="miss"?"miss":"";
    return `<div class="home-widget-row"><span class="home-widget-dot ${dotClass}"></span><span class="home-widget-row-name">${escapeHTML(h.name)}</span></div>`;
  }).join("");
  return `<div class="home-widget"><div class="home-widget-head"><span class="home-widget-title">🌿 Habits</span><span class="home-widget-count">${done.length} of ${today.length} today</span></div>${rows}<button class="home-widget-link" onclick="switchView('todayView')">View habits →</button></div>`;
}
function homeCircleWidgetHTML(nudges){
  if(!state.people.length) return "";
  const shown=[...nudges.map(x=>x.person),...state.people.filter(p=>!nudges.some(x=>x.person.id===p.id))].slice(0,2);
  const rows=shown.map(p=>`<div class="home-widget-row">${visualHTML(p,"home-widget-avatar","person")}<span class="home-widget-row-name">${escapeHTML(p.name)}</span><span class="home-widget-row-meta">${escapeHTML(personTiming(p).label)}</span></div>`).join("");
  return `<div class="home-widget"><div class="home-widget-head"><span class="home-widget-title">💛 My Circle</span></div>${rows}<button class="home-widget-link" onclick="switchView('circleView')">View circle →</button></div>`;
}
