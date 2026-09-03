import { View } from "react-native";

export default function Card({ children }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}