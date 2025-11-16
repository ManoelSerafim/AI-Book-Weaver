
export interface Chapter {
  title: string;
  content: string;
}

export interface Book {
  title: string;
  subtitle?: string;
  authorName: string;
  copyright: string;
  dedication?: string;
  acknowledgements?: string;
  authorBio?: string;
  synopsis: string;
  introduction: Chapter;
  chapters: Chapter[];
  conclusion: Chapter;
}

export interface BookOutline {
  synopsis: string;
  introductionTitle: string;
  chapterTitles: string[];
  conclusionTitle: string;
}

export interface GenerationConfig {
    title: string;
    subtitle?: string;
    authorName: string;
    category: string;
    genre: 'fiction' | 'non-fiction';
    wordCount: string;
    tone: string;
    targetAudience: string;
    language: string;
}
