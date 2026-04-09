import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 1000): Promise<T | null> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      console.warn(`Gemini API rate limited. Retrying in ${initialDelay}ms...`);
      await delay(initialDelay);
      return callWithRetry(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

export async function summarizeEmail(subject: string, body: string) {
  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Please provide a concise 2-3 sentence summary of the following email.
        Subject: ${subject}
        Body: ${body}`,
      });
      return response.text;
    });
    return result || "Could not generate summary.";
  } catch (error) {
    console.error("Summarization failed:", error);
    return "Could not generate summary.";
  }
}

export async function detectPriority(subject: string, body: string): Promise<'urgent' | 'normal' | 'low'> {
  try {
    const result = await callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the priority of this email. Return only one word: "urgent", "normal", or "low".
        Subject: ${subject}
        Body: ${body}`,
      });
      return response.text?.toLowerCase().trim();
    });

    if (result?.includes('urgent')) return 'urgent';
    if (result?.includes('low')) return 'low';
    return 'normal';
  } catch (error) {
    console.error("Priority detection failed:", error);
    return 'normal';
  }
}

export async function generateSmartReplies(subject: string, body: string): Promise<string[]> {
  try {
    const result = await callWithRetry(async () => {
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
      return response.text;
    });

    const data = JSON.parse(result || '{"replies": []}');
    return data.replies;
  } catch (error) {
    console.error("Smart replies failed:", error);
    return [];
  }
}
