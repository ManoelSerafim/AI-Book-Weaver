
import { GoogleGenAI, Type } from "@google/genai";
import type { BookOutline, GenerationConfig, PublishingDetails } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const bookOutlineSchema = {
  type: Type.OBJECT,
  properties: {
    synopsis: {
      type: Type.STRING,
      description: "A compelling and brief synopsis of the book, around 150-200 words, that explains the central theme.",
    },
    introductionTitle: {
      type: Type.STRING,
      description: "A suitable title for the introduction chapter.",
    },
    chapterTitles: {
      type: Type.ARRAY,
      description: "An array of 10 to 15 engaging and sequential chapter titles.",
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

const publishingDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "A compelling book description, optimized for online stores like Amazon KDP, around 150-200 words.",
    },
    keywords: {
      type: Type.ARRAY,
      description: "An array of exactly 7 relevant keywords for search discoverability on KDP.",
      items: { type: Type.STRING },
    },
    category: {
      type: Type.STRING,
      description: "The most specific and appropriate Amazon KDP category path for the book (e.g., 'Books > Science Fiction & Fantasy > Fantasy > Epic').",
    },
  },
  required: ["description", "keywords", "category"],
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

export const generateBookOutline = async (config: GenerationConfig): Promise<BookOutline> => {
  const prompt = `
    You are a master book planner. Generate a detailed book outline based on the following specifications.
    
    - Title: "${config.title}"
    - Subtitle: "${config.subtitle || 'N/A'}"
    - Genre: ${config.genre}
    - Category: ${config.category}
    - Tone: ${config.tone}
    - Target Audience: ${config.targetAudience}
    - Desired Length: ${config.wordCount}
    
    Your task is to create an outline that includes:
    1.  A compelling synopsis (150-200 words).
    2.  An engaging title for the Introduction.
    3.  A list of 10 to 15 sequential and descriptive chapter titles.
    4.  An impactful title for the Conclusion.

    IMPORTANT: Generate all content (synopsis, titles) in ${config.language}.
    The structure must be logical and flow naturally from one topic to the next, keeping the target audience and tone in mind.`;

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
    const cleanedJson = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleanedJson) as BookOutline;

  } catch (error) {
    console.error("Error generating book outline:", error);
    throw new Error("Failed to generate book outline. Please check the console for details.");
  }
};

export const generateChapterContent = async (
  config: GenerationConfig,
  chapterTitle: string,
  synopsis: string,
): Promise<string> => {
  const prompt = `
    You are an expert author writing in a ${config.tone} style for ${config.targetAudience}.
    Your current project is a ${config.genre} book titled "${config.title}".
    The overall book synopsis is: "${synopsis}".
    
    You are now writing the chapter titled: "${chapterTitle}".

    Please write the full content for this chapter in ${config.language}.
    - The content should be approximately 1,500 to 3,000 words.
    - The writing must be clear, engaging, and consistent with the book's overall tone and genre.
    - If non-fiction, use explanations, examples, and storytelling.
    - If fiction, develop characters, plot, and dialogue.
    - Do not repeat the chapter title in the content. Begin directly with the chapter text.
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

export const generateAuthorBio = async (authorName: string, bookTitle: string, category: string, language: string): Promise<string> => {
    const prompt = `
    Write a short, professional author biography in ${language} for an author named ${authorName}.
    They have just written a book titled "${bookTitle}" in the "${category}" category.
    The biography should be about 100-150 words.
    The tone should be engaging, establish credibility in the category's subject matter, and mention their motivation for writing the book.
    Do not include contact information.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating author bio:", error);
        throw new Error("Failed to generate author bio.");
    }
}


export const generateCoverImage = async (config: GenerationConfig, synopsis: string, feedback?: string): Promise<string> => {
  let prompt = `
    Create a stunning, high-quality book cover for a book with the following details:
    - Title: "${config.title}"
    - Author: "${config.authorName}"
    - Synopsis: "${synopsis}"
    - Genre: ${config.genre}
    - Category: ${config.category}
    - Tone: ${config.tone}
    - Target Audience: ${config.targetAudience}

    The cover style should be modern, artistic, and eye-catching, suitable for a bestseller.
    
    CRITICAL INSTRUCTION: The cover MUST include the exact book title "${config.title}" and the author's name "${config.authorName}".
    The text must be clear, professional, and elegantly integrated into the design. Use a readable, high-quality font.
    The background art should be visually compelling and representative of the book's theme.
  `;

  if (feedback && feedback.trim()) {
    prompt += `\n\nIMPORTANT CORRECTION INSTRUCTIONS: The user has provided feedback on a previous version. Please modify the image based on the following instructions: "${feedback}"`;
  }

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

export const generatePublishingDetails = async (
  config: GenerationConfig,
  synopsis: string,
): Promise<PublishingDetails> => {
  const prompt = `
    You are an expert in book marketing for Amazon KDP.
    Based on the following book details, generate the necessary metadata for publishing.
    - Title: "${config.title}"
    - Synopsis: "${synopsis}"
    - Genre: ${config.genre}
    - Category: ${config.category}
    - Target Audience: ${config.targetAudience}
    
    Your task is to create:
    1. A compelling book description (150-200 words) that hooks the reader.
    2. Exactly 7 specific keywords that potential readers would use to find this book.
    3. The most fitting and specific KDP category path.

    IMPORTANT: Generate all content in ${config.language}.
    Return a valid JSON object matching the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: publishingDetailsSchema,
      },
    });

    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleanedJson) as PublishingDetails;

  } catch (error) {
    console.error("Error generating publishing details:", error);
    throw new Error("Failed to generate publishing details.");
  }
};
