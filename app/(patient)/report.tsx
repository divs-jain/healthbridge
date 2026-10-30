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
import { useTranslation } from "react-i18next";
import { addDoctorRating, getOptimalPharmacy } from "../../services/dbService";

const db = getFirestore(app);

export default function Report() {
  const { appointmentId } = useLocalSearchParams();
  const [report, setReport] = useState(null);
  const [rating, setRating] = useState("");
  const { t } = useTranslation();

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
      alert(t('err_no_pharmacy_available'));
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

    alert(t('msg_sent_to_pharmacy'));
  };

  // ⭐ Submit rating
  const handleRating = async () => {
    try {
      if (!rating) {
        alert(t('err_select_rating'));
        return;
      }

      // update doctor average rating
      await addDoctorRating(report.doctorId, Number(rating));

      // store rating in consultation
      await updateDoc(doc(db, "consultations", report.id), {
        rating: Number(rating),
      });

      alert(t('msg_thanks_feedback'));

      // update UI instantly
      setReport({ ...report, rating: Number(rating) });

    } catch (error) {
      console.log("RATING ERROR:", error);
      alert(t('err_rating_failed'));
    }
  };

  // CASE 1: No appointment selected
  if (!appointmentId) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 18 }}>
          {t('msg_open_report_from_appointments')}
        </Text>
      </View>
    );
  }

  // CASE 2: No consultation yet
  if (!report) {
    return (
      <View style={{ padding: 20 }}>
        <Text>{t('msg_no_consultation_yet')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>
      
      <Text style={{ fontSize: 20, marginBottom: 15 }}>
        {t('title_consultation_report')}
      </Text>

      <Text>{t('lbl_heart_rate')}: {report.heartRate}</Text>
      <Text>{t('lbl_o2_level')}: {report.o2Level}</Text>
      <Text>{t('lbl_diagnosis')}: {report.diagnosis}</Text>

      <Text style={{ marginTop: 10, fontWeight: "bold" }}>
        {t('lbl_medicines')}:
      </Text>

      {report.medications?.map((med, index) => (
        <View key={index} style={{ marginBottom: 10 }}>
          <Text>
            {med.slNo}. {med.name}
          </Text>
          <Text>{t('lbl_dosage_short')}: {med.dosage}</Text>
          <Text>{t('lbl_instructions_short')}: {med.instructions}</Text>
        </View>
      ))}

      <Text style={{ marginTop: 10 }}>
        {t('lbl_remarks')}: {report.remarks}
      </Text>

      {/* ⭐ RATING SECTION */}
      {!report.rating ? (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: "bold" }}>{t('rate_doctor')}:</Text>

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
                <Text>{t('lbl_stars', { count: num })}</Text>
              </View>
            ))}
          </RadioButton.Group>

          <Button title={t('btn_submit_rating')} onPress={handleRating} />
        </View>
      ) : (
        <View style={{ marginTop: 20 }}>
          <Text>⭐ {t('lbl_you_rated', { rating: report.rating })}</Text>
        </View>
      )}

      {/* 🏥 SEND TO PHARMACY */}
      <View style={{ marginTop: 20 }}>
        <Button
          title={t('btn_send_to_pharmacy')}
          onPress={handleSendToPharmacy}
        />
      </View>

    </View>
  );
}