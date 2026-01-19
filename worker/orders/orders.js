import { auth, db } from "../../js/firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc
} from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("ordersContainer");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  loadOrders(user.uid);
});

async function loadOrders(workerId) {
  container.innerHTML = "";

  const q = query(
    collection(db, "orders"),
    where("assignedTo", "==", workerId)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = `<p class="muted">لا توجد طلبات حالياً</p>`;
    return;
  }

  snap.forEach((orderSnap) => {
    const o = orderSnap.data();
    const orderId = orderSnap.id;

    const card = document.createElement("div");
    card.className = "order-card";

    card.innerHTML = `
      <p><strong>${escapeHTML(o.serviceType || "")}</strong></p>
      <p class="muted">${escapeHTML(o.address || "—")}</p>

      <span class="badge status-${o.status}">
        ${translateStatus(o.status)}
      </span>
    `;

    /* Actions */
    if (o.status === "assigned") {
      const btn = document.createElement("button");
      btn.textContent = "قبول الطلب";
      btn.className = "btn-primary";

      btn.onclick = async () => {
        btn.disabled = true;
        await updateDoc(doc(db, "orders", orderId), {
          status: "accepted"
        });

        await notifyUser(o.userId, "🧑‍🔧 تم قبول طلبك");
        loadOrders(workerId);
      };

      card.appendChild(btn);
    }

    if (o.status === "accepted") {
      const btn = document.createElement("button");
      btn.textContent = "إنهاء الطلب";
      btn.className = "btn-success";

      btn.onclick = async () => {
        btn.disabled = true;
        await updateDoc(doc(db, "orders", orderId), {
          status: "completed",
          completedAt: serverTimestamp()
        });

        await notifyUser(o.userId, "✅ تم إنهاء طلبك بنجاح");
        loadOrders(workerId);
      };

      card.appendChild(btn);
    }

    container.appendChild(card);
  });
}

/* Helpers */

function translateStatus(s) {
  switch (s) {
    case "assigned": return "مُسند إليك";
    case "accepted": return "قيد التنفيذ";
    case "completed": return "مكتمل";
    default: return s;
  }
}

async function notifyUser(userId, message) {
  await addDoc(collection(db, "notifications"), {
    userId,
    message,
    read: false,
    createdAt: serverTimestamp()
  });
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}