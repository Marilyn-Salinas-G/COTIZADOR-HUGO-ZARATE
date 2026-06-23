const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');
const destDir = path.join(__dirname, '..', 'public');

const filesToCopy = {
  'LOGO BANCOLOMBIA.jpg': 'logo_bancolombia.jpg',
  'LOGO BRE-B.png': 'logo_breve.png',
  'LOGO DAVIVIENDA.png': 'logo_davivienda.png',
  'LOGO NEQUI.png': 'logo_nequi.png'
};

for (const [src, dest] of Object.entries(filesToCopy)) {
  const srcPath = path.join(srcDir, src);
  const destPath = path.join(destDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} to ${dest}`);
  } else {
    console.log(`Source not found: ${src}`);
  }
}
