import { auth, db, storage } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const steps = Array.from(document.querySelectorAll(".wizard-step"));
const progressNodes = Array.from(document.querySelectorAll(".wizard-step-item"));
const stepHint = document.getElementById("stepHint");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitOrder");
const draftBadge = document.getElementById("draftStatus");

const serviceType = document.getElementById("serviceType");
const description = document.getElementById("description");
const address = document.getElementById("address");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const locationStatus = document.getElementById("locationStatus");
const photosInput = document.getElementById("photos");
const photosPreview = document.getElementById("photosPreview");

const previewService = document.getElementById("previewService");
const previewDescription = document.getElementById("previewDescription");
const previewAddress = document.getElementById("previewAddress");
const previewLocation = document.getElementById("previewLocation");
const previewDate = document.getElementById("previewDate");
const previewTime = document.getElementById("previewTime");
const previewPhotos = document.getElementById("previewPhotos");

let userLat = null;
let userLng = null;
let currentStep = 0;
let currentUserId = null;
let autoSaveTimer = null;
let photosState = [];
let draftPhotoNames = [];
const MAX_PHOTOS = 8;
const DRAFT_KEY = "newOrderDraft";

function showStep(index) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, i) => step.classList.toggle("active", i === currentStep));
  progressNodes.forEach((node, i) => node.classList.toggle("active", i <= currentStep));

  backBtn.disabled = currentStep === 0;
  nextBtn.hidden = currentStep === steps.length - 1;
  submitBtn.hidden = currentStep !== steps.length - 1;
  stepHint.textContent = `الخطوة ${currentStep + 1} من ${steps.length}`;

  if (currentStep === steps.length - 1) {
    updatePreview();
  }
}

function validateStep(stepIndex) {
  if (stepIndex === 0) {
    if (!serviceType.value) {
      alert("يرجى اختيار نوع الخدمة");
      return false;
    }
    if (!description.value.trim()) {
      alert("يرجى كتابة وصف واضح للعطل");
      return false;
    }
  }

  if (stepIndex === 1) {
    if (!address.value.trim() || !dateInput.value || !timeInput.value) {
      alert("يرجى إدخال العنوان والتاريخ والوقت");
      return false;
    }
    if (userLat === null || userLng === null) {
      alert("يرجى تحديد الموقع عبر GPS");
      return false;
    }
  }

  return true;
}

function updatePreview() {
  previewService.textContent = serviceType.value || "-";
  previewDescription.textContent = description.value.trim() || "-";
  previewAddress.textContent = address.value.trim() || "-";
  previewLocation.textContent =
    userLat && userLng ? `${userLat.toFixed(5)}, ${userLng.toFixed(5)}` : "لم يتم تحديد الموقع";
  previewDate.textContent = dateInput.value || "-";
  previewTime.textContent = timeInput.value || "-";
  if (photosState.length) {
    previewPhotos.textContent = `${photosState.length} مرفق${photosState.length > 1 ? "ات" : ""}`;
  } else if (draftPhotoNames.length) {
    previewPhotos.textContent = `تم حفظ أسماء ${draftPhotoNames.length} مرفقات، يرجى إعادة رفعها قبل الإرسال`;
  } else {
    previewPhotos.textContent = "لا توجد مرفقات";
  }
}

function scheduleDraftSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveDraft, 500);
}

function getDraftPayload() {
  return {
    serviceType: serviceType.value,
    description: description.value,
    address: address.value,
    date: dateInput.value,
    time: timeInput.value,
    userLat,
    userLng,
    photoNames: photosState.length ? photosState.map((p) => p.name) : draftPhotoNames,
    updatedAt: Date.now()
  };
}

async function saveDraft() {
  const payload = getDraftPayload();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  draftBadge.textContent = "تم الحفظ محلياً";

  if (currentUserId) {
    try {
      await setDoc(doc(db, "users", currentUserId), { orderDraft: payload }, { merge: true });
      draftBadge.textContent = "تم الحفظ في الحساب";
    } catch (e) {
      console.error("draft sync error", e);
      draftBadge.textContent = "تعذر مزامنة المسودة";
    }
  }
}

function applyDraft(draft) {
  serviceType.value = draft.serviceType || "";
  description.value = draft.description || "";
  address.value = draft.address || "";
  dateInput.value = draft.date || "";
  timeInput.value = draft.time || "";
  draftPhotoNames = draft.photoNames || [];
  userLat = draft.userLat ?? null;
  userLng = draft.userLng ?? null;
  if (userLat && userLng) {
    locationStatus.textContent = "✅ تم استرجاع الموقع";
  }
  updatePreview();
}

async function loadDraft() {
  let chosenDraft = null;
  let latestUpdatedAt = 0;

  const localDraft = localStorage.getItem(DRAFT_KEY);
  if (localDraft) {
    try {
      const parsed = JSON.parse(localDraft);
      chosenDraft = parsed;
      latestUpdatedAt = parsed.updatedAt || 0;
    } catch (e) {
      console.error("local draft parse error", e);
    }
  }

  if (currentUserId) {
    try {
      const snap = await getDoc(doc(db, "users", currentUserId));
      const remoteDraft = snap.data()?.orderDraft;
      if (remoteDraft && (remoteDraft.updatedAt || 0) > latestUpdatedAt) {
        chosenDraft = remoteDraft;
        latestUpdatedAt = remoteDraft.updatedAt;
      }
    } catch (e) {
      console.error("remote draft load error", e);
    }
  }

  if (chosenDraft) {
    applyDraft(chosenDraft);
    draftBadge.textContent = "تم استرجاع المسودة";
  }
}

function addPhotoCard(fileObj) {
  const wrapper = document.createElement("div");
  wrapper.className = "preview-thumb";

  const img = document.createElement("img");
  img.src = fileObj.previewUrl;
  img.alt = fileObj.name;

  const nameEl = document.createElement("span");
  nameEl.textContent = fileObj.name;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "إزالة";
  removeBtn.addEventListener("click", () => {
    photosState = photosState.filter((p) => p.id !== fileObj.id);
    renderPhotos();
    scheduleDraftSave();
  });

  wrapper.appendChild(img);
  wrapper.appendChild(nameEl);
  wrapper.appendChild(removeBtn);
  photosPreview.appendChild(wrapper);
}

function renderPhotos() {
  photosPreview.innerHTML = "";
  photosState.forEach(addPhotoCard);
  updatePreview();
}

function handleFiles(fileList) {
  const newFiles = Array.from(fileList).slice(0, MAX_PHOTOS - photosState.length);
  if (!newFiles.length) {
    alert(`يمكن إضافة ${MAX_PHOTOS} صور كحد أقصى`);
    return;
  }

  newFiles.forEach(async (file) => {
    try {
      const compressed = await compressImage(file);
      draftPhotoNames = [];
      photosState.push({
        id: crypto.randomUUID(),
        blob: compressed.blob,
        previewUrl: compressed.preview,
        name: file.name
      });
      renderPhotos();
      scheduleDraftSave();
    } catch (e) {
      console.error("compress error", e);
      alert("تعذر قراءة إحدى الصور");
    }
  });
}

function compressImage(file, maxDim = 1600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("failed to compress"));
            resolve({ blob, preview: canvas.toDataURL("image/jpeg", 0.6) });
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadPhotos() {
  const urls = [];
  for (let i = 0; i < photosState.length; i++) {
    const photo = photosState[i];
    const storageRef = ref(storage, `orders/${auth.currentUser.uid}/${Date.now()}-${i}.jpg`);
    const snapshot = await uploadBytes(storageRef, photo.blob, { contentType: "image/jpeg" });
    const url = await getDownloadURL(snapshot.ref);
    urls.push(url);
  }
  return urls;
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function bindInputs() {
  [serviceType, description, address, dateInput, timeInput].forEach((el) => {
    el.addEventListener("input", scheduleDraftSave);
  });
}

function setupNavigation() {
  nextBtn.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1);
  });

  backBtn.addEventListener("click", () => showStep(currentStep - 1));
}

function setupLocation() {
  document.getElementById("getLocationBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("المتصفح لا يدعم GPS");
      return;
    }

    locationStatus.textContent = "⏳ جاري تحديد الموقع...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        locationStatus.textContent = "✅ تم تحديد الموقع";
        scheduleDraftSave();
      },
      () => {
        alert("❌ لم يتم السماح بتحديد الموقع");
        locationStatus.textContent = "";
      }
    );
  });
}

function setupPhotos() {
  photosInput.addEventListener("change", (e) => handleFiles(e.target.files));

  const uploadBox = document.querySelector(".upload-box");
  uploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.classList.add("dragging");
  });
  uploadBox.addEventListener("dragleave", () => uploadBox.classList.remove("dragging"));
  uploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadBox.classList.remove("dragging");
    handleFiles(e.dataTransfer.files);
  });
}

async function submitOrder() {
  if (!validateStep(0) || !validateStep(1)) {
    showStep(0);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "جاري الإرسال...";

  try {
    const workersSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "worker"))
    );

    let nearestWorker = null;
    let minDistance = Infinity;

    workersSnap.forEach((docSnap) => {
      const worker = docSnap.data();
      if (!worker.workerLocation) return;

      const dist = getDistance(
        userLat,
        userLng,
        worker.workerLocation.lat,
        worker.workerLocation.lng
      );

      if (dist < minDistance) {
        minDistance = dist;
        nearestWorker = docSnap.id;
      }
    });

    const photoUrls = photosState.length ? await uploadPhotos() : [];

    await addDoc(collection(db, "orders"), {
      userId: auth.currentUser.uid,
      serviceType: serviceType.value,
      description: description.value.trim(),
      address: address.value.trim(),
      location: { lat: userLat, lng: userLng },
      date: dateInput.value,
      time: timeInput.value,
      photos: photoUrls,
      status: nearestWorker ? "assigned" : "pending",
      assignedTo: nearestWorker,
      createdAt: serverTimestamp()
    });

    localStorage.removeItem(DRAFT_KEY);
    draftPhotoNames = [];
    if (currentUserId) {
      await setDoc(doc(db, "users", currentUserId), { orderDraft: null }, { merge: true });
    }

    alert("✅ تم إرسال الطلب بنجاح");
    window.location.href = "orders.html";
  } catch (e) {
    alert("❌ فشل إرسال الطلب");
    console.error(e);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "إرسال الطلب";
  }
}

function init() {
  showStep(0);
  bindInputs();
  setupNavigation();
  setupLocation();
  setupPhotos();
  loadDraft();

  nextBtn.addEventListener("click", updatePreview);
  submitBtn.addEventListener("click", submitOrder);
  onAuthStateChanged(auth, async (user) => {
    currentUserId = user?.uid || null;
    await loadDraft();
  });
}

init();
