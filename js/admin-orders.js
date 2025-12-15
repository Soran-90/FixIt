import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("ordersContainer");

async function loadOrders() {
  container.innerHTML = "⏳ جاري تحميل الطلبات...";

  const snapshot = await getDocs(collection(db, "orders"));

  if (snapshot.empty) {
    container.innerHTML = "لا توجد طلبات";
    return;
  }

  container.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const order = docSnap.data();

    const mapLink =
      order.location
        ? `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`
        : null;

    const div = document.createElement("div");
    div.className = "order-card";

    div.innerHTML = `
      <p><strong>الخدمة:</strong> ${order.serviceType}</p>
      <p><strong>الوصف:</strong> ${order.description}</p>
      <p><strong>العنوان:</strong> ${order.address || "—"}</p>
      <p><strong>الحالة:</strong> ${order.status}</p>

      ${
        mapLink
          ? `<a href="${mapLink}" target="_blank">
               📍 فتح الموقع على الخريطة
             </a>`
          : `<p>📍 لا يوجد موقع</p>`
      }

      <br><br>

      <select data-id="${docSnap.id}">
        <option value="pending">قيد الانتظار</option>
        <option value="accepted">تم القبول</option>
        <option value="completed">مكتمل</option>
      </select>
      <hr>
    `;

    const select = div.querySelector("select");
    select.value = order.status;

    select.addEventListener("change", async (e) => {
      const newStatus = e.target.value;
      await updateDoc(doc(db, "orders", docSnap.id), {
        status: newStatus
      });
      alert("تم تحديث حالة الطلب");
    });

    container.appendChild(div);
  });
}

loadOrders();
