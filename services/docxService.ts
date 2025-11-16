
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  PageBreak, 
  TableOfContents,
  PageNumber,
  Header,
  TabStopType,
  TabStopPosition
} from 'docx';
import type { Book } from '../types';

export const createAndDownloadDocx = async (
  book: Book,
  options: { fontSize: number; lineSpacing: number; fontFamily: string; }
) => {
  const { fontSize, lineSpacing, fontFamily } = options;
  const FONT_SIZE_POINTS = fontSize * 2; // docx font sizes are in half-points
  const SPACING_LINE = Math.round(lineSpacing * 240); // 1.0 spacing = 240

  const doc = new Document({
    creator: "AI Book Weaver",
    title: book.title,
    description: book.synopsis,
    styles: {
      default: {
        heading1: {
          run: { font: fontFamily, size: 32, bold: true },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 } },
        },
        title: {
            run: { font: fontFamily, size: 56, bold: true },
            paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 2000, after: 100 } },
        },
      },
      paragraphStyles: [
        {
          id: "normalPara",
          name: "Normal Para",
          basedOn: "Normal",
          next: "Normal",
          run: {
            font: fontFamily,
            size: FONT_SIZE_POINTS,
          },
          paragraph: {
            spacing: { line: SPACING_LINE },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
        {
            id: "subtitle",
            name: "Subtitle",
            basedOn: "Normal",
            next: "Normal",
            run: { font: fontFamily, size: 32, italics: true },
            paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 1000 } },
        },
        {
            id: "author",
            name: "Author",
            basedOn: "Normal",
            next: "Normal",
            run: { font: fontFamily, size: 28 },
            paragraph: { alignment: AlignmentType.CENTER },
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
                  font: fontFamily,
                  size: 20,
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        // 1. Internal Cover Page
        new Paragraph({ text: book.title, style: "titleStyle" }),
        ...(book.subtitle ? [new Paragraph({ text: book.subtitle, style: "subtitle" })] : []),
        new Paragraph({ text: book.authorName, style: "author" }),
        new Paragraph({ children: [new PageBreak()] }),

        // 2. Copyright Page
        new Paragraph({ 
            text: book.copyright,
            alignment: AlignmentType.CENTER,
            spacing: { before: 4000 }
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // 3. Dedication (optional)
        ...(book.dedication ? [
            new Paragraph({
                text: book.dedication,
                alignment: AlignmentType.CENTER,
                italics: true,
                spacing: { before: 4000 }
            }),
            new Paragraph({ children: [new PageBreak()] })
        ] : []),

        // 4. Synopsis
        new Paragraph({ text: "Synopsis", heading: HeadingLevel.HEADING_1 }),
        ...book.synopsis.split('\n').filter(p => p.trim() !== '').map(p => new Paragraph({ text: p, style: "normalPara" })),
        new Paragraph({ children: [new PageBreak()] }),

        // 5. Introduction
        new Paragraph({ text: book.introduction.title, heading: HeadingLevel.HEADING_1 }),
        ...book.introduction.content.split('\n').filter(p => p.trim() !== '').map(p => new Paragraph({ text: p, style: "normalPara" })),

        // 6. Chapters
        ...book.chapters.flatMap(chapter => [
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1 }),
          ...chapter.content.split('\n').filter(p => p.trim() !== '').map(p => new Paragraph({ text: p, style: "normalPara" })),
        ]),

        // 7. Conclusion
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ text: book.conclusion.title, heading: HeadingLevel.HEADING_1 }),
        ...book.conclusion.content.split('\n').filter(p => p.trim() !== '').map(p => new Paragraph({ text: p, style: "normalPara" })),

        // 8. Acknowledgements (optional)
        ...(book.acknowledgements ? [
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ text: "Acknowledgements", heading: HeadingLevel.HEADING_1 }),
          ...book.acknowledgements.split('\n').filter(p => p.trim() !== '').map(p => new Paragraph({ text: p, style: "normalPara" }))
        ] : []),
        
        // 9. About the Author (optional)
        ...(book.authorBio ? [
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ text: "About the Author", heading: HeadingLevel.HEADING_1 }),
          ...book.authorBio.split('\n').filter(p => p.trim() !== '').map(p => new Paragraph({ text: p, style: "normalPara" }))
        ] : []),

        // 10. Final Page
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
            text: "Thank you for reading.",
            alignment: AlignmentType.CENTER,
            spacing: { before: 4000 }
        })
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
