import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

export default function AdminLayout() {
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
        name="stakeholders"
        options={{
          title: "Stakeholders",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="oversight"
        options={{
          title: "Oversight",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="eye-check" size={26} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="escalations"
        options={{
          title: "Escalations",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="alert-decagram" size={26} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}