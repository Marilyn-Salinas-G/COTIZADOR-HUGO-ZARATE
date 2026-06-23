const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Cotizacion_161_SEGUROS_MUNDIAL (1).pdf');

if (!fs.existsSync(pdfPath)) {
  console.error('File not found:', pdfPath);
  process.exit(1);
}

const data = fs.readFileSync(pdfPath);

let count = 0;
let pos = 0;

while (true) {
  // Find 'stream' keyword
  const streamIdx = data.indexOf('stream', pos);
  if (streamIdx === -1) break;
  
  // Find next 'endstream' keyword
  const endStreamIdx = data.indexOf('endstream', streamIdx);
  if (endStreamIdx === -1) break;
  
  // Extract data between stream and endstream
  // In PDF, 'stream' is followed by a newline (CRLF or LF)
  let start = streamIdx + 6;
  if (data[start] === 13) start++; // CR
  if (data[start] === 10) start++; // LF
  
  let end = endStreamIdx;
  if (data[end - 1] === 10) end--; // LF
  if (data[end - 1] === 13) end--; // CR
  
  const streamData = data.slice(start, end);
  
  // Check if it looks like a JPEG (starts with FF D8 FF)
  if (streamData[0] === 0xff && streamData[1] === 0xd8 && streamData[2] === 0xff) {
    count++;
    const outPath = path.join(__dirname, `extracted_page_${count}.jpg`);
    fs.writeFileSync(outPath, streamData);
    console.log(`Extracted image ${count}: ${streamData.length} bytes -> ${outPath}`);
  }
  
  pos = endStreamIdx + 9;
}

console.log(`Extraction complete. Total images extracted: ${count}`);
