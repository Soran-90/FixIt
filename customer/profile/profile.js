import { auth, db } from "../../js/firebase.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ===== Elements ===== */
const nameEl = document.getElementById("profileName");
const emailEl = document.getElementById("profileEmail");
const phoneEl = document.getElementById("profilePhone");
const roleEl = document.getElementById("profileRole");
const logoutBtn = document.getElementById("logoutBtn");

/* ===== Load User ===== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;

    const data = snap.data();

    nameEl.textContent = data.name || "—";
    emailEl.textContent = data.email || user.email;
    phoneEl.textContent = data.phone || "غير مضاف";
    roleEl.textContent = translateRole(data.role);

  } catch (err) {
    console.error("Profile load error:", err);
  }
});

/* ===== Logout ===== */
logoutBtn.addEventListener("click", async () => {
  const ok = confirm("هل أنت متأكد من تسجيل الخروج؟");
  if (!ok) return;

  try {
    await signOut(auth);
    window.location.href = "../../login.html";
  } catch (e) {
    alert("حدث خطأ أثناء تسجيل الخروج");
    console.error(e);
  }
});

/* ===== Helpers ===== */
function translateRole(role) {
  switch (role) {
    case "customer": return "زبون";
    case "worker": return "عامل";
    case "admin": return "مدير";
    default: return role || "—";
  }
}