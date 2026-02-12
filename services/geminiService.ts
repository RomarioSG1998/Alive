
import { GoogleGenAI } from "@google/genai";


const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

// URL de fallback de alta qualidade (Unsplash - Survivor aesthetic)
const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000&auto=format&fit=crop";

export const getNarratorUpdate = async (health: number, hunger: number, lastLog: string[]) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are the mysterious narrator of a survival game called 'Alive'. 
      The player's current status: Health ${health}/100, Hunger ${hunger}/100.
      Previous events: ${lastLog ? lastLog.slice(-3).join(', ') : 'None'}.
      
      Generate a short, atmospheric 1-sentence observation about the environment or the player's mental state. 
      Keep it cryptic and immersive.`,
      config: {
        temperature: 0.8,
        topP: 0.9,
      }
    });

    return response.text || "The wind whispers through the void...";
  } catch (error) {
    console.error("Narrator failed:", error);
    return "The silence is deafening.";
  }
};

export const generateAvatar = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: "Hyper-realistic cinematic close-up portrait of a weathered survivalist, intense gaze, rugged beard, sweat and dirt on face, wearing tactical survival gear with straps, background of a dark mysterious tropical island at dusk, dramatic rim lighting, 8k resolution, professional photography style." }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return FALLBACK_AVATAR;
  } catch (error: any) {
    // Se for erro de cota (429) ou qualquer outro, retorna o fallback silenciosamente
    console.warn("Avatar AI Quota exceeded, using fallback image.");
    return FALLBACK_AVATAR;
  }
};

export const getCraftingHint = async (inventory: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Player has these items: ${inventory}. 
        Suggest one cryptic survival tip or crafting idea based on these materials in a short sentence.`,
    });
    return response.text || "Keep moving.";
  } catch (e) {
    return "Combine and survive.";
  }
}
