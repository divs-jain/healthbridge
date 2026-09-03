import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

export default function DoctorLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          elevation: 0,
          backgroundColor: '#FFFFFF',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        }
      }}
    >
      
      <Tabs.Screen
        name="pending"
        options={{
          title: "Pending Patients",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-clock" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="escalations"
        options={{
          title: "Escalations",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="alert-circle-outline" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="records"
        options={{
          title: "Records",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={26} color={color} />
          ),
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen name="consultation" options={{ href: null }} />

    </Tabs>
  );
}