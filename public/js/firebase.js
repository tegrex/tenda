import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { isDemoMode } from "./demoMode.js";

const productionFirebaseConfig = {
  apiKey: "AIzaSyCmu3YoLaOKua8D0rlAOq23gDlytcG9RsU",
  authDomain: "tenda-f4508.firebaseapp.com",
  projectId: "tenda-f4508",
  storageBucket: "tenda-f4508.firebasestorage.app",
  messagingSenderId: "692722205940",
  appId: "1:692722205940:web:27f51e3450d34289010aa1"
};

const demoFirebaseConfig = {
  apiKey: "AIzaSyD6JDOzJmGFrFBPGJxXpt1k73f5ghC1Ong",
  authDomain: "fir-61623.firebaseapp.com",
  projectId: "fir-61623",
  storageBucket: "fir-61623.firebasestorage.app",
  messagingSenderId: "134955448299",
  appId: "1:134955448299:web:18cc13d64688bb66cd0bae"
};

export const firebaseConfig = isDemoMode ? demoFirebaseConfig : productionFirebaseConfig;

export { isDemoMode };

export const app = initializeApp(firebaseConfig);

// Ekspor Firestore database & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
