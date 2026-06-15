'use client';

import React, { useState, useEffect } from 'react';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogPost } from '@/types/blog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

// Function to safely convert strings to lowercase
const safeToLowerCase = (value: string | null | undefined): string => {
  if (typeof value !== 'string') return '';
  return value.toLowerCase();
};

// Function to get tag color based on category name
const getTagColor = (category: string) => {
  const categoryColors: Record<string, { bg: string, hover: string, text: string }> = {
    'Hero Story': { bg: 'bg-amber-200', hover: 'hover:bg-amber-300', text: 'text-amber-900' },
    'Health': { bg: 'bg-emerald-200', hover: 'hover:bg-emerald-300', text: 'text-emerald-900' },
    'Training': { bg: 'bg-sky-200', hover: 'hover:bg-sky-300', text: 'text-sky-900' },
    'Nutrition': { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' },
    'News': { bg: 'bg-blue-200', hover: 'hover:bg-blue-300', text: 'text-blue-900' },
    'Puppy Tips': { bg: 'bg-pink-200', hover: 'hover:bg-pink-300', text: 'text-pink-900' },
    'Behavior': { bg: 'bg-indigo-200', hover: 'hover:bg-indigo-300', text: 'text-indigo-900' },
    'Adoption': { bg: 'bg-teal-200', hover: 'hover:bg-teal-300', text: 'text-teal-900' },
    'Breeds': { bg: 'bg-orange-200', hover: 'hover:bg-orange-300', text: 'text-orange-900' },
    'Care': { bg: 'bg-lime-200', hover: 'hover:bg-lime-300', text: 'text-lime-900' },
    'Stories': { bg: 'bg-rose-200', hover: 'hover:bg-rose-300', text: 'text-rose-900' },
    'Guides': { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' },
  };

  // Get colors for the specific category, or use default colors
  return categoryColors[category] || { bg: 'bg-gray-200', hover: 'hover:bg-gray-300', text: 'text-gray-900' };
};

// Sample blog posts data for fallback
const sampleBlogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Bella: From Shelter Dog to Family Hero",
    description: "How a rescue Border Collie saved her new family's child and changed their lives forever. This heartwarming story follows Bella's journey from an abandoned shelter dog to becoming an unexpected hero.",
    date: "May 1, 2025",
    image: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1",
    slug: "bella-shelter-dog-hero",
    content: "",
    author: "Dog Quest Team",
    author_image: null,
    category: "Hero Story",
    featured: true,
    status: "published",
    publish_date: "2025-05-01",
    created_at: "2025-05-01T10:00:00Z",
    updated_at: "2025-05-01T10:00:00Z",
    read_time: "5 min"
  },
  {
    id: "2",
    title: "5 Essential Training Tips for New Puppy Owners",
    description: "Start your puppy journey right with these professional trainer-approved techniques. Learn the basics of positive reinforcement, crate training, socialization, and more to help your new puppy become a well-behaved companion.",
    content: "",
    author: "Dog Quest Team",
    author_image: null,
    category: "Training",
    date: "April 28, 2025",
    featured: false,
    status: "published",
    publish_date: "2025-04-28",
    created_at: "2025-04-28T10:00:00Z",
    updated_at: "2025-04-28T10:00:00Z",
    read_time: "5 min",
    image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901",
    slug: "essential-puppy-training-tips"
  },
  {
    id: "3",
    title: "Choosing the Right Diet for Your Dog's Breed",
    description: "Different breeds have different nutritional needs. Learn what's best for your pet based on size, age, activity level, and breed-specific health concerns. Our comprehensive guide helps you navigate dog food options.",
    content: "",
    author: "Dog Quest Team",
    author_image: null,
    category: "Nutrition",
    date: "April 25, 2025",
    featured: false,
    status: "published",
    publish_date: "2025-04-25",
    created_at: "2025-04-25T10:00:00Z",
    updated_at: "2025-04-25T10:00:00Z",
    read_time: "5 min",
    image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04",
    slug: "breed-specific-diets"
  },
  {
    id: "4",
    title: "Understanding Dog Behavior: What Your Pet Is Really Telling You",
    description: "Decode your dog's body language and vocalizations with our expert guide. Learn to recognize signs of stress, happiness, fear, and other emotions to better care for your canine companion.",
    content: "",
    author: "Dog Quest Team",
    author_image: null,
    category: "Health",
    date: "April 22, 2025",
    featured: false,
    status: "published",
    publish_date: "2025-04-22",
    created_at: "2025-04-22T10:00:00Z",
    updated_at: "2025-04-22T10:00:00Z",
    read_time: "5 min",
    image: "https://images.unsplash.com/photo-1472396961693-142e6e269027",
    slug: "understanding-dog-behavior"
  },
  {
    id: "5",
    title: "The Best Dog-Friendly Hiking Trails in Ireland",
    description: "Explore the Emerald Isle with your four-legged friend on these scenic paths. From coastal walks to mountain trails, discover the most beautiful dog-friendly hiking spots across Ireland.",
    content: "",
    author: "Dog Quest Team",
    author_image: null,
    category: "News",
    date: "April 19, 2025",
    featured: false,
    status: "published",
    publish_date: "2025-04-19",
    created_at: "2025-04-19T10:00:00Z",
    updated_at: "2025-04-19T10:00:00Z",
    read_time: "5 min",
    image: "https://images.unsplash.com/photo-1536810853517-c31c0f1b9993",
    slug: "dog-friendly-hiking-ireland"
  },
  {
    id: "6",
    title: "Seasonal Allergies in Dogs: Signs and Solutions",
    description: "Help your pup through pollen season with these veterinarian recommendations. Learn to identify allergy symptoms and discover effective treatments to keep your dog comfortable year-round.",
    content: "",
    author: "Dog Quest Team",
    author_image: null,
    category: "Health",
    date: "April 16, 2025",
    featured: false,
    status: "published",
    publish_date: "2025-04-16",
    created_at: "2025-04-16T10:00:00Z",
    updated_at: "2025-04-16T10:00:00Z",
    read_time: "5 min",
    image: "https://images.unsplash.com/photo-1559715498-345bac2dd56e",
    slug: "seasonal-dog-allergies"
  }
];

const BlogPostDetail: React.FC = () => {
  const params = useParams();
  const slug = params?.slug as string;
  
  // Scroll to top on mount (for blog detail page navigation)
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready and scroll happens after render
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 0);
    return () => clearTimeout(timer);
  }, [slug]);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch the blog post from Supabase
    const fetchBlogPost = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .single();
        
        if (error) {
          console.error('Error fetching blog post:', error);
          // Fallback to sample data
          const foundPost = sampleBlogPosts.find(p => p.slug === slug);
          if (foundPost) {
            setPost(foundPost);
          } else {
            toast({
              title: "Post not found",
              description: "Sorry, we couldn't find the blog post you're looking for.",
              variant: "destructive"
            });
          }
        } else if (data) {
          // Format post with date property for consistency
          const formattedPost = {
            ...data,
            date: data.publish_date || data.created_at.split('T')[0]
          };
          setPost(formattedPost);
          
          // Fetch related posts
          fetchRelatedPosts(formattedPost);
        }
        
        // Set loading to false after handling data
        setLoading(false);
      } catch (error) {
        console.error('Error in blog post fetch:', error);
        setLoading(false);
      }
    };

    // Fetch related posts based on category
    const fetchRelatedPosts = async (currentPost: BlogPost) => {
      try {
        // Get primary category for fetching related posts
        const mainCategory = Array.isArray(currentPost.category) 
          ? currentPost.category[0] 
          : currentPost.category;
        
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .filter('category', 'cs', `{${mainCategory}}`) // Filter using containment operator for arrays
          .neq('id', currentPost.id)
          .eq('status', 'published')
          .limit(3);
        
        if (error) {
          console.error('Error fetching related posts:', error);
          // Fallback to sample data
          const sampleRelated = sampleBlogPosts
            .filter(p => p.id !== currentPost.id)
            .slice(0, 3);
          setRelatedPosts(sampleRelated);
        } else if (data && data.length > 0) {
          // Format posts with date property for consistency
          const formattedPosts = data.map((post) => ({
            ...post,
            date: post.publish_date || post.created_at.split('T')[0]
          }));
          setRelatedPosts(formattedPosts);
        } else {
          // Not enough related posts from API, use sample data
          const sampleRelated = sampleBlogPosts
            .filter(p => p.id !== currentPost.id)
            .slice(0, 3);
          setRelatedPosts(sampleRelated);
        }
      } catch (error) {
        console.error('Error in related posts fetch:', error);
      }
    };

    if (slug) {
      fetchBlogPost();
    }
  }, [slug, toast]);

  // Don't render anything during initial load
  if (loading && !post) {
    return null;
  }

  // Render not found state
  if (!post) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-berkshire text-brand-dark-green mb-4">Blog Post Not Found</h1>
        <p className="mb-8">The blog post you're looking for doesn't exist or has been moved.</p>
        <Button asChild>
          <Link href="/blog">Return to Blog</Link>
        </Button>
      </div>
    );
  }

  // Get the date for display
  const displayDate = post.date || (post.publish_date || post.created_at.split('T')[0]);
  
  // Get the categories for display
  const categories = Array.isArray(post.category) ? post.category : [post.category];

  // Safely join categories for meta tags
  const categoriesKeywords = categories
    .filter(cat => cat) // Filter out null/undefined
    .map(cat => typeof cat === 'string' ? safeToLowerCase(cat) : '')
    .join(', ');

  return (
    <>
      
      <div className="container mx-auto px-4 py-6">
        {/* Blog post header */}
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-4">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {displayDate}
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category, index) => {
                const categoryColor = getTagColor(category);
                return (
                  <Badge 
                    key={`${category}-${index}`}
                    className={`${categoryColor.bg} ${categoryColor.hover} ${categoryColor.text} px-3 py-1`}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {category}
                  </Badge>
                );
              })}
            </div>
          </div>
          
          {/* Featured image with rounded corners */}
          <div className="mb-8 flex justify-center">
            <div className="max-w-3xl w-full">
              {post.image && (
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-auto h-auto max-h-[500px] object-contain mx-auto rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Blog content in article tag with appropriate semantic structure */}
        <article className="prose prose-lg max-w-4xl mx-auto mb-12">
          <p className="text-lg leading-relaxed mb-6">{post.description}</p>
          
          {/* Actual blog content - preserving line breaks and formatting */}
          <div className="whitespace-pre-wrap">
            {post.content}
          </div>
        </article>
        
        {/* Author section */}
        <div className="max-w-4xl mx-auto border-t border-gray-200 pt-8 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-soft-green flex items-center justify-center text-white">
                DQ
              </div>
              <div>
                <p className="font-medium text-brand-dark-green">Written by Dog Quest Team</p>
                <p className="text-sm text-gray-500">Dog lovers & experts</p>
              </div>
            </div>
            <Button variant="outline" asChild className="flex items-center">
              <Link href="/blog">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Blog
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Related posts section - outside main container */}
      <div className="bg-[#E1E8E0] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="font-berkshire text-2xl text-brand-dark-green mb-6">
            You might also like...
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((relatedPost) => (
              <BlogCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPostDetail;
