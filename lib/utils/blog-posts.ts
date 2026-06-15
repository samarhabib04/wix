import type { BlogPost } from '@/types/blog';

/** Category label used for the /blog “Hero Stories” carousel (legacy). */
export function isHeroStoryCategory(category: unknown): boolean {
  if (Array.isArray(category)) {
    return category.some(
      (cat) => typeof cat === 'string' && cat.toLowerCase() === 'hero story',
    );
  }
  return typeof category === 'string' && category.toLowerCase() === 'hero story';
}

export function getPostSortTime(post: Pick<BlogPost, 'publish_date' | 'created_at'>): number {
  return new Date(post.publish_date || post.created_at).getTime();
}

export function sortBlogPostsNewestFirst<T extends Pick<BlogPost, 'publish_date' | 'created_at'>>(
  posts: T[],
): T[] {
  return [...posts].sort((a, b) => getPostSortTime(b) - getPostSortTime(a));
}

/**
 * Homepage hero: explicit `featured` wins, then “Hero Story” category, then newest post.
 */
export function pickHomepageHeroPost(posts: BlogPost[]): BlogPost | undefined {
  const sorted = sortBlogPostsNewestFirst(posts);
  return (
    sorted.find((post) => post.featured === true) ??
    sorted.find((post) => isHeroStoryCategory(post.category)) ??
    sorted[0]
  );
}

/** Posts for homepage sidebar — everything except the hero. */
export function pickHomepageRecentPosts(
  posts: BlogPost[],
  hero?: BlogPost,
  limit = 6,
): BlogPost[] {
  const heroId = hero?.id;
  return sortBlogPostsNewestFirst(posts)
    .filter((post) => post.id !== heroId)
    .slice(0, limit);
}

/**
 * /blog hero carousel: featured posts first, then “Hero Story” category (deduped).
 */
export function pickBlogPageHeroPosts(posts: BlogPost[]): BlogPost[] {
  const sorted = sortBlogPostsNewestFirst(posts);
  const seen = new Set<string>();
  const heroes: BlogPost[] = [];

  for (const post of sorted) {
    if (post.featured !== true) continue;
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    heroes.push(post);
  }

  for (const post of sorted) {
    if (!isHeroStoryCategory(post.category)) continue;
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    heroes.push(post);
  }

  return heroes;
}

export function pickBlogPageRegularPosts(
  posts: BlogPost[],
  heroPosts: BlogPost[],
): BlogPost[] {
  const heroIds = new Set(heroPosts.map((post) => post.id));
  return sortBlogPostsNewestFirst(posts).filter((post) => !heroIds.has(post.id));
}
