import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("ordersContainer");
const paginationContainer = document.getElementById("paginationContainer");

const PAGE_SIZE = 10;
let allOrders = [];
let currentPage = 1;

async function loadOrders() {
  container.innerHTML = "<p class='muted'>⏳ جاري تحميل الطلبات...</p>";

  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));

  if (snap.empty) {
    container.innerHTML = "<p class='muted'>لا توجد طلبات</p>";
    return;
  }

  allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  currentPage = 1;
  renderPage();
}

function renderPage() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageOrders = allOrders.slice(start, start + PAGE_SIZE);

  container.innerHTML = "";

  pageOrders.forEach((order) => {
    const mapLink = order.location
      ? `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`
      : null;

    const div = document.createElement("div");
    div.className = "order-card";

    div.innerHTML = `
      <p><strong>الخدمة:</strong> ${escapeHTML(order.serviceType || "—")}</p>
      <p><strong>الوصف:</strong> ${escapeHTML(order.description || "—")}</p>
      <p><strong>العنوان:</strong> ${escapeHTML(order.address || "—")}</p>
      <p><strong>الحالة:</strong> <span class="badge ${badgeClass(order.status)}">${translateStatus(order.status)}</span></p>
      ${mapLink ? `<a href="${mapLink}" target="_blank" style="color:#2563eb;">📍 فتح الموقع على الخريطة</a>` : "<p class='muted'>📍 لا يوجد موقع</p>"}
      <br>
      <label style="font-size:13px;color:#555;">تغيير الحالة:</label>
      <select data-id="${order.id}" style="margin-top:6px;">
        <option value="pending">قيد الانتظار</option>
        <option value="assigned">تم الإسناد</option>
        <option value="accepted">قيد التنفيذ</option>
        <option value="completed">مكتمل</option>
      </select>
    `;

    const select = div.querySelector("select");
    select.value = order.status;

    select.addEventListener("change", async (e) => {
      const newStatus = e.target.value;
      select.disabled = true;
      try {
        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        order.status = newStatus;
        const badge = div.querySelector(".badge");
        if (badge) {
          badge.textContent = translateStatus(newStatus);
          badge.className = `badge ${badgeClass(newStatus)}`;
        }
      } catch (err) {
        alert("تعذر تحديث الحالة");
        console.error(err);
      } finally {
        select.disabled = false;
      }
    });

    container.appendChild(div);
  });

  renderPagination();
}

function renderPagination() {
  if (!paginationContainer) return;
  const totalPages = Math.ceil(allOrders.length / PAGE_SIZE);
  if (totalPages <= 1) { paginationContainer.innerHTML = ""; return; }

  let html = "";
  if (currentPage > 1) {
    html += `<button onclick="goToPage(${currentPage - 1})" style="margin:4px;padding:8px 14px;border-radius:8px;border:1px solid #ccc;cursor:pointer;">◀ السابق</button>`;
  }
  html += `<span style="margin:0 10px;font-size:14px;color:#555;">صفحة ${currentPage} من ${totalPages}</span>`;
  if (currentPage < totalPages) {
    html += `<button onclick="goToPage(${currentPage + 1})" style="margin:4px;padding:8px 14px;border-radius:8px;border:1px solid #ccc;cursor:pointer;">التالي ▶</button>`;
  }

  paginationContainer.innerHTML = html;
}

window.goToPage = function(page) {
  currentPage = page;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function translateStatus(s) {
  switch (s) {
    case "pending": return "قيد الانتظار";
    case "assigned": return "تم الإسناد";
    case "accepted": return "قيد التنفيذ";
    case "completed": return "مكتمل";
    default: return s || "—";
  }
}

function badgeClass(status) {
  if (status === "completed") return "success";
  if (status === "pending") return "warning";
  return "info";
}

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

loadOrders();
