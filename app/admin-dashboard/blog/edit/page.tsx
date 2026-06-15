'use client';

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";
import { BlogPost } from "@/types/blog";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { PREDEFINED_BLOG_CATEGORIES } from "@/lib/constants/blog-categories";
import { useBlogEditorPersistence } from "@/hooks/useBlogEditorPersistence";
import { blogSlugSuffixFromPostId, generateBlogSlug } from "@/lib/utils/blog-slug";
import { setExclusiveFeaturedPost } from "@/lib/utils/blog-featured";
import { BlogFeaturedField } from "@/components/admin-dashboard/BlogFeaturedField";
import LoadingSpinner from "@/components/ui/loading-spinner";

const PREDEFINED_CATEGORIES = [...PREDEFINED_BLOG_CATEGORIES];

function AdminBlogEditPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get('id') ?? '';
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: [] as string[],
    status: "draft",
    image: "",
    featured: false,
    author: "",
  });

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const {
    saveStatusLabel,
    hydrateFromServer,
    clearBackup,
  } = useBlogEditorPersistence({
    mode: 'edit',
    postId,
    legacySlug: post?.slug,
    formData,
    setFormData,
    ready: !loading && !!post,
  });

  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    if (!postId) {
      router.replace('/admin-dashboard/blog');
      return;
    }
    fetchBlogPost();
  }, [postId]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('blog_posts').select('category');
        if (error) {
          console.error('Error fetching categories:', error);
        } else if (data) {
          const existingCategories = [...new Set(data.flatMap((p) =>
            Array.isArray(p.category) ? p.category : (p.category ? [p.category] : [])
          ))];
          setAllCategories([...new Set([...existingCategories, ...PREDEFINED_CATEGORIES])]);
        }
      } catch (error) {
        console.error('Unexpected error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const fetchBlogPost = async () => {
    const fetchId = ++fetchGenerationRef.current;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (fetchId !== fetchGenerationRef.current) return;

      if (error) {
        console.error('Error fetching blog post:', error);
      }

      if (!data) {
        router.replace('/admin-dashboard/blog');
        return;
      }

      setPost(data);
      const category = Array.isArray(data.category)
        ? data.category
        : data.category
          ? [data.category]
          : [];

      setFormData(
        hydrateFromServer(
          {
            title: data.title,
            description: data.description,
            content: data.content,
            category,
            status: data.status,
            image: data.image || "",
            featured: data.featured,
            author: data.author,
          },
          data.slug,
        ),
      );
    } catch (error) {
      if (fetchId !== fetchGenerationRef.current) return;
      console.error('Unexpected error:', error);
      router.replace('/admin-dashboard/blog');
    } finally {
      if (fetchId === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked });
  };

  const handleAddCategory = (category: string) => {
    if (category && !formData.category.includes(category)) {
      setFormData({ ...formData, category: [...formData.category, category] });
    }
    setNewCategory("");
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setFormData({
      ...formData,
      category: formData.category.filter((cat) => cat !== categoryToRemove),
    });
  };

  const handleImageChange = (url: string | null) => {
    setFormData({ ...formData, image: url || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (formData.featured) {
        await setExclusiveFeaturedPost(postId);
      }

      const submissionData = {
        ...formData,
        slug: generateBlogSlug(formData.title, blogSlugSuffixFromPostId(postId)),
        updated_at: new Date().toISOString(),
        publish_date: formData.status === 'published' ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('blog_posts')
        .update(submissionData)
        .eq('id', postId);

      if (error) {
        console.error('Error saving blog post:', error);
        toast({
          title: "Error",
          description: "Failed to save blog post. Please try again.",
          variant: "destructive",
        });
      } else {
        clearBackup();
        toast({
          title: "Success",
          description: "Blog post updated successfully.",
        });
        router.push('/admin-dashboard/blog');
      }
    } catch (error) {
      console.error('Unexpected error during save:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container p-6">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin-dashboard/blog')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Blog Post</h1>
              <p className="text-sm text-muted-foreground">{saveStatusLabel}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push('/admin-dashboard/blog')}>
              Cancel
            </Button>
            <Button type="submit" form="blog-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save Blog Post'}
            </Button>
          </div>
        </div>

        <form id="blog-form" onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" value={formData.title} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={3} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea id="content" name="content" value={formData.content} onChange={handleInputChange} rows={10} required />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Categories</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.category.map((cat) => (
                          <Badge key={cat} className="flex items-center gap-1">
                            {cat}
                            <button type="button" onClick={() => handleRemoveCategory(cat)} className="ml-1 rounded-full hover:bg-gray-200 p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Select
                        value={newCategory === "custom" ? "" : newCategory}
                        onValueChange={(value) => {
                          if (value === "custom") setNewCategory("custom");
                          else { setNewCategory(value); handleAddCategory(value); }
                        }}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {allCategories.filter((cat) => !formData.category.includes(cat)).sort().map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                          <SelectItem value="custom">Add Custom Category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image">Featured Image</Label>
                      <ImageUploader value={formData.image} onChange={handleImageChange} bucketName="blog-images" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="author">Author</Label>
                      <Input id="author" name="author" value={formData.author} onChange={handleInputChange} required />
                    </div>

                    <BlogFeaturedField
                      checked={formData.featured}
                      onCheckedChange={(checked) => handleSwitchChange('featured', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}

export default function AdminBlogEditPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage label="Loading editor..." />}>
      <AdminBlogEditPageInner />
    </Suspense>
  );
}
