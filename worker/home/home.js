import { auth, db } from "../../js/firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* Elements */
const totalEl = document.getElementById("totalOrders");
const activeEl = document.getElementById("activeOrders");
const ratingEl = document.getElementById("ratingAvg");
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

  totalEl.textContent = total;
  activeEl.textContent = active;

  // rating من users
  const userSnap = await fetch(`../../api/get-user-rating?uid=${workerId}`).catch(() => null);
  // fallback
  ratingEl.textContent = "—";
}

async function loadNewOrders(workerId) {
  newOrdersEl.innerHTML = "";

  const q = query(
    collection(db, "orders"),
    where("status", "in", ["pending", "assigned"])
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
      <p><strong>${o.serviceType}</strong></p>
      <p class="muted">${o.address || "—"}</p>
      <span class="badge status-${o.status}">
        ${translateStatus(o.status)}
      </span>
    `;

    newOrdersEl.appendChild(card);
  });
}

function translateStatus(s) {
  switch (s) {
    case "pending": return "قيد الانتظار";
    case "assigned": return "مُسند";
    case "accepted": return "قيد التنفيذ";
    default: return s;
  }
}