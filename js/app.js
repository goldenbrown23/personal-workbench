function renderAll(){ renderHome(); renderToday(); renderWeek(); renderManage(); renderCircle(); renderManagePeople(); renderSettings(); renderPractice(); }

// The tab strip's own DOM order IS the swipe sequence (Home → Habits → My Circle →
// Trends → Settings today) — reading it live instead of hardcoding view ids means a
// future 6th tab is picked up automatically, no second list to keep in sync.
const PRIMARY_TAB_VIEWS=[...document.querySelectorAll(".tabbar .tab")].map(b=>b.dataset.view);

function switchView(viewId){
  if(!document.getElementById(viewId)) viewId="homeView";
  const prevViewId=document.querySelector(".view.active")?.id;
  const prevIndex=PRIMARY_TAB_VIEWS.indexOf(prevViewId),nextIndex=PRIMARY_TAB_VIEWS.indexOf(viewId);
  // Only two adjacent primary tabs get a direction — jumping in from a non-tab screen
  // (Guide, Weekly Detail) or re-selecting the same tab stays a plain, instant swap.
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
  const activeTab=document.querySelector(`.tab[data-view="${viewId}"]`);
  // Keeps the selected tab visible once the strip has more tabs than fit — a no-op today
  // since 5 tabs never overflow, block:"nearest" keeps this from ever nudging page scroll.
  activeTab?.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
  localStorage.setItem(VIEW_KEY,viewId);
  window.scrollTo({top:0,behavior:"auto"});
  if(viewId==="weekView") renderWeek();
  if(viewId==="circleView") renderCircle();
  if(viewId==="homeView") renderHome();
  if(viewId==="settingsView") renderSettings();
  if(viewId==="practiceView") renderPractice();
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
  swipeTracking={startX:touch.clientX,startY:touch.clientY,startTime:Date.now()};
}
function onSwipeEnd(e){
  const start=swipeTracking;
  swipeTracking=null;
  if(!start) return;
  const touch=e.changedTouches[0];
  if(!touch) return;
  const dx=touch.clientX-start.startX,dy=touch.clientY-start.startY,dt=Date.now()-start.startTime;
  if(dt>SWIPE_MAX_DURATION) return;
  if(Math.abs(dx)<SWIPE_MIN_DIST) return;
  // Off-axis guard: a mostly-vertical drag (ordinary page scrolling) never counts,
  // however far it travels horizontally along the way.
  if(Math.abs(dy)>Math.abs(dx)*SWIPE_MAX_OFF_AXIS_RATIO) return;
  const currentViewId=document.querySelector(".view.active")?.id;
  const currentIndex=PRIMARY_TAB_VIEWS.indexOf(currentViewId);
  if(currentIndex===-1) return;
  const nextIndex=currentIndex+(dx<0?1:-1); // swipe left → next tab, swipe right → previous tab
  if(nextIndex<0||nextIndex>=PRIMARY_TAB_VIEWS.length) return; // no wrap past either end
  switchView(PRIMARY_TAB_VIEWS[nextIndex]);
}
function onSwipeCancel(){ swipeTracking=null; }
const swipeSurface=document.querySelector(".app");
if(swipeSurface){
  swipeSurface.addEventListener("touchstart",onSwipeStart,{passive:true});
  swipeSurface.addEventListener("touchend",onSwipeEnd,{passive:true});
  swipeSurface.addEventListener("touchcancel",onSwipeCancel,{passive:true});
}

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
