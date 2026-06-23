const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    // Skip node_modules
    if (file === 'node_modules') return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) {
        results.push({
          name: file,
          path: fullPath,
          size: stat.size
        });
      }
    }
  });
  return results;
};

const images = walk(path.join(__dirname, '..'));
console.log('--- Found Images ---');
images.forEach(img => {
  console.log(`${img.name} (${img.size} bytes) -> ${path.relative(path.join(__dirname, '..'), img.path)}`);
});
