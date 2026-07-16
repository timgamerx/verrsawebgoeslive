import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { WaitlistApiResponse } from '../../types/waitlist';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Configuration is required.'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WaitlistApiResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  try {
    const supabase = getSupabaseClient();

    const { data: existingEntry, error: checkError } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Supabase check error:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingEntry) {
      return res.status(400).json({ error: 'Already Subscribed. This email is already receiving Verrsa updates.' });
    }

    const { data: newEntry, error: insertError } = await supabase
      .from('waitlist')
      .insert({ email: normalizedEmail })
      .select();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: 'Failed to add email' });
    }

    return res.status(201).json({
      success: true,
      message: 'You’re in! 🎉. You’ll be the first to receive creator tips, product updates, and exclusive Verrsa news.',
      data: newEntry,
    });
  } catch (error) {
    console.error('Waitlist API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
