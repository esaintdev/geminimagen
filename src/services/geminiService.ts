import { GoogleGenAI } from "@google/genai";

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export async function generateImage(prompt: string, aspectRatio: string = "1:1"): Promise<string> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'undefined' || process.env.GEMINI_API_KEY === '') {
    console.error("GEMINI_API_KEY is missing or invalid.");
    throw new Error("GEMINI_API_KEY is not set. Please ensure it's in .env.local and restart the server.");
  }

  console.log("Generating image for:", prompt.substring(0, 30) + "...");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
        },
      },
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("No image generated in the response.");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }

    throw new Error("No image data found in the response parts.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}
export async function generateMultiViewImages(prompt: string, views: string[], aspectRatio: string = "1:1"): Promise<GeneratedImage[]> {
  const tasks = views.map(async (view) => {
    const fullPrompt = `${prompt} (${view})`;
    const url = await generateImage(fullPrompt, aspectRatio);
    return {
      url,
      prompt: fullPrompt,
      timestamp: Date.now() + Math.random(), // Add randomness to ensure unique IDs for keys
    };
  });

  return Promise.all(tasks);
}
