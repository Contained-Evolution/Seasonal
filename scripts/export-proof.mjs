import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto(process.env.SEASONAL_URL || 'http://127.0.0.1:5173/');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download print PDF' }).click();
  await (await download).saveAs(path.join(root, 'public', 'downloads', 'ghost-moon-medium-letter.pdf'));
} finally {
  await browser.close();
}
