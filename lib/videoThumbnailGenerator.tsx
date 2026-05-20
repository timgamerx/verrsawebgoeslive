/**
 * Video Thumbnail Generator Utility
 * Generates thumbnail URLs from Supabase video storage URLs
 */

/**
 * Generates a thumbnail URL from a Supabase video URL
 * For videos stored in Supabase storage, we can extract a frame as thumbnail
 * 
 * @param videoUrl - The full video URL from Supabase storage
 * @returns Thumbnail URL or fallback image
 */
export function generateVideoThumbnail(videoUrl: string | undefined): string {
  const fallbackImage = "https://ik.imagekit.io/te9biwxvl/verrsa-team.png";
  
  if (!videoUrl || videoUrl.trim() === "") {
    return fallbackImage;
  }

  try {
    // Check if it's a Supabase storage URL
    const supabasePattern = /supabase\.co\/storage\/v1\/object\/public/;
    
    if (supabasePattern.test(videoUrl)) {
      // For Supabase storage, we can use the video URL with a transformation parameter
      // to extract a frame as thumbnail (if Supabase supports it)
      // Otherwise, we'll use a video poster/thumbnail approach
      
      // Option 1: If you have a separate thumbnails bucket, construct the thumbnail URL
      // by replacing the video path with thumbnail path
      const thumbnailUrl = videoUrl.replace('/videos/', '/thumbnails/')
        .replace(/\.(mp4|mov|avi|webm|mkv)$/i, '.jpg');
      
      return thumbnailUrl;
    }
    
    // For other video URLs, return the URL itself (browser will handle poster)
    return videoUrl;
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    return fallbackImage;
  }
}

/**
 * Generates a thumbnail URL with fallback to cover image
 * 
 * @param videoUrl - The video URL from Supabase storage
 * @param coverImageUrl - Optional cover image URL as fallback
 * @returns Best available thumbnail URL
 */
export function getVideoThumbnailWithFallback(
  videoUrl: string | undefined,
  coverImageUrl: string | undefined
): string {
  const fallbackImage = "https://ik.imagekit.io/te9biwxvl/verrsa-team.png";
  
  // Priority 1: Use cover_image_url if available
  if (coverImageUrl && coverImageUrl.trim() !== "") {
    return coverImageUrl;
  }
  
  // Priority 2: Generate thumbnail from video URL
  if (videoUrl && videoUrl.trim() !== "") {
    return generateVideoThumbnail(videoUrl);
  }
  
  // Priority 3: Use fallback
  return fallbackImage;
}

/**
 * Extracts a video frame as base64 data URL (client-side only)
 * This can be used to generate thumbnails on the client side
 * 
 * @param videoUrl - The video URL
 * @param seekTime - Time in seconds to capture the frame (default: 1)
 * @returns Promise with base64 data URL of the frame
 */
export async function extractVideoFrame(
  videoUrl: string,
  seekTime: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = Math.min(seekTime, video.duration);
      });
      
      video.addEventListener('seeked', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      });
      
      video.addEventListener('error', (e) => {
        reject(new Error('Error loading video'));
      });
      
      video.src = videoUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a thumbnail URL for Open Graph meta tags
 * Ensures the URL is absolute and properly formatted
 * 
 * @param videoUrl - The video URL
 * @param coverImageUrl - Optional cover image URL
 * @returns Absolute thumbnail URL for meta tags
 */
export function getVideoMetaThumbnail(
  videoUrl: string | undefined,
  coverImageUrl: string | undefined
): string {
  const thumbnail = getVideoThumbnailWithFallback(videoUrl, coverImageUrl);
  
  // Ensure the URL is absolute
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
    return thumbnail;
  }
  
  // If relative, make it absolute (shouldn't happen with Supabase URLs)
  return `https://verrsa.org${thumbnail.startsWith('/') ? '' : '/'}${thumbnail}`;
}
