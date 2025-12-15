import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let checked = false;

onAuthStateChanged(auth, async (user) => {
  if (checked) return;
  checked = true;

  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists() || snap.data().role !== "admin") {
      window.location.replace("login.html");
      return;
    }

    console.log("✅ Admin verified");

  } catch (e) {
    console.error(e);
    window.location.replace("login.html");
  }
});
