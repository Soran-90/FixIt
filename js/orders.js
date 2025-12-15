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
const loadingText = document.getElementById("loadingText");
let unsubscribeOrders = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  subscribeToOrders(user.uid);
});

function subscribeToOrders(userId) {
  container.innerHTML = "⏳ جاري تحميل طلباتك...";
  if (loadingText) loadingText.style.display = "block";
  const q = query(collection(db, "orders"), where("userId", "==", userId));

  if (unsubscribeOrders) unsubscribeOrders();

  let initialized = false;
  unsubscribeOrders = onSnapshot(q, async (snapshot) => {
    await renderOrders(snapshot);
    if (loadingText) loadingText.style.display = "none";
    if (initialized) {
      showBanner("🔔 تم تحديث حالة طلباتك لحظيًا");
    }
    initialized = true;
  }, (err) => {
    container.innerHTML = "❌ تعذر تحميل الطلبات الآن";
    if (loadingText) loadingText.style.display = "none";
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
    let ratingNotesNode = null;

    // 👷‍♂️ معلومات العامل + متوسط التقييم
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

    // ⭐ واجهة التقييم (إذا مكتمل ولم يُقيّم)
    if (order.status === "completed" && !order.rated) {
      ratingUI = `
        <div class="rating-block" data-order="${orderId}">
          <label>قيّم العامل:</label>
          <div class="star-row" role="radiogroup" aria-label="اختيار عدد النجوم">
            <button type="button" class="star-btn" data-val="1" aria-label="نجمة واحدة">★</button>
            <button type="button" class="star-btn" data-val="2" aria-label="نجمتان">★★</button>
            <button type="button" class="star-btn" data-val="3" aria-label="ثلاث نجوم">★★★</button>
            <button type="button" class="star-btn" data-val="4" aria-label="أربع نجوم">★★★★</button>
            <button type="button" class="star-btn" data-val="5" aria-label="خمس نجوم">★★★★★</button>
          </div>
          <input type="text" id="rating-good-${orderId}" placeholder="ما الذي أعجبك؟ (قصير)" maxlength="120">
          <input type="text" id="rating-bad-${orderId}" placeholder="ما الذي يمكن تحسينه؟ (قصير)" maxlength="120">
          <button data-id="${orderId}" class="submit-rating">إرسال التقييم</button>
        </div>
      `;
    }

    // ⭐ عرض التقييم إذا موجود
    if (order.rated) {
      ratingNotesNode = document.createElement("div");
      ratingNotesNode.className = "rating-notes";

      const ratingLine = document.createElement("p");
      ratingLine.textContent = `تقييمك: ${"⭐".repeat(order.rating)} (${order.rating}/5)`;
      ratingNotesNode.appendChild(ratingLine);

      if (order.ratingPositive) {
        const positiveP = document.createElement("p");
        positiveP.innerHTML = `<strong>أسباب الإعجاب:</strong> ${escapeHTML(order.ratingPositive)}`;
        ratingNotesNode.appendChild(positiveP);
      }

      if (order.ratingNegative) {
        const negativeP = document.createElement("p");
        negativeP.innerHTML = `<strong>ملاحظات للتحسين:</strong> ${escapeHTML(order.ratingNegative)}`;
        ratingNotesNode.appendChild(negativeP);
      }

      if (order.ratingReply) {
        const replyP = document.createElement("p");
        replyP.className = "reply-box";
        replyP.innerHTML = `<strong>رد العامل:</strong> ${escapeHTML(order.ratingReply)}`;
        ratingNotesNode.appendChild(replyP);
      }
    }

    div.innerHTML = `
      <p><strong>الخدمة:</strong> ${escapeHTML(order.serviceType || "")}</p>
      <p><strong>الوصف:</strong> ${escapeHTML(order.description || "")}</p>
      <p><strong>الحالة:</strong> ${translateStatus(order.status)}</p>
      ${workerInfo}
      ${ratingUI}
      <hr>
    `;

    if (ratingNotesNode) {
      const hr = div.querySelector("hr");
      div.insertBefore(ratingNotesNode, hr || null);
    }

    // ربط زر إرسال التقييم
    if (order.status === "completed" && !order.rated) {
      const ratingBlock = div.querySelector(".rating-block");
      const starButtons = ratingBlock.querySelectorAll(".star-btn");
      let selectedRating = 0;

      starButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedRating = Number(btn.dataset.val);
          starButtons.forEach((b) => b.classList.toggle("selected", Number(b.dataset.val) <= selectedRating));
        });
      });

      div.querySelector(".submit-rating").addEventListener("click", async () => {
        const positive = ratingBlock.querySelector(`#rating-good-${orderId}`).value.trim();
        const negative = ratingBlock.querySelector(`#rating-bad-${orderId}`).value.trim();

        if (!selectedRating) {
          alert("يرجى اختيار عدد النجوم");
          return;
        }

        await submitRating(orderId, selectedRating, { positive, negative });
      });
    }

    return div;
  }));

  orderViews.forEach((view) => container.appendChild(view));
}

async function submitRating(orderId, rating, reasons = {}) {
  try {
    // جلب الطلب
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) return;

    const { assignedTo } = orderSnap.data();

    // 1️⃣ حفظ التقييم في الطلب
    await updateDoc(orderRef, {
      rating: rating,
      rated: true,
      ratingPositive: reasons.positive || null,
      ratingNegative: reasons.negative || null
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
    case "assigned": return "تم تعيين عامل";
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

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
