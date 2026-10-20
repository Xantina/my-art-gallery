import { onRequest as handleContactRequest } from '../functions/api/contact';

interface Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_ALLOWED_HOSTNAMES?: string;
  CONTACT_FROM_EMAIL?: string;
}

const jsonHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

export default {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/contact') {
      return handleContactRequest({ request, env });
    }

    return new Response(JSON.stringify({ error: 'API route not found.' }), {
      status: 404,
      headers: jsonHeaders,
    });
  },
};
