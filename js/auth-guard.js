import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {

  // 🔴 غير مسجل دخول
  if (!user) {
    if (!location.pathname.endsWith("login.html")) {
      window.location.replace("login.html");
    }
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await auth.signOut();
      window.location.replace("login.html");
      return;
    }

    const role = snap.data().role;
    const path = location.pathname;

    // 🔐 توجيه فقط إذا دخل صفحة غير مسموحة له
    if (role === "admin") {
      if (!path.includes("/admin/")) {
        window.location.replace("admin/dashboard.html");
      }
      return;
    }

    if (role === "worker") {
      if (!path.endsWith("worker.html")) {
        window.location.replace("worker.html");
      }
      return;
    }

    // 👤 customer
    // مسموح له التنقل بين صفحات المستخدم
    // ❌ لا يوجد أي redirect هنا

  } catch (e) {
    console.error(e);
    await auth.signOut();
    window.location.replace("login.html");
  }
});
