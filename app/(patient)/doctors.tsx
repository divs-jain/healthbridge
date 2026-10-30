import { View, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { getApprovedDoctors, createAppointment, getUserRole, hasActiveAppointment } from "../../services/dbService";
import { Card, Text, Button, Avatar, Surface, useTheme, ActivityIndicator } from "react-native-paper";
import { getAuth } from "firebase/auth";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function Doctors() {
  const { departments } = useLocalSearchParams();
  const parsedDepartments = departments ? JSON.parse(departments) : [];
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      const allDoctors = await getApprovedDoctors();
      const normalize = (text) => text.toLowerCase();

      let filtered = allDoctors;
      
      if (parsedDepartments.length > 0) {
        filtered = allDoctors.filter((doc) =>
          parsedDepartments.some((dept) => {
            const d1 = normalize(dept);
            const d2 = normalize(doc.department);
            return d1.includes(d2) || d2.includes(d1);
          })
        );
      }

      setDoctors(filtered);
      setLoading(false);
    };

    fetchDoctors();
  }, [departments]);

  const handleBook = async (doctor) => {
    setBookingId(doctor.id);
    try {
      const user = getAuth().currentUser;
      const hasActive = await hasActiveAppointment(user.uid, doctor.id);

      if (hasActive) {
        alert(t('err_active_appointment'));
        return;
      }

      const userData = await getUserRole(user.uid);

      await createAppointment({
        doctorId: doctor.id,
        doctorName: doctor.name || "Unknown Doctor",
        department: doctor.department || "General",
        patientId: user.uid,
        patientName: userData?.name || "Patient",
        status: "pending",
        createdAt: new Date(),
      });
      alert(t('msg_appointment_requested'));
    } catch (err) {
      alert(t('err_booking_failed') + " " + err.message);
    } finally {
      setBookingId(null);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<MaterialCommunityIcons key={i} name="star" size={16} color="#F59E0B" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<MaterialCommunityIcons key={i} name="star-half-full" size={16} color="#F59E0B" />);
      } else {
        stars.push(<MaterialCommunityIcons key={i} name="star-outline" size={16} color="#CBD5E1" />);
      }
    }
    return stars;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: t('title_find_doctor'), headerBackTitle: t('btn_back') }} />
      
      {parsedDepartments.length > 0 && (
        <View style={styles.filterHeader}>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>{t('lbl_showing_specialists')}</Text>
          <View style={styles.pillContainer}>
            {parsedDepartments.map((d, i) => (
              <View key={i} style={[styles.pill, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={[styles.pillText, { color: theme.colors.primary }]}>{t(`dept.${d}`, d)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="stethoscope" size={64} color="#CBD5E1" />
          <Text variant="titleMedium" style={{ color: '#64748B', marginTop: 16 }}>{t('msg_no_doctors_found')}</Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardHeader}>
                <Avatar.Text size={50} label={item.name?.substring(0, 2).toUpperCase()} style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.secondary} />
                <View style={styles.cardInfo}>
                  <Text variant="titleMedium" style={{ fontWeight: "bold" }}>{t('lbl_dr', { name: item.name })}</Text>
                  <Text variant="bodyMedium" style={{ color: '#64748B' }}>{t(`dept.${item.department}`, item.department)}</Text>
                  <View style={styles.ratingRow}>
                    {renderStars(item.rating || 0)}
                    <Text style={styles.ratingText}>{item.rating?.toFixed(1) || "0.0"} ({t('lbl_reviews', { count: item.totalRatings || 0 })})</Text>
                  </View>
                </View>
              </View>

              <Button
                mode="contained"
                style={styles.bookButton}
                contentStyle={{ paddingVertical: 8 }}
                loading={bookingId === item.id}
                disabled={bookingId === item.id}
                onPress={() => handleBook(item)}
              >
                {t('btn_request_appointment')}
              </Button>
            </Surface>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    fontWeight: '700',
    fontSize: 13,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardInfo: {
    marginLeft: 16,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#FFFBEB',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 6,
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700'
  },
  bookButton: {
    borderRadius: 16,
  }
});