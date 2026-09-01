let waitingWorker = null;
let updateDismissedThisSession = false;
let reloadingForUpdate = false;

function fmtUpdatedDate(){
  const d = parseLocalDate(APP_UPDATED_AT);
  return d ? new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric"}).format(d) : APP_UPDATED_AT;
}

function renderVersionInfo(){
  const versionEl = document.getElementById("appVersion");
  if(versionEl) versionEl.textContent = `App version: ${APP_VERSION}`;
  const updatedEl = document.getElementById("appUpdatedAt");
  if(updatedEl) updatedEl.textContent = `Last updated: ${fmtUpdatedDate()}`;
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
  waitingWorker.postMessage({type:"SKIP_WAITING"});
}

function initUpdateWatcher(){
  if(!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if(reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });

  navigator.serviceWorker.register("./sw.js").then(reg => {
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
  }).catch(() => {});
}

function checkForUpdates(){
  if(!("serviceWorker" in navigator)){
    showSaved("Updates aren’t available on this device.");
    return;
  }
  navigator.serviceWorker.getRegistration().then(reg => {
    if(!reg){ showSaved("You’re on the latest version."); return; }
    if(reg.waiting){ waitingWorker = reg.waiting; showUpdateCard(); return; }
    reg.update().then(() => {
      setTimeout(() => {
        if(reg.waiting){ waitingWorker = reg.waiting; showUpdateCard(); }
        else showSaved("You’re on the latest version.");
      }, 1200);
    }).catch(() => showSaved("Couldn’t check for updates right now."));
  });
}

document.getElementById("updateNowBtn")?.addEventListener("click", applyUpdate);
document.getElementById("updateLaterBtn")?.addEventListener("click", dismissUpdate);
document.getElementById("checkUpdatesBtn")?.addEventListener("click", checkForUpdates);
