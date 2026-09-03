import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";

import { registerUser, loginUser } from "../../services/authService";
import { saveUserRole, getUserRole } from "../../services/dbService";

import { TextInput, Button, Text, Surface, useTheme, SegmentedButtons } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function Login() {
  const { role } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDept, setSelectedDept] = useState("General Physician");
  const [loading, setLoading] = useState(false);

  const departments = ["General Physician", "Cardiology", "Pediatrics", "Gynecology"];

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (!isLogin) {
        const userCred = await registerUser(email, password);
        await saveUserRole(userCred.user.uid, {
          name,
          role,
          email,
          department: role === "doctor" ? selectedDept : null,
          status: role === "doctor" ? "pending" : "approved",
          rating: 0,
          totalRatings: 0,
        });
        alert(role === "doctor" ? "Registered successfully. Waiting for admin approval." : "Registered successfully.");
        setIsLogin(true);
      } else {
        const userCred = await loginUser(email, password);
        const userData = await getUserRole(userCred.user.uid);
        
        if (!userData) {
          alert("User data not found");
          return;
        }

        if (userData.role === "admin") router.replace("/(admin)/stakeholders");
        else if (userData.role === "doctor") {
          if (userData.status !== "approved") {
            alert("Waiting for admin approval");
            return;
          }
          router.replace("/(doctor)/pending");
        } else if (userData.role === "pharmacy") {
          router.replace("/(pharmacy)/requests");
        } else {
          router.replace("/(patient)/diagnosis");
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    patient: "Patient Portal",
    doctor: "Doctor Portal",
    pharmacy: "Pharmacy Portal",
    admin: "Admin Console"
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ 
        title: roleLabels[role] || "Login", 
        headerBackTitle: "Back"
      }} />
      
      <LinearGradient colors={['#DBEAFE', '#F8FAFC', '#F8FAFC']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Surface style={[styles.iconContainer, { shadowColor: theme.colors.primary }]} elevation={4}>
              <MaterialCommunityIcons 
                name={role === 'doctor' ? 'stethoscope' : role === 'pharmacy' ? 'pill' : role === 'admin' ? 'shield-account' : 'account'} 
                size={40} 
                color={theme.colors.primary} 
              />
            </Surface>
          <Text variant="headlineMedium" style={styles.title}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Please enter your details to continue.
          </Text>
        </View>

          <Surface style={styles.card} elevation={3}>
          <SegmentedButtons
            value={isLogin ? 'login' : 'register'}
            onValueChange={val => setIsLogin(val === 'login')}
            buttons={[
              { value: 'login', label: 'Login' },
              { value: 'register', label: 'Register' },
            ]}
            style={{ marginBottom: 24 }}
          />

          {!isLogin && (
            <TextInput
              label="Full Name"
              mode="outlined"
              left={<TextInput.Icon icon="account-outline" />}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          )}

          <TextInput
            label="Email Address"
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-outline" />}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry
            left={<TextInput.Icon icon="lock-outline" />}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {!isLogin && role === "doctor" && (
            <View style={{ marginTop: 8, marginBottom: 16 }}>
              <Text variant="labelLarge" style={{ marginBottom: 8, color: '#64748B' }}>Specialty</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {departments.map((d) => (
                  <Button 
                    key={d}
                    mode={selectedDept === d ? "contained" : "outlined"}
                    onPress={() => setSelectedDept(d)}
                    style={{ marginRight: 8 }}
                  >
                    {d}
                  </Button>
                ))}
              </ScrollView>
            </View>
          )}

          <Button 
            mode="contained" 
            onPress={handleAuth} 
            loading={loading}
            disabled={loading || !email || !password || (!isLogin && !name)}
            style={styles.actionButton}
            contentStyle={{ paddingVertical: 8 }}
          >
            {isLogin ? "Login to Portal" : "Complete Registration"}
          </Button>
          </Surface>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#475569',
    marginTop: 8,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    marginTop: 12,
    borderRadius: 12,
  }
});