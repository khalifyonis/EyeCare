/**
 * Export docs/erd-diagram.mmd to PNG for MS Word (via Kroki + Playwright crop).
 * Run: node scripts/render-erd-mermaid-png.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const docsDir = path.join(__dirname, '..', 'docs');
const mmdPath = path.join(docsDir, 'erd-diagram.mmd');
const pngPath = path.join(docsDir, 'erd-diagram-word.png');
const svgPath = path.join(docsDir, 'erd-diagram-word.svg');

async function exportSvg(mmd) {
  const res = await fetch('https://kroki.io/mermaid/svg', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: mmd,
  });
  if (!res.ok) {
    throw new Error(`Kroki mermaid/svg failed: ${res.status} ${await res.text()}`);
  }
  return res.text();
}

function parseSvgSize(svg) {
  const viewBox = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (viewBox) {
    return { width: Math.ceil(Number(viewBox[1])), height: Math.ceil(Number(viewBox[2])) };
  }
  const width = svg.match(/width="(\d+(?:\.\d+)?)(?:px)?"/);
  const height = svg.match(/height="(\d+(?:\.\d+)?)(?:px)?"/);
  return {
    width: width ? Math.ceil(Number(width[1])) : 1200,
    height: height ? Math.ceil(Number(height[1])) : 1600,
  };
}

async function main() {
  const mmd = fs.readFileSync(mmdPath, 'utf8');
  console.log('Exporting Mermaid SVG from Kroki...');
  const svg = await exportSvg(mmd);
  fs.writeFileSync(svgPath, svg);

  const { width, height } = parseSvgSize(svg);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #fff; }
  svg { display: block; }
</style></head>
<body>${svg}</body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: width + 40, height: height + 40 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.locator('svg').screenshot({ path: pngPath, type: 'png' });
  await browser.close();

  const size = fs.statSync(pngPath).size;
  console.log(`Wrote ${pngPath} (${width}x${height}, ${size} bytes)`);
  console.log(`SVG backup: ${svgPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
