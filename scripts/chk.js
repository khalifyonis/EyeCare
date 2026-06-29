const fs = require('fs');
const x = fs.readFileSync('scripts/_doc.xml', 'utf8');
function paraAround(sub) {
  const i = x.indexOf(sub);
  const s = Math.max(x.lastIndexOf('<w:p>', i), x.lastIndexOf('<w:p ', i));
  const e = x.indexOf('</w:p>', i) + 6;
  return x.slice(s, e);
}
console.log('--- Architecture caption paragraph ---');
console.log(paraAround('Three-Tier Architecture').replace(/></g, '>\n<'));
