import { View, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, getFirestore, onSnapshot } from "firebase/firestore";
import { getSequentialPharmacy } from "../../services/dbService";
import { app } from "../../config/firebaseConfig";
import { Surface, Text, Button, useTheme, ActivityIndicator, Appbar } from "react-native-paper";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const db = getFirestore(app);

export default function Pharmacies() {
  const [requests, setRequests] = useState([]);
  const [sending, setSending] = useState({});
  const [loading, setLoading] = useState(true);
  
  const theme = useTheme();
  const { t } = useTranslation();
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "pharmacyRequests"),
      where("patientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let data = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });

      const grouped = data.reduce((acc, req) => {
        if (!acc[req.consultationId]) acc[req.consultationId] = [];
        acc[req.consultationId].push(req);
        return acc;
      }, {});

      const processed = [];
      for (const [consultationId, reqs] of Object.entries(grouped)) {
        reqs.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return tb - ta;
        });

        const activeReq = reqs[0];
        let hasReady = reqs.some(r => r.status === "ready");
        let hasPartial = reqs.some(r => r.status === "partial" || r.status === "accepted");

        let displayStatus = "pending";
        if (hasReady) displayStatus = "ready";
        else if (hasPartial) displayStatus = "accepted";

        let allMeds = [];
        reqs.forEach(r => {
          if (r.medications) {
            allMeds = [...allMeds, ...r.medications];
          }
        });

        const uniqueMeds = Array.from(new Map(allMeds.map(m => [m.name, m])).values());

        let locationDetails = null;
        if (displayStatus === "ready") {
          const readyReq = reqs.find(r => r.status === "ready");
          if (readyReq && readyReq.pharmacyId) {
            try {
              const qPharm = query(collection(db, "users"), where("uid", "==", readyReq.pharmacyId));
              const pSnap = await getDocs(qPharm);
              if (!pSnap.empty) {
                locationDetails = pSnap.docs[0].data();
              }
            } catch (e) {}
          }
        }

        processed.push({
          id: consultationId,
          displayStatus,
          medications: uniqueMeds,
          createdAt: activeReq.createdAt,
          location: locationDetails
        });
      }

      processed.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });

      setRequests(processed);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusInfo = (status) => {
    switch(status) {
      case 'ready': return { color: '#10B981', icon: 'check-circle', text: 'Ready for Pickup' };
      case 'accepted': return { color: '#3B82F6', icon: 'package-variant', text: 'Preparing Order' };
      default: return { color: '#F59E0B', icon: 'clock-outline', text: 'Processing' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.Content title="Pharmacy Queue" color="#0F172A" titleStyle={{ fontWeight: '800', fontSize: 28 }} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="pill" size={64} color="#CBD5E1" />
          <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>
            No prescriptions found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const { color, icon, text } = getStatusInfo(item.displayStatus);
            return (
              <Surface style={styles.card} elevation={0}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <MaterialCommunityIcons name={icon} size={24} color={color} />
                  </View>
                  <View style={styles.infoBox}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{text}</Text>
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>
                      {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.sectionTitle}>Prescribed Medications</Text>
                {item.medications?.map((med, i) => (
                  <View key={i} style={styles.medRow}>
                    <MaterialCommunityIcons name="pill" size={16} color="#64748B" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={{ fontWeight: 'bold', color: '#334155' }}>{med.name}</Text>
                      <Text style={{ color: '#64748B', fontSize: 13 }}>{med.dosage}</Text>
                    </View>
                  </View>
                ))}
                
                {item.location && (
                  <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker" size={20} color="#059669" />
                    <Text style={{ marginLeft: 8, color: '#065F46', flex: 1, fontSize: 13, fontWeight: '600' }}>
                      Pickup at: {item.location.name || item.location.address}
                    </Text>
                  </View>
                )}
              </Surface>
            );
          }}
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
  section: { marginBottom: 16 },
  sectionTitle: { color: '#64748B', marginBottom: 8, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  medRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: '#BBF7D0' }
});
