import { View, FlatList, StyleSheet, Linking, Alert } from "react-native";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, getFirestore, addDoc, onSnapshot } from "firebase/firestore";
import { app } from "../../config/firebaseConfig";
import { getSequentialPharmacy } from "../../services/dbService";
import { Surface, Text, Button, useTheme, ActivityIndicator, Avatar, Appbar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../../components/LanguageToggle";

const db = getFirestore(app);

export default function AssignedDoctors() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentConsults, setSentConsults] = useState({});
  const [sending, setSending] = useState({});
  
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user) return;

    let appts = [];
    let consults = [];
    let reqs = {};
    let combined = [];

    const processCombined = () => {
      const consMap = {};
      consults.forEach(c => {
        if (c.appointmentId) consMap[c.appointmentId] = c;
      });

      const merged = appts.map(a => ({
        ...a,
        consultation: consMap[a.id] || null
      }));

      merged.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || Date.now();
        return timeB - timeA;
      });
      setItems(merged);
      setSentConsults(reqs);
      setLoading(false);
    };

    const qAppt = query(collection(db, "appointments"), where("patientId", "==", user.uid));
    const unsubAppt = onSnapshot(qAppt, (snap) => {
      appts = snap.docs.map(doc => ({ id: doc.id, type: 'appointment', ...doc.data() }));
      processCombined();
    });

    const qCons = query(collection(db, "consultations"), where("patientId", "==", user.uid));
    const unsubCons = onSnapshot(qCons, (snap) => {
      consults = snap.docs.map(doc => ({ id: doc.id, type: 'consultation', ...doc.data() }));
      processCombined();
    });

    const qReqs = query(collection(db, "pharmacyRequests"), where("patientId", "==", user.uid));
    const unsubReqs = onSnapshot(qReqs, (snap) => {
      reqs = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.consultationId) reqs[data.consultationId] = true;
      });
      processCombined();
    });

    return () => {
      unsubAppt();
      unsubCons();
      unsubReqs();
    };
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => {
    let statusColor = "#64748B";
    let statusText = t(`status_${item.status}`, item.status);
    let icon = "calendar";

    if (item.status === "pending") {
      statusColor = "#F59E0B";
      statusText = t('status_waiting_doctor');
      icon = "clock-outline";
    } else if (item.status === "confirmed") {
      statusColor = theme.colors.secondary;
      icon = "calendar-check";
    } else if (item.status === "in_progress") {
      statusColor = "#EF4444";
      statusText = item.consultationType === "in_person" ? t('status_visit_started') : t('status_call_started');
      icon = item.consultationType === "in_person" ? "map-marker-account" : "video-outline";
    } else if (item.status === "completed" || item.status === "call_ended") {
      statusColor = theme.colors.primary;
      statusText = t('status_completed');
      icon = "check-circle";
    }

    const isInPerson = item.consultationType === "in_person";

    return (
      <Surface style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]} elevation={0}>
        <View style={styles.cardHeader}>
          <Avatar.Icon size={44} icon="doctor" style={{ backgroundColor: statusColor + '15' }} color={statusColor} />
          <View style={styles.infoBox}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{t('lbl_appointment_with', { name: item.doctorName })}</Text>
            <Text variant="bodySmall" style={{ color: '#64748B' }}>{t(`dept.${item.department}`, item.department)}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: statusColor + '15' }]}>
            <MaterialCommunityIcons name={icon} size={14} color={statusColor} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {item.scheduledTime && (
          <View style={styles.timeRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
            <Text style={styles.timeText}>{t('lbl_scheduled')}: {item.scheduledDate ? `${item.scheduledDate} ${t('lbl_at')} ` : ''}{item.scheduledTime}</Text>
          </View>
        )}

        {isInPerson && (
          <View style={[styles.timeRow, { marginTop: -8, backgroundColor: theme.colors.primaryContainer + '30' }]}>
            <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
            <Text style={[styles.timeText, { color: theme.colors.primary }]}>{t('lbl_in_person_visit')}: {item.location}</Text>
          </View>
        )}

        {item.status === "in_progress" && !isInPerson && (
          <Button
            mode="contained"
            buttonColor="#EF4444"
            icon="video"
            style={{ borderRadius: 8, marginBottom: 16 }}
            onPress={() => Linking.openURL(item.videoLink || 'https://meet.google.com/')}
          >
            {t('join_call')}
          </Button>
        )}

        {item.status === "in_progress" && isInPerson && (
          <View style={[styles.timeRow, { backgroundColor: '#FEF2F2', marginTop: -8 }]}>
            <MaterialCommunityIcons name="information" size={16} color="#EF4444" />
            <Text style={[styles.timeText, { color: '#EF4444' }]}>{t('msg_proceed_to_room')}</Text>
          </View>
        )}

        {item.consultation && (
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, fontWeight: 'bold', fontSize: 16, color: '#0F172A' }}>{t('lbl_digital_prescription')}</Text>
            </View>

            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionTitle}>{t('lbl_diagnosis')}</Text>
              <Text variant="bodyMedium" style={{ color: '#334155' }}>{item.consultation.diagnosis}</Text>
            </View>

            {item.consultation.medications?.length > 0 && (
              <View style={styles.section}>
                <Text variant="labelLarge" style={styles.sectionTitle}>{t('lbl_medicines')}</Text>
                {item.consultation.medications.map((med, i) => (
                  <View key={i} style={styles.medRow}>
                    <MaterialCommunityIcons name="pill" size={16} color="#64748B" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={{ fontWeight: 'bold', color: '#334155' }}>{med.name}</Text>
                      <Text style={{ color: '#64748B', fontSize: 13 }}>{med.dosage} {med.instructions ? `• ${med.instructions}` : ''}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {sentConsults[item.consultation.id] ? (
                <Button mode="contained-tonal" style={{ borderRadius: 8 }} icon="check-circle" disabled>
                  {t('btn_sent_to_pharmacy')}
                </Button>
              ) : (
                <Button 
                  mode="contained" 
                  buttonColor={theme.colors.secondary}
                  style={{ borderRadius: 8 }}
                  icon="medical-bag"
                  loading={sending[item.consultation.id]}
                  disabled={sending[item.consultation.id]}
                  onPress={() => handleSendToPharmacy(item.consultation)}
                >
                  {t('btn_send_to_pharmacy')}
                </Button>
              )}
              
              <Button 
                mode="outlined" 
                style={{ borderRadius: 8 }}
                icon="file-document-outline"
                onPress={() => router.push({ pathname: "/(patient)/report", params: { appointmentId: item.id }})}
              >
                {t('btn_view_full_report')}
              </Button>
            </View>
          </View>
        )}
      </Surface>
    );
  };

  const handleSendToPharmacy = async (consultation) => {
    try {
      setSending(prev => ({ ...prev, [consultation.id]: true }));
      const pharmacyId = await getSequentialPharmacy();
      if (!pharmacyId) {
        alert(t('err_no_pharmacy_available'));
        setSending(prev => ({ ...prev, [consultation.id]: false }));
        return;
      }

      await addDoc(collection(db, "pharmacyRequests"), {
        patientId: user.uid,
        pharmacyId: pharmacyId,
        medications: consultation.medications,
        status: "pending",
        createdAt: new Date(),
        consultationId: consultation.id,
        attemptedPharmacies: [pharmacyId]
      });

      alert(t('msg_sent_to_pharmacy'));
    } catch (error) {
      alert(t('err_sending_pharmacy'));
    } finally {
      setSending(prev => ({ ...prev, [consultation.id]: false }));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.Content title={t('tab_assigned_doctors')} color="#0F172A" titleStyle={{ fontWeight: '800', fontSize: 28 }} />
        <LanguageToggle color="#1E3A8A" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="doctor" size={64} color="#CBD5E1" />
          <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>
            {t('msg_no_assigned_doctors')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 24, paddingBottom: 120, flexGrow: 1 },
  card: { 
    padding: 24, 
    borderRadius: 32, 
    backgroundColor: '#FFFFFF', 
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderLeftWidth: 0,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 20 },
  iconBox: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  infoBox: { marginLeft: 16, flex: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 20 },
  timeText: { marginLeft: 12, color: '#334155', fontWeight: '600', fontSize: 14 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#64748B', marginBottom: 8, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  medRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 8 }
});
