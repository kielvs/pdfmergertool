const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

const upload = multer({ dest: 'uploads/' });

function formatTimestamp() {
  const date = new Date();
  const options = {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  const formattedDate = date.toLocaleString('en-US', options).replace(/[^\w]/g, '-');
  const nanoseconds = date.getMilliseconds().toString().padStart(3, '0');
  return `${formattedDate}-${nanoseconds}`;
}

router.post('/merge-pdf', upload.none(), async (req, res) => {
  const { url1, url2 } = req.body;

  try {
    // Download the first PDF
    const firstPdfBuffer = await downloadPdf(url1);

    // Download the second PDF
    const secondPdfBuffer = await downloadPdf(url2);

    // Load the first and second PDFs
    const firstPdf = await PDFDocument.load(firstPdfBuffer);
    const secondPdf = await PDFDocument.load(secondPdfBuffer);

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Copy pages from the first PDF to the merged document
    const firstPdfPages = await mergedPdf.copyPages(firstPdf, firstPdf.getPageIndices());
    firstPdfPages.forEach((page) => mergedPdf.addPage(page));

    // Copy pages from the second PDF to the merged document
    const secondPdfPages = await mergedPdf.copyPages(secondPdf, secondPdf.getPageIndices());
    secondPdfPages.forEach((page) => mergedPdf.addPage(page));

    // Save the merged PDF to a file
    const mergedPdfBytes = await mergedPdf.save();
    const timestamp = formatTimestamp();
    const mergedPdfPath = `uploads/merged_${timestamp}.pdf`;

    fs.writeFileSync(mergedPdfPath, mergedPdfBytes);

    res.status(200).json({ message: 'PDFs merged successfully', mergedPdfPath });
  } catch (error) {
    console.error('Error merging PDFs:', error);
    res.status(500).json({ error: 'An error occurred while merging PDFs' });
  }
});

async function downloadPdf(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data;
  } catch (error) {
    throw error;
  }
}

module.exports = router;
