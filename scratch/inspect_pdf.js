const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Cotizacion_161_SEGUROS_MUNDIAL (1).pdf');

if (!fs.existsSync(pdfPath)) {
  console.error('File not found:', pdfPath);
  process.exit(1);
}

const data = fs.readFileSync(pdfPath);
const content = data.toString('binary');

// Count occurrences of page descriptors
const pageCount = (content.match(/\/Type\s*\/Page\b/g) || []).length;
console.log('--- PDF Inspection ---');
console.log('File size:', data.length, 'bytes');
console.log('Number of pages (/Type /Page):', pageCount);

// Let's count some other objects
const imageCount = (content.match(/\/Subtype\s*\/Image\b/g) || []).length;
console.log('Number of images (/Subtype /Image):', imageCount);

// Check if we can find any other page break indicators
const pagesAttrCount = (content.match(/\/Type\s*\/Pages\b/g) || []).length;
console.log('Number of pages catalogs (/Type /Pages):', pagesAttrCount);
