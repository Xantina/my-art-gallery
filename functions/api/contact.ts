interface Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_ALLOWED_HOSTNAMES?: string;
  CONTACT_FROM_EMAIL?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface ContactFields {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const CONTACT_RECIPIENT = 'cheyroach@gmail.com';
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_CHARACTERS = 15 * 1024 * 1024;
const TURNSTILE_ACTION = 'contact';
const fieldLimits: Record<keyof ContactFields, number> = {
  name: 100,
  email: 254,
  subject: 200,
  message: 10000,
};

const jsonHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

const jsonResponse = (status: number, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...extraHeaders } });

const badRequest = (error: string) => jsonResponse(400, { error });

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isEmail = (value: string): boolean => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

const configurationUnavailable = () => jsonResponse(503, {
  error: `The contact form is unavailable. Please try again or email ${CONTACT_RECIPIENT}.`,
});

const isSameOriginRequest = (request: Request): boolean => {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return false;
  return request.headers.get('Sec-Fetch-Site') !== 'cross-site';
};

const decodedBase64Length = (content: string): number =>
  (content.length / 4) * 3 - (content.endsWith('==') ? 2 : content.endsWith('=') ? 1 : 0);

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  if (!isSameOriginRequest(request)) {
    return jsonResponse(403, { error: 'Cross-origin contact requests are not allowed.' });
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS', 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' }, { Allow: 'POST, OPTIONS' });
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse(415, { error: 'Request body must be JSON.' });
  }

  try {
    const declaredLength = Number(request.headers.get('Content-Length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_CHARACTERS) {
      return jsonResponse(413, { error: 'The contact submission is too large.' });
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_CHARACTERS) {
      return jsonResponse(413, { error: 'The contact submission is too large.' });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return badRequest('Request body must be valid JSON.');
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return badRequest('Request body must be an object.');
    }

    const input = body as Record<string, unknown>;
    if (typeof input.website !== 'string') return badRequest('Invalid contact submission.');
    // Bots commonly fill this visually hidden field. Return success without sending mail.
    if (input.website.trim()) return jsonResponse(200, { success: true });

    const token = input.turnstileToken;
    if (typeof token !== 'string' || !token.trim() || token.length > 2048) {
      return badRequest('Please complete verification and try again.');
    }

    const fields = {} as ContactFields;
    for (const field of Object.keys(fieldLimits) as (keyof ContactFields)[]) {
      const value = input[field];
      if (typeof value !== 'string' || !value.trim()) {
        return badRequest(`${field} must be a non-empty string.`);
      }
      fields[field] = value.trim();
      if (fields[field].length > fieldLimits[field]) {
        return badRequest(`${field} must be ${fieldLimits[field]} characters or fewer.`);
      }
    }

    const { name, email, subject, message } = fields;
    if (!isEmail(email)) return badRequest('Please provide a valid email address.');
    if ([name, email, subject].some(value => /[\r\n]/.test(value) || value.includes('\u0000')) || message.includes('\u0000')) {
      return badRequest('Fields contain invalid control characters.');
    }

    const rawLinks = input.referenceLinks ?? [];
    if (!Array.isArray(rawLinks) || rawLinks.length > 10) {
      return badRequest('Add up to 10 reference links.');
    }
    const referenceLinks: string[] = [];
    for (const link of rawLinks) {
      if (typeof link !== 'string' || link.length > 2048) {
        return badRequest('Reference links must be HTTPS URLs of 2048 characters or fewer.');
      }
      try {
        const url = new URL(link.trim());
        if (url.protocol !== 'https:' || url.username || url.password) {
          return badRequest('Reference links must use HTTPS without login credentials.');
        }
        referenceLinks.push(url.href);
      } catch {
        return badRequest('Please provide valid HTTPS reference links.');
      }
    }

    const rawAttachments = input.attachments ?? [];
    if (!Array.isArray(rawAttachments) || rawAttachments.length > 5) {
      return badRequest('Attach up to 5 reference images.');
    }
    const attachments: { filename: string; content: string }[] = [];
    let totalBytes = 0;
    for (const attachment of rawAttachments) {
      if (typeof attachment !== 'object' || attachment === null) {
        return badRequest('Invalid image attachment.');
      }
      const candidate = attachment as Record<string, unknown>;
      if (typeof candidate.filename !== 'string' || !candidate.filename.trim() || candidate.filename.length > 255 ||
          typeof candidate.content !== 'string' || !candidate.content || candidate.content.length % 4 !== 0 ||
          candidate.content.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(candidate.content)) {
        return badRequest('Each reference must be an image of 5 MB or less.');
      }

      const decodedLength = decodedBase64Length(candidate.content);
      totalBytes += decodedLength;
      if (decodedLength <= 0 || decodedLength > MAX_ATTACHMENT_BYTES || totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
        return badRequest('Images must be 5 MB or less each and 10 MB or less combined.');
      }

      let bytes: string;
      try {
        bytes = atob(candidate.content);
      } catch {
        return badRequest('Invalid image attachment encoding.');
      }
      if (bytes.length !== decodedLength) return badRequest('Invalid image attachment encoding.');

      // Browser-provided MIME types are intentionally ignored; derive the type from magic bytes.
      const extension = bytes.startsWith('\x89PNG\r\n\x1a\n') ? 'png'
        : bytes.startsWith('\xff\xd8\xff') ? 'jpg'
        : /^(GIF87a|GIF89a)/.test(bytes) ? 'gif'
        : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP' ? 'webp'
        : null;
      if (!extension) return badRequest('Only JPG, PNG, GIF, and WebP reference images are accepted.');

      const stem = candidate.filename.replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100) || 'reference';
      attachments.push({ filename: `${attachments.length + 1}-${stem}.${extension}`, content: candidate.content });
    }

    const secret = env.TURNSTILE_SECRET_KEY?.trim();
    const resendKey = env.RESEND_API_KEY?.trim();
    const fromEmail = env.CONTACT_FROM_EMAIL?.trim();
    const allowedHosts = (env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
      .split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
    const requestHostname = new URL(request.url).hostname.toLowerCase();
    const isLocalRequest = requestHostname === 'localhost' || requestHostname === '127.0.0.1';
    const isTestSecret = secret ? /^[123]x0000000000000000000000000000000AA$/.test(secret) : false;
    if (!secret || !resendKey || !fromEmail || !isEmail(fromEmail) || /[\r\n]/.test(fromEmail) ||
        !allowedHosts.length || (isTestSecret && !isLocalRequest)) {
      console.warn('Contact endpoint configuration unavailable');
      return configurationUnavailable();
    }

    try {
      const verifyBody = new FormData();
      verifyBody.set('secret', secret);
      verifyBody.set('response', token);
      // Do not pass an IP from request headers. Cloudflare edge/WAF owns IP-based controls.
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: verifyBody,
        signal: AbortSignal.timeout(10000),
      });
      if (!verification.ok) return configurationUnavailable();

      const result: unknown = await verification.json();
      if (!result || typeof result !== 'object' || typeof (result as Record<string, unknown>).success !== 'boolean') {
        return configurationUnavailable();
      }
      const turnstile = result as Record<string, unknown>;
      const expectedAction = isTestSecret && isLocalRequest ? 'test' : TURNSTILE_ACTION;
      if (!turnstile.success || typeof turnstile.hostname !== 'string' ||
          !allowedHosts.includes(turnstile.hostname.toLowerCase()) || turnstile.action !== expectedAction) {
        console.warn('Contact verification rejected');
        return jsonResponse(403, { error: 'Verification failed or expired. Please verify again.' });
      }
    } catch {
      console.warn('Contact verification service unavailable');
      return configurationUnavailable();
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Xantina Contact <${fromEmail}>`,
        to: [CONTACT_RECIPIENT],
        reply_to: email,
        subject: `New Contact: ${subject}`,
        attachments,
        html: `
          <h1>New Contact Form Submission</h1>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\r\n|\r|\n/g, '<br>')}</p>
          ${referenceLinks.length ? `<h2>Reference links</h2><ul>${referenceLinks.map(link => `<li><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></li>`).join('')}</ul>` : ''}
          ${attachments.length ? `<p>${attachments.length} reference image(s) attached.</p>` : ''}
        `,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!emailResponse.ok) {
      console.error('Email provider rejected contact submission', emailResponse.status);
      return jsonResponse(500, { error: `Failed to send message. Please try again or email ${CONTACT_RECIPIENT}.` });
    }

    console.log('Contact email accepted by provider');
    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    console.error('Contact submission failed', error instanceof Error ? error.name : 'UnknownError');
    return jsonResponse(500, { error: `Failed to send message. Please try again or email ${CONTACT_RECIPIENT}.` });
  }
};
