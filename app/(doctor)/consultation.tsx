import { View, ScrollView, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { getAuth } from "firebase/auth";
import { addDoc, collection, doc, updateDoc, getDocs, query, where, getFirestore, getDoc } from "firebase/firestore";
import { app } from "../../config/firebaseConfig";
import { getOptimalPharmacy } from "../../services/dbService";
import { Text, TextInput, Button, Surface, useTheme, IconButton } from "react-native-paper";
import { useTranslation } from "react-i18next";

const db = getFirestore(app);

export default function Consultation() {
  const { appointmentId, patientId, readonly } = useLocalSearchParams();
  const isReadonly = readonly === "true";
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const [symptoms, setSymptoms] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [o2, setO2] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [consultationType, setConsultationType] = useState("online");

  const [medications, setMedications] = useState([
    { slNo: 1, name: "", dosage: "", instructions: "" },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (appointmentId) {
          const docRef = doc(db, "appointments", appointmentId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setConsultationType(docSnap.data().consultationType || "online");
          }
        }

        if (isReadonly && appointmentId) {
          const q = query(collection(db, "consultations"), where("appointmentId", "==", appointmentId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            setSymptoms(data.symptoms || "");
            setHeartRate(data.heartRate || "");
            setO2(data.o2Level || "");
            setDiagnosis(data.diagnosis || "");
            setRemarks(data.remarks || "");
            if (data.medications && data.medications.length > 0) {
              setMedications(data.medications);
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    };
    fetchData();
  }, [isReadonly, appointmentId]);

  const handleAddMedicine = () => {
    setMedications([
      ...medications,
      { slNo: medications.length + 1, name: "", dosage: "", instructions: "" },
    ]);
  };

  const handleRemoveMedicine = (index) => {
    const updated = medications.filter((_, i) => i !== index);
    setMedications(updated.map((m, i) => ({ ...m, slNo: i + 1 })));
  };

  const handleChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSave = async () => {
    try {
      const doctor = getAuth().currentUser;
      if (!doctor) return alert(t('err_not_logged_in', 'Doctor not logged in'));
      if (!diagnosis) return alert(t('err_enter_diagnosis', 'Please enter diagnosis'));
      if (!symptoms) return alert('Please enter patient symptoms');

      const validMeds = medications.filter((m) => m.name && m.dosage);
      if (validMeds.length === 0) return alert(t('err_add_medicine', 'Please add at least one medicine'));

      setLoading(true);

      // Create Structured CSV-Compatible Record
      const structuredRecord = {
        appointmentId,
        patientId,
        doctorId: doctor.uid,
        symptoms,
        heartRate,
        o2Level: o2,
        diagnosis,
        medications: validMeds,
        remarks,
        createdAt: new Date(),
        // Adding a flat CSV-compatible metadata string representation
        csvExportString: JSON.stringify({
          appointmentId, patientId, doctorId: doctor.uid, symptoms, diagnosis, remarks, medCount: validMeds.length
        })
      };

      await addDoc(collection(db, "consultations"), structuredRecord);

      // 2. Mark Appointment as Completed and mark hasRx
      await updateDoc(doc(db, "appointments", appointmentId), {
        status: "completed",
        hasRx: true
      });

      alert(t('msg_consultation_saved', 'Consultation saved successfully.'));
      router.back();

    } catch (error) {
      console.log("ERROR:", error);
      alert(t('err_saving_consultation', 'Error saving consultation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: t('title_consultation_report', 'Consultation Report') }} />
      
      <View style={styles.content}>
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Symptoms, Vitals & Diagnosis</Text>
          <TextInput label="Symptoms Observed" mode="outlined" style={styles.input} onChangeText={setSymptoms} value={symptoms} editable={!isReadonly} multiline numberOfLines={2} />
          
          {consultationType === "in_person" && (
            <View style={styles.row}>
              <TextInput label={t('lbl_heart_rate', 'Heart Rate')} mode="outlined" style={styles.flexInput} onChangeText={setHeartRate} value={heartRate} editable={!isReadonly} keyboardType="numeric" />
              <View style={{ width: 16 }} />
              <TextInput label={t('lbl_o2_level', 'O2 Level')} mode="outlined" style={styles.flexInput} onChangeText={setO2} value={o2} editable={!isReadonly} keyboardType="numeric" />
            </View>
          )}

          <TextInput label={t('lbl_diagnosis', 'Diagnosis')} mode="outlined" style={styles.input} onChangeText={setDiagnosis} value={diagnosis} editable={!isReadonly} />
        </Surface>

        <Surface style={styles.card} elevation={1}>
          <View style={styles.medHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('lbl_prescriptions', 'Prescriptions')}</Text>
          </View>

          {medications.map((med, index) => (
            <View key={index} style={styles.medRow}>
              <View style={styles.medHeaderRow}>
                <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>#{med.slNo}</Text>
                {index > 0 && !isReadonly && (
                  <IconButton icon="close" size={20} iconColor="#EF4444" onPress={() => handleRemoveMedicine(index)} />
                )}
              </View>
              <TextInput label={t('lbl_med_name', 'Medicine Name')} mode="outlined" style={styles.input} value={med.name} editable={!isReadonly} onChangeText={(text) => handleChange(index, "name", text)} />
              <TextInput label={t('lbl_dosage', 'Dosage (e.g. 1-0-1)')} mode="outlined" style={styles.input} value={med.dosage} editable={!isReadonly} onChangeText={(text) => handleChange(index, "dosage", text)} />
              <TextInput label={t('lbl_instructions', 'Instructions (Optional)')} mode="outlined" style={styles.input} value={med.instructions} editable={!isReadonly} onChangeText={(text) => handleChange(index, "instructions", text)} />
            </View>
          ))}

          {!isReadonly && (
            <Button mode="outlined" icon="plus" onPress={handleAddMedicine} style={{ marginTop: 8 }}>
              {t('btn_add_medicine', 'Add Another Medicine')}
            </Button>
          )}
        </Surface>

        <TextInput label={t('lbl_remarks', 'Additional Remarks')} mode="outlined" style={styles.input} onChangeText={setRemarks} value={remarks} editable={!isReadonly} multiline numberOfLines={3} />

        {!isReadonly && (
          <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading} style={styles.saveBtn} contentStyle={{ paddingVertical: 8 }}>
            {t('btn_complete_consultation', 'Complete Consultation')}
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', marginBottom: 16 },
  sectionTitle: { fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 16 },
  flexInput: { flex: 1, backgroundColor: '#FFFFFF' },
  input: { marginBottom: 16, backgroundColor: '#FFFFFF' },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medRow: { padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  medHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  saveBtn: { marginTop: 16, borderRadius: 12 }
});