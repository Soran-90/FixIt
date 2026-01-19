import { auth, db } from "../../js/firebase.js";
import { signOut } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  getDoc
} from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const nameEl = document.getElementById("workerName");
const emailEl = document.getElementById("workerEmail");
const roleEl = document.getElementById("workerRole");
const avgEl = document.getElementById("ratingAvg");
const countEl = document.getElementById("ratingCount");
const logoutBtn = document.getElementById("logoutBtn");

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  emailEl.textContent = user.email || "—";

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  nameEl.textContent = data.name || "—";
  roleEl.textContent = data.role || "worker";
  avgEl.textContent = data.ratingAvg
    ? `${data.ratingAvg} / 5`
    : "—";
  countEl.textContent = data.ratingCount
    ? `${data.ratingCount} تقييم`
    : "لا توجد تقييمات";
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../../login.html";
});
const userSnap = await getDoc(doc(db, "users", user.uid));

if (userSnap.data().role !== "worker") {
  alert("❌ هذه الصفحة خاصة بالعامل");
  return;
}