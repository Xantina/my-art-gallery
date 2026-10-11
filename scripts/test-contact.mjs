import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = readFileSync(new URL('../supabase/functions/send-contact-email/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/, '');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const valid = { name: 'Client', email: 'client@example.com', subject: 'Test', message: '<b>Hello</b>', turnstileToken: 'valid-token' };

function setup({ result = { success: true, hostname: 'xantina.art', action: 'contact' }, outage = false, env = {}, providerFailure = false } = {}) {
  let handler;
  const calls = [];
  const logs = [];
  const settings = { RESEND_API_KEY: 'resend-secret', TURNSTILE_SECRET_KEY: 'turnstile-secret', TURNSTILE_ALLOWED_HOSTNAMES: 'xantina.art,www.xantina.art', SUPABASE_URL: 'https://project.supabase.co', ...env };
  const used = new Set();
  vm.runInNewContext(code, {
    Deno: { env: { get: key => settings[key] } }, serve: fn => { handler = fn; },
    Request, Response, URL, AbortSignal, atob,
    console: { log: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      if (url.includes('siteverify')) {
        if (outage) throw new Error('Unavailable');
        const token = JSON.parse(options.body).response;
        if (used.has(token)) return Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] });
        used.add(token);
        return Response.json(result);
      }
      return providerFailure ? Response.json({ message: 'private provider detail' }, { status: 500 }) : Response.json({ id: 'test' });
    },
  });
  return { calls, logs, send: (body = valid, method = 'POST') => handler(new Request('https://example.test', { method, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) })) };
}

for (const token of [undefined, '', 123, 'x'.repeat(2049)]) {
  const test = setup();
  assert.equal((await test.send({ ...valid, turnstileToken: token })).status, 400);
  assert.equal(test.calls.length, 0);
}
for (const result of [{ success: false }, { success: true, hostname: 'evil.test', action: 'contact' }, { success: true, hostname: 'xantina.art', action: 'other' }]) {
  const test = setup({ result });
  assert.equal((await test.send()).status, 403);
  assert.equal(test.calls.length, 1);
}
for (const options of [{ outage: true }, { result: null }, { env: { TURNSTILE_SECRET_KEY: '' } }, { env: { TURNSTILE_ALLOWED_HOSTNAMES: '' } }, { env: { RESEND_API_KEY: '' } }, { env: { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' } }]) {
  const test = setup(options);
  assert.equal((await test.send()).status, 503);
  assert(!test.calls.some(call => call.url.includes('resend')));
}
const good = setup();
assert.equal((await good.send({ ...valid, referenceLinks: ['https://www.dropbox.com/s/test?a=1&b=2'], attachments: [{ filename: 'reference.png', content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1cAAAAASUVORK5CYII=' }] })).status, 200);
assert.equal(good.calls[1].body.attachments.length, 1);
assert(good.calls[1].body.html.includes('&lt;b&gt;Hello&lt;/b&gt;'));
assert(good.calls[1].body.html.includes('a=1&amp;b=2'));
assert.equal((await good.send()).status, 403);
assert.equal(good.calls.filter(call => call.url.includes('resend')).length, 1);
assert.equal((await good.send(undefined, 'GET')).status, 405);
assert.equal((await good.send(undefined, 'OPTIONS')).status, 200);
assert(!JSON.stringify(good.logs).includes('valid-token'));
assert(!JSON.stringify(good.logs).includes('Hello'));
const failed = setup({ providerFailure: true });
assert.equal((await failed.send()).status, 500);
assert.equal((await failed.send({ ...valid, turnstileToken: 'new-token' })).status, 500);
const invalidAttachment = setup();
assert.equal((await invalidAttachment.send({ ...valid, attachments: [{ filename: 'bad.svg', content: 'PHN2Zy8+' }] })).status, 400);
assert.equal(invalidAttachment.calls.length, 1);
console.log('Contact server verification checks passed. No real emails sent.');
