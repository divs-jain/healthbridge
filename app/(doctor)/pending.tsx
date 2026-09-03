import { View, FlatList, StyleSheet, Linking, Alert } from "react-native";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  onSnapshot
} from "firebase/firestore";
import { app } from "../../config/firebaseConfig";
import { useRouter, Stack } from "expo-router";
import { Appbar, Text, Surface, Button, useTheme, Avatar, Portal, Modal, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const db = getFirestore(app);

export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  
  // Escalate Modal State
  const [escalateVisible, setEscalateVisible] = useState(false);
  const [escalateItem, setEscalateItem] = useState(null);
  const [escalateReason, setEscalateReason] = useState("");

  // Schedule Modal State
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [scheduleItem, setScheduleItem] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [consultationType, setConsultationType] = useState("online"); // "online" or "in_person"
  const [locationStr, setLocationStr] = useState("");
  
  const theme = useTheme();
  const user = getAuth().currentUser;
  const router = useRouter();

  const bookedSlots = appointments
    .filter(a => a.status === 'confirmed' || a.status === 'in_progress')
    .map(a => `${a.scheduledDate || ''}|${a.scheduledTime}`);

  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };
  const dates = getNextDays();

  const timeSlots = [
    "9:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "1:00 PM - 2:00 PM",
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
  ];

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "appointments"),
      where("doctorId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = [];
      snapshot.forEach((docSnap) => {
        const docData = docSnap.data();
        if (docData.status !== 'completed' && docData.status !== 'escalated') {
          data.push({ id: docSnap.id, ...docData });
        }
      });
      data.sort((a, b) => {
        const order = { in_progress: 1, pending: 2, confirmed: 3, call_ended: 4 };
        return (order[a.status] || 99) - (order[b.status] || 99);
      });
      setAppointments(data);
    });
    return () => unsubscribe();
  }, [router]);

  const handleConfirmSchedule = async () => {
    if (!selectedDate) return alert("Please select a date.");
    if (!selectedTime) return alert("Please select a time slot.");
    if (consultationType === "in_person" && !locationStr.trim()) return alert("Please enter the hospital/clinic address.");

    try {
      if (scheduleItem.status === 'completed' || scheduleItem.status === 'call_ended') {
        // This is a "Consult Again" action. Create a NEW appointment.
        await addDoc(collection(db, "appointments"), {
          doctorId: scheduleItem.doctorId,
          doctorName: scheduleItem.doctorName || "",
          patientId: scheduleItem.patientId,
          patientName: scheduleItem.patientName,
          department: scheduleItem.department || "",
          status: "confirmed",
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
          consultationType: consultationType,
          location: consultationType === "in_person" ? locationStr : "",
          createdAt: new Date(),
          hasRx: false
        });
      } else {
        // Normal scheduling of a pending appointment
        await updateDoc(doc(db, "appointments", scheduleItem.id), {
          status: "confirmed",
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
          consultationType: consultationType,
          location: consultationType === "in_person" ? locationStr : ""
        });
      }
      setScheduleVisible(false);
    } catch (error) {
      alert("Error updating appointment");
    }
  };

  const handleInitiateCall = async (id) => {
    try {
      const meetId = Math.random().toString(36).substring(2, 12);
      const link = `https://meet.google.com/${meetId.substring(0,3)}-${meetId.substring(3,7)}-${meetId.substring(7,10)}`;
      
      await updateDoc(doc(db, "appointments", id), {
        status: "in_progress",
        videoLink: link
      });
      
      Linking.openURL(link);
    } catch (error) {
      alert("Failed to initiate call");
    }
  };

  const handleInitiateVisit = async (id) => {
    try {
      await updateDoc(doc(db, "appointments", id), {
        status: "in_progress"
      });
    } catch (error) {
      alert("Failed to start visit");
    }
  };

  const handleEndCall = async (id) => {
    try {
      await updateDoc(doc(db, "appointments", id), {
        status: "call_ended",
      });
    } catch (error) {
      alert("Error ending consultation");
    }
  };

  // Removed handleConsultAgain as we will open the Schedule Modal directly

  const submitEscalation = async () => {
    if (!escalateReason.trim()) {
      alert("Please enter a reason.");
      return;
    }
    try {
      // Fetch the consultation data if it exists
      const qCons = query(collection(db, "consultations"), where("appointmentId", "==", escalateItem.id));
      const snapCons = await getDocs(qCons);
      let consultationData = null;
      if (!snapCons.empty) {
        consultationData = snapCons.docs[0].data();
      }

      await addDoc(collection(db, "escalations"), {
        patientId: escalateItem.patientId,
        patientName: escalateItem.patientName,
        doctorId: user.uid,
        appointmentId: escalateItem.id,
        reason: escalateReason,
        status: "pending_admin_review",
        createdAt: new Date(),
        consultationDetails: consultationData ? {
          diagnosis: consultationData.diagnosis || "",
          remarks: consultationData.remarks || "",
          medications: consultationData.medications || []
        } : null
      });
      
      await updateDoc(doc(db, "appointments", escalateItem.id), {
        status: "escalated"
      });
      
      setEscalateVisible(false);
      alert("Case escalated successfully.");
    } catch (error) {
      alert("Error escalating case.");
    }
  };

  const AppointmentCard = ({ item }) => {
    const isPending = item.status === "pending";
    const statusColor = isPending ? "#F59E0B" : item.status === "in_progress" ? "#EF4444" : theme.colors.secondary;
    const isInPerson = item.consultationType === "in_person";
    
    return (
      <Surface style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]} elevation={0}>
        <View style={styles.cardHeader}>
          <Avatar.Text 
            size={44} 
            label={item.patientName?.substring(0, 2).toUpperCase() || 'P'} 
            style={{ backgroundColor: isPending ? '#FEF3C7' : theme.colors.secondaryContainer }} 
            color={statusColor} 
          />
          <View style={styles.patientInfo}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.patientName}</Text>
            <View style={styles.statusPill}>
              <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {item.scheduledTime && (
          <View style={styles.timeRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
            <Text style={styles.timeText}>{item.scheduledDate ? `${item.scheduledDate === dates[0] ? 'Today' : item.scheduledDate === dates[1] ? 'Tomorrow' : item.scheduledDate.substring(5)} at ` : ''}{item.scheduledTime}</Text>
            {isInPerson && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}>
                <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
                <Text style={{ marginLeft: 4, color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>In-Person</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          {isPending ? (
            <Button
              mode="contained"
              onPress={() => {
                setScheduleItem(item);
                setSelectedDate(dates[0]);
                setSelectedTime("");
                setConsultationType("online");
                setLocationStr("");
                setScheduleVisible(true);
              }}
              icon="calendar-plus"
              style={{ borderRadius: 8 }}
            >
              Schedule
            </Button>
          ) : (
            <View style={{ flex: 1, flexDirection: 'column', gap: 12 }}>
              
              {/* Call / Visit Controls */}
              {item.status === "confirmed" && (
                <Button 
                  mode="contained" 
                  buttonColor="#10B981" 
                  icon={isInPerson ? "map-marker-account" : "video"} 
                  style={{ borderRadius: 8 }}
                  onPress={() => isInPerson ? handleInitiateVisit(item.id) : handleInitiateCall(item.id)}
                >
                  {isInPerson ? "Start In-Person Visit" : "Start Video Call"}
                </Button>
              )}
              {item.status === "in_progress" && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!isInPerson && (
                    <Button mode="contained-tonal" style={{ flex: 1, borderRadius: 8 }} icon="video" onPress={() => Linking.openURL(item.videoLink)}>
                      Re-Join Call
                    </Button>
                  )}
                  <Button mode="contained" style={{ flex: 1, borderRadius: 8 }} buttonColor="#EF4444" icon="check-circle" onPress={() => handleEndCall(item.id)}>
                    {isInPerson ? "End Visit" : "End Call"}
                  </Button>
                </View>
              )}

              {/* Write Prescription Control (First Time) */}
              {(item.status === "in_progress" || item.status === "call_ended" || item.status === "completed") && !item.hasRx && (
                <Button 
                  mode="contained" 
                  buttonColor={theme.colors.secondary} 
                  icon="prescription"
                  style={{ borderRadius: 8 }}
                  onPress={() => router.push({ pathname: "/(doctor)/consultation", params: { appointmentId: item.id, patientId: item.patientId, readonly: "false" }})}
                >
                  Write Rx
                </Button>
              )}

              {/* View Prescription & Consult Again Controls */}
              {item.hasRx && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: (item.status === "confirmed" || item.status === "in_progress") ? 12 : 0 }}>
                  <Button 
                    mode="outlined" 
                    style={{ flex: 1, borderRadius: 8 }} 
                    icon="file-document-outline"
                    onPress={() => router.push({ pathname: "/(doctor)/consultation", params: { appointmentId: item.id, patientId: item.patientId, readonly: "true" }})}
                  >
                    View Rx
                  </Button>
                  
                  {item.status !== "confirmed" && item.status !== "in_progress" && (
                    <Button 
                      mode="contained-tonal" 
                      style={{ flex: 1, borderRadius: 8 }} 
                      icon="calendar-sync"
                      onPress={() => {
                        setScheduleItem(item);
                        setSelectedDate(dates[0]);
                        setSelectedTime("");
                        setConsultationType("online");
                        setLocationStr("");
                        setScheduleVisible(true);
                      }}
                    >
                      Consult Again
                    </Button>
                  )}
                </View>
              )}

            </View>
          )}
        </View>

        {item.status !== 'completed' && item.status !== 'escalated' && (
          <Button
            mode="text"
            textColor="#F59E0B"
            icon="alert"
            style={{ marginTop: 8 }}
            onPress={() => {
              setEscalateItem(item);
              setEscalateReason("");
              setEscalateVisible(true);
            }}
          >
            Flag / Escalate Case to Admin
          </Button>
        )}
      </Surface>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: '#F8FAFC', elevation: 0 }}>
        <Appbar.Content title="Pending Patients" color="#0F172A" titleStyle={{ fontWeight: '800', fontSize: 28 }} />
        <Appbar.Action icon="logout" iconColor="#64748B" onPress={() => { getAuth().signOut(); router.replace("/"); }} />
      </Appbar.Header>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AppointmentCard item={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-check" size={64} color="#CBD5E1" />
            <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>No appointments today.</Text>
          </View>
        }
      />

      {/* Escalate Modal */}
      <Portal>
        <Modal visible={escalateVisible} onDismiss={() => setEscalateVisible(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>Escalate Case</Text>
          <Text style={{ color: '#64748B', marginBottom: 16 }}>
            Please provide a reason for escalating {escalateItem?.patientName}'s case to higher-level specialists:
          </Text>
          <TextInput
            mode="outlined"
            label="Reason for escalation"
            value={escalateReason}
            onChangeText={setEscalateReason}
            multiline
            numberOfLines={4}
            style={{ marginBottom: 20 }}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button mode="outlined" style={{ flex: 1 }} onPress={() => setEscalateVisible(false)}>
              Cancel
            </Button>
            <Button mode="contained" style={{ flex: 1 }} buttonColor="#F59E0B" onPress={submitEscalation}>
              Submit
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Schedule Modal */}
      <Portal>
        <Modal visible={scheduleVisible} onDismiss={() => setScheduleVisible(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>Schedule Appointment</Text>
          
          <Text style={{ color: '#64748B', marginBottom: 8, fontWeight: 'bold' }}>Select Date:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {dates.map((d) => (
              <Button 
                key={d} 
                mode={selectedDate === d ? "contained" : "outlined"}
                onPress={() => { setSelectedDate(d); setSelectedTime(""); }}
                style={{ borderRadius: 20 }}
                labelStyle={{ fontSize: 12 }}
              >
                {d === dates[0] ? "Today" : d === dates[1] ? "Tomorrow" : d.substring(5)}
              </Button>
            ))}
          </View>

          <Text style={{ color: '#64748B', marginBottom: 8, fontWeight: 'bold' }}>Select Time Slot:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {timeSlots.map((slot) => {
              const isBooked = bookedSlots.includes(`${selectedDate}|${slot}`) && !(scheduleItem?.scheduledDate === selectedDate && scheduleItem?.scheduledTime === slot);
              return (
                <Button 
                  key={slot} 
                  mode={selectedTime === slot ? "contained" : "outlined"}
                  onPress={() => setSelectedTime(slot)}
                  style={{ borderRadius: 20 }}
                  labelStyle={{ fontSize: 12, color: isBooked ? '#94A3B8' : undefined }}
                  disabled={isBooked}
                >
                  {isBooked ? slot.split(' - ')[0] + " (Booked)" : slot.split(' - ')[0]}
                </Button>
              );
            })}
          </View>

          <Text style={{ color: '#64748B', marginBottom: 8, fontWeight: 'bold' }}>Consultation Type:</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Button 
              mode={consultationType === "online" ? "contained" : "outlined"}
              icon="video"
              style={{ flex: 1 }}
              onPress={() => setConsultationType("online")}
            >
              Online Call
            </Button>
            <Button 
              mode={consultationType === "in_person" ? "contained" : "outlined"}
              icon="map-marker"
              style={{ flex: 1 }}
              onPress={() => setConsultationType("in_person")}
            >
              In-Person
            </Button>
          </View>

          {consultationType === "in_person" && (
            <TextInput
              mode="outlined"
              label="Hospital / Clinic Address"
              value={locationStr}
              onChangeText={setLocationStr}
              placeholder="e.g. City Hospital, Room 402"
              style={{ marginBottom: 16 }}
            />
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Button mode="outlined" style={{ flex: 1 }} onPress={() => setScheduleVisible(false)}>
              Cancel
            </Button>
            <Button mode="contained" style={{ flex: 1 }} onPress={handleConfirmSchedule}>
              Confirm
            </Button>
          </View>
        </Modal>
      </Portal>

    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 24, paddingBottom: 120, flexGrow: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 32, 
    padding: 24, 
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderLeftWidth: 0,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 20 },
  patientInfo: { marginLeft: 16, flex: 1 },
  statusPill: { marginTop: 4, alignSelf: 'flex-start' },
  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 20 },
  timeText: { marginLeft: 12, color: '#334155', fontWeight: '600', fontSize: 14 },
  actionRow: { flexDirection: 'column', gap: 12 },
  modalContent: { backgroundColor: 'white', padding: 24, margin: 24, borderRadius: 32 }
});