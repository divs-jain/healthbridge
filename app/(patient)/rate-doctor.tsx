import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { addDoctorRating } from "../../services/dbService";
import { Surface, Text, Button, useTheme, Avatar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function RateDoctor() {
  const { doctorId, doctorName, department } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRating = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await addDoctorRating(doctorId, rating);
      alert(t('msg_thanks_feedback'));
      router.back();
    } catch (err) {
      alert(t('err_rating_failed'));
    } finally {
      setLoading(false);
    }
  };

  const Star = ({ pos }) => (
    <TouchableOpacity onPress={() => setRating(pos)}>
      <MaterialCommunityIcons 
        name={pos <= rating ? "star" : "star-outline"} 
        size={48} 
        color={pos <= rating ? "#F59E0B" : "#CBD5E1"} 
      />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: t('title_rate_consultation') }} />
      
      <Surface style={styles.card} elevation={2}>
        <Avatar.Icon 
          size={80} 
          icon="account-star" 
          style={{ backgroundColor: theme.colors.primaryContainer, alignSelf: 'center', marginBottom: 16 }} 
          color={theme.colors.primary} 
        />
        
        <Text variant="headlineSmall" style={styles.title}>{t('msg_how_was_visit')}</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {t('lbl_dr', { name: doctorName })} ({t(`dept.${department}`, department)})
        </Text>

        <View style={styles.starsContainer}>
          <Star pos={1} />
          <Star pos={2} />
          <Star pos={3} />
          <Star pos={4} />
          <Star pos={5} />
        </View>

        <Button 
          mode="contained" 
          onPress={handleRating} 
          loading={loading}
          disabled={loading || rating === 0}
          style={styles.submitButton}
          contentStyle={{ paddingVertical: 8 }}
        >
          {t('btn_submit_rating')}
        </Button>
        <Button 
          mode="text" 
          onPress={() => router.back()} 
          style={{ marginTop: 8 }}
        >
          {t('btn_skip')}
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    padding: 32,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748B',
    marginBottom: 32,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  submitButton: {
    width: '100%',
    borderRadius: 12,
  }
});
