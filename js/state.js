const STORAGE_KEY = "return_habit_tracker_v1";
const VIEW_KEY = "personal_workbench_last_view";
const METHOD_KEY = "personal_workbench_last_contact_method";
const WORKBENCH_ICONS={"heart":[["path",{"d":"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"}]],"sun":[["circle",{"cx":"12","cy":"12","r":"4"}],["path",{"d":"M12 2v2"}],["path",{"d":"M12 20v2"}],["path",{"d":"m4.93 4.93 1.41 1.41"}],["path",{"d":"m17.66 17.66 1.41 1.41"}],["path",{"d":"M2 12h2"}],["path",{"d":"M20 12h2"}],["path",{"d":"m6.34 17.66-1.41 1.41"}],["path",{"d":"m19.07 4.93-1.41 1.41"}]],"moon":[["path",{"d":"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"}]],"sparkles":[["path",{"d":"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"}],["path",{"d":"M20 2v4"}],["path",{"d":"M22 4h-4"}],["circle",{"cx":"4","cy":"20","r":"2"}]],"book":[["path",{"d":"M12 7v14"}],["path",{"d":"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"}]],"strength":[["path",{"d":"M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"}],["path",{"d":"m2.5 21.5 1.4-1.4"}],["path",{"d":"m20.1 3.9 1.4-1.4"}],["path",{"d":"M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"}],["path",{"d":"m9.6 14.4 4.8-4.8"}]],"water":[["path",{"d":"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"}],["path",{"d":"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"}]],"medicine":[["path",{"d":"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"}],["path",{"d":"m8.5 8.5 7 7"}]],"leaf":[["path",{"d":"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"}],["path",{"d":"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"}]],"coffee":[["path",{"d":"M10 2v2"}],["path",{"d":"M14 2v2"}],["path",{"d":"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"}],["path",{"d":"M6 2v2"}]],"phone":[["path",{"d":"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"}]],"people":[["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["path",{"d":"M16 3.128a4 4 0 0 1 0 7.744"}],["path",{"d":"M22 21v-2a4 4 0 0 0-3-3.87"}],["circle",{"cx":"9","cy":"7","r":"4"}]],"home":[["path",{"d":"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{"d":"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]],"mind":[["path",{"d":"M12 18V5"}],["path",{"d":"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"}],["path",{"d":"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"}],["path",{"d":"M17.997 5.125a4 4 0 0 1 2.526 5.77"}],["path",{"d":"M18 18a4 4 0 0 0 2-7.464"}],["path",{"d":"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"}],["path",{"d":"M6 18a4 4 0 0 1-2-7.464"}],["path",{"d":"M6.003 5.125a4 4 0 0 0-2.526 5.77"}]],"star":[["path",{"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"}]],"gift":[["path",{"d":"M12 7v14"}],["path",{"d":"M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"}],["path",{"d":"M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"}],["rect",{"x":"3","y":"7","width":"18","height":"4","rx":"1"}]],"music":[["path",{"d":"M9 18V5l12-2v13"}],["circle",{"cx":"6","cy":"18","r":"3"}],["circle",{"cx":"18","cy":"16","r":"3"}]],"flower":[["path",{"d":"M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"}],["circle",{"cx":"12","cy":"8","r":"2"}],["path",{"d":"M12 10v12"}],["path",{"d":"M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"}],["path",{"d":"M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"}]],"walk":[["path",{"d":"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"}],["path",{"d":"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"}],["path",{"d":"M16 17h4"}],["path",{"d":"M4 13h4"}]]};
const ICON_LABELS={heart:"Heart",sun:"Sun",moon:"Moon",sparkles:"Sparkles",book:"Book",strength:"Strength",water:"Water",medicine:"Medicine",leaf:"Leaf",coffee:"Coffee",phone:"Phone",people:"People",home:"Home",mind:"Mind",star:"Star",gift:"Gift",music:"Music",flower:"Flower",walk:"Walk"};
const VISUAL_TONES={sage:"Sage",lavender:"Lavender",blush:"Blush",sky:"Sky",sand:"Sand",gray:"Gray"};
function iconSVG(name){const nodes=WORKBENCH_ICONS[name];if(!nodes)return "";const attrs=a=>Object.entries(a).map(([k,v])=>' '+k+'="'+escapeAttr(v)+'"').join("");return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+nodes.map(([tag,a])=>"<"+tag+attrs(a)+"></"+tag+">").join("")+"</svg>"}
function safeTone(tone){return Object.hasOwn(VISUAL_TONES,tone)?tone:"sage"}
function visualHTML(item,className,fallback="🌱"){const tone=safeTone(item?.color);const content=item?.icon&&WORKBENCH_ICONS[item.icon]?iconSVG(item.icon):escapeHTML(item?.emoji||fallback);return '<span class="'+className+' visual-tone-'+tone+'">'+content+'</span>'}
const defaultState = {
  habits: [
    {id:"am-face", emoji:"☀️", name:"Morning Face Wash", small:"A quick wash still counts.",scheduleType:"daily"},
    {id:"pm-face", emoji:"🌙", name:"Night Face Wash", small:"A smaller valid version still counts.",scheduleType:"daily"},
    {id:"vit-d", emoji:"🌞", name:"Daily D", small:"Take it with your first real meal.",scheduleType:"daily"}
  ],
  logs: {},
  people: [],
  settings: {startScreen:"last",compactMode:false,hapticsEnabled:true,backupReminderEnabled:true,firstUsedAt:new Date().toISOString(),lastBackupAt:null,backupRemindAfter:null}
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {habits: (parsed.habits || []).map(h=>({goalType:"practice",full:"",small2:"",scheduleType:"daily",weekdays:[],weeklyTarget:1,...h})), logs: parsed.logs || {}, people:(parsed.people||[]).map(p=>({...p,interactions:p.interactions||[],notes:p.notes||[]})), settings:{...defaultState.settings,...(parsed.settings||{})}};
  }catch(e){ return structuredClone(defaultState); }
}
let state = loadState();
localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
let undoSnapshot=null, toastTimer=null;
const oldHabitFilter=localStorage.getItem("personal_workbench_habit_filter")||"today";
let habitScope=["today","week","all"].includes(oldHabitFilter)?oldHabitFilter:"today";
let habitStatusFilter=["logged","return"].includes(oldHabitFilter)?oldHabitFilter:"any";
const GENTLE_KEY="personal_workbench_gentle_day";

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}
function showSaved(message,before=null){
  undoSnapshot=before;
  document.getElementById("toastMessage").textContent=message;
  document.getElementById("undoBtn").style.display=before?"block":"none";
  const toast=document.getElementById("saveToast");toast.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),4500);
  if(state.settings?.hapticsEnabled && navigator.vibrate) navigator.vibrate(18);
}
document.getElementById("undoBtn").addEventListener("click",()=>{if(!undoSnapshot)return;state=undoSnapshot;undoSnapshot=null;saveState();document.getElementById("saveToast").classList.remove("show");});

let visualTarget=null,pendingIcon=null,pendingTone="sage";
const visualPickerModal=document.getElementById("visualPickerModal");
function visualFields(target){return target==="habit"?{icon:"habitIcon",color:"habitColor",emoji:"habitEmoji",preview:"habitVisualPreview"}:{icon:"personIcon",color:"personColor",emoji:"personEmoji",preview:"personVisualPreview"}}
function updateVisualPreview(target){const f=visualFields(target),icon=document.getElementById(f.icon).value,tone=safeTone(document.getElementById(f.color).value),emoji=document.getElementById(f.emoji).value.trim()||(target==="habit"?"🌱":"💛"),preview=document.getElementById(f.preview);preview.className=`visual-preview visual-tone-${tone}`;preview.innerHTML=icon&&WORKBENCH_ICONS[icon]?iconSVG(icon):escapeHTML(emoji)}
function renderVisualPicker(){
  document.getElementById("visualIconGrid").innerHTML=Object.entries(ICON_LABELS).map(([name,label])=>`<button class="icon-choice ${pendingIcon===name?"selected":""}" type="button" data-icon-choice="${name}" aria-label="${label}" title="${label}">${iconSVG(name)}</button>`).join("");
  document.getElementById("visualToneRow").innerHTML=Object.entries(VISUAL_TONES).map(([tone,label])=>`<button class="tone-choice visual-tone-${tone} ${pendingTone===tone?"selected":""}" type="button" data-tone-choice="${tone}" aria-label="${label}" title="${label}"></button>`).join("");
  document.querySelectorAll("[data-icon-choice]").forEach(button=>button.addEventListener("click",()=>{pendingIcon=button.dataset.iconChoice;renderVisualPicker()}));
  document.querySelectorAll("[data-tone-choice]").forEach(button=>button.addEventListener("click",()=>{pendingTone=button.dataset.toneChoice;renderVisualPicker()}));
}
function openVisualPicker(target){const f=visualFields(target);visualTarget=target;pendingIcon=document.getElementById(f.icon).value||null;pendingTone=safeTone(document.getElementById(f.color).value);document.getElementById("visualPickerTitle").textContent=target==="habit"?"Habit icon & color":"Person icon & color";renderVisualPicker();visualPickerModal.classList.add("show")}
function closeVisualPicker(){visualPickerModal.classList.remove("show");visualTarget=null}
function applyVisualChoice(useEmoji=false){if(!visualTarget)return;const f=visualFields(visualTarget);document.getElementById(f.icon).value=useEmoji?"":(pendingIcon||"");document.getElementById(f.color).value=pendingTone;updateVisualPreview(visualTarget);closeVisualPicker()}
document.getElementById("chooseHabitVisual").addEventListener("click",()=>openVisualPicker("habit"));document.getElementById("choosePersonVisual").addEventListener("click",()=>openVisualPicker("person"));
document.getElementById("closeVisualPicker").addEventListener("click",closeVisualPicker);document.getElementById("cancelVisualPicker").addEventListener("click",closeVisualPicker);document.getElementById("applyVisualPicker").addEventListener("click",()=>applyVisualChoice(false));document.getElementById("useEmojiVisual").addEventListener("click",()=>applyVisualChoice(true));visualPickerModal.addEventListener("click",e=>{if(e.target===visualPickerModal)closeVisualPicker()});
document.getElementById("habitEmoji").addEventListener("input",()=>{document.getElementById("habitIcon").value="";updateVisualPreview("habit")});document.getElementById("personEmoji").addEventListener("input",()=>{document.getElementById("personIcon").value="";updateVisualPreview("person")});

function dateKey(d=new Date()){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtLong(d){ return new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric"}).format(d); }
function dailyCopy(key,choices,d=new Date()){const seed=Number(dateKey(d).replaceAll("-",""))+[...key].reduce((sum,char)=>sum+char.charCodeAt(0),0);return choices[seed%choices.length]}
function fmtShort(d){ return new Intl.DateTimeFormat(undefined,{weekday:"short"}).format(d); }

function parseLocalDate(key){ if(!key) return null; const [y,m,d]=key.split("-").map(Number); return new Date(y,m-1,d); }
function daysBetween(a,b){ const x=new Date(a.getFullYear(),a.getMonth(),a.getDate()); const y=new Date(b.getFullYear(),b.getMonth(),b.getDate()); return Math.round((y-x)/86400000); }
function fmtDate(d){ return d ? new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(d) : "Not yet"; }


function escapeHTML(str=""){return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function escapeAttr(str=""){return escapeHTML(str);}
function jsEscape(str=""){return String(str).replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
