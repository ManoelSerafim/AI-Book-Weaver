
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  PageBreak, 
  TableOfContents,
  Numbering,
  Indent,
  PageNumber,
  Header
} from 'docx';
import type { Book } from '../types';

export const createAndDownloadDocx = async (
  book: Book,
  options: { fontSize: number; lineSpacing: number }
) => {
  const { fontSize, lineSpacing } = options;

  const doc = new Document({
    creator: "AI Book Weaver",
    title: book.title,
    description: book.synopsis,
    styles: {
      paragraphStyles: [
        {
          id: "normalPara",
          name: "Normal Para",
          basedOn: "Normal",
          next: "Normal",
          run: {
            font: "Times New Roman",
            size: fontSize * 2, // Font size is in half-points
          },
          paragraph: {
            spacing: {
              line: Math.round(lineSpacing * 240), // 1.0 spacing = 240
            },
          },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: 8640, // 6 inches in twips
            height: 12960, // 9 inches in twips
          },
          margin: {
            top: 1080,    // 0.75 inches
            right: 720,   // 0.5 inches (outside)
            bottom: 1080, // 0.75 inches
            left: 1080,   // 0.75 inches (inside)
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  children: ["", PageNumber.CURRENT],
                  font: "Times New Roman",
                  size: 20,
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        // Internal Cover Page
        new Paragraph({
          children: [new TextRun(book.title)],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 4000, after: 8000 },
        }),
        new Paragraph({
          children: [new PageBreak()]
        }),
        // Table of Contents
        new Paragraph({ text: "Table of Contents", heading: HeadingLevel.HEADING_1 }),
        new TableOfContents("Summary", {
          hyperlink: true,
          headingStyleRange: "1-1",
        }),
        new Paragraph({
          children: [new PageBreak()]
        }),

        // Synopsis
        new Paragraph({ text: "Synopsis", heading: HeadingLevel.HEADING_1 }),
        ...book.synopsis.split('\n').map(p => new Paragraph({ text: p, style: "normalPara" })),
        new Paragraph({
          children: [new PageBreak()]
        }),

        // Introduction
        new Paragraph({ text: book.introduction.title, heading: HeadingLevel.HEADING_1 }),
        ...book.introduction.content.split('\n').map(p => new Paragraph({ text: p, style: "normalPara" })),

        // Chapters
        ...book.chapters.flatMap(chapter => [
          new Paragraph({
            children: [new PageBreak()]
          }),
          new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1 }),
          ...chapter.content.split('\n').map(p => new Paragraph({ text: p, style: "normalPara" })),
        ]),

        // Conclusion
        new Paragraph({
          children: [new PageBreak()]
        }),
        new Paragraph({ text: book.conclusion.title, heading: HeadingLevel.HEADING_1 }),
        ...book.conclusion.content.split('\n').map(p => new Paragraph({ text: p, style: "normalPara" })),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${book.title.replace(/ /g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};