/**
 * Discovery Components - Web compatible version
 */

import React from "react";
import { ContentCategory, Hashtag, TrendingCreator } from "../types/discovery";
import VerificationBadge from "./VerificationBadge";

const RESTRICTED_STATES = new Set(["blocked","removed","under_review","restricted","suspended","banned"]);

const isRestrictedItem = (item: any): boolean => {
  if (!item || typeof item !== "object") return false;
  const action = String(item.enforcement_action || item.action || item.moderation_action || "").toLowerCase();
  const status = String(item.status || item.moderation_status || "").toLowerCase();
  if (RESTRICTED_STATES.has(action) || RESTRICTED_STATES.has(status)) return true;
  return Boolean(item.is_restricted || item.is_blocked || item.blocked || item.is_removed || item.hidden);
};

function formatCount(count: number): string {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
  if (count >= 1000) return (count / 1000).toFixed(1) + "K";
  return count.toString();
}

interface CategoryChipProps {
  category: ContentCategory | string;
  isSelected: boolean;
  onPress: () => void;
  theme: any;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({ category, isSelected, onPress, theme }) => (
  <button
    onClick={onPress}
    style={{
      padding: "8px 16px",
      borderRadius: 20,
      marginRight: 8,
      border: "1px solid " + (isSelected ? theme.accent : theme.border),
      backgroundColor: isSelected ? theme.accent : theme.cardBackground,
      color: isSelected ? "#FFF" : theme.text,
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
    }}
  >
    {category}
  </button>
);

interface CategoryListProps {
  categories: (ContentCategory | string)[];
  selectedCategory: string;
  onSelectCategory: (c: string) => void;
  theme: any;
}

export const CategoryList: React.FC<CategoryListProps> = ({ categories, selectedCategory, onSelectCategory, theme }) => (
  <div style={{ display: "flex", overflowX: "auto", margin: "12px 0", padding: "0 16px" }}>
    {categories.map((c) => (
      <CategoryChip
        key={String(c)}
        category={c}
        isSelected={selectedCategory === c}
        onPress={() => onSelectCategory(String(c))}
        theme={theme}
      />
    ))}
  </div>
);

interface HashtagChipProps {
  hashtag: Hashtag;
  onPress: () => void;
  theme: any;
  showCount?: boolean;
}

export const HashtagChip: React.FC<HashtagChipProps> = ({ hashtag, onPress, theme, showCount = true }) => (
  <button
    onClick={onPress}
    style={{ padding: "10px 16px", borderRadius: 12, marginRight: 10, minWidth: 120, backgroundColor: theme.cardBackground, border: "none", cursor: "pointer", textAlign: "left" }}
  >
    <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
      {(hashtag as any).tag || hashtag.name}
    </div>
    {showCount && (
      <div style={{ fontSize: 12, color: theme.textSecondary }}>
        {formatCount((hashtag as any).count || hashtag.post_count || 0)} posts
      </div>
    )}
  </button>
);

interface TrendingHashtagsProps {
  hashtags: Hashtag[];
  onSelectHashtag: (h: string) => void;
  theme: any;
  title?: string;
}

export const TrendingHashtags: React.FC<TrendingHashtagsProps> = ({ hashtags, onSelectHashtag, theme, title = "Trending Hashtags" }) => (
  <div style={{ margin: "16px 0" }}>
    <div style={{ padding: "0 16px", marginBottom: 12 }}>
      <span style={{ fontWeight: 700, fontSize: 16, color: theme.text }}>{title}</span>
    </div>
    <div style={{ display: "flex", overflowX: "auto", padding: "0 16px" }}>
      {hashtags
        .filter((h) => !isRestrictedItem(h))
        .map((h, i) => (
          <HashtagChip key={i} hashtag={h} onPress={() => onSelectHashtag((h as any).tag || h.name)} theme={theme} />
        ))}
    </div>
  </div>
);

interface TrendingCreatorCardProps {
  creator: TrendingCreator;
  onPress: () => void;
  theme: any;
}

export const TrendingCreatorCard: React.FC<TrendingCreatorCardProps> = ({ creator, onPress, theme }) => (
  <button
    onClick={onPress}
    style={{ display: "flex", padding: "12px", borderRadius: 12, marginRight: 12, width: 280, backgroundColor: theme.cardBackground, border: "none", cursor: "pointer", textAlign: "left" }}
  >
    <img
      src={creator.avatar_url || "https://via.placeholder.com/50"}
      alt={creator.full_name || creator.username}
      style={{ width: 50, height: 50, borderRadius: 25, objectFit: "cover" }}
    />
    <div style={{ marginLeft: 12, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginRight: 4 }}>
          {creator.full_name || creator.username}
        </span>
        {creator.is_verified && <VerificationBadge size={14} />}
      </div>
      <div style={{ fontSize: 13, color: theme.text, marginBottom: 6 }}>@{creator.username}</div>
      <div style={{ fontSize: 12, color: theme.text }}>{formatCount(creator.follower_count || 0)} followers</div>
    </div>
  </button>
);

interface TrendingCreatorsProps {
  creators: TrendingCreator[];
  onSelectCreator: (id: string) => void;
  theme: any;
  title?: string;
}

export const TrendingCreators: React.FC<TrendingCreatorsProps> = ({ creators, onSelectCreator, theme, title }) => {
  const visible = creators.filter((c) => !isRestrictedItem(c));
  return (
    <div style={{ margin: "16px 0" }}>
      <div style={{ padding: "0 16px", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: theme.text }}>
          {title || "Top Voices on Verrsa (" + visible.length + ")"}
        </span>
      </div>
      <div style={{ display: "flex", overflowX: "auto", padding: "0 16px" }}>
        {visible.map((c) => (
          <TrendingCreatorCard key={c.id} creator={c} onPress={() => onSelectCreator(c.id)} theme={theme} />
        ))}
      </div>
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  iconName?: string;
  theme: any;
  onSeeAll?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, theme, onSeeAll }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", marginBottom: 12 }}>
    <span style={{ fontWeight: 700, fontSize: 16, color: theme.text }}>{title}</span>
    {onSeeAll && (
      <button onClick={onSeeAll} style={{ background: "none", border: "none", color: theme.accent, cursor: "pointer", fontSize: 14 }}>
        See All
      </button>
    )}
  </div>
);

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  theme: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, theme }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 40 }}>
    <div style={{ fontSize: 32, marginBottom: 16 }}>No items found</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center" }}>{message}</div>
  </div>
);
