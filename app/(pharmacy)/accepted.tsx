import { View, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc, getFirestore, onSnapshot } from "firebase/firestore";
import { app } from "../../config/firebaseConfig";
import { Surface, Text, Button, Appbar, ActivityIndicator, useTheme } from "react-native-paper";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const db = getFirestore(app);

export default function PharmacyAccepted() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const theme = useTheme();
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "pharmacyRequests"),
      where("pharmacyId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      let data = [];
      snap.forEach((d) => {
        const docData = d.data();
        if (["accepted", "partial", "ready"].includes(docData.status)) {
          data.push({ id: d.id, ...docData });
        }
      });
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || Date.now();
        return timeB - timeA;
      });
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const markReady = async (id) => {
    try {
      await updateDoc(doc(db, "pharmacyRequests", id), {
        status: "ready"
      });
    } catch (error) {
      alert("Error updating order.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.Content title="Accepted Orders" color="#0F172A" titleStyle={{ fontWeight: '800', fontSize: 28 }} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="package-variant" size={64} color="#CBD5E1" />
          <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>No accepted orders.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isReady = item.status === 'ready';
            const statusColor = isReady ? '#10B981' : theme.colors.primary;
            return (
            <Surface style={styles.card} elevation={0}>
              <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: statusColor + '15' }]}>
                  <MaterialCommunityIcons 
                    name={isReady ? "check-circle" : "package-variant-closed"} 
                    size={24} 
                    color={statusColor} 
                  />
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {item.status === 'partial' ? "Partial Order" : "Full Order"}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#64748B' }}>
                    {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString() : ''}
                  </Text>
                </View>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>Medicines to Prepare</Text>
                {item.medications?.map((m, i) => (
                  <View key={i} style={styles.medRow}>
                     <MaterialCommunityIcons name="pill" size={16} color="#64748B" />
                     <View style={{ marginLeft: 8 }}>
                       <Text style={{ fontWeight: 'bold', color: '#334155' }}>{m.name}</Text>
                       <Text style={{ color: '#64748B', fontSize: 13 }}>{m.dosage}</Text>
                     </View>
                  </View>
                ))}
              </View>

              {!isReady && (
                <Button 
                  mode="contained" 
                  buttonColor="#10B981" 
                  icon="check" 
                  style={{ borderRadius: 16 }}
                  contentStyle={{ paddingVertical: 8 }}
                  onPress={() => markReady(item.id)}
                >
                  Mark as Ready for Pickup
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 20 },
  iconBox: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#64748B', marginBottom: 8, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  medRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 8 },
});
