const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node extract-docx-text.js <file.docx>');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-'));
const zipCopy = path.join(tmp, 'doc.zip');
fs.copyFileSync(file, zipCopy);
execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipCopy.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}\\out' -Force"`, { stdio: 'pipe' });

const xml = fs.readFileSync(path.join(tmp, 'out', 'word', 'document.xml'), 'utf8');
const text = xml
  .replace(/<w:tab[^/]*\/>/g, '\t')
  .replace(/<\/w:p>/g, '\n')
  .replace(/<w:br[^/]*\/>/g, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\n{3,}/g, '\n\n');

console.log(text);
