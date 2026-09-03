import { View, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc, getFirestore } from "firebase/firestore";
import { app } from "../../config/firebaseConfig";
import { Surface, Text, Appbar, ActivityIndicator, Button, useTheme } from "react-native-paper";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const db = getFirestore(app);

export default function Oversight() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const theme = useTheme();

  const fetchRequests = async () => {
    const q1 = query(collection(db, "pharmacyRequests"), where("status", "==", "pending"));
    const q2 = query(collection(db, "pharmacyRequests"), where("status", "==", "pending_admin_oversight"));
    
    const snap1 = await getDocs(q1);
    const snap2 = await getDocs(q2);
    
    let data = [];
    snap1.forEach((d) => data.push({ id: d.id, ...d.data() }));
    snap2.forEach((d) => data.push({ id: d.id, ...d.data() }));
    
    data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleForceAssign = async (id) => {
    // In a real application, you would pick a specific pharmacy or notify them.
    // For now, we will just mark it as resolved by admin.
    try {
      await updateDoc(doc(db, "pharmacyRequests", id), {
        status: "accepted",
        pharmacyId: "admin_forced" // Example
      });
      alert("Request forcefully assigned/resolved.");
      fetchRequests();
    } catch (e) {
      alert("Error processing.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content title="Pharmacy Pool Oversight" color="#FFF" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="eye-check" size={64} color="#CBD5E1" />
          <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>All requests are being handled smoothly.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isOversight = item.status === "pending_admin_oversight";
            return (
              <Surface style={[styles.card, { borderLeftColor: isOversight ? '#EF4444' : '#F59E0B', borderLeftWidth: 4 }]} elevation={1}>
                <View style={styles.header}>
                  <MaterialCommunityIcons name={isOversight ? "alert-circle" : "clock"} size={24} color={isOversight ? '#EF4444' : '#F59E0B'} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: isOversight ? '#EF4444' : '#0F172A' }}>
                      {isOversight ? "Needs Admin Intervention" : "Currently Pending in Pool"}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>
                      {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#64748B', marginBottom: 8 }}>Medicines:</Text>
                  {item.medications?.map((m, i) => (
                    <Text key={i} style={{ color: '#334155', fontWeight: '500' }}>• {m.name} ({m.dosage})</Text>
                  ))}
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#64748B' }}>Attempted Pharmacies: {item.attemptedPharmacies?.length || 0}</Text>
                  <Text style={{ color: '#64748B' }}>Currently Assigned: {item.pharmacyId}</Text>
                </View>

                {isOversight && (
                  <Button mode="contained" buttonColor="#EF4444" onPress={() => handleForceAssign(item.id)}>
                    Force Fulfill / Assign
                  </Button>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 }
});
