import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = readFileSync(new URL('../functions/api/contact.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const valid = {
  name: 'Client',
  email: 'client@example.com',
  subject: 'Test',
  message: '<b>Hello</b>',
  website: '',
  turnstileToken: 'valid-token',
};

function setup({
  result = { success: true, hostname: 'xantina.art', action: 'contact' },
  outage = false,
  env = {},
  providerFailure = false,
} = {}) {
  const calls = [];
  const logs = [];
  const exports = {};
  const settings = {
    RESEND_API_KEY: 'resend-secret',
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    TURNSTILE_ALLOWED_HOSTNAMES: 'xantina.art,www.xantina.art',
    CONTACT_FROM_EMAIL: 'contact@xantina.art',
    ...env,
  };
  const used = new Set();

  vm.runInNewContext(code, {
    exports,
    Request,
    Response,
    URL,
    FormData,
    AbortSignal,
    atob,
    JSON,
    console: {
      log: (...args) => logs.push(args),
      warn: (...args) => logs.push(args),
      error: (...args) => logs.push(args),
    },
    fetch: async (url, options) => {
      const requestBody = options.body instanceof FormData
        ? Object.fromEntries(options.body.entries())
        : JSON.parse(options.body);
      calls.push({ url, body: requestBody, headers: options.headers });
      if (url.includes('siteverify')) {
        if (outage) throw new Error('Unavailable');
        const token = requestBody.response;
        if (used.has(token)) return Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] });
        used.add(token);
        return Response.json(result);
      }
      return providerFailure
        ? Response.json({ message: 'private provider detail' }, { status: 500 })
        : Response.json({ id: 'test' });
    },
  });

  return {
    calls,
    logs,
    send: (body = valid, method = 'POST', requestOptions = {}) => {
      const headers = method === 'POST' ? { 'Content-Type': 'application/json', ...(requestOptions.headers ?? {}) } : requestOptions.headers;
      const request = new Request(requestOptions.url ?? 'https://xantina.art/api/contact', {
        method,
        headers,
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      });
      return exports.onRequest({ request, env: settings });
    },
  };
}

for (const token of [undefined, '', 123, 'x'.repeat(2049)]) {
  const test = setup();
  assert.equal((await test.send({ ...valid, turnstileToken: token })).status, 400);
  assert.equal(test.calls.length, 0);
}

for (const result of [
  { success: false },
  { success: true, hostname: 'evil.test', action: 'contact' },
  { success: true, hostname: 'xantina.art', action: 'other' },
]) {
  const test = setup({ result });
  assert.equal((await test.send()).status, 403);
  assert.equal(test.calls.length, 1);
}

for (const options of [
  { outage: true },
  { result: null },
  { env: { TURNSTILE_SECRET_KEY: '' } },
  { env: { TURNSTILE_ALLOWED_HOSTNAMES: '' } },
  { env: { RESEND_API_KEY: '' } },
  { env: { CONTACT_FROM_EMAIL: '' } },
  { env: { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' } },
]) {
  const test = setup(options);
  assert.equal((await test.send()).status, 503);
  assert(!test.calls.some(call => call.url.includes('resend')));
}

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1cAAAAASUVORK5CYII=';
const good = setup();
const response = await good.send({
  ...valid,
  referenceLinks: ['https://www.dropbox.com/s/test?a=1&b=2'],
  attachments: [{ filename: 'reference.png', content: png }],
});
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { success: true });
assert.equal(good.calls[1].body.to[0], 'xantina@xantina.art');
assert.equal(good.calls[1].body.reply_to, 'client@example.com');
assert.equal(good.calls[1].body.attachments[0].filename, '1-reference.png');
assert(good.calls[1].body.html.includes('&lt;b&gt;Hello&lt;/b&gt;'));
assert(good.calls[1].body.html.includes('a=1&amp;b=2'));
assert.equal((await good.send()).status, 403, 'Turnstile tokens cannot be reused');
assert.equal(good.calls.filter(call => call.url.includes('resend')).length, 1);

assert.equal((await setup().send(undefined, 'GET')).status, 405);
assert.equal((await setup().send(undefined, 'OPTIONS')).status, 204);
assert.equal((await setup().send(valid, 'POST', { headers: { Origin: 'https://evil.test' } })).status, 403);
assert.equal((await setup().send(valid, 'POST', { headers: { Origin: 'https://xantina.art' } })).status, 200);

const missingField = setup();
assert.equal((await missingField.send({ ...valid, name: '' })).status, 400);
assert.equal(missingField.calls.length, 0);
const invalidLink = setup();
assert.equal((await invalidLink.send({ ...valid, referenceLinks: ['http://example.com'] })).status, 400);
assert.equal(invalidLink.calls.length, 0);
const invalidAttachment = setup();
assert.equal((await invalidAttachment.send({ ...valid, attachments: [{ filename: 'bad.svg', content: 'PHN2Zy8+' }] })).status, 400);
assert.equal(invalidAttachment.calls.length, 0);

const fiveMiBPng = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),
  Buffer.alloc(5 * 1024 * 1024 - 8),
]).toString('base64');
const overCombinedLimit = setup();
assert.equal((await overCombinedLimit.send({
  ...valid,
  attachments: [
    { filename: 'one.png', content: fiveMiBPng },
    { filename: 'two.png', content: fiveMiBPng },
    { filename: 'three.png', content: 'iVBORw0KGgo=' },
  ],
})).status, 400);
assert.equal(overCombinedLimit.calls.length, 0, 'oversized attachments are rejected before external calls');

const honeypot = setup();
assert.equal((await honeypot.send({ ...valid, website: 'https://spam.test' })).status, 200);
assert.equal(honeypot.calls.length, 0);

const failed = setup({ providerFailure: true });
const failedResponse = await failed.send();
assert.equal(failedResponse.status, 500);
assert(!JSON.stringify(await failedResponse.json()).includes('private provider detail'));
assert(!JSON.stringify(failed.logs).includes('valid-token'));
assert(!JSON.stringify(failed.logs).includes('<b>Hello</b>'));

console.log('Contact Pages Function checks passed. No real emails sent.');
