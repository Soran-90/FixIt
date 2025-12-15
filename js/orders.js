import { auth, db } from "./firebase.js";
import { i18nReady, t } from "./i18n.js";
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
const loadingText = document.getElementById("loadingText");
let unsubscribeOrders = null;

await i18nReady;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  subscribeToOrders(user.uid);
});

function subscribeToOrders(userId) {
  container.innerHTML = t("orders.loading", "⏳");
  const q = query(collection(db, "orders"), where("userId", "==", userId));

  if (unsubscribeOrders) unsubscribeOrders();

  let initialized = false;
  unsubscribeOrders = onSnapshot(q, async (snapshot) => {
    await renderOrders(snapshot);
    if (loadingText) loadingText.style.display = "none";
    if (initialized) {
      showBanner(t("orders.banner.updated"));
    }
    initialized = true;
  }, (err) => {
    container.innerHTML = t("orders.error");
    if (loadingText) loadingText.style.display = "none";
    console.error("realtime orders error", err);
  });
}

async function renderOrders(snapshot) {
  if (snapshot.empty) {
    container.innerHTML = t("orders.empty");
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
          <p><strong>${t("orders.field.worker")}</strong> ${worker.name || worker.email}</p>
          <p><strong>${t("orders.field.workerRating")}</strong> ⭐ ${worker.ratingAvg || 0}</p>
        `;
      }
    }

    // ⭐ واجهة التقييم (إذا مكتمل ولم يُقيّم)
    if (order.status === "completed" && !order.rated) {
      ratingUI = `
        <label>${t("orders.rating.prompt")}</label>
        <select id="rating-${orderId}" aria-label="${t("orders.rating.prompt")}">
          <option value="">${t("orders.rating.placeholder")}</option>
          <option value="1">⭐</option>
          <option value="2">⭐⭐</option>
          <option value="3">⭐⭐⭐</option>
          <option value="4">⭐⭐⭐⭐</option>
          <option value="5">⭐⭐⭐⭐⭐</option>
        </select>
        <button data-id="${orderId}">${t("orders.rating.submit")}</button>
      `;
    }

    // ⭐ عرض التقييم إذا موجود
    if (order.rated) {
      ratingUI = `<p>${t("orders.rating.yours")}&nbsp;${"⭐".repeat(order.rating)}</p>`;
    }

    div.innerHTML = `
      <p><strong>${t("orders.field.service")}</strong> ${order.serviceType}</p>
      <p><strong>${t("orders.field.description")}</strong> ${order.description}</p>
      <p><strong>${t("orders.field.status")}</strong> ${t(`status.${order.status}`, order.status)}</p>
      ${workerInfo}
      ${ratingUI}
      <hr>
    `;

    // ربط زر إرسال التقييم
    if (order.status === "completed" && !order.rated) {
      div.querySelector("button").addEventListener("click", async () => {
        const ratingValue = div.querySelector(`#rating-${orderId}`).value;
        if (!ratingValue) {
          alert(t("orders.rating.required"));
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

    alert(t("orders.rating.saved"));
    location.reload();

  } catch (e) {
    alert(t("orders.rating.failed"));
    console.error(e);
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
