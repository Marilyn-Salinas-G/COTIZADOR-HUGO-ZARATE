const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, 'extracted_page_1.jpg');

if (!fs.existsSync(imgPath)) {
  console.error('File not found:', imgPath);
  process.exit(1);
}

const buffer = fs.readFileSync(imgPath);
let i = 2; // skip SOI (FF D8)

let width = 0;
let height = 0;

while (i < buffer.length) {
  if (buffer[i] === 0xff) {
    const marker = buffer[i + 1];
    if (marker === 0xc0 || marker === 0xc2) { // SOF0 or SOF2
      height = buffer.readUInt16BE(i + 5);
      width = buffer.readUInt16BE(i + 7);
      break;
    }
    i += 2 + buffer.readUInt16BE(i + 2);
  } else {
    i++;
  }
}

console.log('Image dimensions:', width, 'x', height);
