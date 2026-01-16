
import { GoogleGenAI, Type } from "@google/genai";
import { ChartContext, AnalysisResult } from "./types";

export const analyzeChartContext = async (context: ChartContext): Promise<AnalysisResult> => {
  // Always create a new GoogleGenAI instance right before making an API call to ensure latest API key usage.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this chart context extracted from a webpage.
    Page Title: ${context.title}
    URL: ${context.url}
    Chart Type: ${context.chartType}
    Extracted Data/Labels: ${context.labels.join(', ') || 'None found'}
    Nearby Text: ${context.extractedText.join(' ')}

    Provide a concise explanation of what this chart likely represents and 3 key insights a user might find useful.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'A short summary of the chart.' },
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key insights from the data.'
            },
            confidence: { type: Type.NUMBER, description: 'Confidence score from 0 to 1.' }
          },
          required: ["summary", "insights", "confidence"]
        }
      }
    });

    // Directly access the .text property (not a method) as per SDK guidelines.
    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No text returned from Gemini API");
    }
    return JSON.parse(textOutput);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "This is a sample explanation. (Error connecting to AI backend)",
      insights: ["Could not parse specific data", "Try dragging to a clearer part of the chart", "Verify if the chart has accessible text labels"],
      confidence: 0
    };
  }
};
