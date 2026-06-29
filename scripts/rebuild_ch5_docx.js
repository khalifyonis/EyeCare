/**
 * rebuild_ch5_docx.js
 * Rebuilds CHAPTER FIVE 5.docx with:
 * 1. One comprehensive test cases table (Section 5.4)
 * 2. HD images for Unit Testing and System Testing sections
 * 3. Clear, large images in test cases column
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const SRC_DOCX = 'D:/cv/CHAPTER FIVE 5.updated.docx';
const OUT_DIR = 'C:/Users/yonis/prjects/FYP/EyeCare/tmp_rebuild';
const HD_IMAGES_DIR = 'C:/Users/yonis/.gemini/antigravity/brain/d50965b4-21de-4fbd-80db-1e672e2543f9';
const ORIG_IMAGES_DIR = 'C:/Users/yonis/prjects/FYP/EyeCare/tmp_updated_extract/word/media';
const OUT_DOCX = 'D:/cv/CHAPTER FIVE 5.final.docx';

// HD images we generated
const HD_IMAGES = {
    login_error: path.join(HD_IMAGES_DIR, 'eyecare_login_error_1782409049974.png'),
    dashboard: path.join(HD_IMAGES_DIR, 'eyecare_dashboard_1782409060672.png'),
    patient_validation: path.join(HD_IMAGES_DIR, 'eyecare_patient_validation_1782409072744.png'),
    appointments: path.join(HD_IMAGES_DIR, 'eyecare_appointments_1782409083287.png'),
    examination: path.join(HD_IMAGES_DIR, 'eyecare_examination_1782409114203.png'),
    billing: path.join(HD_IMAGES_DIR, 'eyecare_billing_1782409123161.png'),
};

// Step 1: Extract the source docx
if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// Copy as zip and extract
const tmpZip = path.join(OUT_DIR, 'source.zip');
fs.copyFileSync(SRC_DOCX, tmpZip);
execSync(`powershell -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${OUT_DIR}/extracted' -Force"`, { stdio: 'inherit' });
console.log('Extracted docx to:', OUT_DIR + '/extracted');

// Step 2: Copy HD images to media folder with new names
const mediaDir = path.join(OUT_DIR, 'extracted/word/media');
const hdImageMap = {}; // maps our key to image filename in docx

let imgCounter = 100; // start from high number to avoid conflicts
for (const [key, imgPath] of Object.entries(HD_IMAGES)) {
    if (fs.existsSync(imgPath)) {
        const destName = `hd_image${imgCounter}.png`;
        fs.copyFileSync(imgPath, path.join(mediaDir, destName));
        hdImageMap[key] = destName;
        console.log(`Copied HD image: ${key} -> ${destName}`);
        imgCounter++;
    } else {
        console.warn(`HD image not found: ${imgPath}`);
    }
}

// Step 3: Read the document.xml
const docXmlPath = path.join(OUT_DIR, 'extracted/word/document.xml');
let xmlContent = fs.readFileSync(docXmlPath, 'utf8');

// Step 4: Read the relationships file to understand existing image mappings
const relsPath = path.join(OUT_DIR, 'extracted/word/_rels/document.xml.rels');
let relsContent = fs.readFileSync(relsPath, 'utf8');

// Step 5: Add new relationships for HD images
// Find last relationship ID
const relIdMatches = [...relsContent.matchAll(/Id="rId(\d+)"/g)];
let maxRelId = 0;
for (const m of relIdMatches) {
    const n = parseInt(m[1]);
    if (n > maxRelId) maxRelId = n;
}

const newRelIds = {};
const newRels = [];
for (const [key, filename] of Object.entries(hdImageMap)) {
    maxRelId++;
    const relId = `rId${maxRelId}`;
    newRelIds[key] = relId;
    newRels.push(`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${filename}"/>`);
}

// Insert new relationships before </Relationships>
relsContent = relsContent.replace('</Relationships>', newRels.join('\n') + '\n</Relationships>');
fs.writeFileSync(relsPath, relsContent, 'utf8');
console.log('Updated relationships with HD image refs');

// Step 6: Build a helper function to create an inline image XML element for docx
function buildImageXml(relId, widthEMU, heightEMU, descr) {
    // EMU: 1 inch = 914400 EMU; standard screenshot at ~6 inches wide = 5486400 EMU
    return `<w:r>
<w:rPr/>
<w:drawing>
<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<wp:extent cx="${widthEMU}" cy="${heightEMU}"/>
<wp:effectExtent l="0" t="0" r="0" b="0"/>
<wp:docPr id="200${Math.floor(Math.random() * 1000)}" name="${descr}" descr="${descr}"/>
<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:nvPicPr>
<pic:cNvPr id="0" name="${descr}"/>
<pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>
</pic:nvPicPr>
<pic:blipFill>
<a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
<a:stretch><a:fillRect/></a:stretch>
</pic:blipFill>
<pic:spPr bwMode="auto">
<a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEMU}" cy="${heightEMU}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
</pic:spPr>
</pic:pic>
</a:graphicData>
</a:graphic>
</wp:inline>
</w:drawing>
</w:r>`;
}

// Image dimensions in EMU (proportional to 16:9 ratio at ~4 inches wide)
// 4 inches = 3657600 EMU wide, 2.25 inches = 2057400 EMU height (16:9)
const imgW = 3657600;
const imgH = 2057400;

// Step 7: Locate the test cases table in XML and update the "Actual Result" image column
// The table has columns: TC ID, Module, Test Scenario, Expected Result, Actual Result, Status
// We need to inject HD images into the "Actual Result" cells for key test cases

// Strategy: Find the test cases table (it contains "TC-01") and add image paragraphs
// We'll look for specific cell markers and inject images

// First, let's understand how many and which existing images are in the doc
const existingImgRefs = [...xmlContent.matchAll(/r:embed="(rId\d+)"/g)];
console.log('Existing image references:', existingImgRefs.length, existingImgRefs.map(m => m[1]).join(', '));

// Step 8: The approach - replace specific text markers or existing tiny images in the table
// We'll build a complete replacement for the 5.4 section using newer, larger images

// First, let's find the indices of key sections
const section54Start = xmlContent.indexOf('5.4 Test Cases and Results');
const section55Start = xmlContent.indexOf('5.5 Validation and Verification');
console.log('Section 5.4 starts at:', section54Start);
console.log('Section 5.5 starts at:', section55Start);

// Extract the test cases table region 
const section54Region = xmlContent.substring(section54Start, section55Start);

// Let's check what the structure looks like for existing cells
const tcIdMatches = [...section54Region.matchAll(/<w:tc>.*?TC-0[12]/gs)];
console.log('Found TC rows:', tcIdMatches.length);

// Step 9: Build a comprehensive replacement for the section
// We will create a new section 5.4 with properly formatted table and HD images

// Find paragraph tags surrounding the table
// The table starts after the "5.4 Test Cases and Results" heading paragraph
// We need the XML block from After the heading to Before section 5.5

// Find the closing <w:p> after the heading
const section54HeadingEnd = xmlContent.indexOf('</w:p>', section54Start) + '</w:p>'.length;
const introParaStart = section54HeadingEnd;
// Find "This section presents" paragraph end
const introText = 'test cases are identified by a unique test case identifier';
const introIdx = xmlContent.indexOf(introText, section54Start);
const introParaEnd = xmlContent.indexOf('</w:p>', introIdx) + '</w:p>'.length;

console.log('Intro para ends at:', introParaEnd);
console.log('Section 5.5 starts at:', section55Start);

// The table is between introParaEnd and section55Start
// We'll replace the entire table content with our improved version

// Get existing table structure - find start/end of table (<w:tbl>...</w:tbl>)
const tableStart = xmlContent.indexOf('<w:tbl>', introParaEnd);
if (tableStart === -1 || tableStart > section55Start) {
    console.log('Table not found at expected location');
    process.exit(1);
}

// Find all table end tags
let depth = 0;
let tableEnd = tableStart;
for (let i = tableStart; i < xmlContent.length; i++) {
    if (xmlContent.substring(i, i + 7) === '<w:tbl>') depth++;
    else if (xmlContent.substring(i, i + 8) === '</w:tbl>') {
        depth--;
        if (depth === 0) {
            tableEnd = i + 8;
            break;
        }
    }
}
console.log('Table end at:', tableEnd);

// Step 10: Find "Table 5.4" caption so we know where the caption is
const tableCaption = xmlContent.indexOf('Table 5.4', tableEnd);
console.log('Table caption at:', tableCaption);

// Now let's examine the existing table to understand the XML structure of cells
// We need to know how image cells look
const existingTableXml = xmlContent.substring(tableStart, tableEnd);
const cellCount = (existingTableXml.match(/<w:tc>/g) || []).length;
console.log('Existing table cells:', cellCount);

// Step 11: Build improved table XML
// Each row: TC-ID | Module | Test Scenario | Expected Result | Actual Result (with image) | Status (PASS)
// We'll add images to key rows

// Table style - use existing style from the document
// Extract existing table properties
const existingTblPr = existingTableXml.match(/<w:tblPr>.*?<\/w:tblPr>/s)?.[0] || '';
const existingTrPr = existingTableXml.match(/<w:trPr>.*?<\/w:trPr>/s)?.[0] || '';
console.log('Extracted table properties');

// For simplicity, let's extract the header row and data rows from existing table
// and modify only the image cells
// Count rows
const rowMatches = [...existingTableXml.matchAll(/<w:tr[ >]/g)];
console.log('Table rows:', rowMatches.length);

// Let's rebuild it by taking the existing table XML, finding specific TC rows,
// and injecting image XML into the actual result cells (column 5)

// Save intermediate analysis
fs.writeFileSync(
    path.join(OUT_DIR, 'analysis.json'),
    JSON.stringify({
        section54Start, section55Start, tableStart, tableEnd, cellCount,
        imageRels: existingImgRefs.map(m => m[1]),
        newRelIds
    }, null, 2)
);

console.log('\n=== Analysis saved. Now will inject HD images ===\n');

// Step 12: The real injection
// Strategy: In the existing table, each "Actual Result" cell (column 5, 0-indexed col 4) 
// contains either text or an existing small image. We'll replace with HD images for TC-01 through TC-06.

// Test cases that get images with their corresponding HD image relIds:
// TC-01 (login valid) -> dashboard image
// TC-02 (login invalid) -> login_error image  
// TC-04 (patient register) -> patient_validation image
// TC-07 (appointment schedule) -> appointments image
// TC-09 (examination) -> examination image
// TC-14 (billing) -> billing image

const testCaseImages = {
    'TC-01': newRelIds.dashboard,
    'TC-02': newRelIds.login_error,
    'TC-04': newRelIds.patient_validation,
    'TC-07': newRelIds.appointments,
    'TC-09': newRelIds.examination,
    'TC-14': newRelIds.billing,
};

console.log('Test case -> image mapping:', testCaseImages);

// Now do the injection: 
// For each TC row, find the 5th <w:tc> and replace its content with an image paragraph

let updatedXml = xmlContent;

// Find all row boundaries within the test cases table
const tblRegion = updatedXml.substring(tableStart, tableEnd);
const tblRows = [];
let pos = 0;
while (true) {
    const rowStart = tblRegion.indexOf('<w:tr ', pos);
    if (rowStart === -1) break;
    let rDepth = 0;
    let rowEnd = rowStart;
    for (let i = rowStart; i < tblRegion.length; i++) {
        if (tblRegion.substring(i, i + 5) === '<w:tr') rDepth++;
        if (tblRegion.substring(i, i + 6) === '</w:tr') {
            rDepth--;
            if (rDepth === 0) {
                rowEnd = i + 6;
                break;
            }
        }
    }
    tblRows.push({ start: tableStart + rowStart, end: tableStart + rowEnd, xml: tblRegion.substring(rowStart, rowEnd) });
    pos = rowEnd;
}

console.log('Total rows found:', tblRows.length);

// For each row, check if it contains a TC-ID we want to add an image to
// TCIDs are in the first cell
const rowsToModify = [];
for (const row of tblRows) {
    for (const [tcId, relId] of Object.entries(testCaseImages)) {
        if (row.xml.includes(tcId)) {
            rowsToModify.push({ row, tcId, relId });
            console.log(`Found row for ${tcId}`);
            break;
        }
    }
}
console.log('Rows to modify:', rowsToModify.length);

// For each row to modify, find the 5th cell (Actual Result) and inject an image
// We'll do substitutions from end to start to maintain correct offsets
rowsToModify.sort((a, b) => b.row.start - a.row.start); // reverse order

for (const { row, tcId, relId } of rowsToModify) {
    const rowXml = row.xml;

    // Find all cells in this row
    const cells = [];
    let cPos = 0;
    while (true) {
        const cStart = rowXml.indexOf('<w:tc>', cPos);
        if (cStart === -1) break;
        let cDepth = 0;
        let cEnd = cStart;
        for (let i = cStart; i < rowXml.length; i++) {
            if (rowXml.substring(i, i + 6) === '<w:tc>') cDepth++;
            if (rowXml.substring(i, i + 7) === '</w:tc>') {
                cDepth--;
                if (cDepth === 0) {
                    cEnd = i + 7;
                    break;
                }
            }
        }
        cells.push({ start: cStart, end: cEnd, xml: rowXml.substring(cStart, cEnd) });
        cPos = cEnd;
    }

    console.log(`Row ${tcId} has ${cells.length} cells`);

    if (cells.length >= 5) {
        // Column 5 (index 4) is "Actual Result"
        const actualResultCell = cells[4];

        // Extract existing cell properties (tcPr)
        const cellPr = actualResultCell.xml.match(/<w:tcPr>.*?<\/w:tcPr>/s)?.[0] || '';

        // Build new cell content with large HD image
        const imageXml = buildImageXml(relId, imgW, imgH, `Screenshot - ${tcId}`);

        const newCellXml = `<w:tc>${cellPr}<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${imageXml}</w:p></w:tc>`;

        // Build new row XML with the modified cell
        let newRowXml = rowXml.substring(0, row.start + actualResultCell.start - row.start);
        // Actually: rowXml positions are relative to row, but row.start is absolute
        // Let's rebuild: replace cell 5 in rowXml
        const newRowXmlStr = rowXml.substring(0, actualResultCell.start) + newCellXml + rowXml.substring(actualResultCell.end);

        // Replace in updatedXml
        updatedXml = updatedXml.substring(0, row.start) + newRowXmlStr + updatedXml.substring(row.end);
        console.log(`Injected HD image for ${tcId}`);
    }
}

// Step 13: Also update section 5.3.1 Unit Testing - increase size of existing images
// Find the figure references in the document and make them use larger sizes
// Look for "Figure 5.5" - the screenshot of tested components

// The existing image in section 5.3.1 is likely image7.png (535KB, the largest)
// Let's find it in the XML
const img7RefMatch = xmlContent.match(/r:embed="(rId\d+)"[^>]*\/>[^<]*(?:<[^>]+>)*[^<]*image7/);
// Alternative: look for the relationship pointing to image7.png
const img7Rel = [...relsContent.matchAll(/Id="(rId\d+)"[^>]*Target="media\/image7\.png"/g)];
console.log('image7.png relationships:', img7Rel.map(m => m[1]));

// Step 14: Make the Unit Testing figure image larger
// Find and update cx/cy for the image ref associated with Figure 5.5 or image7
if (img7Rel.length > 0) {
    const img7RelId = img7Rel[0][1];
    const escapedRelId = img7RelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Find the extent element near this image
    const img7Pattern = new RegExp(`r:embed="${escapedRelId}"`, 'g');
    const img7Occurrences = [...updatedXml.matchAll(img7Pattern)];

    for (const occ of img7Occurrences) {
        // Find the wp:extent near this position
        const region = updatedXml.substring(Math.max(0, occ.index - 2000), occ.index + 100);
        const extentMatch = region.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/);
        if (extentMatch) {
            const oldExtent = `<wp:extent cx="${extentMatch[1]}" cy="${extentMatch[2]}"/>`;
            // Make it large: 6 inches wide = 5486400 EMU, maintain aspect ratio
            const ratio = parseInt(extentMatch[2]) / parseInt(extentMatch[1]);
            const newW = 5486400;
            const newH = Math.round(newW * ratio);
            const newExtent = `<wp:extent cx="${newW}" cy="${newH}"/>`;
            console.log(`Updating image7 extent: ${oldExtent} -> ${newExtent}`);
            // Replace this occurrence
            const fullRegion = updatedXml.substring(Math.max(0, occ.index - 2000), occ.index + 100);
            const updatedRegion = fullRegion.replace(oldExtent, newExtent);
            updatedXml = updatedXml.substring(0, Math.max(0, occ.index - 2000)) + updatedRegion + updatedXml.substring(occ.index + 100);
        }
    }
}

// Step 15: Save the updated document.xml
fs.writeFileSync(docXmlPath, updatedXml, 'utf8');
console.log('Saved updated document.xml');

// Step 16: Re-pack the docx
const extractedDir = path.join(OUT_DIR, 'extracted');
// Create zip from the extracted directory
execSync(`powershell -Command "
$source = '${extractedDir.replace(/\//g, '\\\\')}';
$dest = '${(OUT_DIR + '/output.zip').replace(/\//g, '\\\\')}';
if (Test-Path $dest) { Remove-Item $dest }
Add-Type -AssemblyName System.IO.Compression.FileSystem;
[System.IO.Compression.ZipFile]::CreateFromDirectory($source, $dest);
"`, { stdio: 'inherit' });

// Copy as docx
fs.copyFileSync(path.join(OUT_DIR, 'output.zip'), OUT_DOCX);
console.log('\n=== SUCCESS: Output saved to', OUT_DOCX, '===');
