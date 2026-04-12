// @ts-nocheck
import React from "react";
import { useBookmarks, Post } from "../context/BookmarkProvider";
import { IoBookmark, IoBookmarkOutline } from "react-icons/io5";

interface BookmarkButtonProps {
  post: Post;
  size?: number;
  color?: string;
  activeColor?: string;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  post,
  size = 18,
  color = "#333",
  activeColor = "#00BFFF",
}) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [isToggling, setIsToggling] = React.useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleBookmark(post);
    } catch (error) {
      console.error("BookmarkButton: Error toggling bookmark:", error);
    } finally {
      setIsToggling(false);
    }
  };

  if (isToggling) {
    return <span style={{ color: activeColor, fontSize: size }}>...</span>;
  }

  return (
    <button onClick={handleToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      {isBookmarked(post.id)
        ? <IoBookmark size={size} color={activeColor} />
        : <IoBookmarkOutline size={size} color={color} />
      }
    </button>
  );
};

export default BookmarkButton;
