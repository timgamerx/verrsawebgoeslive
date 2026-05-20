import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import { supabase } from "../../components/supabase";

interface Post {
  id: string;
  title: string;
  description?: string;
  content?: string;
  cover_image_url?: string;
  created_at?: string;
  type?: string;
  category?: string;
  video_url?: string;
  audio_url?: string;
  view_count?: number;
}

interface PostPageProps {
  post: Post | null;
}

export default function PostPage({ post }: PostPageProps) {
  if (!post) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "sans-serif",
        }}
      >
        <h1>Post not found</h1>
      </div>
    );
  }

  const description =
    post.description ||
    post.content?.replace(/<[^>]*>/g, "").slice(0, 160) ||
    "Discover amazing content on Verrsa.";

  const image =
    post.cover_image_url ||
    "https://ik.imagekit.io/te9biwxvl/verrsa-team.png";

  const url = `https://verrsa.org/post/${post.id}`;

  return (
    <>
      <Head>
        <title>{post.title} | Verrsa</title>

        <meta name="description" content={description} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="Verrsa" />

        {/* Twitter */}
        <meta
          name="twitter:card"
          content="summary_large_image"
        />
        <meta name="twitter:title" content={post.title} />
        <meta
          name="twitter:description"
          content={description}
        />
        <meta name="twitter:image" content={image} />

        {/* Additional SEO */}
        <meta
          name="keywords"
          content={`Verrsa, ${post.category || "content"}, ${
            post.type || "post"
          }`}
        />

        <link rel="canonical" href={url} />
      </Head>

      <main
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "40px 20px",
          fontFamily: "'Instrument Sans', sans-serif",
        }}
      >
        {/* Cover Image */}
        {post.cover_image_url && (
          <div
            style={{
              width: "100%",
              height: "450px",
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              marginBottom: "32px",
            }}
          >
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              priority
              style={{
                objectFit: "cover",
              }}
            />
          </div>
        )}

        {/* Category */}
        <div
          style={{
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              backgroundColor: "#E0F2FE",
              color: "#0284C7",
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {post.category || post.type || "Post"}
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "48px",
            lineHeight: "58px",
            fontWeight: 700,
            color: "#0F172A",
            marginBottom: "20px",
          }}
        >
          {post.title}
        </h1>

        {/* Meta */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            color: "#64748B",
            marginBottom: "40px",
            fontSize: "14px",
            flexWrap: "wrap",
          }}
        >
          {post.created_at && (
            <span>
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          )}

          {post.view_count !== undefined && (
            <span>👁️ {post.view_count} views</span>
          )}

          {post.type && (
            <span>
              {post.type.charAt(0).toUpperCase() +
                post.type.slice(1)}
            </span>
          )}
        </div>

        {/* Description */}
        {post.description && (
          <p
            style={{
              fontSize: "20px",
              lineHeight: "34px",
              color: "#475569",
              marginBottom: "32px",
            }}
          >
            {post.description}
          </p>
        )}

        {/* Video */}
        {post.type === "video" && post.video_url && (
          <video
            controls
            style={{
              width: "100%",
              borderRadius: "16px",
              marginBottom: "32px",
            }}
          >
            <source
              src={post.video_url}
              type="video/mp4"
            />
          </video>
        )}

        {/* Podcast */}
        {post.type === "podcast" && post.audio_url && (
          <audio
            controls
            style={{
              width: "100%",
              marginBottom: "32px",
            }}
          >
            <source
              src={post.audio_url}
              type="audio/mpeg"
            />
          </audio>
        )}

        {/* Content */}
        <div
          style={{
            fontSize: "18px",
            lineHeight: "34px",
            color: "#1E293B",
          }}
          dangerouslySetInnerHTML={{
            __html: post.content || "",
          }}
        />
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (
  context
) => {
  try {
    const { postId } = context.params as {
      postId: string;
    };

    const { data: post, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error || !post) {
      return {
        notFound: true,
      };
    }

    // Increment view count
    await supabase
      .from("posts")
      .update({
        view_count: (post.view_count || 0) + 1,
      })
      .eq("id", postId);

    return {
      props: {
        post,
      },
    };
  } catch (error) {
    console.error("Error loading post:", error);

    return {
      notFound: true,
    };
  }
};