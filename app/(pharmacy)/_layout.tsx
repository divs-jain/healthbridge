import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

export default function PharmacyLayout() {
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
        name="requests"
        options={{
          title: "Order Requests",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="inbox-arrow-down" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="accepted"
        options={{
          title: "Accepted Orders",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-variant-closed" size={26} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
