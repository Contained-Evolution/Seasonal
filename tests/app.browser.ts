import { expect, test } from '@playwright/test';

test('shows the Halloween masthead, browses stencils, downloads a PDF, and opens the phone light test', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Happy Halloween' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Halloween is here/ })).toBeVisible();
  await expect(page.getByText('In development', { exact: false })).toHaveCount(0);
  await expect(page.getByTestId('stencil-card')).toHaveCount(1);
  await expect(page.getByText('This is the picture you will carve.')).toBeVisible();
  await page.getByTestId('stencil-card').first().click();
  await expect(page.getByText('Moonlit Ghost', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Wide', exact: true }).click();
  await expect(page.getByRole('img', { name: /wide pumpkin/i })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download print PDF' }).click();
  expect((await download).suggestedFilename()).toBe('ghost-moon-medium-letter.pdf');
  await page.getByRole('button', { name: /Light it up/ }).click();
  await expect(page.getByRole('dialog', { name: 'Pumpkin Glow' })).toBeVisible();
  await expect(page.getByText(/battery tea light/)).toBeVisible();
  await page.getByRole('button', { name: 'End glow' }).click();
  await expect(page.getByRole('dialog', { name: 'Pumpkin Glow' })).toBeHidden();
});

test('spider opens truthful help and motion settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open help and settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Help & settings' })).toBeVisible();
  await expect(page.getByText(/None required/)).toBeVisible();
  await page.getByLabel('Let the spider follow while I scroll').uncheck();
  await page.getByRole('button', { name: 'Close help and settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Help & settings' })).toBeHidden();
});

test('category filter and local upload controls work without network submission', async ({ page }) => {
  const requests: string[] = []; page.on('request', request => { if (request.method() !== 'GET') requests.push(request.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ghosts & Haunted' }).click();
  await expect(page.getByTestId('stencil-card')).toHaveCount(1);
  await expect(page.getByText('Turn your image into a stencil')).toBeVisible();
  expect(requests).toEqual([]);
});
