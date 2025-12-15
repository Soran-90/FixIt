import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("يرجى إدخال البريد الإلكتروني وكلمة المرور");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // ✅ تحويل مبدئي
    window.location.href = "home.html";

  } catch (e) {
    alert("❌ خطأ في بيانات الدخول");
  }
});
