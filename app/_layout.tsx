import { Stack } from "expo-router";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import "../config/i18n";

const queryClient = new QueryClient();

// Premium Medical Theme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#1E3A8A", // Deep Indigo
    primaryContainer: "#DBEAFE",
    secondary: "#0EA5E9", // Vibrant Sky Blue
    secondaryContainer: "#E0F2FE",
    background: "#F8FAFC", 
    surface: "#FFFFFF",
    surfaceVariant: "#F1F5F9",
    error: "#E11D48",
    text: "#0F172A",
    outline: "#CBD5E1",
    elevation: {
      level0: "transparent",
      level1: "#FFFFFF",
      level2: "#F8FAFC",
      level3: "#F1F5F9",
      level4: "#E2E8F0",
      level5: "#CBD5E1",
    }
  },
  roundness: 16, // Softer, modern edges
};

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ 
          headerStyle: { backgroundColor: '#1E3A8A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false // sleek, no harsh line
        }} />
      </PaperProvider>
    </QueryClientProvider>
  );
}