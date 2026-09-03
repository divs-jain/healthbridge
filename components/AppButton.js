import { TouchableOpacity, Text } from "react-native";

export default function AppButton({ title, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#2563EB",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginVertical: 5,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "bold" }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}