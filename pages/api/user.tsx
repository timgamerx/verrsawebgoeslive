import React from 'react';
import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

const resolveSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return { url, key };
};

const normalizeUsername = (value: string) => value.replace(/^@+/, '').trim();

const getUserFromDB = async (username: string) => {
  const { url, key } = resolveSupabaseConfig();
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const cleaned = normalizeUsername(username);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url')
    .ilike('username', cleaned)
    .maybeSingle();

  if (error || !data) return null;

  const bio = (data.bio || 'Creator on Verrsa').toString().trim();

  return {
    username: data.username || cleaned,
    name: data.full_name || data.username || 'Verrsa Creator',
    bio: bio.length > 150 ? `${bio.slice(0, 147)}...` : bio,
    avatar: data.avatar_url || '',
  };
};

export default async function handler(req: any, res: any) {
  try {
    const rawUsername = req.query?.username;
    const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;

    if (!username) {
      return res.status(400).json({ error: 'Missing required query param: username' });
    }

    const user = await getUserFromDB(String(username));
    const displayUsername = user?.username || normalizeUsername(String(username));
    const displayName = user?.name || 'Verrsa Creator';
    const displayBio = user?.bio || 'Build. Share. Grow on Verrsa.';
    const avatar = user?.avatar;

    const image = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 56,
            gap: 18,
            background: 'linear-gradient(160deg, #0a111b 0%, #0f2a4c 48%, #005c9d 100%)',
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          {avatar ? (
            <img
              src={avatar}
              width="148"
              height="148"
              style={{ borderRadius: '999px', objectFit: 'cover', border: '4px solid rgba(255,255,255,0.4)' }}
            />
          ) : (
            <div
              style={{
                width: 148,
                height: 148,
                borderRadius: '999px',
                border: '4px solid rgba(255,255,255,0.3)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 56,
                fontWeight: 700,
              }}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div style={{ display: 'flex', fontSize: 54, fontWeight: 800, letterSpacing: -0.9 }}>@{displayUsername}</div>
          <div style={{ display: 'flex', fontSize: 34, opacity: 0.88 }}>{displayName}</div>
          <div style={{ display: 'flex', fontSize: 28, opacity: 0.72, maxWidth: 1000 }}>{displayBio}</div>

          <div style={{ display: 'flex', marginTop: 10, fontSize: 22, opacity: 0.65, letterSpacing: 2 }}>VERRSA</div>
        </div>
      ),
      { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
    );

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error('OG user generation failed:', error);
    return res.status(500).json({ error: 'Failed to generate user OG image' });
  }
}
