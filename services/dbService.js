import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { app } from "../config/firebaseConfig";

const db = getFirestore(app);

export const saveUserRole = async (userId, data) => {
  await setDoc(doc(db, "users", userId), {
    ...data,
    createdAt: new Date(),
  });
};

export const getUserRole = async (userId) => {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? snap.data() : null;
};

export const saveMedicalRecord = async (record) => {
  await addDoc(collection(db, "records"), record);
};

export const getPatientRecords = async (patientId) => {
  const q = query(collection(db, "records"), where("patientId", "==", patientId));
  const snapshot = await getDocs(q);
  let data = [];
  snapshot.forEach((doc) => {
    data.push({ id: doc.id, ...doc.data() });
  });
  return data;
};

export const getApprovedDoctors = async () => {
  const q = query(
    collection(db, "users"),
    where("role", "==", "doctor"),
    where("status", "==", "approved")
  );

  const snapshot = await getDocs(q);

  let data = [];
  snapshot.forEach((doc) => {
    data.push({ id: doc.id, ...doc.data() });
  });

  return data;
};

export const createAppointment = async (data) => {
  await addDoc(collection(db, "appointments"), data);
};

export const hasActiveAppointment = async (patientId, doctorId) => {
  const q = query(
    collection(db, "appointments"),
    where("patientId", "==", patientId),
    where("doctorId", "==", doctorId)
  );
  const snap = await getDocs(q);
  
  for (const docSnap of snap.docs) {
    const status = docSnap.data().status;
    if (status === "pending" || status === "confirmed" || status === "in_progress") {
      return true;
    }
  }
  return false;
};

// ⭐ Rating system
export const addDoctorRating = async (doctorId, newRating) => {
  const ref = doc(db, "users", doctorId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  const totalRatings = data.totalRatings || 0;
  const currentRating = data.rating || 0;

  const updatedTotal = totalRatings + 1;
  const updatedRating =
    (currentRating * totalRatings + newRating) / updatedTotal;

  await updateDoc(ref, {
    rating: updatedRating,
    totalRatings: updatedTotal,
  });
};
export const getPendingDoctors = async () => {
  const q = query(
    collection(db, "users"),
    where("role", "==", "doctor"),
    where("status", "==", "pending")
  );

  const snapshot = await getDocs(q);

  let data = [];
  snapshot.forEach((doc) => {
    data.push({ id: doc.id, ...doc.data() });
  });

  return data;
};
export const approveDoctor = async (id) => {
  await updateDoc(doc(db, "users", id), {
    status: "approved",
  });
};

// Gets the next pharmacy sequentially (round-robin by least totalOrdersReceived)
// Accepts an optional array of pharmacy IDs to exclude (e.g. if they rejected it)
export const getSequentialPharmacy = async (excludedIds = []) => {
  const q = query(
    collection(db, "users"),
    where("role", "==", "pharmacy")
  );

  const snapshot = await getDocs(q);
  let pharmacies = [];
  
  snapshot.forEach((docSnap) => {
    if (!excludedIds.includes(docSnap.id)) {
      pharmacies.push({ id: docSnap.id, ...docSnap.data() });
    }
  });

  if (pharmacies.length === 0) return null;

  // Round-robin: Pick the one with the least totalOrdersReceived
  pharmacies.sort((a, b) => {
    const ordersA = a.totalOrdersReceived || 0;
    const ordersB = b.totalOrdersReceived || 0;
    return ordersA - ordersB;
  });

  const selectedPharmacy = pharmacies[0];

  // Increment order count to maintain sequential distribution
  await updateDoc(doc(db, "users", selectedPharmacy.id), {
    totalOrdersReceived: (selectedPharmacy.totalOrdersReceived || 0) + 1
  });

  return selectedPharmacy.id;
};

export const getAllPharmacies = async () => {
  const q = query(
    collection(db, "users"),
    where("role", "==", "pharmacy")
  );

  const snapshot = await getDocs(q);
  let pharmacies = [];
  
  snapshot.forEach((docSnap) => {
    pharmacies.push({ id: docSnap.id, ...docSnap.data() });
  });

  return pharmacies;
};