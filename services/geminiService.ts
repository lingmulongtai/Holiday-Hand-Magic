import { GoogleGenAI, Type } from "@google/genai";
import { Point3D } from "../types";

// Initialize Gemini Client
// IMPORTANT: Expects process.env.API_KEY to be available.
const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateGeminiShape = async (prompt: string, count: number): Promise<Point3D[]> => {
  if (!ai) {
    console.warn("Gemini API Key missing, returning sphere.");
    // Fallback stub if no API key
    return [];
  }

  const systemInstruction = `
    You are a 3D geometry engine. 
    Your task is to generate a list of 3D coordinates (x, y, z) that form a specific shape.
    The coordinates must be normalized within the range of -1.5 to 1.5.
    Return ONLY a raw JSON array of numbers [x1, y1, z1, x2, y2, z2, ...]. 
    Do not include objects, just a flat array of numbers.
    The output should be dense enough to form the volume or surface of the requested object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a point cloud for a shape that looks like: "${prompt}". Generate approximately ${count * 3} coordinates (x,y,z triplets).`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
           type: Type.ARRAY,
           items: { type: Type.NUMBER }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    if (!Array.isArray(rawData)) return [];

    const points: Point3D[] = [];
    // Convert flat array to Point3D objects
    for (let i = 0; i < rawData.length; i += 3) {
      if (i + 2 < rawData.length) {
        points.push({
          x: rawData[i],
          y: rawData[i + 1],
          z: rawData[i + 2]
        });
      }
    }
    
    return points.slice(0, count);

  } catch (error) {
    console.error("Gemini Shape Gen Error:", error);
    return [];
  }
};

export const detectGesture = async (base64Image: string): Promise<string> => {
    if (!ai) return "NONE";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: "Analyze the hand in this image. Is it an 'OPEN_HAND' (fingers spread), a 'FIST' (closed hand), or 'POINTING_UP' (index finger up)? If unclear or no hand, return 'NONE'. Return only the enum string." }
                ]
            }
        });
        const text = response.text?.trim().toUpperCase() || "NONE";
        if (text.includes("OPEN")) return "OPEN_HAND";
        if (text.includes("FIST")) return "FIST";
        if (text.includes("POINT")) return "POINTING_UP";
        return "NONE";
    } catch (e) {
        console.error(e);
        return "NONE";
    }
}
