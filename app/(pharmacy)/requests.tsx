import { View, FlatList, StyleSheet, Alert } from "react-native";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc, getFirestore, addDoc, onSnapshot } from "firebase/firestore";
import { getSequentialPharmacy } from "../../services/dbService";
import { app } from "../../config/firebaseConfig";
import { Surface, Text, Button, Appbar, ActivityIndicator, Portal, Modal, Checkbox, useTheme } from "react-native-paper";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const db = getFirestore(app);

export default function PharmacyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Array of indices of medications that the pharmacy HAS in stock
  const [checkedMeds, setCheckedMeds] = useState([]);
  
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
        if (d.data().status === "pending") {
          data.push({ id: d.id, ...d.data() });
        }
      });
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || Date.now();
        return timeB - timeA;
      });
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openReviewModal = (req) => {
    setSelectedRequest(req);
    setCheckedMeds(req.medications.map((_, i) => i)); // Default all checked
    setModalVisible(true);
  };

  const toggleCheckbox = (index) => {
    if (checkedMeds.includes(index)) {
      setCheckedMeds(checkedMeds.filter(i => i !== index));
    } else {
      setCheckedMeds([...checkedMeds, index]);
    }
  };

  const handleAcceptOrder = async () => {
    if (checkedMeds.length === 0) {
      alert("You must select at least one medicine to accept.");
      return;
    }

    setModalVisible(false);
    
    try {
      const isPartial = checkedMeds.length < selectedRequest.medications.length;
      
      const acceptedMeds = selectedRequest.medications.filter((_, i) => checkedMeds.includes(i));
      const rejectedMeds = selectedRequest.medications.filter((_, i) => !checkedMeds.includes(i));

      if (isPartial) {
        // Update current request to partial
        await updateDoc(doc(db, "pharmacyRequests", selectedRequest.id), {
          status: "partial",
          medications: acceptedMeds
        });

        // Split the remaining order and send to next pharmacy in the sequential pool
        const attempted = selectedRequest.attemptedPharmacies || [user.uid];
        const nextPharmacyId = await getSequentialPharmacy(attempted);

        if (nextPharmacyId) {
          await addDoc(collection(db, "pharmacyRequests"), {
            patientId: selectedRequest.patientId,
            pharmacyId: nextPharmacyId,
            medications: rejectedMeds,
            status: "pending",
            createdAt: new Date(),
            consultationId: selectedRequest.consultationId,
            attemptedPharmacies: [...attempted, nextPharmacyId]
          });
          alert("Partial order accepted. Remaining medicines allocated to the next pharmacy.");
        } else {
          // If no other pharmacy exists, we must notify the Admin (oversight)
          await addDoc(collection(db, "pharmacyRequests"), {
            patientId: selectedRequest.patientId,
            pharmacyId: "unassigned",
            medications: rejectedMeds,
            status: "pending_admin_oversight",
            createdAt: new Date(),
            consultationId: selectedRequest.consultationId,
            attemptedPharmacies: attempted
          });
          alert("Partial order accepted. No other pharmacies available. Remainder sent to Admin Oversight.");
        }
      } else {
        // Full order accepted
        await updateDoc(doc(db, "pharmacyRequests", selectedRequest.id), {
          status: "accepted"
        });
        alert("Full order accepted.");
      }
    } catch (error) {
      console.log(error);
      alert("Error processing order.");
    }
  };

  const handleRejectOrder = async () => {
    Alert.alert(
      "Reject Order",
      "Are you sure you cannot fulfill any of this order? It will be re-assigned to the next pharmacy.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive",
          onPress: async () => {
            setModalVisible(false);
            try {
              const attempted = selectedRequest.attemptedPharmacies || [user.uid];
              const nextPharmacyId = await getSequentialPharmacy(attempted);
              
              if (nextPharmacyId) {
                await updateDoc(doc(db, "pharmacyRequests", selectedRequest.id), {
                  pharmacyId: nextPharmacyId,
                  attemptedPharmacies: [...attempted, nextPharmacyId]
                });
                alert("Order passed to the next pharmacy.");
              } else {
                await updateDoc(doc(db, "pharmacyRequests", selectedRequest.id), {
                  pharmacyId: "unassigned",
                  status: "pending_admin_oversight"
                });
                alert("No other pharmacies available. Sent to Admin Oversight.");
              }
            } catch (error) {
              alert("Error rejecting order.");
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
        <Appbar.Content title="Order Requests" color="#0F172A" titleStyle={{ fontWeight: '800', fontSize: 28 }} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="inbox-arrow-down" size={64} color="#CBD5E1" />
          <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>No pending orders.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <Surface style={styles.card} elevation={0}>
                <View style={styles.header}>
                  <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons name="receipt-outline" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Prescription Request</Text>
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>
                      {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.sectionTitle}>Requested Medicines ({item.medications?.length})</Text>
                  {item.medications?.map((m, i) => (
                    <View key={i} style={styles.medRow}>
                      <MaterialCommunityIcons name="pill" size={16} color="#64748B" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: '#334155', fontWeight: 'bold' }}>{m.name}</Text>
                        <Text style={{ color: '#64748B', fontSize: 13 }}>{m.dosage}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Button mode="contained" style={{ borderRadius: 16 }} contentStyle={{ paddingVertical: 8 }} onPress={() => openReviewModal(item)}>
                  Review Order Availability
                </Button>
              </Surface>
          }
        />
      )}

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>Confirm Availability</Text>
          <Text style={{ color: '#64748B', marginBottom: 16 }}>
            Check the medicines you currently have in stock. Unchecked items will be automatically forwarded to the next pharmacy.
          </Text>

          <FlatList
            data={selectedRequest?.medications || []}
            keyExtractor={(_, index) => index.toString()}
            style={{ maxHeight: 300, marginBottom: 16 }}
            renderItem={({ item, index }) => (
              <View style={styles.checkRow}>
                <Checkbox
                  status={checkedMeds.includes(index) ? 'checked' : 'unchecked'}
                  onPress={() => toggleCheckbox(index)}
                  color={theme.colors.primary}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                  <Text style={{ color: '#64748B', fontSize: 12 }}>{item.dosage}</Text>
                </View>
              </View>
            )}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button mode="outlined" style={{ flex: 1, borderRadius: 16 }} textColor="#EF4444" onPress={handleRejectOrder}>
              Reject All
            </Button>
            <Button mode="contained" style={{ flex: 1, borderRadius: 16 }} onPress={handleAcceptOrder}>
              Accept Selected
            </Button>
          </View>
        </Modal>
      </Portal>
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
  modalContent: { backgroundColor: 'white', padding: 24, margin: 24, borderRadius: 32 },
  checkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 8 }
});