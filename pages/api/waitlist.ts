import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { WaitlistApiResponse, WaitlistSubscribeRequest } from '../../types/waitlist';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendWaitlistEmail(email: string): Promise<boolean> {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  
  if (!SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured');
    return false;
  }

  const emailHTML = `
    <div style="font-family: 'Instrument Sans', Arial, sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 40px;">
        <img src="https://ik.imagekit.io/te9biwxvl/verrsa-team.png" alt="Verrsa" style="max-width: 150px; height: auto;" />
      </div>
      
      <h1 style="color: #0F172A; font-size: 28px; margin-bottom: 20px; text-align: center;">Welcome to the Verrsa Waitlist! 🎉</h1>
      
      <p style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 20px;">
        Thank you for joining our waitlist! We're thrilled to have you as part of the Verrsa community.
      </p>
      
      <div style="background-color: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
        <p style="color: #0369A1; font-size: 14px; margin: 0;">
          <strong>What's next?</strong> We'll keep you updated on platform launches, exclusive creator tips, and early access opportunities. Stay tuned!
        </p>
      </div>
      
      <p style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 20px;">
        In the meantime, you can:
      </p>
      
      <ul style="color: #475569; font-size: 15px; line-height: 24px; margin-bottom: 30px;">
        <li style="margin-bottom: 10px;">Follow us on social media for the latest updates</li>
        <li style="margin-bottom: 10px;">Check out our blog for creator tips and platform insights</li>
        <li style="margin-bottom: 10px;">Download the app (available on App Store, coming soon to Play Store)</li>
      </ul>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="https://www.verrsa.org" style="display: inline-block; background-color: #00bfff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">Visit Verrsa</a>
      </div>
      
      <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
        <p style="color: #94A3B8; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Verrsa. All rights reserved.<br />
          <a href="https://www.verrsa.org/privacy" style="color: #0EA5E9; text-decoration: none;">Privacy Policy</a> | 
          <a href="https://www.verrsa.org/terms" style="color: #0EA5E9; text-decoration: none;">Terms of Service</a>
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'hello@verrsa.org', name: 'Verrsa Team' },
        subject: 'Welcome to Verrsa Waitlist! 🚀',
        content: [{ type: 'text/html', value: emailHTML }],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WaitlistApiResponse>,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists in waitlist
    const { data: existingEntry, error: checkError } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      console.error('Supabase check error:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingEntry) {
      return res.status(400).json({ error: 'Email already registered on waitlist' });
    }

    // Add email to waitlist
    const { data: newEntry, error: insertError } = await supabase
      .from('waitlist')
      .insert([
        {
          email: email.toLowerCase(),
          created_at: new Date().toISOString(),
          status: 'pending',
        },
      ])
      .select();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: 'Failed to add email to waitlist' });
    }

    // Send confirmation email
    const emailSent = await sendWaitlistEmail(email);

    if (!emailSent) {
      console.warn('Email notification failed, but waitlist entry was created');
    }

    return res.status(201).json({
      success: true,
      message: 'Successfully added to waitlist. Check your email for confirmation!',
      data: newEntry,
    });
  } catch (error) {
    console.error('Waitlist API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
