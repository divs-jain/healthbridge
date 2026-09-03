const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export const getAISuggestion = async (symptomsText) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Patient symptoms: ${symptomsText}. Return ONLY valid JSON like this:
              {
                "conditions": ["condition1", "condition2"],
                "doctors": ["Dermatology", "General Physician"],
                "first_aid": "Drink plenty of water and rest."
              }
              Do not add extra text.`
            }]
          }],
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return null;
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Gemini API Response:", text);
    return text;

  } catch (error) {
    console.error("FETCH ERROR:", error);
    return null;
  }
};