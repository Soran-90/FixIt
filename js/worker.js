import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const pendingContainer = document.getElementById("pendingOrders");
const myContainer = document.getElementById("myOrders");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // حفظ موقع العامل
  navigator.geolocation.getCurrentPosition(async (pos) => {
    await updateDoc(doc(db, "users", user.uid), {
      workerLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude }
    });
  });

  loadNewOrders(user.uid);
  loadMyOrders(user.uid);
});

async function loadNewOrders(workerId) {
  pendingContainer.innerHTML = "⏳ جاري تحميل الطلبات الجديدة...";

  // 1) طلبات عامة للجميع: pending + assignedTo == null
  const qPublic = query(
    collection(db, "orders"),
    where("status", "==", "pending")
  );

  // 2) طلبات مخصصة لهذا العامل: assigned + assignedTo == workerId
  const qAssigned = query(
    collection(db, "orders"),
    where("status", "==", "assigned"),
    where("assignedTo", "==", workerId)
  );

  const [snapPublic, snapAssigned] = await Promise.all([getDocs(qPublic), getDocs(qAssigned)]);

  pendingContainer.innerHTML = "";

  const allDocs = [];
  snapPublic.forEach(d => allDocs.push(d));
  snapAssigned.forEach(d => allDocs.push(d));

  if (allDocs.length === 0) {
    pendingContainer.innerHTML = "لا توجد طلبات جديدة";
    return;
  }

  allDocs.forEach((orderSnap) => {
    const o = orderSnap.data();

    const div = document.createElement("div");
    div.className = "order-card";

    div.innerHTML = `
      <p><strong>الخدمة:</strong> ${o.serviceType}</p>
      <p><strong>الوصف:</strong> ${o.description || ""}</p>
      <p><strong>العنوان:</strong> ${o.address || "—"}</p>
      <p><strong>الحالة:</strong> ${o.status}</p>
      <button>قبول الطلب</button>
    `;

    div.querySelector("button").onclick = async () => {
      await updateDoc(doc(db, "orders", orderSnap.id), {
        status: "accepted",
        assignedTo: workerId
      });

      // إشعار للزبون
      await addDoc(collection(db, "notifications"), {
        userId: o.userId,
        message: "🧑‍🔧 تم قبول طلبك من قبل العامل",
        read: false,
        createdAt: serverTimestamp()
      });

      loadNewOrders(workerId);
      loadMyOrders(workerId);
    };

    pendingContainer.appendChild(div);
  });
}

async function loadMyOrders(workerId) {
  myContainer.innerHTML = "⏳ جاري تحميل طلباتك...";

  const snap = await getDocs(
    query(collection(db, "orders"), where("assignedTo", "==", workerId))
  );

  if (snap.empty) {
    myContainer.innerHTML = "لا توجد طلبات لديك";
    return;
  }

  myContainer.innerHTML = "";

  snap.forEach((orderSnap) => {
    const o = orderSnap.data();

    const mapLink = o.location
      ? `https://www.google.com/maps?q=${o.location.lat},${o.location.lng}`
      : null;

    const div = document.createElement("div");
    div.className = "order-card";

    div.innerHTML = `
      <p><strong>الخدمة:</strong> ${o.serviceType}</p>
      <p><strong>العنوان:</strong> ${o.address || "—"}</p>
      <p><strong>الحالة:</strong> ${o.status}</p>
      ${mapLink ? `<a href="${mapLink}" target="_blank">📍 فتح الموقع</a>` : ""}
    `;

    if (o.status === "accepted") {
      const btn = document.createElement("button");
      btn.textContent = "إنهاء الطلب";
      btn.onclick = async () => {
        await updateDoc(doc(db, "orders", orderSnap.id), {
          status: "completed",
          completedAt: serverTimestamp()
        });

        await addDoc(collection(db, "notifications"), {
          userId: o.userId,
          message: "✅ تم إنهاء طلبك بنجاح",
          read: false,
          createdAt: serverTimestamp()
        });

        loadMyOrders(workerId);
      };
      div.appendChild(btn);
    }

    myContainer.appendChild(div);
  });
}
