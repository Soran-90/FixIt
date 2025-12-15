import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const container = document.getElementById("usersContainer");

async function loadUsers() {
  container.innerHTML = "⏳ جاري تحميل المستخدمين...";

  const snapshot = await getDocs(collection(db, "users"));

  if (snapshot.empty) {
    container.innerHTML = "لا يوجد مستخدمون";
    return;
  }

  container.innerHTML = "";

  snapshot.forEach((userSnap) => {
    const user = userSnap.data();

    const div = document.createElement("div");
    div.className = "user-card";

    div.innerHTML = `
      <p><strong>البريد:</strong> ${user.email}</p>
      <p><strong>الدور:</strong> ${user.role}</p>

      <select data-id="${userSnap.id}">
        <option value="customer">زبون</option>
        <option value="worker">عامل</option>
      </select>
      <hr>
    `;

    const select = div.querySelector("select");
    select.value = user.role;

    select.addEventListener("change", async (e) => {
      const newRole = e.target.value;
      await updateDoc(doc(db, "users", userSnap.id), {
        role: newRole
      });
      alert("تم تحديث دور المستخدم");
    });

    container.appendChild(div);
  });
}

loadUsers();
