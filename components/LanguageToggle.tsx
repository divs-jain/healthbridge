import { Button } from "react-native-paper";
import { useTranslation } from "react-i18next";

type Props = {
  color?: string;
};

// Shows the name of the *other* language in its own script, so a patient who
// can't read the current language can still find their way back.
export default function LanguageToggle({ color = "#FFFFFF" }: Props) {
  const { i18n } = useTranslation();
  const isHindi = i18n.language?.startsWith("hi");

  return (
    <Button
      mode="text"
      icon="translate"
      textColor={color}
      compact
      onPress={() => i18n.changeLanguage(isHindi ? "en" : "hi")}
      accessibilityLabel={isHindi ? "Switch to English" : "हिंदी में बदलें"}
      labelStyle={{ fontWeight: '700' }}
    >
      {isHindi ? "English" : "हिंदी"}
    </Button>
  );
}
