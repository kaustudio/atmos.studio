// Smoke-drive the app: loader → landing → get started → tool → example → list → drawers.
import { chromium } from 'playwright';

const shots = '/tmp/claude-0/-home-claude/c22e4605-ff80-5550-a5dd-b835c8e841b5/scratchpad/shots';
import { mkdirSync } from 'fs';
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.screenshot({ path: shots + '/01-loader.png' });

// loader should complete and the landing appear
await page.waitForSelector('[data-landing]', { timeout: 15000 });
await page.waitForTimeout(4000); // let loader exit + orbit run
await page.screenshot({ path: shots + '/02-landing.png' });

// orbs painted?
const orbBg = await page.$eval('[data-orbit-card="0"]', (el) => el.style.backgroundImage.slice(0, 30));
console.log('orb bg:', orbBg || '(none)');
const glCanvases = await page.$$eval('[data-orb-gl]', (els) => els.length);
console.log('webgl orb canvases:', glCanvases);

// Get started → wipe → tool
await page.click('button[aria-label="Get started"]');
await page.waitForTimeout(1500);
await page.screenshot({ path: shots + '/03-wipe.png' });
await page.waitForTimeout(2500);
await page.screenshot({ path: shots + '/04-tool.png' });

// first-run visible? try the example
const tryBtn = await page.$('button[aria-label^="Run an example"]');
console.log('try-example present:', !!tryBtn);
if (tryBtn) {
  await tryBtn.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: shots + '/05-processing.png' });
  await page.waitForSelector('[data-band]', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shots + '/06-result.png' });
}

// list rows present?
const rows = await page.$$eval('[data-row]', (els) => els.length);
console.log('list rows:', rows);

// open contrast drawer
const cbtn = await page.$('button[aria-label="Open contrast checker for this palette"]');
if (cbtn) { await cbtn.click(); await page.waitForTimeout(1200); await page.screenshot({ path: shots + '/07-contrast.png' }); await page.keyboard.press('Escape'); await page.waitForTimeout(900); }

// open harmonies from first band
const hbtn = await page.$('[data-band] button[aria-haspopup="dialog"][aria-label^="Colour harmonies"]');
if (hbtn) { await hbtn.click(); await page.waitForTimeout(1200); await page.screenshot({ path: shots + '/08-harmony.png' }); await page.keyboard.press('Escape'); await page.waitForTimeout(900); }

// export dialog
const ebtn = await page.$('button[aria-label="Export this palette as design tokens"]');
if (ebtn) { await ebtn.click(); await page.waitForTimeout(900); await page.screenshot({ path: shots + '/09-export.png' }); await page.keyboard.press('Escape'); await page.waitForTimeout(700); }

// universe grid
await page.click('button[data-toggle-btn]:nth-of-type(2)');
await page.waitForTimeout(2500);
await page.screenshot({ path: shots + '/10-universe.png' });
const clones = await page.$$eval('[data-grid-clones] > *', (els) => els.length).catch(() => 0);
console.log('universe clones:', clones);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// 3D reel
const reelBtn = await page.$$('button[data-toggle-btn]');
await reelBtn[2].click();
await page.waitForTimeout(2500);
await page.screenshot({ path: shots + '/11-reel.png' });
const panels = await page.$$eval('[data-reel-list] > *', (els) => els.length);
console.log('reel panels:', panels);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// dark theme
await page.click('button[aria-label="Toggle dark theme"]');
await page.waitForTimeout(800);
await page.screenshot({ path: shots + '/12-dark.png' });

console.log('ERRORS:', errors.length ? errors.slice(0, 20) : 'none');
await browser.close();
