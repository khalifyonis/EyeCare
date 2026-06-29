/**
 * Use case diagram — 4-quadrant layout (reference style), white, no title.
 * Run: node scripts/render-use-case-png.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const data = require('./use-case-diagram-data');

const LINE = '#1e293b';

function quadHtml(key, items) {
  const ucs = items
    .map((uc) => `<div class="uc" id="${uc.id}" data-actor="${uc.actor}">${uc.label}</div>`)
    .join('');
  return `<div class="quad ${key}">${ucs}</div>`;
}

function actorHtml(actor) {
  return `<div class="actor-wrap ${actor.side}" data-slot="${actor.slot}">
    <div class="actor" id="actor-${actor.id}">
      <div class="head"></div>
      <div class="body"></div>
      <div class="legs"></div>
      <div class="name">${actor.name}</div>
    </div>
  </div>`;
}

function buildHtml() {
  const quads = Object.entries(data.quadrants)
    .map(([key, items]) => quadHtml(key, items))
    .join('');

  const allUseCases = Object.values(data.quadrants).flat();
  const actorsJson = JSON.stringify(
    data.actors.map((a) => ({
      id: a.id,
      side: a.side,
      useCases: allUseCases.filter((u) => u.actor === a.id).map((u) => u.id),
    }))
  );

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    background: #ffffff;
    padding: 16px;
    color: ${LINE};
  }
  .canvas {
    position: relative;
    width: 980px;
    height: 720px;
    margin: 0 auto;
    background: #ffffff;
  }
  .system {
    position: absolute;
    left: 120px;
    right: 120px;
    top: 10px;
    bottom: 10px;
    border: 2px solid ${LINE};
    background: #ffffff;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  .quad {
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    justify-content: space-evenly;
    align-items: center;
    border: 1px solid #cbd5e1;
    min-height: 0;
  }
  .quad.tl { border-top: none; border-left: none; }
  .quad.tr { border-top: none; border-right: none; }
  .quad.bl { border-bottom: none; border-left: none; }
  .quad.br { border-bottom: none; border-right: none; }
  .uc {
    background: #ffffff;
    border: 1.5px solid ${LINE};
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 10px;
    line-height: 1.2;
    text-align: center;
    width: 168px;
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .actor-wrap {
    position: absolute;
    width: 108px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }
  .actor-wrap.left { left: 0; }
  .actor-wrap.right { right: 0; }
  .actor-wrap[data-slot="0"] { top: 108px; height: 150px; }
  .actor-wrap[data-slot="1"] { top: 288px; height: 150px; }
  .actor-wrap[data-slot="2"] { top: 468px; height: 150px; }
  .actor {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .actor .head {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid ${LINE}; background: #ffffff;
  }
  .actor .body {
    width: 2px; height: 18px; background: ${LINE};
  }
  .actor .legs {
    width: 18px; height: 2px; background: ${LINE};
    position: relative;
  }
  .actor .legs::before, .actor .legs::after {
    content: '';
    position: absolute;
    bottom: -10px;
    width: 2px; height: 10px; background: ${LINE};
  }
  .actor .legs::before { left: 2px; transform: rotate(20deg); transform-origin: top; }
  .actor .legs::after { right: 2px; transform: rotate(-20deg); transform-origin: top; }
  .actor .name {
    font-size: 11px; font-weight: 700; text-align: center;
    line-height: 1.15; max-width: 100px; margin-top: 4px;
  }
  svg.links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 3;
  }
  .inc-label { font-size: 8px; fill: #475569; font-family: Arial, sans-serif; }
</style></head>
<body>
  <div class="canvas" id="canvas">
    ${data.actors.map((a) => actorHtml(a)).join('')}
    <div class="system" id="system">${quads}</div>
    <svg class="links" id="links"></svg>
  </div>
  <script>
    const actors = ${actorsJson};
    const includes = ${JSON.stringify(data.includes)};
    const canvas = document.getElementById('canvas');
    const svg = document.getElementById('links');
    const cRect = canvas.getBoundingClientRect();

    function box(id) {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      return {
        left: r.left - cRect.left,
        right: r.right - cRect.left,
        top: r.top - cRect.top,
        bottom: r.bottom - cRect.top,
        cx: r.left - cRect.left + r.width / 2,
        cy: r.top - cRect.top + r.height / 2,
      };
    }

    function seg(x1, y1, x2, y2, dashed) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      p.setAttribute('x1', x1); p.setAttribute('y1', y1);
      p.setAttribute('x2', x2); p.setAttribute('y2', y2);
      p.setAttribute('stroke', '${LINE}');
      p.setAttribute('stroke-width', '1.2');
      if (dashed) p.setAttribute('stroke-dasharray', '5 4');
      svg.appendChild(p);
    }

    function actorLine(actorId, ucId, side) {
      const actor = box('actor-' + actorId);
      const uc = box(ucId);
      const fromX = side === 'left' ? actor.right : actor.left;
      const toX = side === 'left' ? uc.left - 2 : uc.right + 2;
      const midX = side === 'left' ? fromX + 14 : fromX - 14;
      seg(fromX, actor.cy, midX, actor.cy);
      seg(midX, actor.cy, midX, uc.cy);
      seg(midX, uc.cy, toX, uc.cy);
    }

    function includeArrow(fromId, toId) {
      const a = box(fromId);
      const b = box(toId);
      const goLeft = a.cx > b.cx;
      const stub = 12;
      const midX = goLeft ? Math.min(a.left, b.left) - stub : Math.max(a.right, b.right) + stub;
      seg(a.cx, a.bottom, a.cx, a.bottom + 10, true);
      seg(a.cx, a.bottom + 10, midX, a.bottom + 10, true);
      seg(midX, a.bottom + 10, midX, b.cy, true);
      seg(midX, b.cy, b.left - 2, b.cy, true);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', midX - 6);
      t.setAttribute('y', (a.bottom + b.cy) / 2);
      t.setAttribute('text-anchor', 'end');
      t.setAttribute('class', 'inc-label');
      t.textContent = '<<include>>';
      svg.appendChild(t);
    }

    actors.forEach((a) => {
      a.useCases.forEach((ucId) => actorLine(a.id, ucId, a.side));
    });
    includes.forEach(([from, to]) => includeArrow(from, to));
  </script>
</body></html>`;
}

async function main() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const pngPath = path.join(docsDir, 'use-case-diagram.png');
  const htmlPath = path.join(docsDir, 'use-case-diagram.html');
  fs.writeFileSync(htmlPath, buildHtml());

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1020, height: 800 });
  await page.setContent(fs.readFileSync(htmlPath, 'utf8'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.locator('.canvas').screenshot({ path: pngPath, type: 'png' });
  await browser.close();

  console.log(`Wrote ${pngPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
