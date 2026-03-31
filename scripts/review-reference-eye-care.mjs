import { chromium } from 'playwright';

const BASE = 'https://eye-care-pi.vercel.app';
const LOGIN = `${BASE}/login`;

const creds = {
  email: 'admin@icare.com',
  password: 'password123',
};

const candidateRoutes = [
  '/eye-exam/new',
  '/dashboard/eye-examinations/new',
  '/eye-examinations/new',
  '/examinations/new',
  '/dashboard',
];

function uniq(arr) {
  return [...new Set(arr.filter(Boolean).map((x) => x.trim()).filter(Boolean))];
}

async function extractPageData(page) {
  return page.evaluate(() => {
    const isVisible = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const textOf = (selector) =>
      Array.from(document.querySelectorAll(selector))
        .filter(isVisible)
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);

    const labels = textOf('label');
    const headings = textOf('h1, h2, h3, h4');
    const buttons = textOf('button');
    const links = textOf('a');

    const placeholders = Array.from(document.querySelectorAll('input, textarea'))
      .filter((el) => isVisible(el))
      .map((el) => el.getAttribute('placeholder') || '')
      .filter(Boolean);

    const navCandidates = Array.from(document.querySelectorAll('aside, nav')).filter(isVisible);
    const sidebarText = navCandidates
      .flatMap((container) => Array.from(container.querySelectorAll('a, button, span, p, div')))
      .filter(isVisible)
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 80);

    return {
      url: window.location.href,
      headings,
      labels,
      buttons,
      links,
      placeholders,
      sidebarText,
    };
  });
}

async function extractTabData(page) {
  const tabNames = ['Basic Info', 'Visual Acuity', 'Refraction', 'IOP', 'Anterior Segment', 'Fundus', 'Assessment'];
  const results = [];

  for (const tab of tabNames) {
    const tabInfo = { tab, clicked: false, labels: [], placeholders: [], snippets: [] };
    try {
      const tabButton = page.locator(`button:has-text("${tab}")`).first();
      if (await tabButton.count()) {
        await tabButton.click();
        tabInfo.clicked = true;
        await page.waitForTimeout(500);

        const data = await page.evaluate(() => {
          const isVisible = (el) => {
            if (!(el instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          const labels = Array.from(document.querySelectorAll('label'))
            .filter((el) => isVisible(el))
            .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean);

          const placeholders = Array.from(document.querySelectorAll('input, textarea'))
            .filter((el) => isVisible(el))
            .map((el) => el.getAttribute('placeholder') || '')
            .filter(Boolean);

          const snippets = Array.from(document.querySelectorAll('p, h3, h4, h5, span, div'))
            .filter((el) => isVisible(el))
            .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
            .filter((t) => t && t.length > 12 && t.length < 120)
            .slice(0, 40);

          return { labels, placeholders, snippets };
        });

        tabInfo.labels = uniq(data.labels);
        tabInfo.placeholders = uniq(data.placeholders);
        tabInfo.snippets = uniq(data.snippets).slice(0, 20);
      }
    } catch {
      // Continue gathering other tabs.
    }
    results.push(tabInfo);
  }

  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const output = {
    login: {},
    postLoginUrl: '',
    pages: [],
  };

  try {
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
    output.login.before = await extractPageData(page);

    const adminCard = page.locator('text=admin@icare.com').first();
    if (await adminCard.count()) {
      await adminCard.click().catch(() => {});
    }

    await page.fill('input[type="email"], input[name="email"], input[placeholder*="Email" i]', creds.email);
    await page.fill('input[type="password"], input[name="password"], input[placeholder*="Password" i]', creds.password);

    const signInButton = page
      .locator('button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log in"), button[type="submit"]')
      .first();

    await Promise.race([
      page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 }).catch(() => null),
      (async () => {
        await signInButton.click();
        await page.waitForTimeout(3000);
        return null;
      })(),
    ]);

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    output.postLoginUrl = page.url();

    for (const route of candidateRoutes) {
      const target = `${BASE}${route}`;
      const item = { route, target, ok: false, data: null, error: null };
      try {
        const resp = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1200);
        item.ok = Boolean(resp);
        item.status = resp ? resp.status() : null;
        item.finalUrl = page.url();
        item.data = await extractPageData(page);
        if (route === '/eye-exam/new' && item.finalUrl.includes('/eye-exam/new')) {
          item.tabData = await extractTabData(page);
        }

        const safeName = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
        await page.screenshot({ path: `scripts/reference-shot-${safeName || 'root'}.png`, fullPage: true });
      } catch (err) {
        item.error = String(err && err.message ? err.message : err);
      }
      output.pages.push(item);
    }

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error('Automation failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
