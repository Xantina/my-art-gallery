import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const fieldLimits: Record<keyof ContactEmailRequest, number> = {
  name: 100,
  email: 254,
  subject: 200,
  message: 10000,
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const badRequest = (error: string): Response =>
  new Response(JSON.stringify({ error }), {
    status: 400,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, Allow: "POST, OPTIONS", "Content-Type": "application/json" },
    });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return badRequest("Request body must be an object");
    }

    const fields = {} as ContactEmailRequest;
    const input = body as Record<string, unknown>;
    const token = input.turnstileToken;
    if (typeof token !== "string" || !token.trim() || token.length > 2048) {
      return badRequest("Please complete verification and try again.");
    }
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
    const allowedHosts = (Deno.env.get("TURNSTILE_ALLOWED_HOSTNAMES") ?? "")
      .split(",").map(host => host.trim().toLowerCase()).filter(Boolean);
    // Test credentials are permitted only in a local Supabase runtime.
    const localRuntime = /^http:\/\/(localhost|127\.0\.0\.1|kong)(:|\/|$)/.test(Deno.env.get("SUPABASE_URL") ?? "");
    const testSecret = secret ? /^[123]x00000000000000000000/.test(secret) : false;
    const unavailable = () => new Response(JSON.stringify({
      error: "Verification is unavailable. Please try again or email cheyroach@gmail.com.",
    }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!secret || !allowedHosts.length || !RESEND_API_KEY || (testSecret && !localRuntime)) {
      console.warn("Contact verification configuration unavailable");
      return unavailable();
    }
    try {
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
        signal: AbortSignal.timeout(10000),
      });
      if (!verification.ok) return unavailable();
      const result = await verification.json();
      if (!result || typeof result !== "object" || typeof result.success !== "boolean") return unavailable();
      if (!result.success || typeof result.hostname !== "string" ||
          !allowedHosts.includes(result.hostname.toLowerCase()) || result.action !== "contact") {
        console.warn("Contact verification rejected");
        return new Response(JSON.stringify({ error: "Verification failed or expired. Please verify again." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      console.warn("Contact verification service unavailable");
      return unavailable();
    }
    for (const field of Object.keys(fieldLimits) as (keyof ContactEmailRequest)[]) {
      const value = input[field];
      if (typeof value !== "string" || !value.trim()) {
        return badRequest(`${field} must be a non-empty string`);
      }
      fields[field] = value.trim();
      if (fields[field].length > fieldLimits[field]) {
        return badRequest(`${field} must be ${fieldLimits[field]} characters or fewer`);
      }
    }

    const { name, email, subject, message } = fields;
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      return badRequest("Please provide a valid email address");
    }
    if ([name, email, subject].some(value => /[\r\n]/.test(value) || value.includes("\u0000")) || message.includes("\u0000")) {
      return badRequest("Fields contain invalid control characters");
    }

    const rawLinks = input.referenceLinks ?? [];
    if (!Array.isArray(rawLinks) || rawLinks.length > 10) {
      return badRequest("Add up to 10 reference links");
    }
    const referenceLinks: string[] = [];
    for (const link of rawLinks) {
      if (typeof link !== "string" || link.length > 2048) {
        return badRequest("Reference links must be HTTPS URLs of 2048 characters or fewer");
      }
      try {
        const url = new URL(link.trim());
        if (url.protocol !== "https:" || url.username || url.password) {
          return badRequest("Reference links must use HTTPS without login credentials");
        }
        referenceLinks.push(url.href);
      } catch {
        return badRequest("Please provide valid HTTPS reference links");
      }
    }

    const rawAttachments = input.attachments ?? [];
    if (!Array.isArray(rawAttachments) || rawAttachments.length > 5) {
      return badRequest("Attach up to 5 reference images");
    }
    const attachments: { filename: string; content: string }[] = [];
    let totalBytes = 0;
    for (const attachment of rawAttachments) {
      if (typeof attachment !== "object" || attachment === null ||
          typeof attachment.filename !== "string" || !attachment.filename.trim() || attachment.filename.length > 255 ||
          typeof attachment.content !== "string" || !attachment.content ||
          attachment.content.length > Math.ceil(5 * 1024 * 1024 / 3) * 4 ||
          attachment.content.length % 4 !== 0 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.content)) {
        return badRequest("Each reference must be an image of 5 MB or less");
      }
      let bytes: string;
      try {
        bytes = atob(attachment.content);
      } catch {
        return badRequest("Invalid image attachment encoding");
      }
      totalBytes += bytes.length;
      if (bytes.length > 5 * 1024 * 1024 || totalBytes > 10 * 1024 * 1024) {
        return badRequest("Images must be 5 MB or less each and 10 MB or less combined");
      }
      // Check the file signature rather than trusting a browser-provided MIME type.
      const extension = bytes.startsWith("\x89PNG\r\n\x1a\n") ? "png"
        : bytes.startsWith("\xff\xd8\xff") ? "jpg"
        : /^(GIF87a|GIF89a)/.test(bytes) ? "gif"
        : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP" ? "webp"
        : null;
      if (!extension) return badRequest("Only JPG, PNG, GIF, and WebP reference images are accepted");
      const stem = attachment.filename.replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100) || "reference";
      attachments.push({ filename: `${attachments.length + 1}-${stem}.${extension}`, content: attachment.content });
    }

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Contact Form <onboarding@resend.dev>",
        to: ["cheyroach@gmail.com"],
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
          ${referenceLinks.length ? `<h2>Reference links</h2><ul>${referenceLinks.map(link => `<li><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></li>`).join("")}</ul>` : ""}
          ${attachments.length ? `<p>${attachments.length} reference image(s) attached.</p>` : ""}
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Email provider rejected contact submission");
      throw new Error(errorData.message || "Failed to send email");
    }

    console.log("Contact email accepted by provider");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Contact submission failed", error instanceof Error ? error.name : "UnknownError");
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
