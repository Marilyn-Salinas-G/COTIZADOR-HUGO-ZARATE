const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const files = [
  'LOGO BANCOLOMBIA.jpg',
  'LOGO BRE-B.png',
  'LOGO CON TELEFONO.png',
  'LOGO DAVIVIENDA.png',
  'LOGO HUGO PNG.png',
  'LOGO NEQUI.png'
];

files.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`${file}: Not found`);
    return;
  }
  
  // Get image dimensions using simple png/jpeg parsing
  const buffer = fs.readFileSync(filePath);
  let width = 0;
  let height = 0;
  
  if (file.toLowerCase().endsWith('.png')) {
    // PNG dimensions are at offset 16 (4 bytes width, 4 bytes height)
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  } else if (file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')) {
    let i = 2;
    while (i < buffer.length) {
      if (buffer[i] === 0xff) {
        const marker = buffer[i + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          height = buffer.readUInt16BE(i + 5);
          width = buffer.readUInt16BE(i + 7);
          break;
        }
        i += 2 + buffer.readUInt16BE(i + 2);
      } else {
        i++;
      }
    }
  }
  
  console.log(`${file}: ${width} x ${height} (${buffer.length} bytes)`);
});
