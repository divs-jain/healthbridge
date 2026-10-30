const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Tried in order. Overloaded (503), over-quota (429) or slow models fall through to the next one,
// so a patient is never left waiting on a single busy model.
const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash"];
const REQUEST_TIMEOUT_MS = 15000;
const RETRYABLE_STATUSES = [429, 500, 503, 504];

export class AIServiceError extends Error {}

const callModel = async (model, parts, generationConfig) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents: [{ parts }], generationConfig }),
        signal: controller.signal,
      }
    );
    const data = await response.json();
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
};

const callGemini = async (parts, generationConfig) => {
  if (!API_KEY) throw new AIServiceError("EXPO_PUBLIC_GEMINI_API_KEY is not set in .env");

  let lastError = "Gemini request failed";
  for (const model of GEMINI_MODELS) {
    let result;
    try {
      result = await callModel(model, parts, generationConfig);
    } catch (error) {
      // Network failure or timeout: try the next model.
      lastError = error?.name === "AbortError" ? `${model} timed out` : String(error);
      console.warn("Gemini:", lastError);
      continue;
    }

    const { status, data } = result;
    if (status === 200) {
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }

    lastError = data?.error?.message || `Gemini request failed (${status})`;
    console.warn(`Gemini ${model} ${status}:`, lastError);
    // 400/403 (invalid, revoked or leaked API key) won't be fixed by another model.
    if (!RETRYABLE_STATUSES.includes(status) && status !== 404) break;
  }
  throw new AIServiceError(lastError);
};

export const getAISuggestion = async (symptomsText, language = "en") => {
  // Specialty names stay in English: they are matched against doctors' departments.
  const languageRule = language === "hi"
    ? `Write "conditions" and "first_aid" in simple Hindi (Devanagari script) that a rural patient can understand. Keep "doctors" in English.`
    : `Write everything in simple English.`;

  try {
    const text = await callGemini([{
      text: `Patient symptoms: ${symptomsText}. Return ONLY valid JSON like this:
              {
                "conditions": ["condition1", "condition2"],
                "doctors": ["Dermatology", "General Physician"],
                "first_aid": "Drink plenty of water and rest."
              }
              ${languageRule}
              Do not add extra text.`
    }]);
    console.log("Gemini API Response:", text);
    return text;

  } catch (error) {
    console.error("FETCH ERROR:", error);
    return null;
  }
};

const NO_SPEECH = "NO_SPEECH";

// Transcribes a recorded voice note in the language the patient spoke. Hindi is written in Devanagari.
export const transcribeAudio = async (base64Audio, mimeType) => {
  try {
    const text = await callGemini([
      { inlineData: { mimeType, data: base64Audio } },
      {
        text: `Transcribe this voice note in which a patient describes their health symptoms.
               The patient usually speaks Hindi, sometimes mixed with English.
               Write exactly what was said, in the language it was spoken: Hindi in Devanagari script, English in English. Do not translate.
               Return ONLY the transcribed text, without quotes, labels or commentary.
               Never guess or invent words. If the audio is silent, unclear, or has no speech, return exactly ${NO_SPEECH}.`
      },
    ], { temperature: 0 });
    const transcript = text?.trim();
    return !transcript || transcript.includes(NO_SPEECH) ? null : transcript;

  } catch (error) {
    console.error("TRANSCRIBE ERROR:", error);
    if (error instanceof AIServiceError) throw error;
    return null;
  }
};
