const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const pdfPath = path.join(__dirname, '..', 'Guía Maestra_ Agente Cotizador Antigravity.pdf');

if (!fs.existsSync(pdfPath)) {
  console.error('File not found:', pdfPath);
  process.exit(1);
}

const data = fs.readFileSync(pdfPath);

// Let's find all streams in the PDF
// A stream starts with "stream" (followed by \r\n or \n) and ends with "endstream"
let pos = 0;
let streamIndex = 0;

console.log('Scanning PDF for streams...');

while (true) {
  const streamStartIdx = data.indexOf('stream', pos);
  if (streamStartIdx === -1) break;
  
  // Find "endstream"
  const streamEndIdx = data.indexOf('endstream', streamStartIdx);
  if (streamEndIdx === -1) break;
  
  // The actual stream content is between "stream\r\n" or "stream\n" and "endstream"
  // Let's determine where the stream content begins
  let contentStart = streamStartIdx + 6;
  if (data[contentStart] === 13 && data[contentStart + 1] === 10) { // \r\n
    contentStart += 2;
  } else if (data[contentStart] === 10) { // \n
    contentStart += 1;
  }
  
  const streamData = data.subarray(contentStart, streamEndIdx);
  
  // Let's try to decompress this stream with zlib
  try {
    const decompressed = zlib.inflateSync(streamData);
    const text = decompressed.toString('utf-8');
    
    // Check if it contains text markers like BT ... ET
    if (text.includes('BT') || text.includes('Tj') || text.includes('TJ')) {
      console.log(`\n--- Stream ${streamIndex} (Length: ${text.length}) ---`);
      
      // Parse text fragments
      const regex = /\(([^)]+)\)\s*T[j*]/g;
      let match;
      let streamText = '';
      while ((match = regex.exec(text)) !== null) {
        streamText += match[1] + ' ';
      }
      
      // Also look for TJ format: [ (text) 10 (text) ] TJ
      const tjRegex = /\[([^\]]+)\]\s*TJ/g;
      while ((match = tjRegex.exec(text)) !== null) {
        const inner = match[1];
        const innerRegex = /\(([^)]+)\)/g;
        let innerMatch;
        while ((innerMatch = innerRegex.exec(inner)) !== null) {
          streamText += innerMatch[1] + ' ';
        }
      }
      
      // Clean up octal escapes and other PDF escapes
      let cleanText = streamText
        .replace(/\\(\d{3})/g, (m, octal) => String.fromCharCode(parseInt(octal, 8)))
        .replace(/\\(.)/g, '$1');
        
      if (cleanText.trim().length > 0) {
        console.log(cleanText.trim());
      }
    }
  } catch (err) {
    // Not a valid zlib stream or different compression
  }
  
  streamIndex++;
  pos = streamEndIdx + 9;
}
