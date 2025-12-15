import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDoc,
  updateDoc,
  increment,
  onSnapshot,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("ordersContainer");
const liveBanner = document.getElementById("ordersLiveBanner");
let unsubscribeOrders = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  subscribeToOrders(user.uid);
});

function subscribeToOrders(userId) {
  container.innerHTML = "⏳ جاري تحميل طلباتك...";
  const q = query(collection(db, "orders"), where("userId", "==", userId));

  if (unsubscribeOrders) unsubscribeOrders();

  let initialized = false;
  unsubscribeOrders = onSnapshot(q, async (snapshot) => {
    await renderOrders(snapshot);
    if (initialized) {
      showBanner("🔔 تم تحديث حالة طلباتك لحظيًا");
    }
    initialized = true;
  }, (err) => {
    container.innerHTML = "❌ تعذر تحميل الطلبات الآن";
    console.error("realtime orders error", err);
  });
}

async function renderOrders(snapshot) {
  if (snapshot.empty) {
    container.innerHTML = "لا توجد طلبات";
    return;
  }

  container.innerHTML = "";

  const orderViews = await Promise.all(snapshot.docs.map(async (orderSnap) => {
    const order = orderSnap.data();
    const orderId = orderSnap.id;

    const div = document.createElement("div");
    div.className = "order-card";

    let workerInfo = "";
    let ratingUI = "";

    // 👷‍♂️ معلومات العامل + متوسط التقييم
    if (order.assignedTo) {
      const workerRef = doc(db, "users", order.assignedTo);
      const workerSnap = await getDoc(workerRef);

      if (workerSnap.exists()) {
        const worker = workerSnap.data();
        workerInfo = `
          <p><strong>العامل:</strong> ${worker.name || worker.email}</p>
          <p><strong>تقييم العامل:</strong> ⭐ ${worker.ratingAvg || 0}</p>
        `;
      }
    }

    // ⭐ واجهة التقييم (إذا مكتمل ولم يُقيّم)
    if (order.status === "completed" && !order.rated) {
      ratingUI = `
        <label>قيّم العامل:</label>
        <select id="rating-${orderId}">
          <option value="">اختر التقييم</option>
          <option value="1">⭐</option>
          <option value="2">⭐⭐</option>
          <option value="3">⭐⭐⭐</option>
          <option value="4">⭐⭐⭐⭐</option>
          <option value="5">⭐⭐⭐⭐⭐</option>
        </select>
        <button data-id="${orderId}">إرسال التقييم</button>
      `;
    }

    // ⭐ عرض التقييم إذا موجود
    if (order.rated) {
      ratingUI = `<p>تقييمك: ${"⭐".repeat(order.rating)}</p>`;
    }

    div.innerHTML = `
      <p><strong>الخدمة:</strong> ${order.serviceType}</p>
      <p><strong>الوصف:</strong> ${order.description}</p>
      <p><strong>الحالة:</strong> ${translateStatus(order.status)}</p>
      ${workerInfo}
      ${ratingUI}
      <hr>
    `;

    // ربط زر إرسال التقييم
    if (order.status === "completed" && !order.rated) {
      div.querySelector("button").addEventListener("click", async () => {
        const ratingValue = div.querySelector(`#rating-${orderId}`).value;
        if (!ratingValue) {
          alert("يرجى اختيار التقييم");
          return;
        }
        await submitRating(orderId, Number(ratingValue));
      });
    }

    return div;
  }));

  orderViews.forEach((view) => container.appendChild(view));
}

async function submitRating(orderId, rating) {
  try {
    // جلب الطلب
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) return;

    const { assignedTo } = orderSnap.data();

    // 1️⃣ حفظ التقييم في الطلب
    await updateDoc(orderRef, {
      rating: rating,
      rated: true
    });

    // 2️⃣ تحديث إحصائيات العامل
    const workerRef = doc(db, "users", assignedTo);

    await updateDoc(workerRef, {
      ratingCount: increment(1),
      ratingTotal: increment(rating)
    });

    // 3️⃣ حساب المتوسط الجديد
    const workerSnap = await getDoc(workerRef);
    const worker = workerSnap.data();

    const avg = (worker.ratingTotal / worker.ratingCount).toFixed(2);

    await updateDoc(workerRef, {
      ratingAvg: Number(avg)
    });

    alert("✅ تم إرسال التقييم بنجاح");
    location.reload();

  } catch (e) {
    alert("❌ فشل إرسال التقييم");
    console.error(e);
  }
}

function translateStatus(status) {
  switch (status) {
    case "pending": return "قيد الانتظار";
    case "accepted": return "تم قبول الطلب";
    case "completed": return "مكتمل";
    default: return status;
  }
}

function showBanner(message) {
  if (!liveBanner) return;
  liveBanner.textContent = message;
  liveBanner.style.display = "block";
  setTimeout(() => {
    liveBanner.style.display = "none";
  }, 4000);
}
