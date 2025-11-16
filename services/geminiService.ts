import { GoogleGenAI, Type } from "@google/genai";
import type { BookOutline } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const bookOutlineSchema = {
  type: Type.OBJECT,
  properties: {
    synopsis: {
      type: Type.STRING,
      description: "A compelling and brief synopsis of the book, around 150-200 words.",
    },
    introductionTitle: {
      type: Type.STRING,
      description: "A suitable title for the introduction chapter.",
    },
    chapterTitles: {
      type: Type.ARRAY,
      description: "An array of 8 engaging and sequential chapter titles.",
      items: { type: Type.STRING },
    },
    conclusionTitle: {
      type: Type.STRING,
      description: "A suitable title for the concluding chapter.",
    },
  },
  required: ["synopsis", "introductionTitle", "chapterTitles", "conclusionTitle"],
};

const alternativeTitlesSchema = {
  type: Type.OBJECT,
  properties: {
    titles: {
      type: Type.ARRAY,
      description: "An array of exactly 3 alternative, captivating book titles.",
      items: { type: Type.STRING },
    },
  },
  required: ["titles"],
};


export const generateAlternativeTitles = async (originalTitle: string, language: string): Promise<string[]> => {
  const prompt = `Based on the book title "${originalTitle}", suggest 3 alternative, more captivating titles. The new titles should explore different angles or aspects of the core theme implied by the original title.
  IMPORTANT: Generate the titles in ${language}.
  Return the response as a JSON object with a single key "titles" which is an array of 3 strings.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: alternativeTitlesSchema,
      },
    });

    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleanedJson) as { titles: string[] };
    return parsed.titles;
  } catch (error) {
    console.error("Error generating alternative titles:", error);
    throw new Error("Failed to generate alternative titles.");
  }
};

export const generateBookOutline = async (title: string, language: string): Promise<BookOutline> => {
  const prompt = `Generate a book outline for a book titled "${title}". The book should be structured for a general audience and be engaging. Provide a synopsis, an introduction title, exactly 8 chapter titles, and a conclusion title.
  IMPORTANT: Generate all content (synopsis, titles) in ${language}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: bookOutlineSchema,
      },
    });

    const jsonText = response.text.trim();
    // Gemini may wrap the JSON in ```json ... ```, so we need to clean it.
    const cleanedJson = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleanedJson) as BookOutline;

  } catch (error) {
    console.error("Error generating book outline:", error);
    throw new Error("Failed to generate book outline. Please check the console for details.");
  }
};

export const generateChapterContent = async (
  bookTitle: string,
  chapterTitle: string,
  synopsis: string,
  language: string
): Promise<string> => {
  const prompt = `
    You are an expert author. Write the content for a chapter of the book titled "${bookTitle}".
    The overall book synopsis is: "${synopsis}".
    The title of this specific chapter is: "${chapterTitle}".

    Please write the full content for this chapter in ${language}. It should be well-written, engaging, and approximately 500-700 words long.
    Do not repeat the chapter title in the content. Start directly with the chapter text.
    Ensure the content is relevant to the chapter title and fits within the book's overall theme.
    Format the output as plain text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error(`Error generating content for chapter "${chapterTitle}":`, error);
    throw new Error(`Failed to generate content for chapter: "${chapterTitle}".`);
  }
};


export const generateCoverImage = async (title: string, synopsis: string): Promise<string> => {
  const prompt = `
    Create a stunning, high-quality book cover for a book titled "${title}".
    The book's synopsis is: "${synopsis}".
    The style should be modern, artistic, and eye-catching, suitable for a bestseller.
    Do not include any text or titles on the image. The image should be purely artistic and representative of the theme.
    Generate a visually compelling piece of art.
  `;
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '3:4',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages[0].image.imageBytes;
    } else {
      throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating cover image:", error);
    throw new Error("Failed to generate cover image.");
  }
};