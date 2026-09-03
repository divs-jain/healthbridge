import { View, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, getFirestore } from "firebase/firestore";
import { app } from "../../config/firebaseConfig";
import { Surface, Text, Appbar, ActivityIndicator, useTheme } from "react-native-paper";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const db = getFirestore(app);

export default function Escalations() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const user = getAuth().currentUser;

  const fetchEscalations = async () => {
    if (!user) return;
    const q = query(
      collection(db, "escalations"),
      where("doctorId", "==", user.uid)
    );
    const snap = await getDocs(q);
    let data = [];
    snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    setEscalations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEscalations();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => {
    let statusColor = "#F59E0B";
    let statusText = "Pending Admin Review";
    let icon = "clock-outline";

    if (item.status === "resolved") {
      statusColor = theme.colors.primary;
      statusText = "Resolved by Admin";
      icon = "check-circle";
    }

    return (
      <Surface style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]} elevation={1}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="alert" size={24} color={statusColor} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Patient: {item.patientName}</Text>
            <Text variant="bodySmall" style={{ color: '#64748B' }}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>Escalation Reason</Text>
          <Text variant="bodyMedium" style={{ color: '#334155' }}>"{item.reason}"</Text>
        </View>

        <View style={[styles.pill, { backgroundColor: statusColor + '15' }]}>
          <MaterialCommunityIcons name={icon} size={16} color={statusColor} style={{ marginRight: 4 }} />
          <Text style={[styles.pillText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </Surface>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content title="My Escalations" color="#FFF" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : escalations.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="shield-check" size={64} color="#CBD5E1" />
          <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>No escalations filed.</Text>
        </View>
      ) : (
        <FlatList
          data={escalations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#64748B', marginBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: 'bold' }
});
