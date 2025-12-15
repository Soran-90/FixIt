import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("notificationsContainer");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = "لا توجد إشعارات";
      return;
    }

    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));

    // ترتيب محلي (الأحدث أولاً) بدون orderBy لتجنب index
    list.sort((a, b) => {
      const at = a.createdAt?.seconds || 0;
      const bt = b.createdAt?.seconds || 0;
      return bt - at;
    });

    container.innerHTML = "";

    for (const n of list) {
      const div = document.createElement("div");
      div.className = "order-card";
      div.textContent = n.message || "إشعار";

      container.appendChild(div);

      if (n.read === false) {
        await updateDoc(doc(db, "notifications", n.id), { read: true });
      }
    }
  } catch (e) {
    container.innerHTML = "❌ لا يمكن تحميل الإشعارات الآن";
    console.error(e);
  }
});
