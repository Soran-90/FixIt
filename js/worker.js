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
const avgEl = document.getElementById("ratingAvg");
const countEl = document.getElementById("ratingCount");
const wordsEl = document.getElementById("topWords");

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
    updateRatingSummary([]);
    return;
  }

  myContainer.innerHTML = "";

  const orders = [];

  snap.forEach((orderSnap) => {
    orders.push({ id: orderSnap.id, ...orderSnap.data() });
  });

  updateRatingSummary(orders);

  orders.forEach((o) => {
    const mapLink = o.location
      ? `https://www.google.com/maps?q=${o.location.lat},${o.location.lng}`
      : null;

    const div = document.createElement("div");
    div.className = "order-card";

    const positive = o.ratingPositive
      ? `<p><strong>أسباب الإعجاب:</strong> ${escapeHTML(o.ratingPositive)}</p>`
      : "";
    const negative = o.ratingNegative
      ? `<p><strong>ملاحظات للتحسين:</strong> ${escapeHTML(o.ratingNegative)}</p>`
      : "";
    const reply = o.ratingReply
      ? `<p class="reply-box"><strong>ردك:</strong> ${escapeHTML(o.ratingReply)}</p>`
      : "";

    div.innerHTML = `
      <p><strong>الخدمة:</strong> ${o.serviceType}</p>
      <p><strong>العنوان:</strong> ${o.address || "—"}</p>
      <p><strong>الحالة:</strong> ${o.status}</p>
      ${mapLink ? `<a href="${mapLink}" target="_blank">📍 فتح الموقع</a>` : ""}
      ${o.rated ? `<div class="rating-notes"><p>تقييم العميل: ${"⭐".repeat(o.rating || 0)} (${o.rating || 0}/5)</p>${positive}${negative}${reply}</div>` : ""}
    `;

    if (o.status === "accepted") {
      const btn = document.createElement("button");
      btn.textContent = "إنهاء الطلب";
      btn.onclick = async () => {
        await updateDoc(doc(db, "orders", o.id), {
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

    if (o.rated && !o.ratingReply) {
      const replyBox = document.createElement("div");
      replyBox.className = "reply-box";
      replyBox.innerHTML = `
        <p style="margin-top:0;"><strong>رد على العميل:</strong></p>
        <textarea maxlength="200" placeholder="أجب باحترام ووضوح"></textarea>
        <button>حفظ الرد</button>
      `;

      const replyBtn = replyBox.querySelector("button");
      replyBtn.onclick = async () => {
        const replyText = replyBox.querySelector("textarea").value.trim();
        if (!replyText) {
          alert("يرجى كتابة رد قصير");
          return;
        }

        replyBtn.disabled = true;
        await updateDoc(doc(db, "orders", o.id), {
          ratingReply: replyText,
          ratingReplyAt: serverTimestamp(),
          ratingReplyBy: workerId
        });
        loadMyOrders(workerId);
      };
      div.appendChild(replyBox);
    }

    myContainer.appendChild(div);
  });
}

function updateRatingSummary(orders) {
  if (!avgEl || !countEl || !wordsEl) return;

  const ratedOrders = orders.filter((o) => o.rated && o.rating);
  if (ratedOrders.length === 0) {
    avgEl.textContent = "—";
    countEl.textContent = "لا تقييمات بعد";
    wordsEl.textContent = "—";
    return;
  }

  const total = ratedOrders.reduce((sum, o) => sum + (o.rating || 0), 0);
  const avg = (total / ratedOrders.length).toFixed(2);
  avgEl.textContent = `${avg} / 5`;
  countEl.textContent = `${ratedOrders.length} تقييم`;

  const wordCounts = {};
  ratedOrders.forEach((o) => {
    [o.ratingPositive, o.ratingNegative].forEach((txt) => {
      if (!txt) return;
      txt.split(/\s+/).forEach((word) => {
        const clean = word.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
        if (clean.length < 3) return;
        wordCounts[clean] = (wordCounts[clean] || 0) + 1;
      });
    });
  });

  const topWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w, c]) => `${w} (${c})`);

  wordsEl.textContent = topWords.length ? topWords.join(", ") : "لا توجد كلمات متكررة بعد";
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
