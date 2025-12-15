import { auth, db } from "./firebase.js";
import { i18nReady, setLanguage, t } from "./i18n.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const orderCheckbox = document.getElementById("notif-order");
const generalCheckbox = document.getElementById("notif-general");
const saveButton = document.getElementById("saveNotifPrefs");
const statusLine = document.getElementById("notifPrefsStatus");
const languageSelect = document.getElementById("languageSelect");

let currentUserId = null;

await i18nReady;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUserId = user.uid;
  await loadPreferences(user.uid);
});

async function loadPreferences(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    const data = snap.data() || {};
    const prefs = data.notificationPrefs || { orderStatus: true, general: true };
    const preferredLang = data.language || languageSelect?.value || "ar";

    orderCheckbox.checked = prefs.orderStatus !== false;
    generalCheckbox.checked = prefs.general !== false;
    if (languageSelect) {
      languageSelect.value = preferredLang;
      await setLanguage(preferredLang);
    }
  } catch (e) {
    statusLine.textContent = t("profile.notifications.loadingError");
    console.error(e);
  }
}

saveButton?.addEventListener("click", async () => {
  if (!currentUserId) return;
  statusLine.textContent = t("profile.notifications.saving");
  try {
    const chosenLanguage = languageSelect?.value || "ar";
    const userRef = doc(db, "users", currentUserId);
    await setDoc(userRef, {
      notificationPrefs: {
        orderStatus: orderCheckbox.checked,
        general: generalCheckbox.checked
      },
      language: chosenLanguage
    }, { merge: true });

    await setLanguage(chosenLanguage);
    statusLine.textContent = t("profile.notifications.saveSuccess");
  } catch (e) {
    statusLine.textContent = t("profile.notifications.saveFailed");
    console.error(e);
  }
});

languageSelect?.addEventListener("change", (event) => {
  const selected = event.target.value;
  setLanguage(selected);
});
