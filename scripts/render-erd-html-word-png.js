/**
 * Bordered HTML-table ERD for MS Word.
 * Run: node scripts/render-erd-html-word-png.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { layout, tables, links } = require('./erd-word-tables');

function tableHtml(id, { name, fields }) {
  const rows = fields
    .map(
      ([type, column, key]) =>
        `<tr><td>${type}</td><td>${column}</td><td>${key || '&nbsp;'}</td></tr>`
    )
    .join('');
  return `<div class="entity" id="${id}" data-name="${name}">
    <table>
      <thead>
        <tr class="title"><th colspan="3">${name}</th></tr>
        <tr class="cols"><th>type</th><th>column</th><th>key</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function buildHtml() {
  const maxCol = Math.max(...Object.values(layout).map((p) => p.col));
  const maxRow = Math.max(...Object.values(layout).map((p) => p.row));
  const cells = [];
  for (let row = 1; row <= maxRow; row += 1) {
    for (let col = 1; col <= maxCol; col += 1) {
      const id = Object.keys(layout).find((k) => layout[k].row === row && layout[k].col === col);
      cells.push(`<div class="cell r${row} c${col}">${id ? tableHtml(id, tables[id]) : ''}</div>`);
    }
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; font-family: Arial, sans-serif; color: #1e293b; padding: 24px; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 18px; font-weight: 700; }
  .canvas { position: relative; display: grid; grid-template-columns: repeat(${maxCol}, max-content); grid-template-rows: repeat(${maxRow}, auto); gap: 14px 18px; justify-content: center; align-items: start; }
  .cell { display: flex; justify-content: center; align-items: start; min-width: 0; }
  .entity table { border-collapse: collapse; font-size: 10px; background: #fff; }
  .entity th, .entity td { border: 1px solid #94a3b8; padding: 3px 6px; text-align: left; vertical-align: middle; }
  .entity th { font-weight: 600; }
  .entity .title th { background: #ddd6fe; color: #1e293b; text-align: center; font-size: 11px; border-color: #c4b5fd; }
  .entity .cols th { background: #ede9fe; font-size: 9px; border-color: #c4b5fd; }
  .entity td:first-child { width: 72px; }
  .entity td:nth-child(2) { min-width: 120px; }
  .entity td:nth-child(3) { width: 36px; text-align: center; }
  svg.links { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .link-label { font-size: 8px; fill: #475569; font-family: Arial, sans-serif; }
</style></head>
<body>
  <h1>EyeCare Management System — Entity Relationship Diagram</h1>
  <div class="canvas" id="canvas">
    ${cells.join('\n')}
    <svg class="links" id="links"></svg>
  </div>
  <script>
    const links = ${JSON.stringify(links)};
    const canvas = document.getElementById('canvas');
    const svg = document.getElementById('links');
    const cRect = canvas.getBoundingClientRect();

    function anchor(id, side) {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      const x = r.left - cRect.left;
      const y = r.top - cRect.top;
      const w = r.width;
      const h = r.height;
      if (side === 'top') return { x: x + w / 2, y };
      if (side === 'bottom') return { x: x + w / 2, y: y + h };
      if (side === 'left') return { x, y: y + h / 2 };
      return { x: x + w, y: y + h / 2 };
    }

    function pickSides(from, to) {
      const fr = document.getElementById(from).getBoundingClientRect();
      const tr = document.getElementById(to).getBoundingClientRect();
      const dy = (tr.top + tr.height / 2) - (fr.top + fr.height / 2);
      const dx = (tr.left + tr.width / 2) - (fr.left + fr.width / 2);
      if (Math.abs(dy) > Math.abs(dx)) {
        return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
      }
      return dx > 0 ? ['right', 'left'] : ['left', 'right'];
    }

    function path(from, to) {
      const [fs, ts] = pickSides(from, to);
      const a = anchor(from, fs);
      const b = anchor(to, ts);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (fs === 'bottom' || fs === 'top') {
        return 'M' + a.x + ',' + a.y + ' L' + a.x + ',' + my + ' L' + b.x + ',' + my + ' L' + b.x + ',' + b.y;
      }
      return 'M' + a.x + ',' + a.y + ' L' + mx + ',' + a.y + ' L' + mx + ',' + b.y + ' L' + b.x + ',' + b.y;
    }

    function crow(x, y, dir) {
      const s = 6;
      if (dir === 'left') return 'M' + x + ',' + y + ' l' + s + ',-4 M' + x + ',' + y + ' l' + s + ',4 M' + x + ',' + y + ' l' + s + ',0';
      if (dir === 'right') return 'M' + x + ',' + y + ' l-' + s + ',-4 M' + x + ',' + y + ' l-' + s + ',4 M' + x + ',' + y + ' l-' + s + ',0';
      if (dir === 'top') return 'M' + x + ',' + y + ' l-4,' + s + ' M' + x + ',' + y + ' l4,' + s + ' M' + x + ',' + y + ' l0,' + s;
      return 'M' + x + ',' + y + ' l-4,-' + s + ' M' + x + ',' + y + ' l4,-' + s + ' M' + x + ',' + y + ' l0,-' + s;
    }

    links.forEach(([from, to, label]) => {
      const d = path(from, to);
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', '#64748b');
      p.setAttribute('stroke-width', '1');
      svg.appendChild(p);

      const [fs, ts] = pickSides(from, to);
      const b = anchor(to, ts);
      const foot = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      foot.setAttribute('d', crow(b.x, b.y, ts));
      foot.setAttribute('fill', 'none');
      foot.setAttribute('stroke', '#64748b');
      foot.setAttribute('stroke-width', '1');
      svg.appendChild(foot);

      const a = anchor(from, fs);
      const lx = (a.x + b.x) / 2;
      const ly = (a.y + b.y) / 2;
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', lx);
      t.setAttribute('y', ly - 3);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'link-label');
      t.textContent = label;
      svg.appendChild(t);
    });

    const bb = svg.getBBox();
    svg.setAttribute('viewBox', (bb.x - 8) + ' ' + (bb.y - 8) + ' ' + (bb.width + 16) + ' ' + (bb.height + 16));
  </script>
</body></html>`;
}

async function main() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const pngPath = path.join(docsDir, 'erd-diagram-word.png');
  const htmlPath = path.join(docsDir, 'erd-diagram-word.html');
  const html = buildHtml();
  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 2200 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const canvas = page.locator('#canvas');
  await canvas.screenshot({ path: pngPath, type: 'png' });
  await browser.close();

  const size = fs.statSync(pngPath).size;
  console.log(`Wrote ${pngPath} (${size} bytes)`);
  console.log(`Preview HTML: ${htmlPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
