import { auth, db, firebaseConfig } from "./firebase.js?v=demo-separation-20260930";
import { deleteApp, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  runTransaction,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const USERS_COL = "users";

export async function registerUser(email, password, nama) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: nama });

  await setDoc(doc(db, USERS_COL, user.uid), {
    uid: user.uid,
    email: email,
    nama: nama,
    role: "staff",
    status: "active",
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp()
  });

  return user;
}

export async function listManagedUsers() {
  const snapshot = await getDocs(collection(db, USERS_COL));
  return snapshot.docs.map((userDoc) => ({ uid: userDoc.id, ...userDoc.data() }));
}

export async function createManagedUser({ email, password, nama, role, workerId = "" }) {
  if (!email || !password || !nama || !["admin", "staff", "pekerja"].includes(role)) {
    throw new Error("Lengkapi nama, email, kata sandi, dan role yang valid.");
  }
  if (role === "pekerja" && !workerId) {
    throw new Error("Pilih profil pekerja untuk akun dengan role pekerja.");
  }

  const secondaryApp = initializeApp(firebaseConfig, `managed-user-${crypto.randomUUID()}`);
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser = null;

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    createdUser = credential.user;
    await updateProfile(createdUser, { displayName: nama.trim() });

    const profile = {
      uid: createdUser.uid,
      email: email.trim(),
      nama: nama.trim(),
      role,
      status: "active",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };
    if (workerId) profile.workerId = workerId;
    await runTransaction(db, async (transaction) => {
      const workerRef = workerId ? doc(db, "pekerja", workerId) : null;
      if (workerRef) {
        const workerSnapshot = await transaction.get(workerRef);
        if (!workerSnapshot.exists() || workerSnapshot.data().authUid) {
          throw new Error("Profil pekerja sudah tidak tersedia atau telah memiliki akun.");
        }
      }

      transaction.set(doc(db, USERS_COL, createdUser.uid), profile);
      if (workerRef) {
        transaction.update(workerRef, {
          authUid: createdUser.uid,
          updatedAt: serverTimestamp()
        });
      }
    });
    return { uid: createdUser.uid, email: profile.email, nama: profile.nama, role, status: profile.status, workerId };
  } catch (error) {
    if (createdUser) {
      await deleteUser(createdUser).catch(() => {});
    }
    throw error;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}

export async function updateManagedUserStatus(uid, status) {
  if (!uid || !["active", "inactive"].includes(status)) {
    throw new Error("Status akun tidak valid.");
  }
  await updateDoc(doc(db, USERS_COL, uid), {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  const userDoc = await getDoc(doc(db, USERS_COL, userCredential.user.uid));
  
  if (userDoc.exists()) {
    const userData = userDoc.data();
    
    if (userData.status === "inactive") {
      await signOut(auth);
      throw new Error("Akun Anda telah dinonaktifkan. Hubungi administrator.");
    }
    
    return {
      user: userCredential.user,
      role: userData.role || "staff",
      nama: userData.nama || userCredential.user.displayName
    };
  } else {
    await setDoc(doc(db, USERS_COL, userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      nama: userCredential.user.displayName || "User",
      role: "staff",
      status: "active",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
    
    return {
      user: userCredential.user,
      role: "staff",
      nama: userCredential.user.displayName || "User"
    };
  }
}

export async function logoutUser() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function getCurrentUserRole() {
  const user = auth.currentUser;
  if (!user) return null;
  
  const userDoc = await getDoc(doc(db, USERS_COL, user.uid));
  if (userDoc.exists()) {
    return userDoc.data().role;
  }
  return "staff";
}

export async function getCurrentUserData() {
  const user = auth.currentUser;
  if (!user) return null;
  
  const userDoc = await getDoc(doc(db, USERS_COL, user.uid));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function hasPermission(role, action) {
  const permissions = {
    admin: ["create", "read", "update", "delete", "manage_users"],
    staff: ["create", "read", "update"],
    pekerja: ["read", "worker"],
    viewer: ["read"]
  };
  
  return permissions[role]?.includes(action) || false;
}
