# Contact form deployment and spam protection

The contact form posts JSON to the same-origin Cloudflare Pages Function at `POST /api/contact`. The Function validates the request, verifies Turnstile, and calls Resend over HTTPS. The recipient is fixed in `functions/api/contact.ts`; the visitor's validated email address is used only as `Reply-To`.

## Why this uses Resend instead of Cloudflare Email Sending

As of October 19, 2026, Cloudflare Email Sending is free when sending to verified destinations and its `send_email` binding works in Workers. However, Pages Functions support only the subset of bindings listed in the Pages documentation, which does not include Email Sending. The Workers Rate Limiting binding is absent from that Pages subset as well. This project therefore keeps the existing Resend HTTPS API and its 10 MiB combined attachment limit. It does not use SMTP.

- [Pages Functions supported bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Email Sending Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)

If Cloudflare later adds a supported Pages Email Sending binding, reassess the attachment limit before migrating: Cloudflare Email Sending limits the complete encoded message to 5 MiB, not merely the source image bytes.

## Required production configuration

### Turnstile

1. Create a production Turnstile widget in Cloudflare and allow only the production hostnames, for example `xantina.art` and `www.xantina.art`.
2. Add `VITE_TURNSTILE_SITE_KEY` to the Pages production build variables. This site key is public by design.
3. Add `TURNSTILE_SECRET_KEY` as an encrypted Pages Function secret.
4. Add `TURNSTILE_ALLOWED_HOSTNAMES=xantina.art,www.xantina.art` as a Pages Function variable. Add a preview hostname only if contact submissions should work from that preview hostname.

The widget sends the action `contact`. The Function requires Siteverify to return `success: true`, action `contact`, and a hostname in `TURNSTILE_ALLOWED_HOSTNAMES`. Tokens are single-use and reset after every submission attempt. The Function deliberately does not send an IP taken from request headers to Siteverify.

### Resend

1. In Resend, verify the sender domain and complete its DNS setup.
2. Add `RESEND_API_KEY` as an encrypted Pages Function secret.
3. Add `CONTACT_FROM_EMAIL` as a Pages Function variable containing a plain sender address on that verified domain, such as `contact@example.com`. Do not include a display name; the Function adds one.
4. Confirm the fixed destination address in `functions/api/contact.ts` is the intended verified account address. In Resend's restricted/testing mode, the destination must be the account's verified email. With a verified sending domain, use the normal production sending mode.

Never use `VITE_` for `RESEND_API_KEY` or `TURNSTILE_SECRET_KEY`. Vite exposes all `VITE_` values to browser code.

In Cloudflare, set runtime values for each environment that should accept submissions: **Workers & Pages → this Pages project → Settings → Variables and Secrets**. Production and preview configuration are separate. Redeploy after changing bindings, variables, or secrets.

## Free-plan rate limiting

Turnstile and the hidden honeypot are enforced in code. For the production custom domain, the Cloudflare Free plan also includes one zone-level WAF rate-limiting rule. Create it manually in **Security → WAF → Rate limiting rules**:

```text
Expression: http.request.method eq "POST" and http.request.uri.path eq "/api/contact"
Characteristic: IP
Rate: 5 requests per 10 seconds
Action: Block for 10 seconds
```

Adjust the threshold if normal use shows false positives. This edge rule uses Cloudflare's client-IP signal and does not depend on `X-Forwarded-For` or another visitor-controlled header. Zone WAF rules protect a proxied custom domain; they do not protect a direct `*.pages.dev` hostname in a different zone. The Free-plan WAF allowance and periods are documented in [Cloudflare's WAF availability table](https://developers.cloudflare.com/waf/) and [rate-limiting parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/).

## Request behavior and limits

- Only same-origin `POST` requests with JSON are accepted. Cross-origin `Origin` requests are rejected and no permissive CORS headers are returned.
- Name, email, subject, and message are length-limited and validated server-side. Email header fields cannot contain newlines.
- Up to 10 credential-free HTTPS reference links are accepted, each at most 2,048 characters.
- Up to 5 JPG, PNG, GIF, or WebP images are accepted, at most 5 MiB each and 10 MiB combined. The server decodes base64 and checks magic bytes; browser-provided MIME types and filename extensions are not trusted.
- All user content is HTML-escaped before email composition. Provider failures return a generic error and never expose provider response bodies, tokens, API keys, or submitted content in logs.
- The contact page always shows a clickable email fallback.

## Deploy

1. Run the checks listed below.
2. Keep the Pages build command as `npm run build` and output directory as `dist`.
3. Deploy through the connected Git integration or Wrangler. Dashboard drag-and-drop/direct upload does not deploy Pages Functions.
4. Configure the production variables and secrets above, then trigger a new deployment.
5. Open the production contact page, confirm the widget hostname in Turnstile analytics, submit a small test, and confirm that Reply uses the visitor address.

The root-level `functions/api/contact.ts` file maps to `/api/contact` through Pages file-based routing.

## Local development and testing

Vite alone serves the UI but does not execute Pages Functions. For a full local Pages runtime:

1. Put the public development key in ignored `.env.local`:

   ```dotenv
   VITE_TURNSTILE_SITE_KEY=your-development-site-key
   ```

2. Put server-only values in ignored `.dev.vars`:

   ```dotenv
   TURNSTILE_SECRET_KEY=your-development-secret-key
   TURNSTILE_ALLOWED_HOSTNAMES=localhost,127.0.0.1
   RESEND_API_KEY=your-development-resend-key
   CONTACT_FROM_EMAIL=contact@example.com
   ```

3. Build and start Pages locally:

   ```bash
   npm run build
   npx wrangler pages dev dist
   ```

Use a separate Turnstile widget that allows local hostnames, or Cloudflare's documented dummy site/secret pair. Dummy credentials are accepted by this Function only when its request URL is `localhost` or `127.0.0.1`; deployed hosts reject them. With dummy credentials, keep `localhost` in the allowed-hostname variable. A manual successful submission through Wrangler will call Resend and send mail, so use a development Resend key/account when exercising that path.

Automated checks mock Siteverify and Resend and never send real email:

```bash
npm run test:contact
npm run test:contact:browser
npx tsc -b
npm run lint
npm run build
```

The server test covers success, missing/invalid Turnstile data, hostname/action mismatch, bad input and file signatures, the 5 MiB-per-file/10 MiB-combined boundary, provider failure redaction, same-origin enforcement, token reuse, and the honeypot. The browser test covers widget loading, retry, expiration, state preservation, mobile fit, cleanup, the same-origin endpoint, and the visible email fallback.

References: [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/), [Turnstile client rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), and [Turnstile test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
