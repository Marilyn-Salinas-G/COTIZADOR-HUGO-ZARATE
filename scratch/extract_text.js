const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Cotizacion_161_SEGUROS_MUNDIAL (1).pdf');

if (!fs.existsSync(pdfPath)) {
  console.error('File not found:', pdfPath);
  process.exit(1);
}

const data = fs.readFileSync(pdfPath);
const content = data.toString('binary');

// Find all text strings in PDF (usually enclosed in parentheses)
const matches = [];
let pos = 0;
while (true) {
  const start = content.indexOf('(', pos);
  if (start === -1) break;
  const end = content.indexOf(')', start);
  if (end === -1) break;
  
  const text = content.slice(start + 1, end);
  if (text.length > 2 && !text.includes('/')) {
    matches.push(text);
  }
  pos = end + 1;
}

console.log('--- Extracted Text from PDF ---');
console.log('Total text fragments found:', matches.length);
matches.forEach((t, i) => console.log(`${i + 1}: ${t}`));
