export type ContentCategory =
  | "For You"
  | "Latest"
  | "Business"
  | "Entertainment"
  | "Sports"
  | "Technology"
  | "Health"
  | "Education"
  | "Lifestyle"
  | "Politics"
  | "Science"
  | "Art"
  | string;

export type PostType =
  | "all"
  | "verse"
  | "article"
  | "podcast"
  | "reel"
  | "video";

export interface Hashtag {
  id?: string;
  name?: string;
  tag?: string;
  count?: number;
  trending?: boolean;
  post_count?: number;
  trending_score?: number;
}

export interface TrendingTopic {
  id: string;
  title: string;
  category?: ContentCategory;
  post_count?: number;
}

export interface TrendingCreator {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  is_verified?: boolean;
  follower_count?: number;
  subscription_status?: string;
}

export interface FeedFilter {
  category?: ContentCategory;
  postType?: PostType;
  timeRange?: "today" | "week" | "month" | "all";
}

export interface TrendingContent {
  id: string;
  title?: string;
  content?: string;
  type: PostType;
  author_id?: string;
  user_id?: string;
  excerpt?: string;
  cover_image_url?: string;
  username?: string;
  avatar_url?: string;
  is_verified?: boolean;
  created_at: string;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  share_count?: number;
  trending_score?: number;
  hashtags?: string[];
}

export interface DiscoveryFeedItem {
  id: string;
  type: PostType;
  content: TrendingContent;
  score?: number;
}

export interface SearchResult {
  users?: TrendingCreator[];
  posts?: TrendingContent[];
  hashtags?: Hashtag[];
  creators?: TrendingCreator[];
  communities?: any[];
}

export interface RecommendationParams {
  userId?: string;
  user_id?: string;
  category?: ContentCategory;
  postType?: PostType;
  limit?: number;
  offset?: number;
}
