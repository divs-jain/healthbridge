import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

export default function PatientLayout() {
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
        name="diagnosis"
        options={{
          title: t('tab_diagnosis', 'Diagnosis'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="stethoscope" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="assigned-doctors"
        options={{
          title: t('tab_assigned_doctors', 'My Doctors'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="doctor" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="pharmacies"
        options={{
          title: t('tab_pharmacies', 'Pharmacies'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="pharmacy" size={26} color={color} />
          ),
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen name="doctors" options={{ href: null }} />
      <Tabs.Screen name="rate-doctor" options={{ href: null }} />

    </Tabs>
  );
}