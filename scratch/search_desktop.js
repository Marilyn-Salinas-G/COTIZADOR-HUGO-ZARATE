const fs = require('fs');
const path = require('path');

const desktopDir = 'd:\\Usuarios\\Desktop';

if (!fs.existsSync(desktopDir)) {
  console.error('Desktop directory not found:', desktopDir);
  process.exit(1);
}

const files = fs.readdirSync(desktopDir);
console.log('--- Searching Desktop for Logos ---');
files.forEach(file => {
  const name = file.toLowerCase();
  if (name.includes('logo') || name.includes('bogota') || name.includes('bogotá') || name.includes('banco') || name.includes('breve') || name.includes('nequi') || name.includes('davivienda')) {
    console.log(file);
  }
});
