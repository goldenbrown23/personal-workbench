function renderAll(){ renderHome(); renderToday(); renderWeek(); renderManage(); renderCircle(); renderManagePeople(); renderSettings(); renderPractice(); renderMoreModules(); }

// The tab strip's own DOM order drives the tap-transition direction (Home → Habits →
// My Circle → Trends → More) — reading it live instead of hardcoding view ids means a
// future tab is picked up automatically. Swipe is intentionally a SEPARATE, shorter list:
// only the four core sections, never "More" — Settings/future module screens are reached
// by tapping in, not by swiping past Trends.
const PRIMARY_TAB_VIEWS=[...document.querySelectorAll(".tabbar .tab")].map(b=>b.dataset.view);
const SWIPE_VIEWS=PRIMARY_TAB_VIEWS.filter(v=>v!=="moreView");

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
      v.classList.add(direction==="next"?"slide-from-right":"slide-from-left");
    }
  });
  localStorage.setItem(VIEW_KEY,viewId);
  window.scrollTo({top:0,behavior:"auto"});
  if(viewId==="weekView") renderWeek();
  if(viewId==="circleView") renderCircle();
  if(viewId==="homeView") renderHome();
  if(viewId==="settingsView") renderSettings();
  if(viewId==="practiceView") renderPractice();
  if(viewId==="moreView") renderMoreModules();
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
const SWIPE_IGNORE_SELECTOR='.practice-table-wrap, .segmented, .filter-row, .date-chip-row, .weekday-picker, .week-nav, .calendar-grid, .contact-calendar, .tag-picker-grid, input[type="range"], [data-swipe-ignore]';
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
  if(currentIndex===-1) return; // not one of the four core sections (e.g. Settings/More) — swipe does nothing
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
