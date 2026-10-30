import { View, StyleSheet, Dimensions, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Button, Text, Surface, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../../components/LanguageToggle";

const { width } = Dimensions.get('window');

export default function RoleSelect() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const RoleCard = ({ title, icon, role, description, color }) => (
    <Surface style={[styles.card, { shadowColor: color }]} elevation={4}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.text }}>{title}</Text>
        <Text variant="bodySmall" style={{ color: '#64748B', marginTop: 2 }}>{description}</Text>
      </View>
      <Button 
        mode="contained" 
        buttonColor={color}
        onPress={() => router.push(`/(auth)/login?role=${role}`)}
        style={styles.cardButton}
        labelStyle={{ fontWeight: '700' }}
      >
        {t('btn_select')}
      </Button>
    </Surface>
  );

  return (
    <LinearGradient
      colors={['#DBEAFE', '#F8FAFC', '#F8FAFC']}
      style={styles.container}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.languageToggle}>
        <LanguageToggle color={theme.colors.primary} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.logoContainer, { shadowColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="heart-pulse" size={48} color={theme.colors.primary} />
          </View>
          <Text variant="displaySmall" style={styles.title}>{t('app_title')}</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {t('app_tagline')}
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          <RoleCard 
            title={t('role_patient')} 
            icon="account-heart" 
            role="patient" 
            description={t('role_patient_desc')}
            color={theme.colors.primary} 
          />
          <RoleCard 
            title={t('role_doctor')} 
            icon="stethoscope" 
            role="doctor" 
            description={t('role_doctor_desc')}
            color={theme.colors.secondary} 
          />
          <RoleCard 
            title={t('role_pharmacy')} 
            icon="pill" 
            role="pharmacy" 
            description={t('role_pharmacy_desc')}
            color="#8B5CF6" 
          />
          <RoleCard 
            title={t('role_admin')} 
            icon="shield-account" 
            role="admin" 
            description={t('role_admin_desc')}
            color="#F59E0B" 
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  languageToggle: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 1,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  rolesContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardButton: {
    borderRadius: 12,
  }
});