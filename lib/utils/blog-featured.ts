import { supabase } from '@/lib/supabase/client';

/** Ensures only one blog post is marked featured at a time. */
export async function setExclusiveFeaturedPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('blog_posts')
    .update({ featured: false })
    .eq('featured', true)
    .neq('id', postId);

  if (error) {
    console.error('Failed to clear previous featured blog post:', error);
  }
}
