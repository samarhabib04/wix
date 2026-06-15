'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BlogCard } from '@/components/blog/BlogCard';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { BlogPost } from '@/types/blog';
import { supabase } from '@/lib/supabase/client';
import NavigationSection from '@/components/NavigationSection';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  pickBlogPageHeroPosts,
  pickBlogPageRegularPosts,
} from '@/lib/utils/blog-posts';

const getTagColor = (category: string | string[] | null | undefined) => {
  const categoryColors: Record<string, { bg: string, hover: string, text: string }> = {
    'guides': { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' }, // Added Guides category
    'hero story': { bg: 'bg-amber-200', hover: 'hover:bg-amber-300', text: 'text-amber-900' },
    'health': { bg: 'bg-emerald-200', hover: 'hover:bg-emerald-300', text: 'text-emerald-900' },
    'training': { bg: 'bg-sky-200', hover: 'hover:bg-sky-300', text: 'text-sky-900' },
    'nutrition': { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' },
    'news': { bg: 'bg-blue-200', hover: 'hover:bg-blue-300', text: 'text-blue-900' },
    'puppy tips': { bg: 'bg-pink-200', hover: 'hover:bg-pink-300', text: 'text-pink-900' },
    'behavior': { bg: 'bg-indigo-200', hover: 'hover:bg-indigo-300', text: 'text-indigo-900' },
    'adoption': { bg: 'bg-teal-200', hover: 'hover:bg-teal-300', text: 'text-teal-900' },
    'breeds': { bg: 'bg-orange-200', hover: 'hover:bg-orange-300', text: 'text-orange-900' },
    'care': { bg: 'bg-lime-200', hover: 'hover:bg-lime-300', text: 'text-lime-900' },
    'stories': { bg: 'bg-rose-200', hover: 'hover:bg-rose-300', text: 'text-rose-900' },
  };

  // Handle null, undefined or array cases
  if (category === null || category === undefined) {
    return {
      bg: 'bg-gray-200',
      hover: 'hover:bg-gray-300',
      text: 'text-gray-900'
    };
  }

  // If category is an array, use the first category
  const categoryToUse = Array.isArray(category) ? category[0] || '' : category;
  
  // Normalize the input category string
  const normalized = typeof categoryToUse === 'string' ? categoryToUse.toLowerCase() : '';
  return categoryColors[normalized] || {
    bg: 'bg-gray-200',
    hover: 'hover:bg-gray-300',
    text: 'text-gray-900'
  };
};


const Blog = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [heroStories, setHeroStories] = useState<BlogPost[]>([]);
  const [regularPosts, setRegularPosts] = useState<BlogPost[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const postsPerPage = 6;
  const isMobile = useIsMobile();

  // Fetch blog posts from Supabase
  useEffect(() => {
    const fetchBlogPosts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .order('publish_date', { ascending: false });
        
        if (error) {
          console.error('Error fetching blog posts:', error);
        } else if (data && data.length > 0) {
          // Format posts with date property for consistency
          const formattedPosts = data.map((post) => ({
            ...post,
            date: post.publish_date || undefined
          }));
          setBlogPosts(formattedPosts);

          const heroStoriesArray = pickBlogPageHeroPosts(formattedPosts);
          const regularPostsArray = pickBlogPageRegularPosts(
            formattedPosts,
            heroStoriesArray,
          );

          setHeroStories(heroStoriesArray);
          setRegularPosts(regularPostsArray);

          const uniqueCategories = new Set<string>();
          regularPostsArray.forEach((post) => {
            if (!post.category) return;
            if (Array.isArray(post.category)) {
              post.category.forEach((cat) => {
                if (cat && typeof cat === 'string') uniqueCategories.add(cat);
              });
            } else if (typeof post.category === 'string') {
              uniqueCategories.add(post.category);
            }
          });

          setAvailableCategories(Array.from(uniqueCategories));
        }
      } catch (error) {
        console.error('Error in blog posts fetch:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogPosts();
  }, []);

  // Filter posts based on selected categories and maintain the sort order
  const filteredPosts = selectedCategories.length > 0
    ? regularPosts.filter(post => {
        // Handle array of categories or single category string
        if (Array.isArray(post.category)) {
          return post.category.some(cat => selectedCategories.includes(cat));
        }
        // Handle single category as string
        return post.category && selectedCategories.includes(post.category as string);
      })
    : regularPosts;

  // Calculate pagination
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  // Handle category selection
  const handleCategoryChange = (value: string[]) => {
    setSelectedCategories(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedCategories([]);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of container
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-berkshire mb-4">Loading Blog Posts...</h2>
        <p>Please wait while we fetch the latest stories.</p>
      </div>
    );
  }

  // Carousel options based on device type
  const carouselOptions = {
    loop: !isMobile, // Disable infinite loop on mobile
    align: 'start' as const, // TypeScript fix: using const assertion 
    dragFree: !isMobile, // More controlled sliding on mobile
    skipSnaps: !isMobile, // Snap directly to items on mobile
  };

  return (
    <>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Page Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-berkshire text-4xl md:text-4xl lg:text-5xl text-brand-dark-green mb-4">
            Dog Quest Stories & Blog
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Helpful tips, heartwarming stories, and expert advice.
          </p>
        </motion.div>

        {/* Hero Stories Carousel */}
        {heroStories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-berkshire text-brand-soft-green">Hero Stories</h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                Featured posts and Hero Story category
              </p>
            </div>
            
            <Carousel
              opts={carouselOptions}
              className="w-full"
            >
              <CarouselContent>
                {heroStories.map((post) => (
                  <CarouselItem 
                    key={post.id} 
                    className="pl-4 md:basis-[30.75%] basis-[80%]"
                  >
                    <BlogCard post={post} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-2 mt-4">
                <CarouselPrevious className="static translate-y-0 mx-2" />
                <CarouselNext className="static translate-y-0 mx-2" />
              </div>
            </Carousel>
          </motion.div>
        )}

        {/* Blog Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-12 mb-8"
        >
          <h2 className="text-3xl font-berkshire text-brand-soft-green">Blog</h2>
        </motion.div>

        {/* Filter Section */}
        {availableCategories.length > 0 && (
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex flex-row sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-medium text-gray-700">Filter by category:</h2>
              
              {selectedCategories.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleResetFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Reset Filters <X className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
            
            <ToggleGroup 
              type="multiple" 
              value={selectedCategories}
              onValueChange={handleCategoryChange}
              className="flex flex-wrap gap-2 items-start"
            >
              {availableCategories.map(category => {
                const categoryColor = getTagColor(category);
                return (
                  <ToggleGroupItem 
                    key={category} 
                    value={category}
                    aria-label={`Filter by ${category}`}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${categoryColor.bg} ${categoryColor.hover} ${categoryColor.text} border-transparent`}
                  >
                    {category}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </motion.div>
        )}

        {/* Regular Blog Grid */}
        {currentPosts.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          >
            {currentPosts.map(post => (
              <motion.div key={post.id} variants={itemVariants}>
                <BlogCard post={post} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-16 text-center">
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No blog posts found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your filters or check back later for new content.
            </p>
            <Button onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {filteredPosts.length > postsPerPage && (
          <Pagination className="my-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    isActive={currentPage === index + 1}
                    onClick={() => handlePageChange(index + 1)}
                    className="cursor-pointer"
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
      <NavigationSection />
    </>
  );
};

export default Blog;
