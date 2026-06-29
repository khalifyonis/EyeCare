/**
 * rebuild_ch5_docx_v2.js
 * Fixed version: handles XML tag-split text for TC-ID matching
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REBUILD_DIR = 'C:/Users/yonis/prjects/FYP/EyeCare/tmp_rebuild';
const HD_IMAGES_DIR = 'C:/Users/yonis/.gemini/antigravity/brain/d50965b4-21de-4fbd-80db-1e672e2543f9';
const OUT_DOCX = String.raw`D:\cv\CHAPTER FIVE 5.final.docx`;

// The extracted dir was already set up by the previous run
const extractedDir = path.join(REBUILD_DIR, 'extracted');
const docXmlPath = path.join(extractedDir, 'word/document.xml');
const relsPath = path.join(extractedDir, 'word/_rels/document.xml.rels');
const mediaDir = path.join(extractedDir, 'word/media');

// Check if already setup
if (!fs.existsSync(extractedDir)) {
    console.error('Extracted dir not found, run the main script first');
    process.exit(1);
}

// Read current XML
let relsContent = fs.readFileSync(relsPath, 'utf8');
let xmlContent = fs.readFileSync(docXmlPath, 'utf8');

// --- Add HD image relationships (if not already done) ---
const imagesPending = {
    login_error: path.join(HD_IMAGES_DIR, 'eyecare_login_error_1782409049974.png'),
    dashboard: path.join(HD_IMAGES_DIR, 'eyecare_dashboard_1782409060672.png'),
    patient_validation: path.join(HD_IMAGES_DIR, 'eyecare_patient_validation_1782409072744.png'),
    appointments: path.join(HD_IMAGES_DIR, 'eyecare_appointments_1782409083287.png'),
    examination: path.join(HD_IMAGES_DIR, 'eyecare_examination_1782409114203.png'),
    billing: path.join(HD_IMAGES_DIR, 'eyecare_billing_1782409123161.png'),
};

// Copy images to media if not already done
const hdImageMap = {};
const HDFileMap = {
    login_error: 'hd_image100.png',
    dashboard: 'hd_image101.png',
    patient_validation: 'hd_image102.png',
    appointments: 'hd_image103.png',
    examination: 'hd_image104.png',
    billing: 'hd_image105.png',
};
for (const [key, filename] of Object.entries(HDFileMap)) {
    const destPath = path.join(mediaDir, filename);
    if (!fs.existsSync(destPath) && fs.existsSync(imagesPending[key])) {
        fs.copyFileSync(imagesPending[key], destPath);
    }
    hdImageMap[key] = filename;
}
console.log('HD images in media dir:', Object.keys(hdImageMap).length);

// Add rels if not already added
const relIdMatches = [...relsContent.matchAll(/Id="rId(\d+)"/g)];
let maxRelId = 0;
for (const m of relIdMatches) {
    const n = parseInt(m[1]);
    if (n > maxRelId) maxRelId = n;
}
console.log('Max existing relId:', maxRelId);

const newRelIds = {};
// Check if HD rels already added
if (!relsContent.includes('hd_image100.png')) {
    const newRels = [];
    for (const [key, filename] of Object.entries(hdImageMap)) {
        maxRelId++;
        const relId = `rId${maxRelId}`;
        newRelIds[key] = relId;
        newRels.push(`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${filename}"/>`);
    }
    relsContent = relsContent.replace('</Relationships>', newRels.join('\n') + '\n</Relationships>');
    fs.writeFileSync(relsPath, relsContent, 'utf8');
    console.log('Added new HD image relationships, new relIds:', newRelIds);
} else {
    // Extract existing relIds
    for (const [key, filename] of Object.entries(hdImageMap)) {
        const match = relsContent.match(new RegExp(`Id="(rId\\d+)"[^>]*Target="media/${filename}"`));
        if (match) newRelIds[key] = match[1];
    }
    console.log('HD image rels already exist:', newRelIds);
}

// --- Helper: strip XML tags from a string ---
function stripTags(str) {
    return str.replace(/<[^>]+>/g, '');
}

// --- Helper: build inline image XML ---
let imgIdCounter = 500;
function buildImageXml(relId, widthEMU, heightEMU, descr) {
    imgIdCounter++;
    return `<w:r><w:rPr/><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${widthEMU}" cy="${heightEMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${imgIdCounter}" name="${descr}" descr="${descr}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${descr}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEMU}" cy="${heightEMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

// Image size: ~4" wide x 2.25" tall (16:9)
const IMG_W = 3657600;
const IMG_H = 2057400;

// TC -> image mapping
const testCaseImages = {
    'TC-01': newRelIds.dashboard,
    'TC-02': newRelIds.login_error,
    'TC-04': newRelIds.patient_validation,
    'TC-07': newRelIds.appointments,
    'TC-09': newRelIds.examination,
    'TC-14': newRelIds.billing,
};
console.log('TC->image map:', testCaseImages);

// --- Find the test cases table ---
const section54Start = xmlContent.indexOf('5.4 Test Cases and Results');
const section55Start = xmlContent.indexOf('5.5 Validation and Verification');
console.log('Section 5.4:', section54Start, ' Section 5.5:', section55Start);

// Find the table in the 5.4 section
let tblSearchStart = section54Start;
const tblAbsStart = xmlContent.indexOf('<w:tbl>', tblSearchStart);
console.log('Table starts at:', tblAbsStart);

// Find table end
let depth = 0;
let tblAbsEnd = tblAbsStart;
for (let i = tblAbsStart; i < xmlContent.length; i++) {
    if (xmlContent.substring(i, i + 7) === '<w:tbl>') depth++;
    else if (xmlContent.substring(i, i + 8) === '</w:tbl>') {
        depth--;
        if (depth === 0) {
            tblAbsEnd = i + 8;
            break;
        }
    }
}
console.log('Table ends at:', tblAbsEnd);

const tableXml = xmlContent.substring(tblAbsStart, tblAbsEnd);
console.log('Table length:', tableXml.length);

// --- Split table into rows ---
function extractChildren(xml, tag) {
    const results = [];
    let pos = 0;
    const openTag = `<${tag}`;
    const closeTag = `</${tag}>`;
    while (pos < xml.length) {
        const start = xml.indexOf(openTag, pos);
        if (start === -1) break;
        // Check it's actually the tag (not e.g. <w:trPr> when we want <w:tr>)
        const afterTag = xml[start + openTag.length];
        if (afterTag !== '>' && afterTag !== ' ') {
            pos = start + 1;
            continue;
        }
        let d = 0;
        let end = start;
        for (let i = start; i < xml.length; i++) {
            if (xml.substring(i, i + openTag.length) === openTag) {
                const ch = xml[i + openTag.length];
                if (ch === '>' || ch === ' ') d++;
            }
            if (xml.substring(i, i + closeTag.length) === closeTag) {
                d--;
                if (d === 0) {
                    end = i + closeTag.length;
                    break;
                }
            }
        }
        results.push({ start, end, xml: xml.substring(start, end) });
        pos = end;
    }
    return results;
}

const rows = extractChildren(tableXml, 'w:tr');
console.log('Rows extracted:', rows.length);

// For each row, check if the stripped text contains a TC ID
let updatedTableXml = tableXml;
let offset = 0; // track offset as we modify

const modifications = []; // collect, then apply in reverse

for (const row of rows) {
    const plainText = stripTags(row.xml);
    for (const [tcId, relId] of Object.entries(testCaseImages)) {
        if (!relId) continue;
        if (plainText.includes(tcId)) {
            console.log(`Row contains ${tcId}: "${plainText.substring(0, 80).trim()}"`);
            // Get cells in this row
            const cells = extractChildren(row.xml, 'w:tc');
            console.log(`  Cells: ${cells.length}`);
            if (cells.length >= 5) {
                // Cell index 4 = "Actual Result" column
                const targetCell = cells[4];
                const cellPr = (targetCell.xml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [''])[0];
                const imageXml = buildImageXml(relId, IMG_W, IMG_H, `${tcId} Screenshot`);
                const newCellXml = `<w:tc>${cellPr}<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="40"/></w:pPr>${imageXml}</w:p></w:tc>`;
                modifications.push({
                    rowStart: row.start, rowEnd: row.end, rowXml: row.xml,
                    cellStart: targetCell.start, cellEnd: targetCell.end,
                    oldCellXml: targetCell.xml, newCellXml, tcId
                });
            }
            break;
        }
    }
}

console.log('Modifications to make:', modifications.length);

// Apply modifications in reverse order within the table
modifications.sort((a, b) => b.cellStart - a.cellStart);

let newTableXml = tableXml;
for (const mod of modifications) {
    // Replace old cell with new cell in newTableXml
    // Since we're working on positions relative to tableXml, find the exact cell position
    const cellInTable = newTableXml.indexOf(mod.oldCellXml, mod.rowStart);
    if (cellInTable !== -1) {
        newTableXml = newTableXml.substring(0, cellInTable) + mod.newCellXml + newTableXml.substring(cellInTable + mod.oldCellXml.length);
        console.log(`Applied modification for ${mod.tcId}`);
    } else {
        console.warn(`Could not find cell for ${mod.tcId} in updated table`);
    }
}

// Replace the table in the document
let updatedXml = xmlContent.substring(0, tblAbsStart) + newTableXml + xmlContent.substring(tblAbsEnd);
console.log('Table replaced in document XML');

// --- Also make existing images in 5.3 section (unit testing) larger ---
// Find all wp:extent elements and make them larger if they're small (< 2 inches = 1828800 EMU)
updatedXml = updatedXml.replace(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g, (match, cx, cy) => {
    const w = parseInt(cx);
    const h = parseInt(cy);
    // Only upscale images that are currently small (less than 3 inches ~ 2743200 EMU)
    if (w > 0 && w < 2743200) {
        // Scale up to approximately 4 inches = 3657600 EMU, maintain aspect ratio
        const scale = 3657600 / w;
        const newW = 3657600;
        const newH = Math.round(h * scale);
        return `<wp:extent cx="${newW}" cy="${newH}"/>`;
    }
    return match;
});
console.log('Updated image sizes for clarity');

// Save updated document.xml
fs.writeFileSync(docXmlPath, updatedXml, 'utf8');
console.log('Saved updated document.xml, size:', updatedXml.length);

// --- Re-pack as docx ---
// Use Node.js native zip approach
const { execFileSync } = require('child_process');

const outputZip = path.join(REBUILD_DIR, 'output_v2.zip');
if (fs.existsSync(outputZip)) fs.unlinkSync(outputZip);

// Use PowerShell to create zip
const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$src = '${extractedDir.replace(/\//g, '\\')}'
$dst = '${outputZip.replace(/\//g, '\\')}'
if (Test-Path $dst) { Remove-Item $dst -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($src, $dst)
Write-Host 'Zip created: ' $dst
`;

const psFile = path.join(REBUILD_DIR, 'create_zip.ps1');
fs.writeFileSync(psFile, psScript, 'utf8');
execFileSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', psFile], { stdio: 'inherit' });

// Copy zip to final docx location
const finalDocxWin = 'D:\\cv\\CHAPTER FIVE 5.final.docx';
fs.copyFileSync(outputZip, finalDocxWin);
console.log('\n=== SUCCESS: Final document saved to:', finalDocxWin, '===');
