let waitingWorker = null;
let swRegistration = null;
let updateDismissedThisSession = false;
let reloadingForUpdate = false;
let lastAutoUpdateCheck = 0;
const AUTO_UPDATE_CHECK_THROTTLE_MS = 5*60*1000;
const SW_RELOAD_GUARD_KEY = "personal_workbench_sw_reload_at";

function fmtUpdatedDate(){
  const d = parseLocalDate(APP_UPDATED_AT);
  return d ? new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric"}).format(d) : APP_UPDATED_AT;
}

function renderVersionInfo(){
  const versionEl = document.getElementById("appVersion");
  if(versionEl) versionEl.textContent = `Version ${APP_VERSION.replace(/^v/i,"")}`;
  const updatedEl = document.getElementById("appUpdatedAt");
  if(updatedEl) updatedEl.textContent = `Updated ${fmtUpdatedDate()}`;
}

function showUpdateCard(){
  if(updateDismissedThisSession) return;
  document.getElementById("updateCard")?.classList.add("show");
}
function hideUpdateCard(){
  document.getElementById("updateCard")?.classList.remove("show");
}
function dismissUpdate(){
  updateDismissedThisSession = true;
  hideUpdateCard();
}
function applyUpdate(){
  if(!waitingWorker) return;
  const btn = document.getElementById("updateNowBtn");
  if(btn){ btn.disabled = true; btn.textContent = "Applying…"; }
  waitingWorker.postMessage({type:"SKIP_WAITING"});
}

// Session-scoped guard: controllerchange should reload the page exactly once per
// genuine new-version activation. sessionStorage (not just an in-memory flag) survives
// the reload itself, so if something ever caused a second controllerchange right after
// the reload, we still refuse to reload again and avoid a loop.
function shouldReloadForNewController(){
  if(reloadingForUpdate) return false;
  const last = Number(sessionStorage.getItem(SW_RELOAD_GUARD_KEY) || 0);
  if(Date.now() - last < 10000) return false;
  return true;
}

function throttledUpdateCheck(){
  if(!swRegistration) return;
  const now = Date.now();
  if(now - lastAutoUpdateCheck < AUTO_UPDATE_CHECK_THROTTLE_MS) return;
  lastAutoUpdateCheck = now;
  swRegistration.update().catch(() => {});
}

function initUpdateWatcher(){
  if(!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if(!shouldReloadForNewController()) return;
    reloadingForUpdate = true;
    sessionStorage.setItem(SW_RELOAD_GUARD_KEY, String(Date.now()));
    window.location.reload();
  });

  navigator.serviceWorker.register("./sw.js", {updateViaCache: "none"}).then(reg => {
    swRegistration = reg;
    if(reg.waiting && navigator.serviceWorker.controller){
      waitingWorker = reg.waiting;
      showUpdateCard();
    }
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if(!installing) return;
      installing.addEventListener("statechange", () => {
        if(installing.state === "installed" && navigator.serviceWorker.controller){
          waitingWorker = reg.waiting || installing;
          showUpdateCard();
        }
      });
    });
    // Check once right away on launch, in addition to whatever automatic check the
    // browser performs on registration — deterministic instead of relying on that alone.
    lastAutoUpdateCheck = Date.now();
    reg.update().catch(() => {});
  }).catch(() => {});

  // A standalone/home-screen PWA is often resumed from the app switcher rather than
  // freshly navigated, so the browser's own automatic update check may never fire.
  // Re-check whenever the app comes back to the foreground, throttled so rapid
  // app-switching (focus + visibilitychange firing together, repeatedly) can't spam requests.
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") throttledUpdateCheck(); });
  window.addEventListener("focus", throttledUpdateCheck);
  setInterval(throttledUpdateCheck, 60*60*1000);
}

function checkForUpdates(){
  if(!("serviceWorker" in navigator)){
    showSaved("Updates aren’t available on this device.");
    return;
  }
  showSaved("Checking…");
  navigator.serviceWorker.getRegistration().then(reg => {
    if(!reg){ showSaved("You’re on the latest version."); return; }
    if(reg.waiting){ waitingWorker = reg.waiting; showUpdateCard(); showSaved("Update available"); return; }
    reg.update().then(() => {
      setTimeout(() => {
        if(reg.waiting){ waitingWorker = reg.waiting; showUpdateCard(); showSaved("Update available"); }
        else showSaved("You’re up to date.");
      }, 1200);
    }).catch(() => showSaved("Update check failed. Try again in a moment."));
  });
}

document.getElementById("updateNowBtn")?.addEventListener("click", applyUpdate);
document.getElementById("updateLaterBtn")?.addEventListener("click", dismissUpdate);
document.getElementById("checkUpdatesBtn")?.addEventListener("click", checkForUpdates);
