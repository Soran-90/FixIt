import { auth, db } from "../../js/firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const input = document.getElementById("searchInput");
const results = document.getElementById("searchResults");

let userId = null;

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  userId = user.uid;
});

input.addEventListener("input", async () => {
  const keyword = input.value.trim().toLowerCase();

  if (!keyword) {
    results.innerHTML = `<p class="hint">ابدأ بالكتابة للبحث...</p>`;
    return;
  }

  results.innerHTML = "🔄 جاري البحث...";

  const q = query(
    collection(db, "orders"),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);

  const filtered = snap.docs.filter(doc => {
    const o = doc.data();
    return (
      o.serviceType?.toLowerCase().includes(keyword) ||
      o.status?.toLowerCase().includes(keyword)
    );
  });

  if (!filtered.length) {
    results.innerHTML = "❌ لا توجد نتائج";
    return;
  }

  results.innerHTML = "";
  filtered.forEach(doc => {
    const o = doc.data();
    const card = document.createElement("div");
    card.className = "search-card";
    card.innerHTML = `
      <p><strong>الخدمة:</strong> ${o.serviceType}</p>
      <p><strong>الحالة:</strong> ${o.status}</p>
    `;
    results.appendChild(card);
  });
});