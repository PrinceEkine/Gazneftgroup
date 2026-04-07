import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function summarizeEmail(subject: string, body: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Please provide a concise 2-3 sentence summary of the following email.
      Subject: ${subject}
      Body: ${body}`,
    });
    return response.text;
  } catch (error) {
    console.error("Summarization failed:", error);
    return "Could not generate summary.";
  }
}

export async function detectPriority(subject: string, body: string): Promise<'urgent' | 'normal' | 'low'> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the priority of this email. Return only one word: "urgent", "normal", or "low".
      Subject: ${subject}
      Body: ${body}`,
    });
    const text = response.text?.toLowerCase().trim();
    if (text?.includes('urgent')) return 'urgent';
    if (text?.includes('low')) return 'low';
    return 'normal';
  } catch (error) {
    console.error("Priority detection failed:", error);
    return 'normal';
  }
}

export async function generateSmartReplies(subject: string, body: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 short, context-aware reply suggestions for this email.
      Subject: ${subject}
      Body: ${body}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replies: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["replies"]
        }
      }
    });
    const data = JSON.parse(response.text || '{"replies": []}');
    return data.replies;
  } catch (error) {
    console.error("Smart replies failed:", error);
    return [];
  }
}
