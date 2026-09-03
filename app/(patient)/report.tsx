import { useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { app } from "../../config/firebaseConfig";

import { RadioButton } from "react-native-paper";
import { addDoctorRating, getOptimalPharmacy } from "../../services/dbService";

const db = getFirestore(app);

export default function Report() {
  const { appointmentId } = useLocalSearchParams();
  const [report, setReport] = useState(null);
  const [rating, setRating] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      if (!appointmentId) return;

      const q = query(
        collection(db, "consultations"),
        where("appointmentId", "==", appointmentId)
      );

      const snapshot = await getDocs(q);

      snapshot.forEach((docSnap) => {
        setReport({ id: docSnap.id, ...docSnap.data() });
      });
    };

    fetchReport();
  }, [appointmentId]);

  const handleSendToPharmacy = async () => {
    const user = getAuth().currentUser;

    if (!report) return;

    const pharmacyId = await getOptimalPharmacy();
    if (!pharmacyId) {
      alert("No pharmacies available at the moment.");
      return;
    }

    await addDoc(collection(db, "pharmacyRequests"), {
      patientId: user?.uid,
      patientEmail: user?.email,
      pharmacyId: pharmacyId, // Assigned to specific pharmacy
      consultationId: report.id,
      medications: report.medications,
      status: "pending",
      createdAt: new Date(),
    });

    alert("Prescription assigned and sent to pharmacy successfully.");
  };

  // ⭐ Submit rating
  const handleRating = async () => {
    try {
      if (!rating) {
        alert("Please select rating");
        return;
      }

      // update doctor average rating
      await addDoctorRating(report.doctorId, Number(rating));

      // store rating in consultation
      await updateDoc(doc(db, "consultations", report.id), {
        rating: Number(rating),
      });

      alert("Rating submitted");

      // update UI instantly
      setReport({ ...report, rating: Number(rating) });

    } catch (error) {
      console.log("RATING ERROR:", error);
      alert("Error submitting rating");
    }
  };

  // CASE 1: No appointment selected
  if (!appointmentId) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 18 }}>
          Please open a report from the Appointments page
        </Text>
      </View>
    );
  }

  // CASE 2: No consultation yet
  if (!report) {
    return (
      <View style={{ padding: 20 }}>
        <Text>No consultation available yet</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>
      
      <Text style={{ fontSize: 20, marginBottom: 15 }}>
        Consultation Report
      </Text>

      <Text>Heart Rate: {report.heartRate}</Text>
      <Text>O2 Level: {report.o2Level}</Text>
      <Text>Diagnosis: {report.diagnosis}</Text>

      <Text style={{ marginTop: 10, fontWeight: "bold" }}>
        Medicines:
      </Text>

      {report.medications?.map((med, index) => (
        <View key={index} style={{ marginBottom: 10 }}>
          <Text>
            {med.slNo}. {med.name}
          </Text>
          <Text>Dosage: {med.dosage}</Text>
          <Text>Instructions: {med.instructions}</Text>
        </View>
      ))}

      <Text style={{ marginTop: 10 }}>
        Remarks: {report.remarks}
      </Text>

      {/* ⭐ RATING SECTION */}
      {!report.rating ? (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: "bold" }}>Rate Doctor:</Text>

          <RadioButton.Group
            onValueChange={(value) => setRating(value)}
            value={rating}
          >
            {[1, 2, 3, 4, 5].map((num) => (
              <View
                key={num}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <RadioButton value={num.toString()} />
                <Text>{num} Star</Text>
              </View>
            ))}
          </RadioButton.Group>

          <Button title="Submit Rating" onPress={handleRating} />
        </View>
      ) : (
        <View style={{ marginTop: 20 }}>
          <Text>⭐ You rated: {report.rating}</Text>
        </View>
      )}

      {/* 🏥 SEND TO PHARMACY */}
      <View style={{ marginTop: 20 }}>
        <Button
          title="Send to Pharmacy"
          onPress={handleSendToPharmacy}
        />
      </View>

    </View>
  );
}