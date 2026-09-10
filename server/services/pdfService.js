const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

/**
 * Inspects a PDF file and returns the page count.
 */
async function getPdfPageCount(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (err) {
    console.error('Error reading PDF pages:', err.message);
    return 1;
  }
}

/**
 * Combines one or multiple images into a standard A4 multi-page PDF.
 * @param {Array<string>} imagePaths - Array of absolute image file paths
 * @param {string} outputPdfPath - Output destination
 * @returns {Promise<number>} Page count of generated PDF
 */
async function compileImagesToPdf(imagePaths, outputPdfPath) {
  const pdfDoc = await PDFDocument.create();
  // Standard A4 dimensions in points
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  for (const imgPath of imagePaths) {
    try {
      const imgBytes = fs.readFileSync(imgPath);
      const ext = path.extname(imgPath).toLowerCase();
      let embeddedImage;

      if (ext === '.png') {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } else if (ext === '.jpg' || ext === '.jpeg') {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      } else {
        // Default to JPG embed attempt
        try {
          embeddedImage = await pdfDoc.embedJpg(imgBytes);
        } catch {
          embeddedImage = await pdfDoc.embedPng(imgBytes);
        }
      }

      const imgDims = embeddedImage.scale(1);
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

      // Calculate scale to fit inside margins (20pt margins)
      const margin = 20;
      const targetWidth = A4_WIDTH - margin * 2;
      const targetHeight = A4_HEIGHT - margin * 2;

      const scaleFactor = Math.min(
        targetWidth / imgDims.width,
        targetHeight / imgDims.height,
        1.0 // don't upscale beyond original if smaller
      );

      const drawWidth = imgDims.width * scaleFactor;
      const drawHeight = imgDims.height * scaleFactor;

      // Center the image on the page
      const x = (A4_WIDTH - drawWidth) / 2;
      const y = (A4_HEIGHT - drawHeight) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight
      });
    } catch (err) {
      console.error(`Error processing image ${imgPath} for PDF conversion:`, err);
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, pdfBytes);
  return pdfDoc.getPageCount();
}

module.exports = {
  getPdfPageCount,
  compileImagesToPdf
};
