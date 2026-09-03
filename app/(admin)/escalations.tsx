import { View, FlatList, StyleSheet, Alert } from "react-native";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc, getFirestore, onSnapshot } from "firebase/firestore";
import { app } from "../../config/firebaseConfig";
import { Surface, Text, Appbar, ActivityIndicator, Button, useTheme } from "react-native-paper";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const db = getFirestore(app);

export default function AdminEscalations() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const theme = useTheme();

  useEffect(() => {
    const q = query(collection(db, "escalations"));
    const unsubscribe = onSnapshot(q, (snap) => {
      let data = [];
      snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setEscalations(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleResolve = async (id) => {
    Alert.prompt(
      "Resolve Escalation",
      "Enter the referral details or resolution notes:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Resolve", 
          onPress: async (notes) => {
            try {
              await updateDoc(doc(db, "escalations", id), {
                status: "resolved",
                adminNotes: notes || "Referred to specialist",
                resolvedAt: new Date()
              });
              alert("Escalation resolved.");
            } catch (e) {
              alert("Error resolving.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.Content title="Escalation Management" color="#0F172A" titleStyle={{ fontWeight: '800', fontSize: 28 }} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : escalations.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="shield-check" size={64} color="#CBD5E1" />
          <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>No pending escalations.</Text>
        </View>
      ) : (
        <FlatList
          data={escalations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isResolved = item.status === "resolved";
            const statusColor = isResolved ? theme.colors.primary : '#EF4444';
            return (
              <Surface style={styles.card} elevation={0}>
                <View style={styles.header}>
                  <View style={[styles.iconBox, { backgroundColor: statusColor + '15' }]}>
                    <MaterialCommunityIcons name={isResolved ? "check-circle" : "alert-decagram"} size={24} color={statusColor} />
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Patient: {item.patientName}</Text>
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>
                      Filed {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: isResolved ? theme.colors.primary + '15' : '#EF444415' }]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: isResolved ? theme.colors.primary : '#EF4444' }}>
                      {isResolved ? "RESOLVED" : "NEEDS ACTION"}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#64748B', marginBottom: 4, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }}>Reason for Escalation:</Text>
                  <Text style={{ color: '#334155', fontStyle: 'italic' }}>"{item.reason}"</Text>
                </View>

                {item.consultationDetails && (
                  <View style={{ marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
                    <Text style={{ color: '#64748B', marginBottom: 8, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }}>Consultation Details</Text>
                    
                    <Text style={{ color: '#334155', fontWeight: '600', marginBottom: 2 }}>Diagnosis:</Text>
                    <Text style={{ color: '#334155', marginBottom: 8 }}>{item.consultationDetails.diagnosis || 'None'}</Text>

                    {item.consultationDetails.remarks ? (
                      <>
                        <Text style={{ color: '#334155', fontWeight: '600', marginBottom: 2 }}>Doctor Notes:</Text>
                        <Text style={{ color: '#334155', marginBottom: 8 }}>{item.consultationDetails.remarks}</Text>
                      </>
                    ) : null}

                    {item.consultationDetails.medications?.length > 0 && (
                      <>
                        <Text style={{ color: '#334155', fontWeight: '600', marginBottom: 2 }}>Prescribed Medications:</Text>
                        {item.consultationDetails.medications.map((m, i) => (
                          <Text key={i} style={{ color: '#334155' }}>• {m.name} ({m.dosage})</Text>
                        ))}
                      </>
                    )}
                  </View>
                )}

                {isResolved && item.adminNotes && (
                  <View style={{ marginBottom: 16, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ color: '#166534', marginBottom: 4, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }}>Admin Resolution:</Text>
                    <Text style={{ color: '#166534', fontWeight: '500' }}>{item.adminNotes}</Text>
                  </View>
                )}

                {!isResolved && (
                  <Button mode="contained" buttonColor="#EF4444" style={{ borderRadius: 16 }} contentStyle={{ paddingVertical: 8 }} onPress={() => handleResolve(item.id)}>
                    Coordinate Referral & Resolve
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
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }
});
