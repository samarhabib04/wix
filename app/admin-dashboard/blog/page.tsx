'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Plus, Eye, Star } from "lucide-react";
import { BlogPost } from "@/types/blog";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TruncatedCellText from "@/components/admin-dashboard/TruncatedCellText";

const safeToLowerCase = (value: string | string[] | null | undefined): string => {
  if (typeof value === 'string') {
    return value.toLowerCase();
  } else if (Array.isArray(value) && value.length > 0) {
    return typeof value[0] === 'string' ? value[0].toLowerCase() : '';
  } else {
    return '';
  }
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short', 
      year: 'numeric'
    });
  } catch (e) {
    return 'Invalid date';
  }
};

const truncateText = (text: string, maxLength = 60) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export default function AdminBlogPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    const fetchBlogPosts = async () => {
      setLoading(true);
      try {

        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('AdminBlogPage: Error fetching blog posts:', error);
          toast({
            title: "Error",
            description: "Failed to load blog posts. Please try again.",
            variant: "destructive"
          });
        } else if (data) {

          setBlogPosts(data);
        }
      } catch (error) {
        console.error('AdminBlogPage: Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBlogPosts();
  }, [toast]);
  
  const getStatusBadge = (status: string) => {
    switch(safeToLowerCase(status)) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{status}</Badge>;
      case 'draft':
        return <Badge variant="outline" className="border-amber-500 text-amber-700">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const handleEditPost = (post: BlogPost) => {
    if (!post.id) return;
    router.push(`/admin-dashboard/blog/edit?id=${encodeURIComponent(post.id)}`);
  };
  
  const handleDeletePost = async (id: string) => {
    if (confirm("Are you sure you want to delete this blog post? This action cannot be undone.")) {
      try {
        const { error } = await supabase
          .from('blog_posts')
          .delete()
          .eq('id', id);
          
        if (error) {
          toast({
            title: "Error",
            description: "Failed to delete blog post. Please try again.",
            variant: "destructive"
          });
          console.error('Error deleting blog post:', error);
        } else {
          toast({
            title: "Success",
            description: "Blog post deleted successfully.",
            variant: "default"
          });
          setBlogPosts(blogPosts.filter(post => post.id !== id));
        }
      } catch (error) {
        console.error('Unexpected error during deletion:', error);
      }
    }
  };
  
  return (
    <div className="container p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blog Management</h1>
        <Button className="flex items-center gap-2" asChild>
          <Link href="/admin-dashboard/blog/new">
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : blogPosts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-700">No blog posts found</h3>
          <p className="text-gray-500 mt-2">Create your first blog post to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table className="table-fixed min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blogPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">
                    <TruncatedCellText text={post.title} maxChars={50} className="max-w-[240px]" />
                  </TableCell>
                  <TableCell>
                    <TruncatedCellText
                      text={Array.isArray(post.category) && post.category.length > 0 
                        ? post.category[0] 
                        : (typeof post.category === 'string' ? post.category : 'Uncategorized')}
                      maxChars={20}
                      className="max-w-[140px]"
                    />
                  </TableCell>
                  <TableCell>{getStatusBadge(post.status)}</TableCell>
                  <TableCell>
                    {post.featured ? (
                      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-200 gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Homepage
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(post.publish_date || post.created_at)}</TableCell>
                  <TableCell>
                    <TruncatedCellText text={post.author || 'Unknown'} maxChars={20} className="max-w-[140px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        asChild
                      >
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditPost(post)}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

