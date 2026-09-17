// Minimal IndexedDB abstraction for optional person profile photos. Kept separate from
// localStorage/state.js on purpose — image bytes are large enough that storing them in the
// single localStorage state blob (see STORAGE_KEY in state.js) risks hitting the quota with
// only a handful of photos. Only a photoId reference lives on the person record itself.
const PHOTO_DB_NAME="personal_workbench_photos";
const PHOTO_DB_VERSION=1;
const PHOTO_STORE="photos";
const PHOTO_MAX_DIMENSION=160; // ~2x a 54-80px avatar slot — enough for Retina without storing full-res originals
const PHOTO_QUALITY=0.82;

let photoDbPromise=null;
function openPhotoDB(){
  if(photoDbPromise) return photoDbPromise;
  photoDbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(PHOTO_DB_NAME,PHOTO_DB_VERSION);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(PHOTO_STORE)) req.result.createObjectStore(PHOTO_STORE); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return photoDbPromise;
}
function savePhoto(id,blob){
  return openPhotoDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");
    tx.objectStore(PHOTO_STORE).put(blob,id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  }));
}
// put() with an existing key overwrites in place, so replacing a photo is just saving again.
const replacePhoto=savePhoto;
async function getPhoto(id){
  if(!id) return null;
  try{
    const db=await openPhotoDB();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(PHOTO_STORE,"readonly");
      const req=tx.objectStore(PHOTO_STORE).get(id);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
  }catch(_e){ return null; } // missing/corrupt IndexedDB entry — caller falls back to icon+color
}
async function deletePhoto(id){
  if(!id) return;
  try{
    const db=await openPhotoDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(PHOTO_STORE,"readwrite");
      tx.objectStore(PHOTO_STORE).delete(id);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }catch(_e){}
}
async function clearAllPhotos(){
  try{
    const db=await openPhotoDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(PHOTO_STORE,"readwrite");
      tx.objectStore(PHOTO_STORE).clear();
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }catch(_e){}
}

// Resizes/compresses an uploaded image file down to an avatar-appropriate JPEG blob before
// it ever reaches IndexedDB, so a multi-megabyte phone photo doesn't get stored as-is.
function resizePhotoFile(file,maxDimension=PHOTO_MAX_DIMENSION,quality=PHOTO_QUALITY){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const scale=Math.min(1,maxDimension/Math.max(img.width,img.height));
      const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
      const canvas=document.createElement("canvas");
      canvas.width=w;canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not process that image")),"image/jpeg",quality);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read that image"))};
    img.src=url;
  });
}

// Backups can't reach into another origin's IndexedDB, so a photo's bytes are embedded as a
// base64 data URL inside the exported JSON purely for the backup file itself — the app never
// stores photos in localStorage day-to-day, only in this backup snapshot.
function blobToDataURL(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function dataURLToBlob(dataURL){
  const match=/^data:([^;]+);base64,(.*)$/.exec(dataURL||"");
  if(!match) return null;
  const bytes=atob(match[2]);
  const arr=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
  return new Blob([arr],{type:match[1]});
}
