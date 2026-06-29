const fs = require('fs');
const JSZip = require('jszip');
(async () => {
  const z = await JSZip.loadAsync(fs.readFileSync('d:\\cv\\CHAPTER FIVE 5.backup.docx'));
  const xml = await z.files['word/document.xml'].async('string');
  fs.writeFileSync('scripts/_doc.xml', xml);

  // extents for each image rId
  for (const rId of ['rId4','rId5','rId6','rId7','rId8','rId9','rId21']) {
    const m = xml.indexOf(`r:embed="${rId}"`);
    if (m < 0) { console.log(rId, 'NOT FOUND'); continue; }
    const ext = xml.lastIndexOf('<wp:extent', m);
    const seg = xml.slice(ext, ext + 60);
    console.log(rId, seg.replace(/\s+/g,' '));
  }

  // 5.2 section paragraph map
  console.log('\n=== 5.2 region ===');
  const s52 = xml.indexOf('Coding and Modules');
  const s53 = xml.indexOf('Testing Strategy');
  const region = xml.slice(s52, s53);
  const re = /<w:p[ >][\s\S]*?<\/w:p>/g; let mm; let off = s52;
  while ((mm = re.exec(region)) !== null) {
    const t = (mm[0].match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join('');
    if (t.trim()) console.log((s52+mm.index), '|', t.slice(0,70));
  }
  console.log('s52',s52,'s53',s53);

  // figure captions storage (digit run check)
  console.log('\n=== figure captions ===');
  let i=-1; const caps=['Three-Tier Architecture','Screenshots of Tested Components','Integration Testing','Clinic Workflow','System Testing Flow','User Acceptance Testing','Validation and Verification Flow'];
  for (const c of caps){const k=xml.indexOf(c);console.log(k,'|',c);}
})();
