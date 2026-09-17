// Habit Log isn't a primary tab, so unlike the views above it's normally only rendered on
// entry (see switchView's viewId==="habitLogView" branch) — but its own rows can trigger a
// mutation (tap a row to edit, delete a past log) without ever leaving the view, so it must
// also re-render here when it's the one currently on screen, or an edit/delete made from
// inside it goes stale until the user navigates away and back.
function renderAll(){ renderHome(); renderToday(); renderWeek(); renderManage(); renderCircle(); renderManagePeople(); renderSettings(); renderPractice(); renderMoreModules(); if(document.getElementById("habitLogView")?.classList.contains("active")) renderHabitLog(); hydrateAvatarPhotos(); }

// The tab strip's own DOM order drives both the tap-transition direction and swipe
// navigation (Home → Habits → My Circle → Trends → More) — reading it live instead of
// hardcoding view ids means a future tab is picked up automatically on both. Swipe covers
// every primary tab, More included, so swiping past Trends reaches it exactly like tapping
// it would; only non-tab screens reached by tapping in (Settings, Weekly Detail, modals)
// are excluded, via SWIPE_VIEWS.indexOf(currentViewId)===-1 in finishSwipe() below.
const PRIMARY_TAB_VIEWS=[...document.querySelectorAll(".tabbar .tab")].map(b=>b.dataset.view);
const SWIPE_VIEWS=PRIMARY_TAB_VIEWS;

// ---- "Your Workbench" (More) — a registry, not a hardcoded list, so a future module
// only ever needs a new entry here plus its own view; it never has to become a bottom
// tab. `pinned` reordering is real (persisted in state.settings.pinnedModules) but the
// pin control itself only renders once there's more than one module to reorder — with a
// single module, pinning has nothing to do, and showing the control anyway would just be
// clutter in what's supposed to read as a clean, calm screen.
const WORKBENCH_MODULES=[
  {id:"settings", view:"settingsView", label:"Settings", note:"Personalize, backup, and privacy", icon:"gear", tone:"gray"}
];
function moduleIconSVG(name){
  if(name==="gear") return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  return "";
}
function toggleModulePin(id){
  const pinned=state.settings.pinnedModules||(state.settings.pinnedModules=[]);
  const at=pinned.indexOf(id);
  if(at>-1) pinned.splice(at,1); else pinned.push(id);
  saveState();
  renderMoreModules();
}
function renderMoreModules(){
  const wrap=document.getElementById("moreModuleList");
  if(!wrap) return;
  const pinned=state.settings?.pinnedModules||[];
  const ordered=[...WORKBENCH_MODULES].sort((a,b)=>{
    const ai=pinned.indexOf(a.id),bi=pinned.indexOf(b.id);
    if(ai===-1&&bi===-1) return 0;
    if(ai===-1) return 1;
    if(bi===-1) return -1;
    return ai-bi;
  });
  const showPin=WORKBENCH_MODULES.length>1;
  wrap.innerHTML=ordered.map(m=>{
    const isPinned=pinned.includes(m.id);
    const pinBtn=showPin?`<button type="button" class="settings-list-pin ${isPinned?"pinned":""}" aria-label="${isPinned?"Unpin":"Pin"} ${escapeAttr(m.label)}" onclick="event.stopPropagation();toggleModulePin('${jsEscape(m.id)}')"><svg viewBox="0 0 24 24" fill="${isPinned?"currentColor":"none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l2.5 6.5L21 9l-5.5 4.5L17 20l-5-3.5L7 20l1.5-6.5L3 9l6.5-.5Z"></path></svg></button>`:"";
    return `<button type="button" class="settings-list-item-btn" onclick="switchView('${jsEscape(m.view)}')"><span class="settings-list-icon tone-${m.tone}" aria-hidden="true">${moduleIconSVG(m.icon)}</span><span class="settings-list-copy"><strong>${escapeHTML(m.label)}</strong><small>${escapeHTML(m.note)}</small></span>${pinBtn}<span class="settings-list-chevron" aria-hidden="true">›</span></button>`;
  }).join("");
}

// Notes (More → Notes) is a READ-only aggregated view over notes that already live on
// their original records — habit log entries' own .note field, an interaction's own
// .note field, and a person's own .notes[] memories. Nothing here is a second copy: it
// just collects and displays what's already stored elsewhere, sorted by date.
let notesFilter="all";
const NOTES_DAYS_STEP=20;
let notesDaysShown=NOTES_DAYS_STEP;
function collectNotesByDate(){
  const byDate={};
  const add=(key,event)=>{ if(!key) return; (byDate[key]||(byDate[key]=[])).push(event); };
  Object.entries(state.logs||{}).forEach(([key,entries])=>{
    Object.entries(entries||{}).forEach(([habitId,entry])=>{
      if(!entry?.note) return;
      const h=state.habits.find(x=>x.id===habitId);
      add(key,{type:"habit",title:h?h.name:"Habit",note:entry.note,icon:"📝"});
    });
  });
  state.people.forEach(p=>{
    (p.interactions||[]).forEach(item=>{
      if(!item.note) return;
      add(item.date,{type:"circle",title:p.name,note:item.note,icon:"📝"});
    });
    (p.notes||[]).forEach(n=>{
      if(!n.text) return;
      add(n.createdAt?dateKey(new Date(n.createdAt)):dateKey(),{type:"circle",title:p.name,note:n.text,icon:"📝"});
    });
  });
  return byDate;
}
function renderNotesView(){
  const list=document.getElementById("notesList");if(!list)return;
  const byDate=collectNotesByDate();
  const keys=Object.keys(byDate).filter(k=>byDate[k].some(e=>notesFilter==="all"||e.type===notesFilter)).sort((a,b)=>b.localeCompare(a));
  if(!keys.length){
    const emptyText=notesFilter==="habit"?"No habit notes yet.":notesFilter==="circle"?"No My Circle notes yet.":"No notes yet. Notes you add to habits or people will show up here.";
    list.innerHTML=`<div class="history-quiet-run">${escapeHTML(emptyText)}</div>`;
    return;
  }
  const shownKeys=keys.slice(0,notesDaysShown);
  const rows=shownKeys.map(key=>{
    const events=byDate[key].filter(e=>notesFilter==="all"||e.type===notesFilter);
    const date=parseLocalDate(key);
    return `<details class="history-day" open><summary><span class="history-day-label">${escapeHTML(reviewDateLabel(date))}</span><span class="history-day-count">${events.length}</span></summary><div class="history-day-body">${events.map(historyItemHTML).join("")}</div></details>`;
  }).join("");
  const moreDays=keys.length-shownKeys.length;
  list.innerHTML=rows+(moreDays>0?`<button type="button" class="history-show-more" id="notesShowMoreDays">Show ${moreDays} earlier day${moreDays===1?"":"s"}</button>`:"");
  document.getElementById("notesShowMoreDays")?.addEventListener("click",()=>{notesDaysShown+=NOTES_DAYS_STEP;renderNotesView();});
}
function setNotesFilter(type){
  notesFilter=type;
  document.querySelectorAll("[data-notes-filter-pill]").forEach(item=>{const active=item.dataset.notesFilterPill===type;item.classList.toggle("active",active);item.setAttribute("aria-selected",String(active));});
  renderNotesView();
}
document.querySelectorAll("[data-notes-filter-pill]").forEach(button=>button.addEventListener("click",()=>setNotesFilter(button.dataset.notesFilterPill)));

function switchView(viewId){
  if(!document.getElementById(viewId)) viewId="homeView";
  const prevViewId=document.querySelector(".view.active")?.id;
  const prevIndex=PRIMARY_TAB_VIEWS.indexOf(prevViewId),nextIndex=PRIMARY_TAB_VIEWS.indexOf(viewId);
  // Only two adjacent primary tabs get a direction — jumping in from a non-tab screen
  // (Guide, Settings, Weekly Detail) or re-selecting the same tab stays a plain, instant swap.
  const direction=(prevIndex>-1&&nextIndex>-1&&prevIndex!==nextIndex)?(nextIndex>prevIndex?"next":"prev"):null;
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===viewId));
  document.querySelectorAll(".view").forEach(v=>{
    v.classList.remove("slide-from-right","slide-from-left");
    const willBeActive=v.id===viewId;
    v.classList.toggle("active",willBeActive);
    if(willBeActive&&direction){
      void v.offsetWidth; // restart the animation even if the same class was left over
      const cls=direction==="next"?"slide-from-right":"slide-from-left";
      v.classList.add(cls);
      // Clean up once the transition finishes rather than leaving it until the tab is
      // next switched away from — a class that lingers is one animation-end tweak away
      // from silently reintroducing containing-block bugs for any position:fixed content
      // rendered inside this view in the meantime (see the .floating-menu-panel note).
      v.addEventListener("animationend",()=>v.classList.remove(cls),{once:true});
    }
  });
  localStorage.setItem(VIEW_KEY,viewId);
  window.scrollTo({top:0,behavior:"auto"});
  // Entering Habits from a DIFFERENT view re-picks the daypart tab for the current time
  // (see defaultHabitsBlock() in habits.js) — but re-selecting Habits while already on it
  // (e.g. a stray click, or a rerender that happens to pass through here) must never
  // clobber a manual Morning/Afternoon/Evening choice made during this Habits visit.
  if(viewId==="todayView"){ if(prevViewId!==viewId) habitsSelectedBlock=defaultHabitsBlock(); renderToday(); }
  if(viewId==="weekView") renderWeek();
  if(viewId==="circleView") renderCircle();
  if(viewId==="homeView") renderHome();
  if(viewId==="settingsView") renderSettings();
  if(viewId==="practiceView") renderPractice();
  if(viewId==="moreView") renderMoreModules();
  if(viewId==="habitLogView") renderHabitLog();
  if(viewId==="circleMomentsView") renderCircleMoments();
  if(viewId==="notesView") renderNotesView();
  // Each branch above rebuilds a view's markup outside the main renderAll() pass, so any
  // freshly-created avatar spans need their own hydrate call — otherwise a photo only ever
  // loads for whichever render happened to run last through renderAll().
  hydrateAvatarPhotos();
  if(viewId==="aboutView"&&!state.settings.guideOpened){state.settings.guideOpened=true;saveState();}
}
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
document.querySelectorAll("[data-jump]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.jump)));

// ---- Swipe-to-switch-tabs ----
// Deliberately a plain gesture read, not a finger-tracked drag: we only ever call the
// existing switchView() once, after touchend, so there is exactly one navigation path
// (tap or swipe) and no parallel "half-open" view state to keep consistent.
// Every listener stays passive (no preventDefault, anywhere) so this can never swallow
// iOS Safari/PWA's own edge-swipe-back gesture or block ordinary page scrolling.
const SWIPE_IGNORE_SELECTOR='.segmented, .filter-row, .date-chip-row, .weekday-picker, .week-nav, .calendar-grid, .contact-calendar, .tag-picker-grid, input[type="range"], [data-swipe-ignore]';
const SWIPE_MIN_DIST=56,SWIPE_MAX_OFF_AXIS_RATIO=0.55,SWIPE_MAX_DURATION=700,SWIPE_EDGE_GUARD=24;
let swipeTracking=null;
function elementIsHorizontallyScrollable(el){
  for(let node=el;node&&node!==document.body;node=node.parentElement){
    if(node.scrollWidth>node.clientWidth+1){
      const overflowX=getComputedStyle(node).overflowX;
      if(overflowX==="auto"||overflowX==="scroll") return true;
    }
  }
  return false;
}
function onSwipeStart(e){
  swipeTracking=null;
  if(e.touches.length!==1) return;
  if(document.body.classList.contains("sheet-open")) return; // a modal/sheet is open — never steal its gestures
  const touch=e.touches[0];
  // iOS's own back-swipe starts from the very edge of the screen — never begin tracking
  // there, so our gesture can't out-compete (or accidentally cancel) the system one.
  if(touch.clientX<SWIPE_EDGE_GUARD||touch.clientX>window.innerWidth-SWIPE_EDGE_GUARD) return;
  const target=e.target;
  if(target.closest && target.closest(SWIPE_IGNORE_SELECTOR)) return;
  if(elementIsHorizontallyScrollable(target)) return;
  swipeTracking={startX:touch.clientX,startY:touch.clientY,lastX:touch.clientX,lastY:touch.clientY,startTime:Date.now()};
}
function onSwipeMove(e){
  if(!swipeTracking) return;
  const touch=e.touches[0];
  if(!touch) return;
  swipeTracking.lastX=touch.clientX;
  swipeTracking.lastY=touch.clientY;
}
function finishSwipe(endX,endY){
  const start=swipeTracking;
  swipeTracking=null;
  if(!start) return;
  const dx=endX-start.startX,dy=endY-start.startY,dt=Date.now()-start.startTime;
  if(dt>SWIPE_MAX_DURATION) return;
  if(Math.abs(dx)<SWIPE_MIN_DIST) return;
  // Off-axis guard: a mostly-vertical drag (ordinary page scrolling) never counts,
  // however far it travels horizontally along the way.
  if(Math.abs(dy)>Math.abs(dx)*SWIPE_MAX_OFF_AXIS_RATIO) return;
  const currentViewId=document.querySelector(".view.active")?.id;
  const currentIndex=SWIPE_VIEWS.indexOf(currentViewId);
  if(currentIndex===-1) return; // not one of the five primary tabs (e.g. Settings/Weekly Detail) — swipe does nothing
  const nextIndex=currentIndex+(dx<0?1:-1); // swipe left → next tab, swipe right → previous tab
  if(nextIndex<0||nextIndex>=SWIPE_VIEWS.length) return; // no wrap past either end
  switchView(SWIPE_VIEWS[nextIndex]);
}
function onSwipeEnd(e){
  const touch=e.changedTouches[0];
  if(!touch){ swipeTracking=null; return; }
  finishSwipe(touch.clientX,touch.clientY);
}
// A drag that starts on a <button> (true for nearly everything on Home — the "Do this
// next" card and widget cards are both full buttons) commonly gets delivered as
// touchcancel, not touchend, once WebKit/Chromium decide the press shouldn't resolve to
// a click. Treating cancel as "gesture lost, don't navigate" silently broke swiping from
// almost anywhere on Home — so cancel is finished the same way end is, using the last
// touchmove position (touchcancel's own changedTouches coordinates aren't reliable).
function onSwipeCancel(e){
  const start=swipeTracking;
  if(!start){ swipeTracking=null; return; }
  finishSwipe(start.lastX,start.lastY);
}
// Wired to both the page content AND the tab bar itself — swiping directly over the nav
// strip cycles tabs the same way swiping the page does (same four-section limit, same
// touchcancel-on-button handling, since tab buttons have exactly the same drag-cancel
// quirk as any other button).
[document.querySelector(".app"),document.querySelector(".tabbar")].forEach(swipeSurface=>{
  if(!swipeSurface) return;
  swipeSurface.addEventListener("touchstart",onSwipeStart,{passive:true});
  swipeSurface.addEventListener("touchmove",onSwipeMove,{passive:true});
  swipeSurface.addEventListener("touchend",onSwipeEnd,{passive:true});
  swipeSurface.addEventListener("touchcancel",onSwipeCancel,{passive:true});
});

// ---- Shared floating-popover positioning (Trends' Filter, an interaction row's ••• menu,
// and any future <details class="floating-menu"> dropdown) ----
// One component, not a per-instance patch: every .floating-menu-panel is measured and
// placed here, in viewport (position:fixed) coordinates, never CSS-absolute against a
// scrolling ancestor — that mismatch is exactly what let a panel render underneath/behind
// the floating tab bar before. The tab bar's own live bounding rect (not a re-derived
// safe-area/nav-height calc()) is the hard lower boundary, so it's automatically correct
// on every device without duplicating that math in JS.
function positionFloatingPanel(trigger,panel){
  const margin=8;
  const triggerRect=trigger.getBoundingClientRect();
  const navEl=document.querySelector(".tabbar");
  const navTop=navEl?navEl.getBoundingClientRect().top:window.innerHeight;
  const bottomLimit=navTop-margin,topLimit=margin;
  // Measure the panel's natural size off-screen before deciding where (or whether) it fits.
  panel.style.visibility="hidden";
  panel.style.top="-9999px";panel.style.left="0px";panel.style.right="auto";panel.style.bottom="auto";
  const panelHeight=panel.offsetHeight,panelWidth=panel.offsetWidth;
  const spaceBelow=bottomLimit-triggerRect.bottom,spaceAbove=triggerRect.top-topLimit;
  let mode;
  if(panelHeight<=spaceBelow) mode="below";
  else if(panelHeight<=spaceAbove) mode="above";
  else mode="sheet"; // doesn't fit either way — hand off to the bottom-sheet fallback
  if(mode==="sheet"){ return mode; } // stays hidden — the sheet fallback takes over and this panel is never shown
  let top=mode==="below"?triggerRect.bottom+6:triggerRect.top-panelHeight-6;
  top=Math.max(topLimit,Math.min(top,bottomLimit-panelHeight));
  let left=triggerRect.right-panelWidth;
  left=Math.max(margin,Math.min(left,window.innerWidth-panelWidth-margin));
  panel.style.top=top+"px";panel.style.left=left+"px";
  panel.style.visibility="visible";
  return mode;
}
// Moves a panel's actual option buttons into the shared sheet (preserving their real
// onclick handlers/data attributes — no cloning, no second copy to keep in sync) and
// moves them back home when the sheet closes, so the source panel works again next time.
function openFloatingMenuSheet(panel,title){
  const sheet=document.getElementById("floatingMenuSheet");
  const list=document.getElementById("floatingMenuSheetList");
  document.getElementById("floatingMenuSheetTitle").textContent=title;
  list.innerHTML="";
  [...panel.children].forEach(child=>list.appendChild(child));
  // Every .modal-backdrop shares one z-index and stacks by DOM order — an interaction
  // menu lives inside Person Detail, so if that's already open and appears later in the
  // document it would otherwise bury this sheet instead of the other way around. Hide it
  // here (same pattern circle.js already uses for its own nested sheets) and restore it
  // when this one closes.
  const coveredParent=[...document.querySelectorAll(".modal-backdrop.show")].find(el=>el!==sheet);
  coveredParent?.classList.remove("show");
  const restore=()=>{
    [...list.children].forEach(child=>panel.appendChild(child));
    sheet.classList.remove("show");
    coveredParent?.classList.add("show");
    closeBtn.removeEventListener("click",restore);
    sheet.removeEventListener("click",onBackdropClick);
  };
  const closeBtn=document.getElementById("closeFloatingMenuSheet");
  const onBackdropClick=e=>{ if(e.target===sheet) restore(); };
  closeBtn.addEventListener("click",restore);
  sheet.addEventListener("click",onBackdropClick);
  list.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",restore,{once:true}));
  sheet.classList.add("show");
}
// "toggle" doesn't bubble, so this listener is registered on the CAPTURE phase — the
// standard way to delegate a non-bubbling event from a single ancestor listener, which is
// what lets this cover every current and future .floating-menu without re-wiring each one
// after a dynamic re-render (e.g. the interaction list rebuilding on every open).
document.addEventListener("toggle",e=>{
  const details=e.target;
  if(!(details instanceof HTMLDetailsElement)||!details.classList.contains("floating-menu")) return;
  if(!details.open){ delete details.dataset.floatingPlaced; return; }
  const trigger=details.querySelector("summary"),panel=details.querySelector(".floating-menu-panel");
  if(!trigger||!panel) return;
  if(positionFloatingPanel(trigger,panel)==="sheet"){
    details.removeAttribute("open");
    openFloatingMenuSheet(panel,details.dataset.sheetTitle||"Options");
    return;
  }
  // Marks the panel as actually placed. "toggle" is dispatched asynchronously, so between
  // the click opening <details> and this handler running, the browser may scroll the
  // summary into view — and the scroll listener below would otherwise read that as the
  // user scrolling and close the menu before it was ever positioned or shown.
  details.dataset.floatingPlaced="1";
},true);
document.addEventListener("click",e=>{
  document.querySelectorAll("details.floating-menu[open]").forEach(details=>{
    if(!details.contains(e.target)) details.removeAttribute("open");
  });
});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape") return;
  const open=document.querySelector("details.floating-menu[open]");
  if(open) open.removeAttribute("open");
});
// Capture phase so a scroll inside any container (a sheet's own .modal, a scrolling view)
// counts, not just the window — a position:fixed panel doesn't follow its trigger.
window.addEventListener("scroll",()=>{
  document.querySelectorAll("details.floating-menu[open]").forEach(details=>{
    if(details.dataset.floatingPlaced) details.removeAttribute("open");
  });
},{passive:true,capture:true});

const sheets=[...document.querySelectorAll(".modal-backdrop")];
const FOCUSABLE_SELECTOR='a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
function getFocusable(container){
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(el=>el.offsetParent!==null);
}
const modalOpeners=new WeakMap();
const shownSheets=new Set();
sheets.forEach(s=>{ s.setAttribute("aria-hidden","true"); s.setAttribute("inert",""); });
const sheetObserver=new MutationObserver(()=>{
  document.body.classList.toggle("sheet-open",sheets.some(s=>s.classList.contains("show")));
  sheets.forEach(s=>{
    const isShown=s.classList.contains("show"), wasShown=shownSheets.has(s);
    if(isShown&&!wasShown){
      shownSheets.add(s);
      s.removeAttribute("inert");s.removeAttribute("aria-hidden");
      modalOpeners.set(s,document.activeElement);
      const focusable=getFocusable(s);
      (focusable[0]||s).focus();
    }else if(!isShown&&wasShown){
      shownSheets.delete(s);
      s.setAttribute("aria-hidden","true");s.setAttribute("inert","");
      const opener=modalOpeners.get(s);
      if(opener&&document.body.contains(opener))opener.focus();
    }
  });
});
sheets.forEach(s=>sheetObserver.observe(s,{attributes:true,attributeFilter:["class"]}));
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){const open=sheets.filter(s=>s.classList.contains("show")).at(-1);if(open)open.querySelector(".icon-btn")?.click();return;}
  if(e.key==="Tab"){
    const open=sheets.filter(s=>s.classList.contains("show")).at(-1);
    if(!open)return;
    const focusable=getFocusable(open);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});

initUpdateWatcher();

applySettings();
renderAll();
const preferredStart=state.settings?.startScreen||"last";
switchView(preferredStart==="last"?(localStorage.getItem(VIEW_KEY)||"homeView"):preferredStart);
