import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("يرجى إدخال البريد الإلكتروني وكلمة المرور");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) {
      alert("❌ الحساب غير موجود");
      return;
    }

    const role = snap.data().role;

    if (role === "customer") {
      window.location.href = "/customer/home/home.html";
    } else if (role === "worker") {
      window.location.href = "/worker/home/home.html";
    } else if (role === "admin") {
      window.location.href = "/admin/dashboard.html";
    } else {
      alert("❌ دور المستخدم غير معروف");
    }

  } catch (e) {
    alert("❌ خطأ في بيانات الدخول");
    console.error(e);
  }
});