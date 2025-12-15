import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const badge = document.getElementById("notifBadge");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const snap = await getDocs(q);

    let unread = 0;
    snap.forEach((d) => {
      if (d.data().read === false) unread++;
    });

    if (unread === 0) {
      badge.style.display = "none";
    } else {
      badge.textContent = unread;
      badge.style.display = "inline-block";
    }
  } catch (e) {
    // نخفي العداد إذا صار خطأ بدل ما نكسر الصفحة
    badge.style.display = "none";
    console.error(e);
  }
});
