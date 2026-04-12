/**
 * Session-scoped verse view tracker.
 * Each verse is counted once per app session regardless of how many
 * screens show it (Home, Profile, UserProfile, etc.).
 */
import { trackView } from "../components/api";

const _viewedThisSession = new Set<string>();

/**
 * For every verse in `posts` that has not yet been tracked this
 * session, increments its view count in the database once.
 */
export async function trackVerseViews(
  posts: Array<{ id: string; type?: string }>,
): Promise<void> {
  const untracked = posts.filter(
    (p) => p.type === "verse" && !_viewedThisSession.has(p.id),
  );
  if (!untracked.length) return;
  untracked.forEach((p) => _viewedThisSession.add(p.id));
  await Promise.all(untracked.map((p) => trackView(p.id, "verse")));
}
