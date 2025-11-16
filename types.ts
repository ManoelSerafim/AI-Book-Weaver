
export interface Chapter {
  title: string;
  content: string;
}

export interface Book {
  title: string;
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
