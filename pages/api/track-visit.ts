import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ALLOWED_PATHS = ['/', '/auth', '/home'];
const BOT_UA =
  /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|lighthouse|curl|wget|python|axios|node-fetch|go-http|java|httpclient|preview|monitor|uptime|facebookexternalhit|whatsapp|telegram/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ua = String(req.headers['user-agent'] || '');
  if (!ua || BOT_UA.test(ua)) {
    return res.status(200).json({ success: true, ignored: true });
  }

  const path = (req.body as { path?: string })?.path;
  if (!path || !ALLOWED_PATHS.includes(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Configuration is required.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('website_visits').insert({ path });
    if (error) {
      console.error('track-visit insert error:', error);
      return res.status(500).json({ error: 'Failed to record visit' });
    }
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('track-visit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
