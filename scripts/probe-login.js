const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://localhost:3000';
const TMP = path.join(__dirname, '_ch5tmp');
const user = process.argv[2] || 'yonis';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 820 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  await p.fill('#username, input[type="text"]', user);
  await p.fill('input[type="password"]', 'admin123');
  await p.click('button[type="submit"]'); await p.waitForTimeout(3500);
  for (const [k, u] of [['users', '/dashboard/admin/users'], ['inventory', '/dashboard/pharmacy/inventory'], ['appointments', '/dashboard/appointments']]) {
    await p.goto(`${BASE}${u}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    await p.screenshot({ path: path.join(TMP, `probe-${user}-${k}.png`) });
  }
  await b.close();
  console.log('done', user);
})();
