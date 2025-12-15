import { auth } from "./firebase.js";
import { i18nReady, t } from "./i18n.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");

await i18nReady;

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert(t("login.validation.missing"));
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // ✅ تحويل مبدئي
    window.location.href = "home.html";

  } catch (e) {
    alert(t("login.error.auth"));
  }
});
