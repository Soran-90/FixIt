import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

function setLoading(isLoading) {
  if (!loginBtn) return;
  loginBtn.disabled = isLoading;
  loginBtn.textContent = isLoading ? "جاري التحقق..." : "تسجيل الدخول";
}

loginBtn?.addEventListener("click", async () => {
  if (!emailInput?.value || !passwordInput?.value) {
    alert("يرجى إدخال البريد الإلكتروني وكلمة المرور");
    return;
  }

  setLoading(true);

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    const userRef = doc(db, "users", credential.user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists() || snap.data().role !== "admin") {
      await signOut(auth);
      alert("حسابك ليس لديه صلاحية الأدمن");
      return;
    }

    window.location.replace("dashboard.html");
  } catch (e) {
    console.error("admin login error", e);
    alert("بيانات الدخول غير صحيحة أو غير مخول بالوصول");
  } finally {
    setLoading(false);
  }
});
