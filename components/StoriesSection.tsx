'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { BlogPost } from '@/types/blog';
import {
  pickHomepageHeroPost,
  pickHomepageRecentPosts,
} from '@/lib/utils/blog-posts';

interface StoriesBlogPost extends BlogPost {
  isHeroStory?: boolean;
}

// Helper function to safely get category
const getCategoryText = (category: string | string[] | undefined | null): string => {
  if (!category) return '';
  if (Array.isArray(category) && category.length > 0) return category[0];
  if (typeof category === 'string') return category;
  return '';
};

// Helper function to get tag color based on category name
const getTagColor = (category: string | null) => {
  if (!category) return { bg: 'bg-gray-200', hover: 'hover:bg-gray-300', text: 'text-gray-900' };
  
  const lowerCategory = category.toLowerCase();
  
  const categoryColors: Record<string, { bg: string, hover: string, text: string }> = {
    'guides': { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' }, 
    'hero story': { bg: 'bg-amber-200', hover: 'hover:bg-amber-300', text: 'text-amber-900' },
    'health': { bg: 'bg-emerald-200', hover: 'hover:bg-emerald-300', text: 'text-emerald-900' },
    'training': { bg: 'bg-sky-200', hover: 'hover:bg-sky-300', text: 'text-sky-900' },
    'nutrition': { bg: 'bg-purple-200', hover: 'hover:bg-purple-300', text: 'text-purple-900' },
    'news': { bg: 'bg-blue-200', hover: 'hover:bg-blue-300', text: 'text-blue-900' },
    'puppy tips': { bg: 'bg-pink-200', hover: 'hover:bg-pink-300', text: 'text-pink-900' },
    'behavior': { bg: 'bg-indigo-200', hover: 'hover:bg-indigo-300', text: 'text-indigo-900' },
    'adoption': { bg: 'bg-teal-200', hover: 'hover:bg-teal-300', text: 'text-teal-900' },
    'breeds': { bg: 'bg-orange-200', hover: 'hover:bg-orange-300', text: 'text-orange-900' },
    'care': { bg: 'bg-lime-200', hover: 'hover:bg-lime-300', text: 'text-lime-900' },
    'stories': { bg: 'bg-rose-200', hover: 'hover:bg-rose-300', text: 'text-rose-900' },
  };
  
  return categoryColors[lowerCategory] || { bg: 'bg-gray-200', hover: 'hover:bg-gray-300', text: 'text-gray-900' };
};

const HeroStory = ({ post }: { post: StoriesBlogPost }) => {
  const categoryText = getCategoryText(post.category);
  const tagColor = getTagColor(categoryText);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="h-full"
    >
      <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer group border-amber-300 border-4">
        <Link href={`/blog/${post.slug || '#'}`} className="block">
          <div className="relative aspect-square overflow-hidden">
            <img 
              src={post.image ?? '/placeholder.svg'} 
              alt={post.title} 
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105 media-scroll-fix" 
              draggable={false}
            />
            {categoryText && (
              <div className="absolute top-4 left-4">
                <Badge className={`${tagColor.bg} ${tagColor.hover} ${tagColor.text} px-3 py-1`}>
                  {categoryText}
                </Badge>
              </div>
            )}
          </div>
        </Link>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <p className="text-sm text-brand-soft-green font-medium">
              {post.date || post.publish_date}
            </p>
            <Link href={`/blog/${post.slug || '#'}`} className="block">
              <h3 className="font-berkshire text-xl md:text-2xl text-brand-dark-green line-clamp-2 hover:text-brand-soft-green transition-colors">
                {post.title}
              </h3>
            </Link>
            <p className="text-gray-600 line-clamp-2">
              {post.description}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="mt-2 border-2 border-brand-soft-green text-brand-soft-green hover:bg-brand-soft-green hover:text-white group-hover:border-brand-dark-green group-hover:text-brand-dark-green"
            asChild
          >
            <Link href={`/blog/${post.slug || '#'}`}>
              Read More <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const BlogPostCard = ({ post }: { post: StoriesBlogPost }) => {
  // Get the date from either post.date or post.publish_date
  const getDate = () => {
    if (post.date) return post.date;
    return post.publish_date || (post.created_at && post.created_at.split('T')[0]);
  };
  
  const categoryText = getCategoryText(post.category);
  const tagColor = getTagColor(categoryText);

  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-300 cursor-pointer group">
            <Link href={`/blog/${post.slug || '#'}`} className="block">
        <div className="relative aspect-square overflow-hidden">
           <img 
            src={post.image ?? '/placeholder.svg'} 
            alt={post.title} 
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105 media-scroll-fix" 
            draggable={false}
           />
          {categoryText && (
            <div className="absolute top-3 left-3">
              <Badge className={`${tagColor.bg} ${tagColor.hover} ${tagColor.text} text-xs px-2 py-1`}>
                {categoryText}
              </Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500">
            {getDate()}
          </p>
          <Link href={`/blog/${post.slug || '#'}`} className="block">
            <h4 className="font-medium text-brand-dark-green line-clamp-2 hover:text-brand-soft-green transition-colors">
              {post.title}
            </h4>
          </Link>
        </div>
        <Button 
          variant="link" 
          className="p-0 h-auto text-brand-soft-green hover:text-brand-dark-green text-sm"
          asChild
        >
          <Link href={`/blog/${post.slug || '#'}`}>
            Read More <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

const StoriesSection: React.FC = () => {
  const isMobile = useIsMobile();
  const [blogPosts, setBlogPosts] = useState<StoriesBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchBlogPosts() {
      try {

        // Simplified query without complex filters that might cause RLS issues
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .order('publish_date', { ascending: false })
          .limit(20);

        if (error) {
          console.error('StoriesSection: Error fetching blog posts:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const formattedPosts: StoriesBlogPost[] = data.map((post) => ({
            ...post,
            date: post.publish_date || post.created_at?.split('T')[0],
          }));

          setBlogPosts(formattedPosts);
        }
      } catch (error) {
        console.error('StoriesSection: Error in blog posts fetch:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBlogPosts();
  }, []);
  
  const heroStory = pickHomepageHeroPost(blogPosts);
  const regularPosts = pickHomepageRecentPosts(blogPosts, heroStory, 6);
  
  // Loading state
  if (loading) {
    return (
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-4"
            >
              Stories from the Dog Quest Community
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-600 max-w-2xl mx-auto"
            >
              Loading stories...
            </motion.p>
          </div>
        </div>
      </section>
    );
  }
  
  // No posts state
  if (blogPosts.length === 0) {
    return (
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-4"
            >
              Stories from the Dog Quest Community
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-600 max-w-2xl mx-auto"
            >
              No stories available at the moment. Check back soon!
            </motion.p>
          </div>
        </div>
      </section>
    );
  }
  
  return (
    <>
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-berkshire text-brand-dark-green mb-4"
            >
              Stories from the Dog Quest Community
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-600 max-w-2xl mx-auto mb-6"
            >
              A new Hero Story is shared every week - celebrating dogs, breeders, rescues, and happy families.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button 
                asChild
                className="bg-brand-soft-green hover:bg-brand-dark-green text-white"
              >
                <Link href="/blog">
                  View All Stories <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Hero Story - Left Side on desktop, top on mobile */}
            {heroStory && (
              <div className="w-full md:w-1/2">
                <HeroStory post={heroStory} />
              </div>
            )}
            
            {/* Recent Blog Posts - Right Side on desktop, bottom on mobile */}
            <div className="w-full md:w-1/2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="h-full"
              >
                <h3 className="text-xl font-berkshire text-brand-dark-green mt-6 md:mt-20 mb-4">Recent Blog Posts</h3>
                {isMobile ? (
                  <Carousel
                    opts={{
                      align: 'start',
                      loop: false,
                      dragFree: false,
                      skipSnaps: false,
                    }}
                    className="w-full"
                  >
                    <CarouselContent>
                      {regularPosts.map((post) => (
                        <CarouselItem key={post.id} className="basis-full">
                          <BlogPostCard post={post} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <div className="flex justify-end gap-2 mt-8">
                      <CarouselPrevious className="relative -left-0 h-8 w-8" />
                      <CarouselNext className="relative -right-0 h-8 w-8" />
                    </div>
                  </Carousel>
                ) : (
                  <ScrollArea className="h-[550px] pr-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {regularPosts.map((post) => (
                        <div key={post.id} className="h-full">
                          <BlogPostCard post={post} />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Bottom Wave */}
      <div className="w-full overflow-hidden">
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="w-full h-[60px] md:h-[80px] relative block"
        >
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            className="fill-white"
          ></path>
        </svg>
      </div>
    </>
  );
};

export default StoriesSection;
