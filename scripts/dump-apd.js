const fs = require('fs');
const JSZip = require('jszip');
(async () => {
  const z = await JSZip.loadAsync(fs.readFileSync('C:/Users/yonis/prjects/FYP/EyeCare/docs/cv/CHAPTER_06_07_fin.docx'));
  const xml = await z.files['word/document.xml'].async('string');
  fs.writeFileSync('scripts/_apd.xml', xml);
  console.log('len', xml.length);

  const h = xml.indexOf('Appendix D: Raw Data');
  console.log('Appendix D heading idx', h, '(count', (xml.match(/Appendix D: Raw Data/g) || []).length, ')');
  // heading paragraph end
  const hEnd = xml.indexOf('</w:p>', h) + 6;
  console.log('heading paragraph end', hEnd);
  // last sectPr
  const sect = xml.lastIndexOf('<w:sectPr');
  console.log('last sectPr', sect);
  console.log('\n--- heading paragraph ---');
  const ps = Math.max(xml.lastIndexOf('<w:p>', h), xml.lastIndexOf('<w:p ', h));
  console.log(xml.slice(ps, hEnd).replace(/></g, '>\n<'));
  console.log('\n--- a Figure 6 caption for style ---');
  const c = xml.indexOf('Testing Pass Rate by Category');
  const cs = Math.max(xml.lastIndexOf('<w:p>', c), xml.lastIndexOf('<w:p ', c));
  const ce = xml.indexOf('</w:p>', c) + 6;
  console.log(xml.slice(cs, ce).replace(/></g, '>\n<'));
})();
