function applySettings(){document.body.classList.toggle("compact",Boolean(state.settings?.compactMode));}
function renderSettings(){
  document.getElementById("startScreen").value=state.settings?.startScreen||"last";
  document.getElementById("compactMode").checked=Boolean(state.settings?.compactMode);
  document.getElementById("hapticsEnabled").checked=state.settings?.hapticsEnabled!==false;
  document.getElementById("backupReminderEnabled").checked=state.settings?.backupReminderEnabled!==false;
  document.getElementById("compactModeState").textContent=document.getElementById("compactMode").checked?"On":"Off";
  document.getElementById("hapticsEnabledState").textContent=document.getElementById("hapticsEnabled").checked?"On":"Off";
  document.getElementById("backupReminderEnabledState").textContent=document.getElementById("backupReminderEnabled").checked?"On":"Off";
  const last=state.settings?.lastBackupAt?new Date(state.settings.lastBackupAt):null;document.getElementById("backupStatus").textContent=last?`Last backup: ${fmtDate(last)}. A weekly copy is a good safety net.`:"No backup yet. After your first week, the Home screen will remind you gently.";
  document.getElementById("deviceStatus").textContent=("serviceWorker" in navigator)?"Offline support is available. Your data stays in this browser until you export or clear it.":"Your data stays in this browser. Offline support is limited on this device.";
  renderVersionInfo();
}
function openSettings(){switchView("settingsView");renderSettings();}
document.getElementById("settingsBtn").addEventListener("click",openSettings);
document.getElementById("startScreen").addEventListener("change",e=>{state.settings.startScreen=e.target.value;saveState();showSaved("Start screen saved")});
document.getElementById("compactMode").addEventListener("change",e=>{state.settings.compactMode=e.target.checked;applySettings();saveState();showSaved(e.target.checked?"Compact view on":"Comfortable view on")});
document.getElementById("hapticsEnabled").addEventListener("change",e=>{state.settings.hapticsEnabled=e.target.checked;saveState();showSaved(e.target.checked?"Gentle vibration on":"Gentle vibration off")});
document.getElementById("backupReminderEnabled").addEventListener("change",e=>{state.settings.backupReminderEnabled=e.target.checked;saveState();showSaved(e.target.checked?"Backup reminder on":"Backup reminder off")});
function backupIsDue(){if(state.settings?.backupReminderEnabled===false)return false;const now=Date.now(),remind=Date.parse(state.settings?.backupRemindAfter||"");if(Number.isFinite(remind)&&remind>now)return false;const anchor=Date.parse(state.settings?.lastBackupAt||state.settings?.firstUsedAt||new Date().toISOString());return now-anchor>=7*86400000}
function renderBackupReminder(){document.getElementById("backupNudge").classList.toggle("show",backupIsDue())}
function exportBackup(){
  state.settings.lastBackupAt=new Date().toISOString();state.settings.backupRemindAfter=null;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderAll();
  const backup={app:"Personal Workbench",exportedAt:state.settings.lastBackupAt,version:5,data:state};
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download=`personal-workbench-${dateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showSaved("Backup exported");
}
document.getElementById("exportDataBtn").addEventListener("click",exportBackup);document.getElementById("backupNowBtn").addEventListener("click",exportBackup);document.getElementById("backupLaterBtn").addEventListener("click",()=>{state.settings.backupRemindAfter=addDays(new Date(),3).toISOString();saveState();showSaved("We’ll remind you again in 3 days")});
document.getElementById("importDataBtn").addEventListener("click",()=>document.getElementById("importDataFile").click());
document.getElementById("importDataFile").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const parsed=JSON.parse(await file.text());const incoming=parsed.data||parsed;if(!Array.isArray(incoming.habits)||typeof incoming.logs!=="object"||!Array.isArray(incoming.people))throw new Error();const before=structuredClone(state);state={habits:incoming.habits.map(normalizeHabit),logs:incoming.logs,people:incoming.people.map(normalizePerson),dayNotes:(incoming.dayNotes&&typeof incoming.dayNotes==="object")?incoming.dayNotes:{},settings:{...defaultState.settings,...(incoming.settings||{}),lastBackupAt:new Date().toISOString(),backupRemindAfter:null}};applySettings();saveState();showSaved("Backup imported",before)}catch{showSaved("That file is not a valid Workbench backup")}
  e.target.value="";
});
const clearDataModal=document.getElementById("clearDataModal");
function openClearData(){clearDataModal.classList.add("show")}
function closeClearData(){clearDataModal.classList.remove("show")}
document.getElementById("clearDataBtn").addEventListener("click",openClearData);
document.getElementById("closeClearData").addEventListener("click",closeClearData);
document.getElementById("cancelClearData").addEventListener("click",closeClearData);
clearDataModal.addEventListener("click",e=>{if(e.target===clearDataModal)closeClearData()});
document.getElementById("clearHabitHistoryBtn").addEventListener("click",()=>{if(confirm("Clear habit history? This removes check-ins, day notes, and streak data, but keeps your habits and goal plans.")){const before=structuredClone(state);state.logs={};state.dayNotes={};closeClearData();saveState();showSaved("Habit history cleared",before)}});
document.getElementById("clearContactHistoryBtn").addEventListener("click",()=>{if(confirm("Clear Circle contact history? This removes last-contact dates and contact logs, but keeps people, notes, and profile details.")){const before=structuredClone(state);state.people=state.people.map(p=>({...p,lastContact:null,interactions:[]}));closeClearData();saveState();showSaved("Circle contact history cleared",before)}});
document.getElementById("resetDataBtn").addEventListener("click",()=>{if(confirm("Reset the entire Workbench? This removes habits, history, people, notes, and settings from this browser.")){state={habits:[],logs:{},people:[],dayNotes:{},settings:{...defaultState.settings,firstUsedAt:new Date().toISOString(),lastBackupAt:null,backupRemindAfter:null}};[METHOD_KEY,"personal_workbench_habit_filter",GENTLE_KEY].forEach(key=>localStorage.removeItem(key));habitScope="today";habitStatusFilter="any";applySettings();closeClearData();saveState();switchView("homeView");showSaved("Workbench reset")}});
