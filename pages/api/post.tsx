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

const getPostFromDB = async (id: string) => {
  const { url, key } = resolveSupabaseConfig();
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content, post_type, cover_image_url, thumbnail_url, user_id, profiles:user_id(full_name, username)')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const author = profile?.full_name || profile?.username || 'Verrsa Creator';
  const title = (data.title || data.content || 'Check this post on Verrsa').toString().trim();

  return {
    title: title.length > 110 ? `${title.slice(0, 107)}...` : title,
    author,
    postType: data.post_type || 'post',
  };
};

export default async function handler(req: any, res: any) {
  try {
    const rawId = req.query?.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      return res.status(400).json({ error: 'Missing required query param: id' });
    }

    const post = await getPostFromDB(String(id));
    const postTitle = post?.title || 'Discover content on Verrsa';
    const postAuthor = post?.author || 'Verrsa Creator';
    const postType = post?.postType || 'post';

    const image = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 56,
            background: 'linear-gradient(135deg, #0a0f18 0%, #0b1f36 42%, #002f5f 100%)',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 700,
              opacity: 0.92,
              letterSpacing: 0.5,
            }}
          >
            VERRSA
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              maxWidth: 980,
            }}
          >
            <div style={{ display: 'flex', fontSize: 24, opacity: 0.82, textTransform: 'capitalize' }}>
              {postType}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 62,
                lineHeight: 1.08,
                fontWeight: 800,
                letterSpacing: -1.1,
              }}
            >
              {postTitle}
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 30, opacity: 0.78 }}>by {postAuthor}</div>
        </div>
      ),
      { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
    );

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error('OG post generation failed:', error);
    return res.status(500).json({ error: 'Failed to generate post OG image' });
  }
}
