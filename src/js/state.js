const STORAGE_KEY = "return_habit_tracker_v1";
const VIEW_KEY = "personal_workbench_last_view";
const METHOD_KEY = "personal_workbench_last_contact_method";
const WORKBENCH_ICONS={"heart":[["path",{"d":"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"}]],"sun":[["circle",{"cx":"12","cy":"12","r":"4"}],["path",{"d":"M12 2v2"}],["path",{"d":"M12 20v2"}],["path",{"d":"m4.93 4.93 1.41 1.41"}],["path",{"d":"m17.66 17.66 1.41 1.41"}],["path",{"d":"M2 12h2"}],["path",{"d":"M20 12h2"}],["path",{"d":"m6.34 17.66-1.41 1.41"}],["path",{"d":"m19.07 4.93-1.41 1.41"}]],"moon":[["path",{"d":"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"}]],"sparkles":[["path",{"d":"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"}],["path",{"d":"M20 2v4"}],["path",{"d":"M22 4h-4"}],["circle",{"cx":"4","cy":"20","r":"2"}]],"book":[["path",{"d":"M12 7v14"}],["path",{"d":"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"}]],"strength":[["path",{"d":"M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"}],["path",{"d":"m2.5 21.5 1.4-1.4"}],["path",{"d":"m20.1 3.9 1.4-1.4"}],["path",{"d":"M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"}],["path",{"d":"m9.6 14.4 4.8-4.8"}]],"water":[["path",{"d":"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"}],["path",{"d":"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"}]],"medicine":[["path",{"d":"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"}],["path",{"d":"m8.5 8.5 7 7"}]],"leaf":[["path",{"d":"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"}],["path",{"d":"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"}]],"coffee":[["path",{"d":"M10 2v2"}],["path",{"d":"M14 2v2"}],["path",{"d":"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"}],["path",{"d":"M6 2v2"}]],"phone":[["path",{"d":"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"}]],"people":[["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["path",{"d":"M16 3.128a4 4 0 0 1 0 7.744"}],["path",{"d":"M22 21v-2a4 4 0 0 0-3-3.87"}],["circle",{"cx":"9","cy":"7","r":"4"}]],"home":[["path",{"d":"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{"d":"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]],"mind":[["path",{"d":"M12 18V5"}],["path",{"d":"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"}],["path",{"d":"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"}],["path",{"d":"M17.997 5.125a4 4 0 0 1 2.526 5.77"}],["path",{"d":"M18 18a4 4 0 0 0 2-7.464"}],["path",{"d":"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"}],["path",{"d":"M6 18a4 4 0 0 1-2-7.464"}],["path",{"d":"M6.003 5.125a4 4 0 0 0-2.526 5.77"}]],"star":[["path",{"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"}]],"gift":[["path",{"d":"M12 7v14"}],["path",{"d":"M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"}],["path",{"d":"M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"}],["rect",{"x":"3","y":"7","width":"18","height":"4","rx":"1"}]],"music":[["path",{"d":"M9 18V5l12-2v13"}],["circle",{"cx":"6","cy":"18","r":"3"}],["circle",{"cx":"18","cy":"16","r":"3"}]],"flower":[["path",{"d":"M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"}],["circle",{"cx":"12","cy":"8","r":"2"}],["path",{"d":"M12 10v12"}],["path",{"d":"M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"}],["path",{"d":"M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"}]],"walk":[["path",{"d":"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"}],["path",{"d":"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"}],["path",{"d":"M16 17h4"}],["path",{"d":"M4 13h4"}]]};
Object.assign(WORKBENCH_ICONS,{
  "pause":[["rect",{"x":"7","y":"5","width":"3","height":"14","rx":"1"}],["rect",{"x":"14","y":"5","width":"3","height":"14","rx":"1"}]],
  "zap":[["path",{"d":"M13 2 4 14h6l-1 8 9-12h-6z"}]],
  "checkmark":[["path",{"d":"M20 6 9 17l-5-5"}]],
  "bed":[["rect",{"x":"2","y":"11","width":"20","height":"8","rx":"2"}],["path",{"d":"M4 11V7a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v4"}],["path",{"d":"M13 11V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"}],["line",{"x1":"2","y1":"19","x2":"2","y2":"21"}],["line",{"x1":"22","y1":"19","x2":"22","y2":"21"}]],
  "laundry":[["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"}],["circle",{"cx":"12","cy":"13","r":"5"}],["circle",{"cx":"7","cy":"6.5","r":"1"}],["circle",{"cx":"10","cy":"6.5","r":"1"}]],
  "broom":[["line",{"x1":"12","y1":"3","x2":"6","y2":"17"}],["path",{"d":"M4 20 L10 20 L7 15 Z"}]],
  "dishes":[["ellipse",{"cx":"12","cy":"18","rx":"8","ry":"2.5"}],["ellipse",{"cx":"12","cy":"13","rx":"6","ry":"2"}],["ellipse",{"cx":"12","cy":"9","rx":"4","ry":"1.5"}]],
  "plant":[["rect",{"x":"8","y":"16","width":"8","height":"5","rx":"1"}],["circle",{"cx":"12","cy":"10","r":"5"}]],
  "trash":[["path",{"d":"M4 7h16"}],["path",{"d":"M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"}],["path",{"d":"M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"}]],
  "basket":[["path",{"d":"M4 9h16l-2 10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"}],["path",{"d":"M8 9V6a4 4 0 0 1 8 0v3"}]],
  "journal":[["rect",{"x":"5","y":"3","width":"14","height":"18","rx":"2"}],["line",{"x1":"9","y1":"3","x2":"9","y2":"21"}]],
  "headphones":[["path",{"d":"M4 14v-2a8 8 0 0 1 16 0v2"}],["rect",{"x":"2","y":"14","width":"4","height":"6","rx":"1"}],["rect",{"x":"18","y":"14","width":"4","height":"6","rx":"1"}]],
  "calendar":[["rect",{"x":"3","y":"5","width":"18","height":"16","rx":"2"}],["line",{"x1":"3","y1":"10","x2":"21","y2":"10"}],["line",{"x1":"8","y1":"3","x2":"8","y2":"7"}],["line",{"x1":"16","y1":"3","x2":"16","y2":"7"}]],
  "wallet":[["rect",{"x":"2","y":"6","width":"20","height":"14","rx":"2"}],["path",{"d":"M16 12h4"}],["path",{"d":"M2 10h20"}]],
  "inbox":[["rect",{"x":"3","y":"9","width":"18","height":"11","rx":"2"}],["path",{"d":"M3 13h5l2 3h4l2-3h5"}]],
  "folder":[["path",{"d":"M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]],
  "car":[["rect",{"x":"3","y":"11","width":"18","height":"6","rx":"2"}],["circle",{"cx":"7","cy":"18","r":"2"}],["circle",{"cx":"17","cy":"18","r":"2"}],["path",{"d":"M5 11l2-4h10l2 4"}]],
  "key":[["circle",{"cx":"8","cy":"8","r":"4"}],["path",{"d":"M11 11l9 9"}],["path",{"d":"M17 17l2-2"}],["path",{"d":"M14 14l2-2"}]],
  "message":[["rect",{"x":"3","y":"4","width":"18","height":"12","rx":"3"}],["path",{"d":"M8 16l-2 4 5-4z"}]],
  "apple":[["circle",{"cx":"12","cy":"14","r":"7"}],["path",{"d":"M12 7c0-2 1-4 3-4"}],["path",{"d":"M9 4c1 0 2 1 2 3"}]],
  "person":[["circle",{"cx":"12","cy":"8","r":"4"}],["path",{"d":"M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"}]],
  "pet":[["circle",{"cx":"12","cy":"13","r":"7"}],["path",{"d":"M8 8l1-4 3 3"}],["path",{"d":"M16 8l-1-4-3 3"}],["circle",{"cx":"9.5","cy":"12.5","r":"0.8","fill":"currentColor","stroke":"none"}],["circle",{"cx":"14.5","cy":"12.5","r":"0.8","fill":"currentColor","stroke":"none"}]],
  "settings":[["path",{"d":"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"}],["circle",{"cx":"12","cy":"12","r":"3"}]],
  "trending-up":[["path",{"d":"M16 7h6v6"}],["path",{"d":"m22 7-8.5 8.5-5-5L2 17"}]]
});
const ICON_LABELS={heart:"Heart",sun:"Sun",moon:"Moon",sparkles:"Sparkle",book:"Book",strength:"Strength",water:"Water",medicine:"Pill",leaf:"Leaf",coffee:"Coffee",phone:"Phone",people:"Family",home:"Home",mind:"Brain",star:"Star",gift:"Gift",music:"Music",flower:"Plant bloom",walk:"Walk",pause:"Pause",zap:"Lightning",checkmark:"Checkmark",bed:"Bed",laundry:"Laundry",broom:"Broom",dishes:"Dishes",plant:"Plant",trash:"Trash",basket:"Basket",journal:"Journal",headphones:"Headphones",calendar:"Calendar",wallet:"Wallet",inbox:"Inbox",folder:"Folder",car:"Car",key:"Key",message:"Message",apple:"Apple",person:"Person",pet:"Pet"};
const ICON_GROUPS=[
  {label:"Body & health",icons:["water","sun","moon","heart","medicine","apple","walk","sparkles","strength"]},
  {label:"Home",icons:["home","bed","laundry","broom","dishes","plant","trash","basket","flower"]},
  {label:"Mind & reset",icons:["mind","book","journal","headphones","pause","zap","star","music"]},
  {label:"Admin & life",icons:["calendar","wallet","checkmark","inbox","folder","car","key"]},
  {label:"Connection",icons:["message","phone","coffee","gift"]},
  {label:"People",icons:["person","people","pet"]}
];
const VISUAL_TONES={sage:"Sage",blue:"Blue",lavender:"Lavender",peach:"Peach",rose:"Rose",sand:"Sand",gray:"Gray"};
const TONE_MIGRATIONS={sky:"blue",blush:"rose"};
function safeToneMigrated(tone){return TONE_MIGRATIONS[tone]||tone}
function iconSVG(name){const nodes=WORKBENCH_ICONS[name];if(!nodes)return "";const attrs=a=>Object.entries(a).map(([k,v])=>' '+k+'="'+escapeAttr(v)+'"').join("");return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+nodes.map(([tag,a])=>"<"+tag+attrs(a)+"></"+tag+">").join("")+"</svg>"}
function safeTone(tone){const migrated=safeToneMigrated(tone);return Object.hasOwn(VISUAL_TONES,migrated)?migrated:"sage"}
function safeIcon(icon,fallback){return icon&&WORKBENCH_ICONS[icon]?icon:fallback}
// The icon+color span is always rendered (it's the fallback), and a photo <img> is layered
// on top of it via data-avatar-photo — hydrateAvatarPhotos() fills that in asynchronously
// once IndexedDB resolves, so there's never a broken-image flash or a render that blocks on
// IndexedDB. Habits never set photoId, so this is a no-op change for the habit-visual path.
function visualHTML(item,className,fallback="leaf"){
  const tone=safeTone(item?.color);const icon=safeIcon(item?.icon,fallback);
  const base='<span class="'+className+' visual-tone-'+tone+(item?.photoId?' has-photo':'')+'"'+(item?.photoId?' data-avatar-photo="'+escapeAttr(item.photoId)+'"':'')+'>'+iconSVG(icon);
  return item?.photoId ? base+'<img class="avatar-photo-img" alt="" /></span>' : base+'</span>';
}
const _avatarPhotoURLs=new Map();
async function loadAvatarPhotoURL(photoId){
  if(_avatarPhotoURLs.has(photoId)) return _avatarPhotoURLs.get(photoId);
  const blob=await getPhoto(photoId);
  if(!blob) return null;
  const url=URL.createObjectURL(blob);
  _avatarPhotoURLs.set(photoId,url);
  return url;
}
function invalidateAvatarPhoto(photoId){
  if(!photoId) return;
  const url=_avatarPhotoURLs.get(photoId);
  if(url) URL.revokeObjectURL(url);
  _avatarPhotoURLs.delete(photoId);
}
function hydrateAvatarPhotos(){
  document.querySelectorAll("[data-avatar-photo]:not([data-photo-hydrated])").forEach(el=>{
    el.setAttribute("data-photo-hydrated","1");
    const id=el.getAttribute("data-avatar-photo");
    loadAvatarPhotoURL(id).then(url=>{
      if(!url) return; // missing/corrupt photo — the icon+color fallback underneath stays visible
      const img=el.querySelector("img.avatar-photo-img");
      if(img){ img.src=url; img.classList.add("loaded"); }
    });
  });
}

const RELATIONSHIP_TAGS=[
  {id:"family",label:"Family",tone:"peach",icon:"home"},
  {id:"partner",label:"Partner",tone:"rose",icon:"heart"},
  {id:"close-friend",label:"Close Friend",tone:"lavender",icon:"sparkles"},
  {id:"friend",label:"Friend",tone:"sage",icon:"people"},
  {id:"coworker",label:"Coworker",tone:"blue",icon:"folder"},
  {id:"work-contact",label:"Work Contact",tone:"teal",icon:"wallet"},
  {id:"acquaintance",label:"Acquaintance",tone:"gray",icon:"person"},
  {id:"pet",label:"Pet",tone:"sage",icon:"pet"},
  {id:"other",label:"Other",tone:"gray",icon:"star"}
];
const FREQUENCY_TAGS=[
  {id:"7",label:"Weekly",tone:"sage"},
  {id:"14",label:"Every 2 Weeks",tone:"sand"},
  {id:"30",label:"Monthly",tone:"gray"},
  {id:"60",label:"Occasionally",tone:"gray"},
  {id:"0",label:"No Schedule",tone:"gray"}
];
function relationTag(id){return RELATIONSHIP_TAGS.find(t=>t.id===id)}
function relationPillHTML(id,className="relationship-label"){
  const tag=relationTag(id);
  if(!tag) return `<span class="${className} tone-gray">Main Circle</span>`;
  return `<span class="${className} tone-${tag.tone}">${tag.icon?iconSVG(tag.icon):""}<span>${escapeHTML(tag.label)}</span></span>`;
}
function normalizeRelation(value){
  if(!value) return "";
  const v=String(value).trim();
  if(!v||v.toLowerCase()==="main circle") return "";
  if(RELATIONSHIP_TAGS.some(t=>t.id===v)) return v;
  const exact=RELATIONSHIP_TAGS.find(t=>t.label.toLowerCase()===v.toLowerCase());
  if(exact) return exact.id;
  const lower=v.toLowerCase();
  const groups=[
    ["family",["mom","dad","mother","father","sister","brother","sibling","cousin","aunt","uncle","grandma","grandpa","grandmother","grandfather","family","son","daughter","parent"]],
    ["partner",["wife","husband","spouse","girlfriend","boyfriend","partner","fiance","fiancée","fiancee"]],
    ["close-friend",["best friend","bestie","close friend","bff"]],
    ["coworker",["coworker","co-worker","colleague"]],
    ["work-contact",["client","boss","manager","work contact","work"]],
    ["pet",["pet","dog","cat","dogs","cats"]],
    ["friend",["friend"]]
  ];
  for(const [id,words] of groups){ if(words.some(w=>lower.includes(w))) return id; }
  return "other";
}
const TIME_BLOCKS = {
  morning: {label:"Morning", icon:"🌅"},
  afternoon: {label:"Afternoon", icon:"☀️"},
  evening: {label:"Evening", icon:"🌙"}
};
function timeBlockOf(h){ return (h?.timeBlock==="afternoon"||h?.timeBlock==="evening") ? h.timeBlock : "morning"; }
// "What area of life is this?" — a separate dimension from scheduleType (how often) and
// timeBlock (when it fits), never conflated with either. Optional, single-select, fixed
// set on purpose (see CLAUDE.md-adjacent product intent: not a tagging system). A future
// longer-horizon/monthly rhythm can reuse this exact field without any rework here.
const HABIT_CATEGORIES=[
  {id:"wellbeing",label:"Wellbeing",icon:"heart",tone:"rose"},
  {id:"home",label:"Home",icon:"home",tone:"sand"},
  {id:"growth",label:"Growth",icon:"trending-up",tone:"blue"},
  {id:"relationships",label:"Relationships",icon:"people",tone:"lavender"},
  {id:"other",label:"Other",icon:"star",tone:"gray"}
];
function habitCategoryTag(id){return HABIT_CATEGORIES.find(c=>c.id===id)}
// Uncategorized is "" (never null/undefined in normalized state), matching the existing
// normalizeRelation()/RELATIONSHIP_TAGS convention below — a habit simply has no badge to
// show rather than an explicit "Uncategorized" value anywhere in the UI.
function normalizeHabitCategory(value){
  if(!value) return "";
  const v=String(value).trim().toLowerCase();
  return HABIT_CATEGORIES.some(c=>c.id===v)?v:"";
}
function habitCategoryPillHTML(h,className="checklist-category-pill"){
  const tag=habitCategoryTag(h?.category);
  if(!tag) return "";
  return `<span class="${className} tone-${tag.tone}">${iconSVG(tag.icon)}<span>${escapeHTML(tag.label)}</span></span>`;
}
function normalizeHabit(h){
  const source=h&&typeof h==="object"&&!Array.isArray(h)?h:{};
  const merged={goalType:"practice",full:"",small2:"",scheduleType:"daily",weekdays:[],weeklyTarget:1,timeBlock:"morning",paused:false,category:"",...source};
  merged.timeBlock=Object.hasOwn(TIME_BLOCKS,merged.timeBlock)?merged.timeBlock:"morning";
  merged.icon=safeIcon(merged.icon,"leaf");
  merged.color=safeTone(merged.color);
  merged.category=normalizeHabitCategory(merged.category);
  return merged;
}
function normalizePerson(p){
  const source=p&&typeof p==="object"&&!Array.isArray(p)?p:{};
  const merged={interactions:[],notes:[],...source};
  merged.icon=safeIcon(merged.icon,"person");
  merged.color=safeTone(merged.color);
  merged.photoId=(typeof merged.photoId==="string"&&merged.photoId)?merged.photoId:null;
  if(!RELATIONSHIP_TAGS.some(t=>t.id===merged.relation)){
    const legacyText=merged.relation;
    merged.relation=normalizeRelation(merged.relation);
    if(legacyText && merged.relation && !merged.relationLegacyText) merged.relationLegacyText=legacyText;
  }
  const freq=Number(merged.frequency);
  merged.frequency=Number.isFinite(freq)?freq:14;
  merged.interactions=(Array.isArray(merged.interactions)?merged.interactions:[]).map((item,i)=>{
    item=item&&typeof item==="object"&&!Array.isArray(item)?item:{};
    return {
    id:item.id||`i-legacy-${merged.id||"p"}-${i}`,
    date:item.date||dateKey(),
    method:item.method||"Other",
    note:item.note||"",
    countsAsSeen:item.countsAsSeen!==undefined?item.countsAsSeen:(item.method||"").toLowerCase()==="in person",
    createdAt:item.createdAt||item.date||new Date().toISOString(),
    updatedAt:item.updatedAt||item.createdAt||item.date||new Date().toISOString()
    };
  });
  merged.notes=Array.isArray(merged.notes)?merged.notes.filter(item=>item&&typeof item==="object"&&!Array.isArray(item)):[];
  return merged;
}

const defaultState = {
  habits: [
    {id:"am-face", icon:"sun", color:"peach", name:"Morning Face Wash", small:"A quick wash still counts.",scheduleType:"daily",timeBlock:"morning"},
    {id:"pm-face", icon:"moon", color:"lavender", name:"Night Face Wash", small:"A smaller valid version still counts.",scheduleType:"daily",timeBlock:"evening"},
    {id:"vit-d", icon:"medicine", color:"sage", name:"Daily D", small:"Take it with your first real meal.",scheduleType:"daily",timeBlock:"morning"}
  ],
  logs: {},
  people: [],
  dayNotes: {},
  settings: {startScreen:"last",compactMode:false,hapticsEnabled:true,backupReminderEnabled:true,guideOpened:false,firstUsedAt:new Date().toISOString(),lastBackupAt:null,backupRemindAfter:null,pinnedModules:[]}
};

let stateLoadWasCorrupted=false;
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return structuredClone(defaultState);
  try{
    const parsed = JSON.parse(raw);
    return {habits: (parsed.habits || []).map(normalizeHabit), logs: parsed.logs || {}, people:(parsed.people||[]).map(normalizePerson), dayNotes:(parsed.dayNotes&&typeof parsed.dayNotes==="object")?parsed.dayNotes:{}, settings:{...defaultState.settings,...(parsed.settings||{})}};
  }catch(e){
    // Don't silently discard unreadable data — keep the raw string under a separate key
    // in case it's recoverable, and skip the immediate re-save below so the ORIGINAL
    // localStorage entry survives this load too (only an explicit later save overwrites it).
    stateLoadWasCorrupted=true;
    try{ localStorage.setItem(STORAGE_KEY+"_corrupted_backup_"+Date.now(), raw); }catch(_e){}
    return structuredClone(defaultState);
  }
}
let state = loadState();
if(!stateLoadWasCorrupted) localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
let undoSnapshot=null, toastTimer=null;
localStorage.removeItem("personal_workbench_habit_filter");
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
if(stateLoadWasCorrupted) showSaved("Your saved data couldn't be read, so a fresh start was loaded. The old file was kept as a backup in this browser.");
document.getElementById("undoBtn").addEventListener("click",()=>{if(!undoSnapshot)return;state=undoSnapshot;undoSnapshot=null;saveState();document.getElementById("saveToast").classList.remove("show");});

let visualTarget=null,pendingIcon=null,pendingTone="sage";
// Photo state is staged here across the visual picker AND survives back up to the person
// modal (which is where Save actually lives) — nothing touches IndexedDB or state.people
// until the person modal's own Save is clicked, so opening the picker and hitting Cancel
// (at either layer) never writes an orphaned blob. See circle.js's savePersonBtn handler.
// pendingPhotoURL is what the picker currently displays, which may be a URL borrowed from
// the shared hydrateAvatarPhotos() cache (an already-committed photo) or one this picker
// created itself for a freshly-picked file (ownedPhotoURL). Only ownedPhotoURL is ever
// revoked here — revoking a borrowed cached URL would break every other place on screen
// still showing that same photo (see the has-photo avatar spans elsewhere in the DOM).
let pendingMode="icon",pendingPhotoBlob=null,pendingPhotoRemoved=false,pendingPhotoURL=null,ownedPhotoURL=null;
const visualPickerModal=document.getElementById("visualPickerModal");
function visualFields(target){return target==="habit"?{icon:"habitIcon",color:"habitColor",preview:"habitVisualPreview"}:{icon:"personIcon",color:"personColor",preview:"personVisualPreview",photo:"personPhotoId"}}
function updateVisualPreview(target){
  const f=visualFields(target),icon=safeIcon(document.getElementById(f.icon).value,target==="habit"?"leaf":"person"),tone=safeTone(document.getElementById(f.color).value),preview=document.getElementById(f.preview);
  preview.className=`visual-preview visual-tone-${tone}`;
  const existingImg=preview.querySelector("img.avatar-photo-img");if(existingImg)existingImg.remove();
  preview.innerHTML=iconSVG(icon);
  const photoId=f.photo?document.getElementById(f.photo).value:"";
  if(photoId){
    preview.classList.add("has-photo");
    const img=document.createElement("img");img.className="avatar-photo-img";img.alt="";
    preview.appendChild(img);
    loadAvatarPhotoURL(photoId).then(url=>{if(url){img.src=url;img.classList.add("loaded")}});
  }
}
function renderVisualPicker(){
  document.getElementById("visualIconGrid").innerHTML=ICON_GROUPS.map(group=>`<div class="icon-group"><div class="icon-group-label">${escapeHTML(group.label)}</div><div class="icon-group-grid">${group.icons.map(name=>`<button class="icon-choice ${pendingIcon===name?"selected":""}" type="button" data-icon-choice="${name}" aria-label="${escapeAttr(ICON_LABELS[name])} icon" aria-pressed="${pendingIcon===name}" title="${escapeAttr(ICON_LABELS[name])}">${iconSVG(name)}</button>`).join("")}</div></div>`).join("");
  document.getElementById("visualToneRow").innerHTML=Object.entries(VISUAL_TONES).map(([tone,label])=>`<button class="tone-choice visual-tone-${tone} ${pendingTone===tone?"selected":""}" type="button" data-tone-choice="${tone}" aria-label="${label} color" aria-pressed="${pendingTone===tone}" title="${label}"></button>`).join("");
  document.querySelectorAll("[data-icon-choice]").forEach(button=>button.addEventListener("click",()=>{pendingIcon=button.dataset.iconChoice;renderVisualPicker()}));
  document.querySelectorAll("[data-tone-choice]").forEach(button=>button.addEventListener("click",()=>{pendingTone=button.dataset.toneChoice;renderVisualPicker()}));
}
function renderVisualPhotoPreview(){
  const img=document.getElementById("visualPhotoPreviewImg");
  const hasPhoto=Boolean(pendingPhotoURL)&&!pendingPhotoRemoved;
  document.getElementById("removePhotoBtn").hidden=!hasPhoto;
  if(hasPhoto){img.src=pendingPhotoURL;img.classList.add("loaded")}
  else{img.removeAttribute("src");img.classList.remove("loaded")}
}
function setVisualMode(mode){
  pendingMode=mode;
  document.getElementById("visualModePhoto").classList.toggle("active",mode==="photo");
  document.getElementById("visualModePhoto").setAttribute("aria-pressed",mode==="photo");
  document.getElementById("visualModeIcon").classList.toggle("active",mode==="icon");
  document.getElementById("visualModeIcon").setAttribute("aria-pressed",mode==="icon");
  document.getElementById("visualPhotoSection").hidden=mode!=="photo";
  // The icon+color editor stays visible even in Photo mode — it's the fallback that keeps
  // working the moment a photo is removed, so it must stay editable without switching tabs
  // (switching to Icon mode is reserved for actually making icon+color the active choice).
}
function openVisualPicker(target){
  const f=visualFields(target);visualTarget=target;
  pendingIcon=safeIcon(document.getElementById(f.icon).value,target==="habit"?"leaf":"person");
  pendingTone=safeTone(document.getElementById(f.color).value);
  document.getElementById("visualPickerTitle").textContent=target==="habit"?"Habit visual":"Person visual";
  pendingPhotoBlob=null;pendingPhotoRemoved=false;
  if(ownedPhotoURL){URL.revokeObjectURL(ownedPhotoURL);ownedPhotoURL=null}
  pendingPhotoURL=null;
  closeCropStage();
  const supportsPhoto=Boolean(f.photo);
  document.getElementById("visualModeRow").hidden=!supportsPhoto;
  document.getElementById("visualPhotoError").hidden=true;
  if(supportsPhoto){
    const photoId=document.getElementById(f.photo).value;
    if(photoId){
      const openedFor=visualTarget;
      loadAvatarPhotoURL(photoId).then(url=>{
        // Guard against the picker having been closed/reopened, or the photo already
        // removed, before this async IndexedDB read resolved.
        if(visualTarget!==openedFor||pendingPhotoRemoved||ownedPhotoURL) return;
        pendingPhotoURL=url;renderVisualPhotoPreview();
      });
      setVisualMode("photo");
    } else setVisualMode("icon");
  } else setVisualMode("icon");
  renderVisualPicker();
  visualPickerModal.classList.add("show");
}
function closeVisualPicker(){
  visualPickerModal.classList.remove("show");visualTarget=null;
  if(ownedPhotoURL){URL.revokeObjectURL(ownedPhotoURL);ownedPhotoURL=null}
  pendingPhotoURL=null;pendingPhotoBlob=null;pendingPhotoRemoved=false;
  closeCropStage();
}
function applyVisualChoice(){
  if(!visualTarget)return;
  const f=visualFields(visualTarget);
  if(f.photo && pendingMode==="photo" && pendingPhotoURL){
    // Staged only — nothing is written to IndexedDB until the person modal's own Save,
    // so applying here just carries the pending blob/URL forward for that Save handler.
    document.getElementById(f.icon).value=pendingIcon||document.getElementById(f.icon).value;
    document.getElementById(f.color).value=pendingTone;
    const preview=document.getElementById(f.preview);
    preview.className="visual-preview has-photo";
    preview.innerHTML='<img class="avatar-photo-img loaded" alt="" src="'+escapeAttr(pendingPhotoURL||"")+'" />';
    visualPickerModal.classList.remove("show");visualTarget=null;
    return;
  }
  if(f.photo && pendingMode==="icon"){
    if(document.getElementById(f.photo).value) pendingPhotoRemoved=true;
    document.getElementById(f.photo).value="";
  }
  document.getElementById(f.icon).value=pendingIcon||"";document.getElementById(f.color).value=pendingTone;
  updateVisualPreview(visualTarget);
  visualPickerModal.classList.remove("show");visualTarget=null;
  if(ownedPhotoURL){URL.revokeObjectURL(ownedPhotoURL);ownedPhotoURL=null}
  pendingPhotoURL=null;
}
document.getElementById("chooseHabitVisual").addEventListener("click",()=>openVisualPicker("habit"));document.getElementById("choosePersonVisual").addEventListener("click",()=>openVisualPicker("person"));
document.getElementById("closeVisualPicker").addEventListener("click",closeVisualPicker);document.getElementById("cancelVisualPicker").addEventListener("click",closeVisualPicker);document.getElementById("applyVisualPicker").addEventListener("click",applyVisualChoice);visualPickerModal.addEventListener("click",e=>{if(e.target===visualPickerModal)closeVisualPicker()});
document.getElementById("visualModePhoto").addEventListener("click",()=>setVisualMode("photo"));
document.getElementById("visualModeIcon").addEventListener("click",()=>setVisualMode("icon"));
document.getElementById("choosePhotoBtn").addEventListener("click",()=>document.getElementById("personPhotoInput").click());
document.getElementById("personPhotoInput").addEventListener("change",e=>{
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  openCropStage(file);
});

// --- Crop stage: lets the user directly drag/pinch a freshly-picked photo into the
// circular avatar frame before it's compressed and staged. Runs entirely on the real file
// (via an <img>, not a giant canvas) — only the final confirmed crop is drawn to a canvas,
// at a fixed small output size, so the source resolution never matters for storage cost.
//
// cropZoom is a multiplier on top of cropBaseScale (the "cover" scale computed on load, so
// 1 always means "smallest scale that still fully covers the circle" — never below that,
// so the crop can never show blank space). cropLeft/cropTop are the image's top-left corner
// in frame-local px. Every drag/pinch/wheel handler ends by clamping both before rendering.
const CROP_FRAME_SIZE=220;
const CROP_MAX_ZOOM=5; // multiplier over the min-cover scale — generous enough for a tight headshot crop
let cropSourceURL=null,cropNaturalW=0,cropNaturalH=0,cropBaseScale=1,cropZoom=1,cropLeft=0,cropTop=0;
const cropPointers=new Map(); // pointerId -> last known {x,y} in frame-local px
const cropImageEl=document.getElementById("cropImage");
function cropClamp(){
  const scale=cropBaseScale*cropZoom;
  const dispW=cropNaturalW*scale,dispH=cropNaturalH*scale;
  cropLeft=Math.min(0,Math.max(CROP_FRAME_SIZE-dispW,cropLeft));
  cropTop=Math.min(0,Math.max(CROP_FRAME_SIZE-dispH,cropTop));
}
function cropRender(){
  const scale=cropBaseScale*cropZoom;
  cropImageEl.style.width=(cropNaturalW*scale)+"px";
  cropImageEl.style.height=(cropNaturalH*scale)+"px";
  cropImageEl.style.left=cropLeft+"px";
  cropImageEl.style.top=cropTop+"px";
}
function cropCenterAndMinZoom(){
  cropZoom=1;
  cropLeft=(CROP_FRAME_SIZE-cropNaturalW*cropBaseScale)/2;
  cropTop=(CROP_FRAME_SIZE-cropNaturalH*cropBaseScale)/2;
}
// Rescales around (anchorX,anchorY) in frame-local px — the point under a finger/cursor
// stays visually fixed instead of the image jumping to re-center on every zoom step.
function cropZoomAround(anchorX,anchorY,newZoom){
  const scaleOld=cropBaseScale*cropZoom;
  const clamped=Math.min(CROP_MAX_ZOOM,Math.max(1,newZoom));
  const scaleNew=cropBaseScale*clamped;
  const imgX=(anchorX-cropLeft)/scaleOld, imgY=(anchorY-cropTop)/scaleOld;
  cropLeft=anchorX-imgX*scaleNew;
  cropTop=anchorY-imgY*scaleNew;
  cropZoom=clamped;
}
function openCropStage(file){
  const errorEl=document.getElementById("visualPhotoError");errorEl.hidden=true;
  if(cropSourceURL)URL.revokeObjectURL(cropSourceURL);
  cropSourceURL=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{
    cropNaturalW=img.naturalWidth;cropNaturalH=img.naturalHeight;
    cropBaseScale=Math.max(CROP_FRAME_SIZE/cropNaturalW,CROP_FRAME_SIZE/cropNaturalH);
    cropCenterAndMinZoom();
    cropImageEl.src=cropSourceURL;
    cropRender();
    document.getElementById("visualPhotoPreviewRow").hidden=true;
    document.getElementById("visualPickerMainActions").hidden=true;
    document.getElementById("cropStage").hidden=false;
  };
  img.onerror=()=>{
    URL.revokeObjectURL(cropSourceURL);cropSourceURL=null;
    errorEl.textContent="That photo couldn't be used — try a different image.";errorEl.hidden=false;
  };
  img.src=cropSourceURL;
}
function closeCropStage(){
  document.getElementById("cropStage").hidden=true;
  document.getElementById("visualPhotoPreviewRow").hidden=false;
  document.getElementById("visualPickerMainActions").hidden=false;
  if(cropSourceURL){URL.revokeObjectURL(cropSourceURL);cropSourceURL=null}
  cropPointers.clear();
}
const cropFrameEl=document.getElementById("cropFrame");
function cropFramePoint(e){
  const rect=cropFrameEl.getBoundingClientRect();
  return {x:e.clientX-rect.left,y:e.clientY-rect.top};
}
cropFrameEl.addEventListener("pointerdown",e=>{
  try{cropFrameEl.setPointerCapture(e.pointerId)}catch(_err){} // iOS PWA/Safari can throw here for a pointer it doesn't consider active; capture is a nicety, not required for the drag/pinch math below
  cropPointers.set(e.pointerId,cropFramePoint(e));
});
cropFrameEl.addEventListener("pointermove",e=>{
  const old=cropPointers.get(e.pointerId);
  if(!old)return; // not a pointer we started tracking (e.g. hover with no button down)
  const next=cropFramePoint(e);
  if(cropPointers.size===1){
    // One finger/cursor down: plain reposition.
    cropLeft+=next.x-old.x;
    cropTop+=next.y-old.y;
  }else if(cropPointers.size===2){
    // Two fingers: the other pointer's last-known position is the pinch partner. Compare
    // the midpoint/distance before-and-after this single pointer's move so zoom tracks the
    // pinch gesture and pan tracks the midpoint drifting, without the image jumping.
    let otherId=null;
    for(const id of cropPointers.keys()) if(id!==e.pointerId) otherId=id;
    const other=cropPointers.get(otherId);
    const distOld=Math.hypot(old.x-other.x,old.y-other.y);
    const distNew=Math.hypot(next.x-other.x,next.y-other.y);
    const midOld={x:(old.x+other.x)/2,y:(old.y+other.y)/2};
    const midNew={x:(next.x+other.x)/2,y:(next.y+other.y)/2};
    if(distOld>0){
      cropZoomAround(midOld.x,midOld.y,cropZoom*(distNew/distOld));
    }
    cropLeft+=midNew.x-midOld.x;
    cropTop+=midNew.y-midOld.y;
  }
  cropPointers.set(e.pointerId,next);
  cropClamp();cropRender();
});
function endCropPointer(e){ cropPointers.delete(e.pointerId); }
cropFrameEl.addEventListener("pointerup",endCropPointer);
cropFrameEl.addEventListener("pointercancel",endCropPointer);
cropFrameEl.addEventListener("wheel",e=>{
  e.preventDefault();
  const pt=cropFramePoint(e);
  cropZoomAround(pt.x,pt.y,cropZoom*(1-e.deltaY*0.0025));
  cropClamp();cropRender();
},{passive:false});
document.getElementById("cropResetBtn").addEventListener("click",()=>{
  cropCenterAndMinZoom();
  cropClamp();cropRender();
});
document.getElementById("cropCancelBtn").addEventListener("click",closeCropStage);
document.getElementById("cropConfirmBtn").addEventListener("click",async()=>{
  const scale=cropBaseScale*cropZoom;
  const sSize=CROP_FRAME_SIZE/scale; // the visible circle, back in the source image's own natural pixels
  const sx=-cropLeft/scale, sy=-cropTop/scale;
  try{
    const blob=await cropToBlob(cropImageEl,sx,sy,sSize);
    if(ownedPhotoURL)URL.revokeObjectURL(ownedPhotoURL);
    pendingPhotoBlob=blob;pendingPhotoRemoved=false;
    ownedPhotoURL=pendingPhotoURL=URL.createObjectURL(blob);
    renderVisualPhotoPreview();
  }catch(_err){
    document.getElementById("visualPhotoError").textContent="That photo couldn't be used — try a different image.";
    document.getElementById("visualPhotoError").hidden=false;
  }
  closeCropStage();
});
document.getElementById("removePhotoBtn").addEventListener("click",()=>{
  // If this URL was borrowed from the shared avatar-photo cache (an existing committed
  // photo, not a freshly-picked file), it must NOT be revoked — other on-screen avatars
  // for the same photoId still depend on it until Save actually deletes the photo.
  if(ownedPhotoURL){URL.revokeObjectURL(ownedPhotoURL);ownedPhotoURL=null}
  pendingPhotoURL=null;pendingPhotoBlob=null;pendingPhotoRemoved=true;
  renderVisualPhotoPreview();
});

function dateKey(d=new Date()){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtLong(d){ return new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric"}).format(d); }
function dailyCopy(key,choices,d=new Date()){const seed=Number(dateKey(d).replaceAll("-",""))+[...key].reduce((sum,char)=>sum+char.charCodeAt(0),0);return choices[seed%choices.length]}
function fmtShort(d){ return new Intl.DateTimeFormat(undefined,{weekday:"short"}).format(d); }

function parseLocalDate(key){ if(!key) return null; const [y,m,d]=key.split("-").map(Number); return new Date(y,m-1,d); }

function setupDatePicker({chipsId,customId,summaryId,getState,setState}){
  const chips=document.getElementById(chipsId), custom=document.getElementById(customId), summary=document.getElementById(summaryId);
  if(!chips||!custom) return;
  const today=dateKey(), yesterday=dateKey(addDays(new Date(),-1));
  const presets=[[today,"Today"],[yesterday,"Yesterday"]];
  const {date:current,isCustom}=getState();
  const presetMatch=!isCustom&&presets.find(([d])=>d===current);
  chips.innerHTML=presets.map(([d,label])=>`<button type="button" class="filter-chip ${!isCustom&&current===d?"active":""}" data-pick="${d}">${label}</button>`).join("")+`<button type="button" class="filter-chip ${isCustom?"active":""}" data-pick="custom">Pick date</button>`;
  custom.style.display=isCustom?"block":"none";
  // These are logs of what already happened — a future date has no meaning here, and
  // without this cap the native date picker happily accepts one (throwing off Return
  // detection and calendar/history readouts, which assume every entry is today or earlier).
  custom.max=today;
  if(isCustom) custom.value=current||today;
  if(summary) summary.textContent=presetMatch?presetMatch[1]:(current?fmtDate(parseLocalDate(current)):"Pick date");
  chips.querySelectorAll("[data-pick]").forEach(btn=>btn.addEventListener("click",()=>{
    if(btn.dataset.pick==="custom"){setState(custom.value||current||today,true);custom.focus();return;}
    setState(btn.dataset.pick,false);
  }));
  custom.onchange=()=>{ if(custom.value) setState(custom.value>today?today:custom.value,true); };
}
function daysBetween(a,b){ const x=new Date(a.getFullYear(),a.getMonth(),a.getDate()); const y=new Date(b.getFullYear(),b.getMonth(),b.getDate()); return Math.round((y-x)/86400000); }
function fmtDate(d){ return d ? new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(d) : "Not yet"; }


function escapeHTML(str=""){return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function escapeAttr(str=""){return escapeHTML(str);}
function jsEscape(str=""){return String(str).replace(/\\/g,"\\\\").replace(/'/g,"\\'");}

// Shared in-product confirmation shown in place of window.confirm() whenever an action
// (habit log, Circle interaction log) is about to overwrite an existing entry. Used by both
// habits.js and circle.js so there's one calm "replace this?" pattern app-wide rather than a
// per-feature copy. Keeping current makes no data change and just closes the sheet; Replace
// runs whatever commit path the caller already used after the native confirm it replaced.
const replaceLogModal=document.getElementById("replaceLogModal");
let replaceLogPendingAction=null;
function openReplaceLogModal(existingLine,replaceLine,onReplace){
  document.getElementById("replaceLogText").innerHTML=`${escapeHTML(existingLine)}<br>${escapeHTML(replaceLine)}`;
  replaceLogPendingAction=onReplace;
  replaceLogModal.classList.add("show");
}
function closeReplaceLogModal(){replaceLogModal.classList.remove("show");replaceLogPendingAction=null}
document.getElementById("closeReplaceLog").addEventListener("click",closeReplaceLogModal);
document.getElementById("keepCurrentLogBtn").addEventListener("click",closeReplaceLogModal);
replaceLogModal.addEventListener("click",e=>{if(e.target===replaceLogModal)closeReplaceLogModal()});
document.getElementById("replaceLogBtn").addEventListener("click",()=>{
  const action=replaceLogPendingAction;
  closeReplaceLogModal();
  if(action) action();
});
