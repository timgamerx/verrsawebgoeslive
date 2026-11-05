const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.verrsa.org";

export function buildWelcomeHtml(showCreatorCta: boolean): string {
  const cta = showCreatorCta
    ? `
    <p style="line-height:1.6;margin:24px 0 8px;">
      Ready to do more than read? Turn your ideas into income and grow your audience as a creator.
    </p>
    <p style="margin:16px 0 28px;">
      <a href="${SITE_URL}/auth"
         style="background:#00bfff;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">
        Join Creators on Verrsa
      </a>
    </p>`
    : "";

  return `
  <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;color:#222;">
    <h2 style="margin:0 0 16px;">Welcome to Verrsa Newsletter 🎉</h2>
    <p style="line-height:1.6;">
      Thanks for subscribing. Every week you'll get creator tips, product updates,
      and exclusive Verrsa news straight to your inbox.
    </p>
    <p style="line-height:1.6;">Your subscription is complete. There's nothing else you need to do.</p>
    ${cta}
    <p style="margin-top:32px;">The Verrsa Team</p>
    <div style="background-color:#00bfff;height:12px;margin-top:16px;"></div>
  </div>`;
}

export async function sendWelcomeEmail(to: string, showCreatorCta: boolean): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Welcome email skipped: RESEND_API_KEY not configured");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Verrsa <hello@verrsa.org>",
        to: [to],
        subject: "Welcome to Verrsa Newsletter",
        html: buildWelcomeHtml(showCreatorCta),
      }),
    });
    if (!res.ok) console.error("Welcome email failed:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Welcome email error:", e);
    return false;
  }
}
