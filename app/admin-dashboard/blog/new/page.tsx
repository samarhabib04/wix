'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Badge } from "@/components/ui/badge";
import { PREDEFINED_BLOG_CATEGORIES } from "@/lib/constants/blog-categories";
import { useBlogEditorPersistence } from "@/hooks/useBlogEditorPersistence";
import { generateBlogSlug } from "@/lib/utils/blog-slug";
import { setExclusiveFeaturedPost } from "@/lib/utils/blog-featured";
import { BlogFeaturedField } from "@/components/admin-dashboard/BlogFeaturedField";

const PREDEFINED_CATEGORIES = [...PREDEFINED_BLOG_CATEGORIES];

export default function AdminBlogNewPage() {
  const router = useRouter();
  const { toast } = useToast();

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

  const {
    saveStatusLabel,
    clearBackup,
  } = useBlogEditorPersistence({
    mode: 'new',
    formData,
    setFormData,
    ready: !loading,
  });

  // Fetch all existing categories and combine with predefined ones
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("category");

        if (error) {
          console.error("Error fetching categories:", error);
        } else if (data) {
          // Flatten the array of category arrays and remove duplicates
          const existingCategories = [
            ...new Set(
              data.flatMap((post: any) =>
                Array.isArray(post.category)
                  ? post.category
                  : post.category
                  ? [post.category]
                  : []
              )
            ),
          ];

          // Combine existing categories with predefined ones and remove duplicates
          const combinedCategories = [
            ...new Set([...existingCategories, ...PREDEFINED_CATEGORIES]),
          ];

          setAllCategories(combinedCategories);
        }
      } catch (error) {
        console.error("Unexpected error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  // Handle adding a category
  const handleAddCategory = (category: string) => {
    if (category && !formData.category.includes(category)) {
      setFormData({
        ...formData,
        category: [...formData.category, category],
      });
    }
    setNewCategory("");
  };

  // Handle removing a category
  const handleRemoveCategory = (categoryToRemove: string) => {
    setFormData({
      ...formData,
      category: formData.category.filter((cat) => cat !== categoryToRemove),
    });
  };

  // Handle image change
  const handleImageChange = (url: string | null) => {
    setFormData({
      ...formData,
      image: url || "",
    });
  };

  // Form validation (same behavior as Lovable)
  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "Content is required",
        variant: "destructive",
      });
      return false;
    }

    if (formData.category.length === 0) {
      toast({
        title: "Error",
        description: "At least one category is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.image) {
      toast({
        title: "Error",
        description: "Featured image is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.author.trim()) {
      toast({
        title: "Error",
        description: "Author name is required",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const postSlug = generateBlogSlug(formData.title);

      const submissionData = {
        ...formData,
        slug: postSlug,
        updated_at: new Date().toISOString(),
        publish_date:
          formData.status === "published" ? new Date().toISOString() : null,
      };

      const { data: created, error } = await supabase
        .from("blog_posts")
        .insert(submissionData)
        .select("id")
        .single();

      if (error) {
        console.error("Error saving blog post:", error);
        toast({
          title: "Error",
          description: "Failed to save blog post. Please try again.",
          variant: "destructive",
        });
      } else {
        if (formData.featured && created?.id) {
          await setExclusiveFeaturedPost(created.id);
        }
        clearBackup();
        toast({
          title: "Success",
          description: "Blog post created successfully.",
          variant: "default",
        });
        router.push("/admin-dashboard/blog");
      }
    } catch (error) {
      console.error("Unexpected error during save:", error);
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin-dashboard/blog")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Blog Post</h1>
              <p className="text-sm text-muted-foreground">{saveStatusLabel}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/admin-dashboard/blog")}
            >
              Cancel
            </Button>
            <Button type="submit" form="blog-form" disabled={saving}>
              {saving ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Saving...
                </span>
              ) : (
                "Save Blog Post"
              )}
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
                      <Label htmlFor="title">Title*</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Blog post title"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description*</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Short description for this post"
                        rows={3}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content*</Label>
                      <Textarea
                        id="content"
                        name="content"
                        value={formData.content}
                        onChange={handleInputChange}
                        placeholder="Blog post content"
                        rows={10}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status*</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          handleSelectChange("status", value)
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Categories*</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.category.map((cat) => (
                          <Badge key={cat} className="flex items-center gap-1">
                            {cat}
                            <button
                              type="button"
                              onClick={() => handleRemoveCategory(cat)}
                              className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove {cat}</span>
                            </button>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex space-x-2">
                        <Select
                          value={newCategory}
                          onValueChange={(value) => {
                            setNewCategory(value);
                            if (value === "custom") return;
                            handleAddCategory(value);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {allCategories
                              .filter(
                                (cat) => !formData.category.includes(cat)
                              )
                              .sort()
                              .map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            <SelectItem value="custom">
                              Add Custom Category
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newCategory === "custom" && (
                        <div className="flex mt-2 space-x-2">
                          <Input
                            placeholder="Enter new category"
                            value={newCategory === "custom" ? "" : newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => handleAddCategory(newCategory)}
                            variant="secondary"
                            size="sm"
                          >
                            Add
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image">Featured Image*</Label>
                      <ImageUploader
                        value={formData.image}
                        onChange={handleImageChange}
                        bucketName="blog-images"
                        required={true}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="author">Author*</Label>
                      <Input
                        id="author"
                        name="author"
                        value={formData.author}
                        onChange={handleInputChange}
                        placeholder="Author name"
                        required
                      />
                    </div>

                    <BlogFeaturedField
                      checked={formData.featured}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("featured", checked)
                      }
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




























