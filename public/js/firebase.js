import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Konfigurasi Firebase proyek tenda-f4508
export const firebaseConfig = {
  apiKey: "AIzaSyCmu3YoLaOKua8D0rlAOq23gDlytcG9RsU",
  authDomain: "tenda-f4508.firebaseapp.com",
  projectId: "tenda-f4508",
  storageBucket: "tenda-f4508.firebasestorage.app",
  messagingSenderId: "692722205940",
  appId: "1:692722205940:web:27f51e3450d34289010aa1"
};

// Inisialisasi Firebase App
export const app = initializeApp(firebaseConfig);

// Ekspor Firestore database & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
