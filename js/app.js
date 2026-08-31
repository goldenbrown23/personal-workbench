function renderAll(){ renderHome(); renderToday(); renderWeek(); renderManage(); renderCircle(); renderManagePeople(); renderSettings(); }

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
}
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
document.querySelectorAll("[data-jump]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.jump)));
document.getElementById("quickHabitBtn").addEventListener("click",()=>switchView("todayView"));
document.getElementById("quickContactBtn").addEventListener("click",()=>openContactModal());

const sheets=[...document.querySelectorAll(".modal-backdrop")];
const sheetObserver=new MutationObserver(()=>document.body.classList.toggle("sheet-open",sheets.some(s=>s.classList.contains("show"))));
sheets.forEach(s=>sheetObserver.observe(s,{attributes:true,attributeFilter:["class"]}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){const open=sheets.filter(s=>s.classList.contains("show")).at(-1);if(open)open.querySelector(".icon-btn")?.click();}});

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

applySettings();
renderAll();
const preferredStart=state.settings?.startScreen||"last";
switchView(preferredStart==="last"?(localStorage.getItem(VIEW_KEY)||"homeView"):preferredStart);
