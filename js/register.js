import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log("✅ register.js loaded");

const registerBtn = document.getElementById("registerBtn");

registerBtn.addEventListener("click", async () => {
  console.log("🟢 زر إنشاء الحساب تم الضغط عليه");

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !email || !phone || !password) {
    alert("يرجى ملء جميع الحقول");
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    console.log("🟢 تم إنشاء الحساب في Auth");

    await setDoc(doc(db, "users", userCred.user.uid), {
      name,
      email,
      phone,
      role: "customer",
      createdAt: new Date()
    });

    alert("✅ تم إنشاء الحساب بنجاح");
    window.location.href = "home.html";

  } catch (e) {
    console.error("❌ خطأ Firebase:", e);
    alert("خطأ: " + e.message);
  }
});
