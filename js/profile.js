import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { db } from "./firebase.js";

const nameEl   = document.getElementById("profileName");
const emailEl  = document.getElementById("profileEmail");
const phoneEl  = document.getElementById("profilePhone");
const roleEl   = document.getElementById("profileRole");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  emailEl.textContent = user.email;

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    console.warn("User document not found");
    return;
  }

  const data = snap.data();

  nameEl.textContent  = data.name  || "-";
  phoneEl.textContent = data.phone || "-";
  roleEl.textContent  = data.role  || "-";
});

/* ===== Logout ===== */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (err) {
      alert("حدث خطأ أثناء تسجيل الخروج");
      console.error(err);
    }
  });
}