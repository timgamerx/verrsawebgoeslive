const INVITE_RECIPIENTS = [
   "ogundareiyanuoluwa33@gmail.com",
  "bolajigold17@gmail.com",
];

const INVITE_HTML = `
 <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
    <img src="https://ik.imagekit.io/te9biwxvl/verrsa-team.png" alt="Verrsa"
      style="width:100%; border-radius:10px; margin-bottom:20px;" />

    <p style="margin-bottom: 20px;">Hi, Sekoni Pelumi</p>
    <p style="line-height: 1.5;">
    As we continue building Verrsa, I want us to stay aligned on our current
    structure and direction. At this stage, I&#8217;d like us to operate as a collaborative team rather than a traditional
    employment setup, especially as we are still in the early phase and yet to secure funding. Your role as COO remains very
    important, but for now it will be more flexible and focused on key priorities that move the product and overall
    operations forward. As we progress and achieve our targets &ndash; particularly onboarding 5,000&ndash;10,000+ active
    creators within our first year &mdash; the goal is to transition into a more structured system with defined
    responsibilities and consistent compensation (biweekly or monthly). I truly appreciate your effort and commitment so
    far, and I&#8217;m looking forward to building this to that level together."
   </p>

   <p><br /><strong>Iyanuoluwa Joseph</strong><br />CEO, Verrsa</p>
  <div style="background-color: #00bfff; height: 25px;"></div>
  </div>
`;

async function sendViaSendGrid(
  toEmails: string[],
  subject: string,
  html: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number }> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: toEmails.map((email) => ({ to: [{ email }] })),
      from: { email: 'hello@verrsa.org', name: 'Iyanuoluwa Joseph — Verrsa' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  return { ok: response.ok, status: response.status };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  let mode: string | undefined, emails: string[] | undefined, subject: string | undefined, body: string | undefined;
  try {
    ({ mode, emails, subject, body } = req.body ?? {});
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // ── Team invite mode ──
  if (mode === 'invite') {
    try {
      const result = await sendViaSendGrid(
        INVITE_RECIPIENTS,
        'Call for Team Members: Verrsa',
        INVITE_HTML,
        SENDGRID_API_KEY,
      );
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: 'Failed to send invites' });
      }
      return res.status(200).json({
        success: true,
        message: `Invites sent to ${INVITE_RECIPIENTS.length} recipients`,
      });
    } catch (error) {
      console.error('Error sending invites:', error);
      return res.status(500).json({ success: false, error: 'Failed to send invites' });
    }
  }

  // ── Custom campaign mode ──
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'No recipient emails provided' });
  }
  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: 'Subject is required' });
  }
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Email body is required' });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <img src="https://ik.imagekit.io/te9biwxvl/verrsa-team.png" alt="Verrsa"
        style="width:100%; border-radius:10px; margin-bottom:20px;" />
      <div style="font-size: 15px; line-height: 1.7; color: #333;">
        ${body.trim().replace(/\n/g, '<br/>')}
      </div>
      <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
      <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
        You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
      </p>
    </div>
  `;

  try {
    // Send one by one to personalise (avoids recipients seeing each other)
    await Promise.all(
      emails.map((email: string) =>
        sendViaSendGrid([email], subject.trim(), html, SENDGRID_API_KEY),
      ),
    );
    return res.status(200).json({
      success: true,
      message: `Email sent to ${emails.length} recipient${emails.length !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Error sending custom emails:', error);
    return res.status(500).json({ success: false, error: 'Failed to send emails' });
  }
}
