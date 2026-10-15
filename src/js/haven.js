// "Your Haven" — the illustrated, lightly-animated room on Home (replaces the old
// photographic hero; see HOME_HERO_DAYPARTS in home.js for the daypart schedule this
// reads). Pure presentation plus a small interaction state machine: it never reads or
// writes habit/person state and never calls saveState() on the main STORAGE_KEY blob.
// Room prefs (lamp on/off, calm mode) persist separately in their own localStorage key,
// the same pattern HOME_COPY_KEY already uses in home.js for non-critical, non-backed-up
// preference data — see CLAUDE.md's "Room interactions are not habit completions".
const HAVEN_PREFS_KEY="personal_workbench_haven_v1";

// Edit this list to re-skin a cat without touching markup, CSS, or animation code —
// every visual trait a cat needs lives here.
const HAVEN_CATS=[
  {id:"laleh",name:"Laleh",fur:"#f3e6d2",patch:"#c87b4a",patch2:"#2c2420",sleeping:false},
  {id:"zerin",name:"Zerin",fur:"#8d8378",patch:"#5a534a",patch2:"#3a352f",sleeping:true}
];

function havenPrefs(){
  try{ return {lampOn:false,calm:false,...JSON.parse(localStorage.getItem(HAVEN_PREFS_KEY)||"{}")}; }
  catch{ return {lampOn:false,calm:false}; }
}
function saveHavenPrefs(p){ try{ localStorage.setItem(HAVEN_PREFS_KEY,JSON.stringify(p)); }catch{} }
function havenSystemReducedMotion(){ return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
// Checked before every walk/interaction so both the system setting AND the in-app calm
// toggle collapse motion the same way (see "Respect prefers-reduced-motion ... offer a
// calm/static mode" in the brief).
function havenReducedMotion(){ return havenSystemReducedMotion() || havenPrefs().calm; }

// Walk-to targets, in the scene's own 400x300 viewBox units. The lamp is deliberately
// NOT here — tapping it is a direct toggle, not a walk-over interaction (see
// havenHandleTap). Positions are approximate "stand beside it" spots, not exact overlap
// with the furniture, since the character can't literally stand inside the bed or chair.
const HAVEN_SPOTS={
  chair:{x:300,y:250,label:"the reading chair"},
  // Rotating -90deg around the character's own feet (the local origin) swings the body
  // out to the LEFT of this point (head ends up ~82 units further left, at roughly the
  // pillow) rather than up — so x is anchored near the FOOT of the mattress, not its
  // center, and y is the mattress's own vertical center so the lying body lands centered
  // on it rather than off the edge. See havenMoveTo's rotate handling.
  bed:{x:100,y:202,rotate:-90,label:"the bed"},
  window:{x:278,y:252,label:"the window"},
  "cat-laleh":{x:150,y:250,label:"Laleh"},
  "cat-zerin":{x:70,y:232,label:"Zerin, who's curled up asleep"}
};

let havenBuilt=false;
let havenState={x:165,y:255,busy:false};

function havenWait(ms){ return new Promise(r=>setTimeout(r,ms)); }

// Position lives ONLY on this outer, un-animated <g transform="translate(...)">. A CSS
// `transform`/`animation` on an element completely overrides its SVG `transform`
// attribute rather than composing with it — so the breathing animation has to live on an
// INNER group with no transform attribute of its own, or it silently teleports the whole
// cat to the viewBox origin the moment the animation applies. Same reasoning for the
// plants below (havenSceneHTML's .haven-plant-anchor/.haven-plant split).
function havenCatMarkup(cat,x,y){
  const sleepClass=cat.sleeping?" is-sleeping":"";
  return `
  <g transform="translate(${x},${y})">
    <g class="haven-cat${sleepClass}" id="havenCat-${cat.id}"
       style="--cat-fur:${cat.fur};--cat-patch:${cat.patch};--cat-patch2:${cat.patch2}">
      <ellipse class="haven-cat-tail" cx="11" cy="1" rx="9" ry="2.6"></ellipse>
      <ellipse class="haven-cat-body" cx="0" cy="0" rx="13" ry="7.6"></ellipse>
      <path class="haven-cat-patch" d="M-15,-2 q5,6 10,1 q1,-4 -3,-5 Z"></path>
      <circle class="haven-cat-head" cx="-12" cy="-6" r="7.2"></circle>
      <path class="haven-cat-ear" d="M-18,-10.5 l2.6,-5 l2.6,5 Z"></path>
      <path class="haven-cat-ear" d="M-9.4,-10.5 l2.6,-5 l2.6,5 Z"></path>
      ${cat.sleeping
        ? `<path class="haven-cat-eye-closed" d="M-16,-6.4 q1.6,1.2 3.2,0"></path><path class="haven-cat-eye-closed" d="M-10.6,-6.4 q1.6,1.2 3.2,0"></path>`
        : `<rect class="haven-cat-eye" x="-15.8" y="-7.2" width="2.2" height="2.2" rx="1"></rect><rect class="haven-cat-eye" x="-10.6" y="-7.2" width="2.2" height="2.2" rx="1"></rect>`}
      <path class="haven-cat-nose" d="M-13,-4.4 l1,1.3 l-2,0 Z"></path>
    </g>
  </g>`;
}

function havenSceneHTML(){
  return `
  <svg class="haven-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" role="presentation" aria-hidden="true">
    <defs>
      <clipPath id="havenWindowArch"><path d="M234,146 L234,72 A56,56 0 0 1 346,72 L346,146 Z"></path></clipPath>
      <radialGradient id="havenLampGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffdca3" stop-opacity=".85"></stop>
        <stop offset="100%" stop-color="#ffdca3" stop-opacity="0"></stop>
      </radialGradient>
    </defs>

    <rect class="haven-wall" x="0" y="0" width="400" height="216"></rect>
    <rect class="haven-floor" x="0" y="216" width="400" height="84"></rect>
    <g class="haven-planks" aria-hidden="true">
      <line x1="55" y1="216" x2="55" y2="300"></line>
      <line x1="120" y1="216" x2="120" y2="300"></line>
      <line x1="210" y1="216" x2="210" y2="300"></line>
      <line x1="275" y1="216" x2="275" y2="300"></line>
      <line x1="340" y1="216" x2="340" y2="300"></line>
    </g>

    <g clip-path="url(#havenWindowArch)">
      <rect class="haven-sky" x="228" y="8" width="124" height="142"></rect>
      <circle class="haven-sun" cx="312" cy="50" r="13"></circle>
      <g class="haven-moon">
        <circle cx="266" cy="42" r="10" fill="#f6edd8"></circle>
        <circle cx="270" cy="39" r="9" class="haven-moon-shadow"></circle>
      </g>
      <g class="haven-stars">
        <circle class="haven-star" cx="250" cy="30" r="1.2"></circle>
        <circle class="haven-star" cx="330" cy="28" r="1"></circle>
        <circle class="haven-star" cx="300" cy="22" r="1.3"></circle>
        <circle class="haven-star" cx="338" cy="55" r="1"></circle>
      </g>
      <g class="haven-cloud haven-cloud-a"><ellipse cx="255" cy="40" rx="16" ry="6"></ellipse><ellipse cx="268" cy="36" rx="11" ry="5"></ellipse></g>
      <g class="haven-cloud haven-cloud-b"><ellipse cx="320" cy="60" rx="13" ry="5"></ellipse><ellipse cx="331" cy="57" rx="9" ry="4"></ellipse></g>
      <path class="haven-hills" d="M234,146 L234,112 Q262,94 290,108 Q318,92 346,110 L346,146 Z"></path>
      <circle class="haven-hill-light" cx="256" cy="118" r="1.4"></circle>
      <circle class="haven-hill-light" cx="276" cy="122" r="1.2"></circle>
      <circle class="haven-hill-light" cx="312" cy="120" r="1.3"></circle>
      <circle class="haven-hill-light" cx="330" cy="124" r="1.1"></circle>
    </g>
    <path class="haven-window-frame" d="M234,146 L234,72 A56,56 0 0 1 346,72 L346,146" fill="none"></path>
    <line class="haven-window-bar" x1="290" y1="18" x2="290" y2="146"></line>
    <line class="haven-window-bar" x1="234" y1="97" x2="346" y2="97"></line>
    <rect class="haven-window-sill" x="222" y="145" width="136" height="7" rx="2"></rect>
    <path class="haven-curtain" d="M318,20 Q330,76 320,145 Q345,138 344,20 Z"></path>

    <rect class="haven-wood" x="116" y="190" width="34" height="38" rx="3"></rect>
    <circle id="havenLampGlow" class="haven-lamp-glow" cx="131" cy="158" r="32" fill="url(#havenLampGradient)"></circle>
    <rect class="haven-wood-dark" x="127" y="172" width="8" height="18"></rect>
    <path id="havenLampshade" class="haven-lampshade" d="M118,172 L144,172 L136,148 L126,148 Z"></path>

    <rect class="haven-bed-frame" x="14" y="138" width="68" height="100" rx="16"></rect>
    <rect class="haven-bed-mattress" x="18" y="172" width="98" height="60" rx="12"></rect>
    <rect class="haven-bed-blanket" x="18" y="200" width="98" height="34" rx="12"></rect>
    <rect class="haven-bed-pillow" x="22" y="176" width="40" height="22" rx="9"></rect>
    ${havenCatMarkup(HAVEN_CATS.find(c=>c.sleeping)||HAVEN_CATS[1],40,186)}

    <rect class="haven-wood" x="296" y="118" width="72" height="94" rx="4"></rect>
    <line class="haven-cabinet-split" x1="332" y1="118" x2="332" y2="212"></line>
    <circle class="haven-cabinet-handle" cx="326" cy="166" r="1.6"></circle>
    <circle class="haven-cabinet-handle" cx="338" cy="166" r="1.6"></circle>
    <rect class="haven-book" x="300" y="108" width="16" height="10" rx="1" transform="rotate(-4 308 113)"></rect>
    <rect class="haven-book" x="314" y="106" width="14" height="12" rx="1"></rect>
    <g transform="translate(354,96)">
      <g class="haven-plant haven-plant-small">
        <rect class="haven-wood" x="-8" y="16" width="18" height="16" rx="3"></rect>
        <path class="haven-plant-leaf" d="M1,16 Q-10,2 -4,-8"></path>
        <path class="haven-plant-leaf" d="M3,16 Q6,0 16,-6"></path>
        <path class="haven-plant-leaf" d="M2,16 Q2,-2 2,-12"></path>
      </g>
    </g>

    <rect class="haven-chair-back" x="304" y="194" width="58" height="48" rx="15"></rect>
    <rect class="haven-chair-arm" x="296" y="212" width="15" height="38" rx="7"></rect>
    <rect class="haven-chair-arm" x="361" y="212" width="15" height="38" rx="7"></rect>
    <rect class="haven-chair-seat" x="304" y="230" width="58" height="22" rx="9"></rect>
    <ellipse class="haven-chair-pillow" cx="333" cy="220" rx="14" ry="8"></ellipse>

    <g transform="translate(378,258)">
      <g class="haven-plant haven-plant-big">
        <rect class="haven-wood" x="-14" y="16" width="26" height="24" rx="4"></rect>
        <path class="haven-plant-leaf haven-plant-leaf-big" d="M-1,16 Q-22,0 -10,-20"></path>
        <path class="haven-plant-leaf haven-plant-leaf-big" d="M1,16 Q10,-4 2,-26"></path>
        <path class="haven-plant-leaf haven-plant-leaf-big" d="M2,16 Q22,2 16,-16"></path>
      </g>
    </g>

    <ellipse class="haven-rug" cx="165" cy="258" rx="100" ry="30"></ellipse>
    <ellipse class="haven-rug-ring" cx="165" cy="258" rx="76" ry="22"></ellipse>

    ${havenCatMarkup(HAVEN_CATS.find(c=>!c.sleeping)||HAVEN_CATS[0],150,254)}

    <g id="havenCharacter" class="haven-character" transform="translate(165,255)">
      <rect class="haven-leg haven-leg-l" x="-9" y="-30" width="7" height="30" rx="3.2"></rect>
      <rect class="haven-leg haven-leg-r" x="2" y="-30" width="7" height="30" rx="3.2"></rect>
      <g class="haven-torso">
        <rect class="haven-arm haven-arm-l" x="-15" y="-55" width="6" height="21" rx="3"></rect>
        <rect class="haven-arm haven-arm-r" x="9" y="-55" width="6" height="21" rx="3"></rect>
        <rect class="haven-cardigan" x="-12" y="-58" width="24" height="31" rx="10"></rect>
        <rect class="haven-top" x="-5" y="-58" width="10" height="9" rx="4"></rect>
        <path class="haven-hair-back" d="M-11,-66 Q-11,-82 0,-82 Q11,-82 11,-66 Q11,-55 7,-50 Q9,-60 0,-61 Q-9,-60 -7,-50 Q-11,-55 -11,-66 Z"></path>
        <circle class="haven-head" cx="0" cy="-66" r="10.5"></circle>
        <path class="haven-hair-fringe" d="M-10.5,-69 Q0,-79 10.5,-69 Q10.5,-73 0,-75 Q-10.5,-73 -10.5,-69 Z"></path>
        <rect class="haven-eye" x="-4.2" y="-67" width="2.6" height="2.6" rx="1"></rect>
        <rect class="haven-eye" x="1.6" y="-67" width="2.6" height="2.6" rx="1"></rect>
        <path class="haven-mouth" d="M-2.6,-61.5 q2.6,2 5.2,0"></path>
      </g>
    </g>
  </svg>
  <button type="button" class="haven-hotspot" data-spot="lamp" style="left:33%;top:50.5%" aria-pressed="false" aria-label="Turn the lamp on"></button>
  <button type="button" class="haven-hotspot" data-spot="chair" style="left:83%;top:77%" aria-label="Walk to the reading chair and sit"></button>
  <button type="button" class="haven-hotspot" data-spot="bed" style="left:19%;top:72%" aria-label="Walk to the bed and rest"></button>
  <button type="button" class="haven-hotspot" data-spot="window" style="left:72.5%;top:84%" aria-label="Walk to the window"></button>
  <button type="button" class="haven-hotspot haven-hotspot-cat" data-spot="cat-laleh" style="left:37.5%;top:83%" aria-label="Walk over and pet Laleh"></button>
  <button type="button" class="haven-hotspot haven-hotspot-cat" data-spot="cat-zerin" style="left:9%;top:54%" aria-label="Walk over and pet Zerin, who's curled up asleep"></button>
  `;
}

function havenApplyLampState(on){
  document.getElementById("havenLampGlow")?.classList.toggle("lamp-on",on);
  document.getElementById("havenLampshade")?.classList.toggle("lamp-on",on);
  const btn=document.querySelector('#havenScene .haven-hotspot[data-spot="lamp"]');
  if(btn){ btn.setAttribute("aria-pressed",String(!!on)); btn.setAttribute("aria-label",on?"Turn the lamp off":"Turn the lamp on"); }
}
function havenApplyCalmState(calm){
  const scene=document.getElementById("havenScene");
  if(scene) scene.classList.toggle("is-calm",!!calm||havenSystemReducedMotion());
  const btn=document.getElementById("havenCalmToggle");
  if(!btn) return;
  btn.setAttribute("aria-pressed",String(!!calm));
  btn.setAttribute("aria-label",calm?"Turn calm mode off":"Turn calm mode on");
  btn.classList.toggle("active",!!calm);
}
function havenToggleLamp(){
  const prefs=havenPrefs();
  prefs.lampOn=!prefs.lampOn;
  saveHavenPrefs(prefs);
  havenApplyLampState(prefs.lampOn);
}
function havenSetPose(pose){
  const el=document.getElementById("havenCharacter");
  if(!el) return;
  el.classList.remove("is-sitting","is-resting","is-petting");
  if(pose==="sit") el.classList.add("is-sitting");
  else if(pose==="rest") el.classList.add("is-resting");
  else if(pose==="pet") el.classList.add("is-petting");
}
// Transitions the character root's own transform; CSS (not JS) animates the legs/arms
// while .is-walking is present, so this only ever owns POSITION, never gait.
function havenMoveTo(x,y,{rotate=0}={}){
  const el=document.getElementById("havenCharacter");
  if(!el) return Promise.resolve();
  const dist=Math.hypot(x-havenState.x,y-havenState.y);
  const reduced=havenReducedMotion();
  const duration=reduced?0:Math.min(1500,Math.max(320,dist*7));
  el.style.transition=duration?`transform ${duration}ms cubic-bezier(.4,0,.2,1)`:"none";
  if(duration) el.classList.add("is-walking");
  el.style.transform=`translate(${x}px,${y}px)${rotate?` rotate(${rotate}deg)`:""}`;
  havenState.x=x; havenState.y=y;
  if(!duration){ el.classList.remove("is-walking"); return Promise.resolve(); }
  return new Promise(resolve=>{
    const finish=()=>{ el.removeEventListener("transitionend",finish); el.classList.remove("is-walking"); resolve(); };
    el.addEventListener("transitionend",finish,{once:true});
    setTimeout(finish,duration+120); // belt-and-braces: a backgrounded tab can drop transitionend entirely
  });
}
function havenReactCat(id){
  const cat=document.getElementById("havenCat-"+id);
  if(!cat) return;
  cat.classList.add("is-happy");
  clearTimeout(cat._havenHappyTimer);
  cat._havenHappyTimer=setTimeout(()=>cat.classList.remove("is-happy"),2400);
}
async function havenHandleTap(spotId){
  if(spotId==="lamp"){ havenToggleLamp(); return; } // a direct toggle, not a walk-over — see HAVEN_SPOTS comment
  if(havenState.busy) return; // ignore taps mid-walk/mid-action rather than queuing or interrupting
  const spot=HAVEN_SPOTS[spotId];
  if(!spot) return;
  havenState.busy=true;
  try{
    havenSetPose("idle");
    await havenMoveTo(spot.x,spot.y,{rotate:spot.rotate||0});
    if(spotId==="chair") havenSetPose("sit");
    else if(spotId==="bed") havenSetPose("rest");
    else if(spotId.startsWith("cat-")){
      havenSetPose("pet");
      havenReactCat(spotId.slice(4));
    }
  } finally {
    havenState.busy=false;
  }
}
function havenShouldPause(){
  return document.hidden || !document.getElementById("homeView")?.classList.contains("active");
}
function havenUpdatePauseState(){
  document.getElementById("havenScene")?.classList.toggle("is-paused",havenShouldPause());
}
function havenWireInteractions(){
  document.querySelectorAll("#havenScene .haven-hotspot").forEach(btn=>{
    btn.addEventListener("click",()=>havenHandleTap(btn.dataset.spot));
  });
  document.getElementById("havenCalmToggle")?.addEventListener("click",()=>{
    const prefs=havenPrefs();
    prefs.calm=!prefs.calm;
    saveHavenPrefs(prefs);
    havenApplyCalmState(prefs.calm);
  });
  document.addEventListener("visibilitychange",havenUpdatePauseState);
  const homeViewEl=document.getElementById("homeView");
  if(homeViewEl && "MutationObserver" in window){
    new MutationObserver(havenUpdatePauseState).observe(homeViewEl,{attributes:true,attributeFilter:["class"]});
  }
  if(window.matchMedia){
    const mq=window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange=()=>havenApplyCalmState(havenPrefs().calm);
    mq.addEventListener ? mq.addEventListener("change",onChange) : mq.addListener(onChange);
  }
}
// Called by home.js's renderHomeHero on every Home render. The scene is built ONCE —
// rebuilding innerHTML on every render would reset the character's position and
// interrupt any ambient/walk animation in progress every time renderHome() fires (e.g.
// the daypart-boundary timer in home.js); only the daypart (for lighting) is updated
// after the first build.
function renderHavenScene(daypart){
  const scene=document.getElementById("havenScene");
  if(!scene) return;
  if(!havenBuilt){
    scene.innerHTML=havenSceneHTML();
    havenBuilt=true;
    havenWireInteractions();
    const prefs=havenPrefs();
    havenApplyLampState(prefs.lampOn);
    havenApplyCalmState(prefs.calm);
    havenUpdatePauseState();
  }
  scene.dataset.daypart=daypart;
}
