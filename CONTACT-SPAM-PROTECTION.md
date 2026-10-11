# Activate contact verification

The code is implemented and the existing widget's public site key is configured in `.env.local`. Production activation still requires the private key in Supabase and the public key in your hosting build environment. The existing live email function has not been replaced yet.

## Production setup

1. Keep the existing Turnstile widget `0x4AAAAAAFThEHmeu_VDRD-7`. In the Cloudflare dashboard, confirm it is **Managed**, includes `xantina.art` and `www.xantina.art`, and has pre-clearance off. Add a hosting preview hostname only if you want that preview to submit real messages.
2. Put the public site key in `.env.local` and the hosting provider's build environment as `VITE_TURNSTILE_SITE_KEY`. Restart the development server after changing frontend variables. Never put the secret key in a `VITE_` variable.
3. In Supabase project `ojbvkvioyjatgardaeif`, Edge Functions → Secrets, add `TURNSTILE_SECRET_KEY` and `TURNSTILE_ALLOWED_HOSTNAMES=xantina.art,www.xantina.art`. Keep the existing `RESEND_API_KEY`.
4. Publish the frontend with its production site key. Confirm the widget loads on the production contact page, then deploy enforcement:

```powershell
npx supabase functions deploy send-contact-email --project-ref ojbvkvioyjatgardaeif
```

5. Refresh existing tabs. Send one browser submission containing an image and a Google Docs or Dropbox reference link. Confirm receipt and reply-to behavior. A request without a verification token should return 400 and send no email.

If configuration or Cloudflare fails, sending is blocked and the visitor sees the fallback email address. Missing/expired/reused tokens never send email. Turnstile reduces bot submissions; this version does not add rate limits.

## Local development

The root `.env.local` contains the `TURNSTILE_SECRET_KEY=` entry alongside the public site key and is ignored by Git. Replace the blank value locally if needed; never prefix the private key with `VITE_`. Vite does not expose this server-only name to the frontend. Supabase hosted functions do not read this file: set the actual secret in Supabase Edge Function Secrets. For a local Supabase function, pass the root file explicitly with `npx supabase functions serve send-contact-email --env-file .env.local`, adding the local hostname allowlist and existing email-provider key to that ignored file. Do not deploy the blank placeholder.

For a separate local-only widget, register `localhost` and `127.0.0.1` and use its own site/secret key pair. Serve a local Supabase function with `TURNSTILE_ALLOWED_HOSTNAMES=localhost,127.0.0.1` in the ignored `supabase/functions/.env`. Set local Supabase URL and publishable key in `.env.local` using `npx supabase status`. Do not mix a development widget with the production backend's allowed hostnames.

For automated tests, use Cloudflare's documented dummy keys with a **local** function only. The frontend rejects dummy site keys in production builds; the backend rejects dummy secret keys outside local Supabase. Never deploy test credentials to production. Keep hostname and action checks enabled in tests by mocking matching Siteverify responses.

## Checks and monitoring

- Run `npm run test:contact`, `npm run test:contact:browser`, TypeScript, changed-file ESLint, and `npm run build`. Install Chromium once with `npx playwright install chromium`. Browser tests mock the widget and email endpoint and send no real email.
- Test mobile width, widget failure/retry, expiry, route changes and resubmission; failures must preserve text, links and selected files.
- Check Supabase logs for generic verification rejection/unavailable and email acceptance events. Tokens, secrets, message bodies and attachments are not logged.
- A consumed token is reset after each attempted submission. Users may need to complete verification again after an email-provider failure.

References: [widget rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), [server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [local testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
