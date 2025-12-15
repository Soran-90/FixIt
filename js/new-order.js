import { auth, db } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let userLat = null;
let userLng = null;

document.getElementById("getLocationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("المتصفح لا يدعم GPS");
    return;
  }

  document.getElementById("locationStatus").textContent = "⏳ جاري تحديد الموقع...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      document.getElementById("locationStatus").textContent = "✅ تم تحديد الموقع";
    },
    () => {
      alert("❌ لم يتم السماح بتحديد الموقع");
      document.getElementById("locationStatus").textContent = "";
    }
  );
});

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

document.getElementById("submitOrder").addEventListener("click", async () => {
  const serviceType = document.getElementById("serviceType").value;
  const description = document.getElementById("description").value.trim();
  const address = document.getElementById("address").value.trim();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;

  if (!serviceType || !description || !address || !date || !time) {
    alert("يرجى ملء جميع الحقول");
    return;
  }

  if (userLat === null || userLng === null) {
    alert("يرجى تحديد الموقع");
    return;
  }

  const workersSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "worker"))
  );

  let nearestWorker = null;
  let minDistance = Infinity;

  workersSnap.forEach((docSnap) => {
    const worker = docSnap.data();
    if (!worker.workerLocation) return;

    const dist = getDistance(
      userLat,
      userLng,
      worker.workerLocation.lat,
      worker.workerLocation.lng
    );

    if (dist < minDistance) {
      minDistance = dist;
      nearestWorker = docSnap.id;
    }
  });

  try {
    await addDoc(collection(db, "orders"), {
      userId: auth.currentUser.uid,
      serviceType,
      description,
      address,
      location: { lat: userLat, lng: userLng },
      date,
      time,
      // ✅ إذا وجد أقرب عامل → assigned (لا يصبح accepted تلقائيًا)
      status: nearestWorker ? "assigned" : "pending",
      assignedTo: nearestWorker,   // إذا null يبقى pending للجميع
      createdAt: serverTimestamp()
    });

    alert("✅ تم إرسال الطلب بنجاح");
    window.location.href = "orders.html";
  } catch (e) {
    alert("❌ فشل إرسال الطلب");
    console.error(e);
  }
});
