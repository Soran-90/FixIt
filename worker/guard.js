import { auth, db } from "../js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    await auth.signOut();
    window.location.href = "/login.html";
    return;
  }

  const data = snap.data();

  // 🚫 مو عامل
  if (data.role !== "worker") {
    window.location.href = "/customer/home/home.html";
  }
});