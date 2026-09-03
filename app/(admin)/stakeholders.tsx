import { View, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getPendingDoctors, approveDoctor } from "../../services/dbService";
import { Appbar, Surface, Text, Button, useTheme, Avatar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";
import { collection, query, where, getFirestore, onSnapshot } from "firebase/firestore";
import { app } from "../../config/firebaseConfig";

const db = getFirestore(app);

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "doctor"),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setDoctors(data);
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (id) => {
    await approveDoctor(id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.Content title="Admin: Pending Doctors" color="#0F172A" titleStyle={{ fontWeight: '800', fontSize: 28 }} />
        <Appbar.Action icon="logout" iconColor="#64748B" onPress={() => { getAuth().signOut(); router.replace("/"); }} />
      </Appbar.Header>

      <FlatList
        contentContainerStyle={styles.list}
        data={doctors}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="shield-account" size={64} color="#CBD5E1" />
            <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>No pending doctors.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Surface style={styles.card} elevation={0}>
            <View style={styles.cardHeader}>
              <Avatar.Icon size={56} icon="doctor" style={{ backgroundColor: theme.colors.secondaryContainer, borderRadius: 20 }} color={theme.colors.secondary} />
              <View style={styles.infoBox}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Dr. {item.name || item.email.split('@')[0]}</Text>
                <Text variant="bodySmall" style={{ color: '#64748B' }}>{item.department}</Text>
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#64748B', marginBottom: 4, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }}>Email Address:</Text>
              <Text style={{ color: '#334155', fontWeight: '500' }}>{item.email}</Text>
            </View>

            <Button
              mode="contained"
              buttonColor={theme.colors.secondary}
              icon="check-circle"
              style={{ borderRadius: 16 }}
              contentStyle={{ paddingVertical: 8 }}
              onPress={() => handleApprove(item.id)}
            >
              Approve Doctor Account
            </Button>
          </Surface>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 24, paddingBottom: 120, flexGrow: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
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
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 20 },
  infoBox: { marginLeft: 16, flex: 1 },
});