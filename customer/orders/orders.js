import { auth, db } from "../../js/firebase.js";
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

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  subscribeToOrders(user.uid);
});

function subscribeToOrders(userId) {
  // إظهار التحميل
  if (loadingText) loadingText.style.display = "block";
  container.innerHTML = "";

  const q = query(collection(db, "orders"), where("userId", "==", userId));

  if (unsubscribeOrders) unsubscribeOrders();

  let initialized = false;

  unsubscribeOrders = onSnapshot(
    q,
    async (snapshot) => {
      await renderOrders(snapshot);

      // إخفاء التحميل بعد أول تحميل
      if (loadingText) loadingText.style.display = "none";

      if (initialized) {
        showBanner("🔔 تم تحديث حالة طلباتك لحظيًا");
      }
      initialized = true;
    },
    (err) => {
      if (loadingText) loadingText.style.display = "none";
      container.innerHTML = "❌ تعذر تحميل الطلبات الآن";
      console.error("realtime orders error", err);
    }
  );
}

async function renderOrders(snapshot) {
  if (snapshot.empty) {
    container.innerHTML = "لا توجد طلبات";
    return;
  }

  container.innerHTML = "";

  const orderViews = await Promise.all(
    snapshot.docs.map(async (orderSnap) => {
      const order = orderSnap.data();
      const orderId = orderSnap.id;

      const div = document.createElement("div");
      div.className = "order-card";

      let workerInfo = "";
      let ratingUI = "";
      let ratingNotesNode = null;

      // 👷‍♂️ معلومات العامل
      if (order.assignedTo) {
        const workerRef = doc(db, "users", order.assignedTo);
        const workerSnap = await getDoc(workerRef);

        if (workerSnap.exists()) {
          const worker = workerSnap.data();
          workerInfo = `
            <p><strong>العامل:</strong> ${escapeHTML(worker.name || worker.email)}</p>
            <p><strong>تقييم العامل:</strong> ⭐ ${worker.ratingAvg || 0}</p>
          `;
        }
      }

      // ⭐ واجهة التقييم
      if (order.status === "completed" && !order.rated) {
        ratingUI = `
          <div class="rating-block" data-order="${orderId}">
            <label>قيّم العامل:</label>
            <div class="star-row">
              <button type="button" class="star-btn" data-val="1">★</button>
              <button type="button" class="star-btn" data-val="2">★★</button>
              <button type="button" class="star-btn" data-val="3">★★★</button>
              <button type="button" class="star-btn" data-val="4">★★★★</button>
              <button type="button" class="star-btn" data-val="5">★★★★★</button>
            </div>
            <input type="text" id="rating-good-${orderId}" placeholder="ما الذي أعجبك؟">
            <input type="text" id="rating-bad-${orderId}" placeholder="ما الذي يمكن تحسينه؟">
            <button data-id="${orderId}" class="submit-rating">إرسال التقييم</button>
          </div>
        `;
      }

      // ⭐ عرض التقييم إذا موجود
      if (order.rated) {
        ratingNotesNode = document.createElement("div");
        ratingNotesNode.className = "rating-notes";

        ratingNotesNode.innerHTML = `
          <p>تقييمك: ${"⭐".repeat(order.rating)} (${order.rating}/5)</p>
          ${order.ratingPositive ? `<p><strong>إيجابيات:</strong> ${escapeHTML(order.ratingPositive)}</p>` : ""}
          ${order.ratingNegative ? `<p><strong>ملاحظات:</strong> ${escapeHTML(order.ratingNegative)}</p>` : ""}
          ${order.ratingReply ? `<p class="reply-box"><strong>رد العامل:</strong> ${escapeHTML(order.ratingReply)}</p>` : ""}
        `;
      }

      div.innerHTML = `
        <p><strong>الخدمة:</strong> ${escapeHTML(order.serviceType || "")}</p>
        <p><strong>الوصف:</strong> ${escapeHTML(order.description || "")}</p>
        <p>
          <strong>الحالة:</strong>
          <span class="order-status status-${order.status}">
            ${translateStatus(order.status)}
          </span>
        </p>
        ${workerInfo}
        ${ratingUI}
        <hr>
      `;

      if (ratingNotesNode) {
        const hr = div.querySelector("hr");
        div.insertBefore(ratingNotesNode, hr);
      }

      return div;
    })
  );

  orderViews.forEach((view) => container.appendChild(view));
}

function translateStatus(status) {
  switch (status) {
    case "pending": return "قيد الانتظار";
    case "assigned": return "تم إسناده لعامل";
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

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
