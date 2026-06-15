
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BlogPost } from '@/types/blog';
import Link from 'next/link';

interface BlogCardProps {
  post: BlogPost;
}

// Function to get tag color based on category name
const getTagColor = (category: string | null | undefined) => {
  if (!category) {
    return { bg: 'bg-gray-200', hover: 'hover:bg-gray-300', text: 'text-gray-900' };
  }

  const categoryColors: Record<string, { bg: string, hover: string, text: string }> = {
    'Guides': { bg: 'bg-violet-200', hover: 'hover:bg-violet-300', text: 'text-violet-900' }, // Added Guides category
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
  };

  return categoryColors[category] || { bg: 'bg-gray-200', hover: 'hover:bg-gray-300', text: 'text-gray-900' };
};

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  const getDate = () => {
    if (post.date) return post.date;
    return post.publish_date || post.created_at.split('T')[0];
  };

  // Normalize categories to always be an array
  const categories = Array.isArray(post.category)
    ? post.category.slice(0, 3) // take max 3
    : post.category
    ? [post.category]
    : [];
    
  // Check if any category is "Hero Story" with case-insensitive comparison
  const isHeroStory = categories.some(cat => 
    typeof cat === 'string' && cat.toLowerCase() === "hero story"
  );

  const cardClasses = isHeroStory 
    ? "h-full hover:shadow-md transition-shadow duration-300 cursor-pointer group border-amber-300 border-4" 
    : "h-full hover:shadow-md transition-shadow duration-300 cursor-pointer group";

  return (
    <Card className={cardClasses}>
      <Link href={`/blog/${post.slug || '#'}`} className="block">
        <div className="relative aspect-square overflow-hidden">
          {post.image && (
            <img 
              src={post.image} 
              alt={post.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 media-scroll-fix" 
              draggable={false} 
            />
          )}
          {/* Render up to 3 category pills */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {categories.map((cat) => {
              const color = getTagColor(cat);
              return (
                <Badge
                  key={cat}
                  className={`${color.bg} ${color.hover} ${color.text} px-3 py-1 text-sm`}
                >
                  {cat}
                </Badge>
              );
            })}
          </div>
        </div>
      </Link>
      <CardContent className="p-5 space-y-3">
        <p className="text-sm text-gray-500">
          {getDate()}
        </p>
        <Link href={`/blog/${post.slug || '#'}`} className="block">
          <h3 className="font-berkshire text-2xl text-brand-soft-green line-clamp-2 min-h-[3.5rem] hover:text-brand-soft-green transition-colors">
            {post.title}
          </h3>
        </Link>
        <p className="text-gray-600 line-clamp-2 min-h-[3rem]">
          {post.description}
        </p>
        <Button 
          variant="link" 
          className="p-0 h-auto text-brand-soft-green hover:text-brand-dark-green"
          asChild
        >
          <Link href={`/blog/${post.slug || '#'}`}>
            Read More <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
