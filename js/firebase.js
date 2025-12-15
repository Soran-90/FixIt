// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAh7yfCdcwu2wwDVtS9uQuqZzeWtrazUCU",
  authDomain: "fixit-9156d.firebaseapp.com",
  projectId: "fixit-9156d",
  storageBucket: "fixit-9156d.appspot.com",
  messagingSenderId: "916298149436",
  appId: "1:916298149436:web:46bf2b0c72a70811c15d39"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("✅ Firebase connected (v11)");
