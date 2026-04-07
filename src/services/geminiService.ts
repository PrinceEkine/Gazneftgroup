import { GoogleGenAI } from "@google/genai";

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

export async function generateSmartReply(subject: string, body: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following email, suggest a professional and helpful reply.
      Subject: ${subject}
      Body: ${body}`,
    });
    return response.text;
  } catch (error) {
    console.error("Smart reply failed:", error);
    return "Could not generate smart reply.";
  }
}
