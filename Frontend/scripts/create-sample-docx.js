import { Document, Packer, Paragraph, TextRun } from 'docx';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'Project Proposal',
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'This is a sample document for EZProject document preview.',
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'The document viewer supports DOC and DOCX files.',
              size: 24,
            }),
          ],
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
const outputPath = join(__dirname, '..', 'public', 'sample.docx');
writeFileSync(outputPath, buffer);
console.log('Created sample.docx at', outputPath);
