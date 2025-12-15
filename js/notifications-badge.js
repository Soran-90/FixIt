import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const badge = document.getElementById("notifBadge");
const toast = document.getElementById("notifToast");
let unsubscribeNotif = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // استماع لحظي للإشعارات الجديدة
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", user.uid)
  );

  let initialized = false;
  if (unsubscribeNotif) unsubscribeNotif();
  unsubscribeNotif = onSnapshot(q, (snapshot) => {
    let unread = 0;

    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      if (change.type === "added" && initialized && data.read === false) {
        showToast(data.message || "وصل إشعار جديد");
      }
    });

    snapshot.forEach((d) => {
      if (d.data().read === false) unread++;
    });

    updateBadge(unread);
    initialized = true;
  }, (err) => {
    console.error("realtime notifications error", err);
    updateBadge(0);
  });

  try {
    const snap = await getDocs(q); // تحميل أولي سريع (fallback)
    let unread = 0;
    snap.forEach((d) => { if (d.data().read === false) unread++; });
    updateBadge(unread);
  } catch (e) {
    updateBadge(0);
    console.error(e);
  }
});

function updateBadge(unread) {
  if (!badge) return;
  if (unread === 0) {
    badge.style.display = "none";
  } else {
    badge.textContent = unread;
    badge.style.display = "inline-block";
  }
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 4000);
}
