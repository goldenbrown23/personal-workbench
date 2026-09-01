function renderAll(){ renderHome(); renderToday(); renderWeek(); renderManage(); renderCircle(); renderManagePeople(); renderSettings(); renderPractice(); }

function switchView(viewId){
  if(!document.getElementById(viewId)) viewId="homeView";
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===viewId));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===viewId));
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
