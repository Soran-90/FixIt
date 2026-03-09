import { auth, db } from "../../js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const totalEl    = document.getElementById("totalOrders");
const activeEl   = document.getElementById("activeOrders");
const ratingEl   = document.getElementById("ratingAvg");
const newOrdersEl = document.getElementById("newOrders");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  loadStats(user.uid);
  loadNewOrders(user.uid);
});

async function loadStats(workerId) {
  const snap = await getDocs(
    query(collection(db, "orders"), where("assignedTo", "==", workerId))
  );

  let total = 0;
  let active = 0;

  snap.forEach((d) => {
    total++;
    const s = d.data().status;
    if (s === "accepted" || s === "assigned") active++;
  });

  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;

  // تحميل متوسط التقييم من Firestore مباشرة
  try {
    const userSnap = await getDoc(doc(db, "users", workerId));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (ratingEl) {
        ratingEl.textContent = data.ratingAvg
          ? `${parseFloat(data.ratingAvg).toFixed(1)} ⭐`
          : "—";
      }
    }
  } catch {
    if (ratingEl) ratingEl.textContent = "—";
  }
}

async function loadNewOrders(workerId) {
  if (!newOrdersEl) return;
  newOrdersEl.innerHTML = "";

  const q = query(
    collection(db, "orders"),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    newOrdersEl.innerHTML = `<p class="muted">لا توجد طلبات جديدة</p>`;
    return;
  }

  snap.forEach((docSnap) => {
    const o = docSnap.data();
    const card = document.createElement("div");
    card.className = "order-card";
    card.innerHTML = `
      <p><strong>${escapeHTML(o.serviceType || "—")}</strong></p>
      <p class="muted">${escapeHTML(o.address || "—")}</p>
      <span class="badge warning">قيد الانتظار</span>
    `;
    newOrdersEl.appendChild(card);
  });
}

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
