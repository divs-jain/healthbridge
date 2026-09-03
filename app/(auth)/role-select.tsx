import { View, StyleSheet, Dimensions, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Button, Text, Surface, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get('window');

export default function RoleSelect() {
  const router = useRouter();
  const theme = useTheme();

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
        Select
      </Button>
    </Surface>
  );

  return (
    <LinearGradient
      colors={['#DBEAFE', '#F8FAFC', '#F8FAFC']}
      style={styles.container}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.logoContainer, { shadowColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="heart-pulse" size={48} color={theme.colors.primary} />
          </View>
          <Text variant="displaySmall" style={styles.title}>HealthBridge</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Connecting rural communities to world-class healthcare.
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          <RoleCard 
            title="Patient" 
            icon="account-heart" 
            role="patient" 
            description="Access doctors and AI checker"
            color={theme.colors.primary} 
          />
          <RoleCard 
            title="Doctor" 
            icon="stethoscope" 
            role="doctor" 
            description="Manage your appointments"
            color={theme.colors.secondary} 
          />
          <RoleCard 
            title="Pharmacy" 
            icon="pill" 
            role="pharmacy" 
            description="Manage inventory & orders"
            color="#8B5CF6" 
          />
          <RoleCard 
            title="Administrator" 
            icon="shield-account" 
            role="admin" 
            description="System oversight & escalations"
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