import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { getAISuggestion } from "../../services/aiService";
import { saveMedicalRecord } from "../../services/dbService";
import { getAuth } from "firebase/auth";
import { useRouter, Stack } from "expo-router";
import { Appbar, Text, TextInput, Button, Surface, ActivityIndicator, useTheme, Avatar } from "react-native-paper";
import { useTranslation } from "react-i18next";
import * as Network from 'expo-network';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import VoiceInputButton from "../../components/VoiceInputButton";
import LanguageToggle from "../../components/LanguageToggle";

export default function Diagnosis() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    checkNetwork();
  }, []);

  const checkNetwork = async () => {
    const networkState = await Network.getNetworkStateAsync();
    setIsOffline(!networkState.isConnected);
  };

  const handleCheck = async () => {
    if (!symptoms) return;
    setLoading(true);
    const language = i18n.language?.startsWith('hi') ? 'hi' : 'en';
    const aiText = await getAISuggestion(symptoms, language);
    handleAIResponse(aiText);
  };

  const handleTranscript = (text) => {
    setSymptoms((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  };

  const handleAIResponse = async (aiText) => {
    try {
      if (!aiText) throw new Error("AI returned empty response");
      const cleanText = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      setResult(parsed);

      const user = getAuth().currentUser;
      if (user && !isOffline) {
        await saveMedicalRecord({
          patientId: user.uid,
          symptoms: symptoms,
          aiResponse: parsed,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.log("JSON parse error:", err);
      alert(t('err_ai_response', 'AI response error. Try again.'));
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <Appbar.Header style={{ backgroundColor: theme.colors.primary, elevation: 0 }}>
        <Appbar.Content title={t('app_title')} color="#FFF" titleStyle={{ fontWeight: 'bold' }} />
        <LanguageToggle />
        <Appbar.Action icon="logout" iconColor="#FFF" onPress={() => { getAuth().signOut(); router.replace("/"); }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.heroSection}>
          <Text variant="headlineMedium" style={styles.heroTitle}>{t('msg_greeting', 'How are you feeling today?')}</Text>
          <Text variant="bodyLarge" style={styles.heroSubtitle}>{t('msg_greeting_sub', 'Describe your symptoms for a preliminary diagnosis.')}</Text>
        </View>

        <Surface style={styles.aiCard} elevation={2}>
          <View style={styles.aiHeader}>
            <Avatar.Icon size={40} icon="robot-outline" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{t('lbl_ai_checker', 'AI Symptom Checker')}</Text>
              <Text variant="bodySmall" style={{ color: '#64748B' }}>{t('lbl_powered_by')}</Text>
            </View>
          </View>
          
          {isOffline ? (
            <View style={styles.offlineBox}>
              <MaterialCommunityIcons name="wifi-off" size={24} color="#B45309" />
              <Text style={styles.offlineText}>{t('no_internet_ai')}</Text>
            </View>
          ) : (
            <View>
              <VoiceInputButton onTranscript={handleTranscript} disabled={loading} />
              <TextInput
                mode="outlined"
                placeholder={t('symptoms_placeholder')}
                value={symptoms}
                onChangeText={setSymptoms}
                multiline
                numberOfLines={3}
                style={styles.aiInput}
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
              />
              <Button 
                mode="contained" 
                onPress={handleCheck} 
                disabled={loading || !symptoms}
                style={styles.aiButton}
                contentStyle={{ paddingVertical: 4 }}
                icon={loading ? undefined : "creation"}
              >
                {loading ? t('btn_analyzing', 'Analyzing...') : t('check_ai')}
              </Button>
            </View>
          )}
        </Surface>

        {result && (
          <Surface style={styles.resultCard} elevation={2}>
            <Text variant="titleMedium" style={styles.resultHeader}>{t('lbl_possible_conditions', 'Possible Conditions')}</Text>
            <View style={styles.pillContainer}>
              {result.conditions?.map((c, i) => (
                <View key={i} style={styles.pill}>
                  <Text style={styles.pillText}>{c}</Text>
                </View>
              ))}
            </View>

            {result.first_aid && (
              <View style={{ marginTop: 16, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                <Text variant="labelLarge" style={{ color: '#991B1B', marginBottom: 4 }}>{t('lbl_first_aid')}</Text>
                <Text variant="bodyMedium" style={{ color: '#7F1D1D' }}>{result.first_aid}</Text>
              </View>
            )}
            
            <Text variant="titleMedium" style={[styles.resultHeader, { marginTop: 16 }]}>{t('lbl_recommended_doctors', 'Recommended Specialists')}</Text>
            <View style={styles.pillContainer}>
              {result.doctors?.map((d, i) => (
                <View key={i} style={[styles.pill, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text style={[styles.pillText, { color: theme.colors.secondary }]}>{t(`dept.${d}`, d)}</Text>
                </View>
              ))}
            </View>

            <Button
              mode="contained"
              icon="calendar-check"
              style={styles.consultButton}
              buttonColor={theme.colors.secondary}
              onPress={() => router.push({ pathname: "/(patient)/doctors", params: { departments: JSON.stringify(result.doctors) }})}
            >
              {t('consult_doctor')}
            </Button>
          </Surface>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 24,
    marginTop: 8,
  },
  heroTitle: {
    fontWeight: '900',
    color: '#0F172A',
  },
  heroSubtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiInput: {
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  aiButton: {
    borderRadius: 12,
  },
  offlineBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineText: {
    color: '#B45309',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  resultHeader: {
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: {
    color: '#334155',
    fontWeight: '500',
    fontSize: 13,
  },
  consultButton: {
    marginTop: 24,
    borderRadius: 12,
  }
});
