import { expect, test } from '@playwright/test';

const widgetScript = `
window.widgetRenders = 0;
window.widgetRemovals = 0;
window.turnstile = {
  render(element, options) {
    window.widgetRenders++;
    window.widgetOptions = options;
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Mock verify';
    button.onclick = () => options.callback('test-token-' + window.widgetRenders);
    element.appendChild(button);
    return 'widget-' + window.widgetRenders;
  },
  remove() { window.widgetRemovals++; document.querySelectorAll('button').forEach(b => { if (b.textContent === 'Mock verify') b.remove(); }); }
};`;

test('verification, failure preservation, retry, expiry, cleanup and mobile fit', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let scripts = 0;
  await page.route('https://challenges.cloudflare.com/**', route => {
    scripts++;
    return route.fulfill({ contentType: 'application/javascript', body: widgetScript });
  });
  let attempts = 0;
  await page.route('**/api/contact', async route => {
    attempts++;
    const body = route.request().postDataJSON();
    expect(body.turnstileToken).toContain('test-token-');
    expect(body.attachments).toHaveLength(1);
    expect(body.website).toBe('');
    await route.fulfill({ status: attempts === 1 ? 403 : 200, contentType: 'application/json', body: JSON.stringify(attempts === 1 ? { error: 'Verification failed or expired. Please verify again.' } : { success: true }) });
  });
  await page.goto('/contact');
  await expect(page.getByRole('link', { name: 'xantina@xantina.art' })).toHaveAttribute('href', 'mailto:xantina@xantina.art');
  const submit = page.getByRole('button', { name: 'Send Message' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('Name', { exact: true }).fill('Client');
  await page.getByLabel('Email', { exact: true }).fill('client@example.com');
  await page.getByLabel('Subject', { exact: true }).fill('Commission');
  await page.getByLabel('Message', { exact: true }).fill('Please draw this character.');
  await page.getByLabel('Reference links (optional)').fill('https://docs.google.com/document/d/test');
  await page.getByLabel('Reference images (optional)').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1cAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Mock verify' }).click();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText('Verification failed or expired. Please verify again.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Please draw this character.');
  await expect(page.getByLabel('Reference links (optional)')).toHaveValue('https://docs.google.com/document/d/test');
  await expect(page.getByLabel('Remove reference.png')).toBeVisible();
  await expect(submit).toBeDisabled();
  await page.getByRole('button', { name: 'Mock verify' }).click();
  await page.evaluate(() => (window as unknown as { widgetOptions: { 'expired-callback': () => void } }).widgetOptions['expired-callback']());
  await expect(submit).toBeDisabled();
  await page.getByRole('button', { name: 'Mock verify' }).click();
  await submit.click();
  await expect(page.getByText('Message sent!', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page.getByRole('link', { name: 'Gallery', exact: true }).last().click();
  await expect(page).toHaveURL(/gallery/);
  await expect(page.getByRole('button', { name: 'Mock verify' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Featured Works' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { widgetRemovals: number }).widgetRemovals)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page.getByRole('link', { name: 'Contact', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Mock verify' })).toBeVisible();
  expect(scripts).toBe(1);
});

test('script failure gives fallback and can retry', async ({ page }) => {
  let attempts = 0;
  await page.route('https://challenges.cloudflare.com/**', route => {
    attempts++;
    return attempts === 1 ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: widgetScript });
  });
  await page.goto('/contact');
  await expect(page.getByRole('status')).toContainText('xantina@xantina.art');
  await expect(page.getByRole('button', { name: 'Send Message' })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await page.getByRole('button', { name: 'Mock verify' }).click();
  await expect(page.getByRole('button', { name: 'Send Message' })).toBeEnabled();
});
