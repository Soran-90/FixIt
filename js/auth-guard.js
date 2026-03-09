import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let checked = false;

onAuthStateChanged(auth, async (user) => {
  if (checked) return;
  checked = true;

  if (!user) {
    window.location.replace("/login.html");
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      window.location.replace("/login.html");
      return;
    }

    const role = snap.data().role;

    if (role === "worker") {
      window.location.replace("/worker/home/home.html");
    } else if (role === "admin") {
      window.location.replace("/admin/dashboard.html");
    }
    // role === "customer" → stay on page

  } catch (e) {
    console.error("auth-guard error:", e);
    window.location.replace("/login.html");
  }
});
