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
  renderHomeQuickActions(period);
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

function renderHomeQuickActions(period){
  const dock=document.getElementById("homeActionDock");
  if(!dock) return;
  const habitsLabel=period==="morning"?"☀️ Morning habits":period==="afternoon"?"☀️ Afternoon habits":period==="late-night"?"🌙 Tonight’s habits":"🌙 Evening habits";
  dock.innerHTML=`<button class="dock-action" onclick="switchView('todayView')">${habitsLabel}</button><button class="dock-action" onclick="openContactModal()">💬 Log contact</button>`;
}
