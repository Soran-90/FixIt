import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const orderCheckbox = document.getElementById("notif-order");
const generalCheckbox = document.getElementById("notif-general");
const saveButton = document.getElementById("saveNotifPrefs");
const statusLine = document.getElementById("notifPrefsStatus");

let currentUserId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUserId = user.uid;
  await loadPreferences(user.uid);
});

async function loadPreferences(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    const prefs = snap.data()?.notificationPrefs || { orderStatus: true, general: true };

    orderCheckbox.checked = prefs.orderStatus !== false;
    generalCheckbox.checked = prefs.general !== false;
  } catch (e) {
    statusLine.textContent = "❌ تعذر تحميل الإعدادات";
    console.error(e);
  }
}

saveButton?.addEventListener("click", async () => {
  if (!currentUserId) return;
  statusLine.textContent = "جارٍ الحفظ...";
  try {
    const userRef = doc(db, "users", currentUserId);
    await setDoc(userRef, {
      notificationPrefs: {
        orderStatus: orderCheckbox.checked,
        general: generalCheckbox.checked
      }
    }, { merge: true });

    statusLine.textContent = "✅ تم حفظ التفضيلات";
  } catch (e) {
    statusLine.textContent = "❌ فشل الحفظ";
    console.error(e);
  }
});
