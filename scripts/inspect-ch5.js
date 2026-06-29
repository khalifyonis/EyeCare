/* Inspect d:\cv\CHAPTER FIVE 5.docx — list media + ordered text/headings/images */
const fs = require('fs');
const JSZip = require('jszip');

const SRC = process.argv[2] || 'd:\\cv\\CHAPTER FIVE 5.docx';

async function main() {
  const buf = fs.readFileSync(SRC);
  const zip = await JSZip.loadAsync(buf);

  console.log('=== MEDIA ===');
  const media = Object.keys(zip.files).filter((f) => f.startsWith('word/media/'));
  for (const m of media) {
    const data = await zip.files[m].async('nodebuffer');
    // PNG dimensions
    let dim = '';
    if (data.slice(12, 16).toString('ascii') === 'IHDR') {
      const w = data.readUInt32BE(16);
      const h = data.readUInt32BE(20);
      dim = `${w}x${h}`;
    }
    console.log(`${m}  ${Math.round(data.length / 1024)}KB  ${dim}`);
  }

  console.log('\n=== DOCUMENT FLOW (headings, captions, images, tables) ===');
  const xml = await zip.files['word/document.xml'].async('string');

  // Tokenize by paragraphs and tables in order
  const tokens = [];
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g;
  let mt;
  while ((mt = re.exec(xml)) !== null) {
    const seg = mt[0];
    if (seg.startsWith('<w:tbl')) {
      const rows = (seg.match(/<w:tr[ >]/g) || []).length;
      const firstCells = [];
      const cellRe = /<w:tc>[\s\S]*?<\/w:tc>/g;
      let cm; let count = 0;
      const firstRow = seg.match(/<w:tr[ >][\s\S]*?<\/w:tr>/);
      if (firstRow) {
        let c2;
        while ((c2 = cellRe.exec(firstRow[0])) !== null && count < 8) {
          const txt = (c2[0].match(/<w:t[ >][\s\S]*?<\/w:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join('');
          firstCells.push(txt);
          count++;
        }
      }
      const imgs = (seg.match(/<a:blip/g) || []).length;
      tokens.push(`[TABLE rows=${rows} imgs=${imgs}] headers: ${firstCells.join(' | ')}`);
    } else {
      const txt = (seg.match(/<w:t[ >][\s\S]*?<\/w:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join('');
      const hasImg = /<a:blip/.test(seg);
      const styleM = seg.match(/<w:pStyle w:val="([^"]+)"/);
      const style = styleM ? styleM[1] : '';
      if (hasImg) {
        const embed = (seg.match(/r:embed="([^"]+)"/g) || []).join(',');
        tokens.push(`  [IMG ${embed}] ${txt}`);
      } else if (txt.trim()) {
        const tag = /Heading/i.test(style) ? `H(${style})` : '';
        tokens.push(`${tag} ${txt}`.trim());
      }
    }
  }
  tokens.forEach((t, i) => console.log(`${String(i).padStart(3)} ${t}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
