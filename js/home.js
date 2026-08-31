function renderHome(){
  const now=new Date(),hour=now.getHours();
  renderBackupReminder();
  document.getElementById("homeDate").textContent=fmtLong(now);
  document.getElementById("homeGreeting").textContent=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const gentle=gentleDayOn();
  const homeSub=gentle?dailyCopy("gentle-home",["Gentle day is on. Smaller still counts.","Keep today light. Contact matters more than completion.","Only the smallest useful step needs your attention."]):hour<6||hour>=22?dailyCopy("late-home",["It is late. Keep this brief and kind.","Nothing here needs to become a midnight project.","Only what helps you close the day gently."]):hour<12?dailyCopy("morning-home",["Only what is useful this morning. The rest can stay quiet.","Start with one helpful thing—not the whole day.","A calm beginning is enough."]):hour<17?dailyCopy("afternoon-home",["Only what still helps today. Leave the rest alone.","You do not have to rescue the whole day.","One useful next move is enough."]):dailyCopy("evening-home",["Let the day get smaller from here.","Only what supports tonight. The rest can wait.","Close a loop if it helps—then be done."]);
  document.getElementById("homeSub").textContent=homeSub;
  const scheduled=state.habits.filter(h=>habitAppliesToday(h)),logged=scheduled.filter(h=>getStatus(h.id)).length,unlogged=scheduled.filter(h=>!getStatus(h.id));
  document.getElementById("habitHomeMeta").textContent=scheduled.length?`${logged} of ${scheduled.length} checked in today`:state.habits.length?"Nothing scheduled today":"No habits yet";
  document.getElementById("habitHomeProgress").style.width=scheduled.length?`${Math.round(logged/scheduled.length*100)}%`:"0%";
  const peopleMeta=state.people.map(p=>({person:p,timing:personTiming(p)}));
  const nudges=peopleMeta.filter(x=>["due","soon"].includes(x.timing.class));
  document.getElementById("circleHomeMeta").textContent=state.people.length?(nudges.length?`${nudges.length} gentle check-in${nudges.length===1?"":"s"} on your radar`:`${state.people.length} people · nothing pressing`):"Add only the people you intentionally want to keep close";

  const homeNow=document.getElementById("homeNow");
  const returnHabit=unlogged.find(h=>wasMissedPreviousRecordedDay(h.id));
  const nextHabit=returnHabit||unlogged[0];
  const weeklyHabit=state.habits.find(h=>(h.scheduleType||"daily")==="weekly"&&weeklyProgress(h)<Number(h.weeklyTarget||1));
  const personNudge=nudges.sort((a,b)=>(a.timing.class==="due"?0:1)-(b.timing.class==="due"?0:1))[0];
  homeNow.classList.remove("quiet");
  if(nextHabit){
    const isReturn=Boolean(returnHabit&&returnHabit.id===nextHabit.id);
    const detail=isReturn?dailyCopy("habit-return",isReduceGoal(nextHabit)?["The next choice is a return—not a restart.","Going over once does not cancel the plan.","Come back with the next choice, not a new week."]:["You’re continuing—not starting over.","Coming back is the practice. Nothing needs restarting.","This is a return, not a reset."]):gentle?goalCue(nextHabit,true):(nextHabit.full||dailyCopy("habit-next",isReduceGoal(nextHabit)?["Stay within the plan you chose for today.","The goal is less—not perfect avoidance.","One intentional choice can change today’s total."]:["One small check-in is enough to create movement.","Start with this one thing. You can decide what comes next afterward.","A little contact is more useful than waiting for the perfect moment."]));
    const mode=isReturn?"return":gentle?"gentle":"done";
    homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Right now</span><span class="home-now-state">${isReduceGoal(nextHabit)?"Reduce":"Habit"}</span></div><div class="home-now-main">${visualHTML(nextHabit,"home-now-icon")}<span class="home-now-copy"><span class="home-now-title">${escapeHTML(nextHabit.name)}</span><span class="home-now-detail">${escapeHTML(detail)}</span></span></div><button class="home-now-action" onclick="quickCompleteHabit('${jsEscape(nextHabit.id)}')">${habitActionLabel(nextHabit,mode)}</button>`;
  }else if(personNudge){
    const p=personNudge.person;
    const detail=dailyCopy("circle-nudge",["An opportunity to reconnect—not something overdue.","A small hello is enough. This does not need to become a long conversation.","Connection can be simple: one message, no perfect wording required."]);
    homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Right now</span><span class="home-now-state">Circle</span></div><div class="home-now-main">${visualHTML(p,"home-now-icon","💛")}<span class="home-now-copy"><span class="home-now-title">A small hello to ${escapeHTML(p.name)}</span><span class="home-now-detail">${escapeHTML(detail)}</span></span></div><button class="home-now-action" onclick="openContactModal('${jsEscape(p.id)}')">💬 Log a connection</button>`;
  }else if(weeklyHabit){
    const detail=dailyCopy("weekly-room",[`${scheduleLabel(weeklyHabit)}. There is still room in the week.`,`${scheduleLabel(weeklyHabit)}. It does not have to happen all at once.`,`${scheduleLabel(weeklyHabit)}. Choose a day that gives it some breathing room.`]);
    homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Right now</span><span class="home-now-state">This week</span></div><div class="home-now-main">${visualHTML(weeklyHabit,"home-now-icon")}<span class="home-now-copy"><span class="home-now-title">${escapeHTML(weeklyHabit.name)}</span><span class="home-now-detail">${escapeHTML(detail)}</span></span></div><button class="home-now-action" onclick="openHabitScope('week')">View this week</button>`;
  }else{
    homeNow.classList.add("quiet");
    const quietTitle=dailyCopy("quiet-title",["Nothing is pressing","You are allowed to be done","The Workbench is quiet"]),quietDetail=dailyCopy("quiet-detail",["You can leave without finding more work to do.","No new task needs to be invented right now.","Let the empty space stay empty."]);
    homeNow.innerHTML=`<div class="home-now-top"><span class="home-now-label">Right now</span><span class="home-now-state">Quiet</span></div><div class="home-now-main"><span class="home-now-icon">🍃</span><span class="home-now-copy"><span class="home-now-title">${escapeHTML(quietTitle)}</span><span class="home-now-detail">${escapeHTML(quietDetail)}</span></span></div>`;
  }
}
function openHabitScope(scope){habitScope=scope;localStorage.setItem("personal_workbench_habit_filter",scope);switchView("todayView");renderToday()}
