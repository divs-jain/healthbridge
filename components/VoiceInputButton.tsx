import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import { useTranslation } from "react-i18next";
import { AIServiceError, transcribeAudio } from "../services/aiService";

// Mono, low bitrate: speech stays clear and the upload stays small on rural networks.
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
};
const MAX_RECORDING_MS = 60000;
const MIN_RECORDING_MS = 1000;
// Metering is in dBFS: about -160 is silence, normal speech near the phone is roughly -30 to -10.
const SILENCE_DB = -160;
const SPEECH_THRESHOLD_DB = -50;

const readAudioAsBase64 = async (uri: string) => {
  if (Platform.OS !== "web") {
    return new File(uri).base64();
  }
  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

export default function VoiceInputButton({ onTranscript, disabled }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 500);
  // Tracked here rather than read from recorderState, which is polled and lags behind taps.
  const [phase, setPhase] = useState<"idle" | "starting" | "recording" | "transcribing">("idle");
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelPoller = useRef<ReturnType<typeof setInterval> | null>(null);
  const peakLevel = useRef(SILENCE_DB);

  const clearTimers = () => {
    if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    if (levelPoller.current) clearInterval(levelPoller.current);
    autoStopTimer.current = null;
    levelPoller.current = null;
  };

  useEffect(() => clearTimers, []);

  const startRecording = async () => {
    setPhase("starting");
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      console.log("Voice: microphone permission", granted);
      if (!granted) {
        alert(t("voice_permission_denied"));
        setPhase("idle");
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      console.log("Voice: recording started");

      peakLevel.current = SILENCE_DB;
      levelPoller.current = setInterval(() => {
        const level = recorder.getStatus().metering;
        if (typeof level === "number" && level > peakLevel.current) peakLevel.current = level;
      }, 100);
      autoStopTimer.current = setTimeout(() => stopAndTranscribe(), MAX_RECORDING_MS);
      setPhase("recording");
    } catch (err) {
      console.log("Recording error:", err);
      // Release a half-prepared recorder, otherwise the next attempt fails with "already prepared".
      await recorder.stop().catch(() => {});
      alert(t("voice_error"));
      setPhase("idle");
    }
  };

  const stopAndTranscribe = async () => {
    clearTimers();
    setPhase("transcribing");
    try {
      const { durationMillis } = recorder.getStatus();
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      console.log(`Voice: recording stopped (${durationMillis} ms, peak ${Math.round(peakLevel.current)} dB)`, recorder.uri);
      if (!recorder.uri) throw new Error("No recording found");

      // Never send silence to the AI: it tends to invent symptoms instead of returning nothing.
      if (durationMillis < MIN_RECORDING_MS) {
        alert(t("voice_too_short"));
        return;
      }
      if (peakLevel.current < SPEECH_THRESHOLD_DB) {
        alert(t("voice_no_speech"));
        return;
      }

      const base64 = await readAudioAsBase64(recorder.uri);
      console.log(`Voice: audio read (${Math.round(base64.length / 1024)} KB), transcribing...`);
      const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/mp4";
      const text = await transcribeAudio(base64, mimeType);
      console.log("Voice: transcript", text);

      if (text) onTranscript(text);
      else alert(t("voice_no_speech"));
    } catch (err) {
      console.log("Transcription error:", err);
      alert(err instanceof AIServiceError ? t("voice_service_unavailable") : t("voice_error"));
    } finally {
      setPhase("idle");
    }
  };

  const isRecording = phase === "recording";
  const busy = phase === "starting" || phase === "transcribing";
  const seconds = Math.floor((recorderState.durationMillis || 0) / 1000);

  return (
    <View style={styles.container}>
      <Button
        mode={isRecording ? "contained" : "outlined"}
        icon={isRecording ? "stop-circle" : "microphone"}
        buttonColor={isRecording ? theme.colors.error : undefined}
        onPress={isRecording ? stopAndTranscribe : startRecording}
        loading={busy}
        disabled={disabled || busy}
        style={styles.button}
        contentStyle={{ paddingVertical: 4 }}
        accessibilityLabel={isRecording ? t("voice_stop") : t("voice_speak")}
      >
        {phase === "transcribing"
          ? t("voice_transcribing")
          : phase === "starting"
            ? t("voice_starting")
          : isRecording
            ? `${t("voice_stop")} (0:${String(seconds).padStart(2, "0")})`
            : t("voice_speak")}
      </Button>
      {phase === "idle" && (
        <Text variant="bodySmall" style={styles.hint}>
          {t("voice_hint")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
  },
  hint: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
});
