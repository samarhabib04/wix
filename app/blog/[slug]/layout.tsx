import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { SEO_CONFIG, getImageUrl, getFullUrl } from '@/lib/config/seo';
import StructuredData from '@/components/seo/StructuredData';
import { generateArticleSchema, generateBreadcrumbSchema } from '@/components/seo/StructuredData';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  
  try {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('id, title, description, image, author, publish_date, created_at, updated_at, category')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !post) {
      return {
        title: 'Blog Post Not Found | Dog Quest',
        description: 'The blog post you are looking for could not be found.',
      };
    }

    const postImage = post.image ? getImageUrl(post.image) : SEO_CONFIG.images.default;
    const title = `${post.title} | Dog Quest Blog`;
    const description = post.description || `${post.title} - Expert tips and advice for dog owners.`;
    const postUrl = getFullUrl(`/blog/${slug}`);
    const publishDate = post.publish_date || post.created_at;
    const modifiedDate = post.updated_at || publishDate;

    const categories = Array.isArray(post.category) ? post.category : [post.category].filter(Boolean);
    const keywords = [
      'dog care',
      'dog tips',
      'dog advice',
      ...categories,
      'Ireland',
    ];

    return generateSEOMetadata({
      title,
      description,
      url: postUrl,
      image: postImage,
      keywords,
      type: 'article',
    });
  } catch (error) {
    console.error('Error generating blog metadata:', error);
    return {
      title: 'Blog Post | Dog Quest',
      description: 'Read our latest blog post with expert tips and advice for dog owners.',
    };
  }
}

export default async function BlogPostDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  
  let articleSchema = null;
  let breadcrumbSchema = null;

  try {
    const { data: post } = await supabase
      .from('blog_posts')
      .select('id, title, description, image, author, publish_date, created_at, updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (post) {
      const postImage = post.image ? getImageUrl(post.image) : undefined;
      const publishDate = post.publish_date || post.created_at;
      const modifiedDate = post.updated_at || publishDate;

      articleSchema = generateArticleSchema({
        headline: post.title,
        description: post.description || post.title,
        image: postImage,
        datePublished: publishDate,
        dateModified: modifiedDate,
        author: {
          name: post.author || 'Dog Quest Team',
        },
        publisher: {
          name: 'Dog Quest',
          logo: getFullUrl('/logo.png'),
        },
        url: getFullUrl(`/blog/${slug}`),
      });

      breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Home', url: SEO_CONFIG.siteUrl },
        { name: 'Blog', url: getFullUrl('/blog') },
        { name: post.title, url: getFullUrl(`/blog/${slug}`) },
      ]);
    }
  } catch (error) {
    console.error('Error generating structured data:', error);
  }

  return (
    <>
      {articleSchema && <StructuredData data={articleSchema} />}
      {breadcrumbSchema && <StructuredData data={breadcrumbSchema} />}
      {children}
    </>
  );
}






























