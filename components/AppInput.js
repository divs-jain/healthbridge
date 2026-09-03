import { TextInput } from "react-native";

export default function AppInput({ placeholder, value, onChangeText }) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#666"
      value={value}
      onChangeText={onChangeText}
      style={{
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: "#F9FAFB",
      }}
    />
  );
}