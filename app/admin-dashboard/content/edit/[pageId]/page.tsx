'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContentSection {
  question?: string;
  answer?: string;
  hasLink?: boolean;
  linkText?: string;
  linkUrl?: string;
  heading?: string;
  content?: string;
}

interface PageContent {
  page_id: string;
  page_title: string;
  page_path: string;
  content: {
    sections?: ContentSection[];
    hero?: { title: string; subtitle: string };
    mission?: string;
    founders?: Array<{ name: string; role: string; bio: string }>;
    values?: string[];
  };
  meta_description: string;
}

export default function AdminEditContentPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.pageId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Store original values to detect actual changes
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalMetaDescription, setOriginalMetaDescription] = useState("");
  const [originalSections, setOriginalSections] = useState<ContentSection[]>([]);
  
  // State for remove confirmation dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [sectionToRemove, setSectionToRemove] = useState<number | null>(null);

  useEffect(() => {
    if (pageId) {
      loadPageContent();
    }
  }, [pageId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const loadPageContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("page_content")
        .select("*")
        .eq("page_id", pageId)
        .single();

      if (error) throw error;

      setPageContent(data as PageContent);
      const loadedTitle = data.page_title;
      const loadedMetaDescription = data.meta_description || "";
      const contentData = data.content as PageContent['content'];
      const loadedSections = contentData?.sections || [];
      
      // Set current values
      setTitle(loadedTitle);
      setMetaDescription(loadedMetaDescription);
      setSections(loadedSections);
      
      // Store original values for comparison
      setOriginalTitle(loadedTitle);
      setOriginalMetaDescription(loadedMetaDescription);
      setOriginalSections(JSON.parse(JSON.stringify(loadedSections))); // Deep copy
      setHasChanges(false); // Reset changes flag
    } catch (error: any) {
      console.error("Error loading content:", error);
      toast.error("Failed to load page content");
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async (sectionsToSave: ContentSection[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("page_content")
        .update({
          page_title: title,
          meta_description: metaDescription,
          content: { sections: sectionsToSave } as any,
          last_edited_at: new Date().toISOString(),
        })
        .eq("page_id", pageId);

      if (error) {
        console.error("Error saving content:", error);
        toast.error("Failed to save content", {
          description: error.message || "Please try again or check your connection."
        });
        return false;
      }

      toast.success("Content saved successfully!", {
        description: "Your changes have been saved to the database."
      });
      
      // Update original values after successful save
      setOriginalTitle(title);
      setOriginalMetaDescription(metaDescription);
      setOriginalSections(JSON.parse(JSON.stringify(sectionsToSave))); // Deep copy
      setHasChanges(false);
      return true;
    } catch (error: any) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content", {
        description: error?.message || "An unexpected error occurred. Please try again."
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await saveContent(sections);
  };

  // Check if there are actual changes
  useEffect(() => {
    if (!loading && pageContent && originalTitle !== "") {
      const titleChanged = title !== originalTitle;
      const metaDescriptionChanged = metaDescription !== originalMetaDescription;
      const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(originalSections);
      
      const hasActualChanges = titleChanged || metaDescriptionChanged || sectionsChanged;
      setHasChanges(hasActualChanges);
    }
  }, [title, metaDescription, sections, originalTitle, originalMetaDescription, originalSections, loading, pageContent]);

  const handleAddSection = () => {
    const newSection = pageId === "faq" 
      ? { question: "", answer: "", hasLink: false }
      : { heading: "", content: "" };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (index: number, field: string, value: any) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleRemoveClick = (index: number) => {
    setSectionToRemove(index);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (sectionToRemove === null) return;
    
    if (sections.length === 0) {
      setRemoveDialogOpen(false);
      setSectionToRemove(null);
      return;
    }
    
    // Store current sections for potential revert
    const currentSections = [...sections];
    const updatedSections = sections.filter((_, i) => i !== sectionToRemove);
    setSections(updatedSections);
    
    // Close dialog and reset
    setRemoveDialogOpen(false);
    setSectionToRemove(null);
    
    // Automatically save to database
    const success = await saveContent(updatedSections);
    
    if (success) {
      toast.success("Section removed and saved", {
        description: "The section has been permanently deleted from the database.",
        duration: 3000,
      });
    } else {
      // If save failed, revert the sections state
      setSections(currentSections);
      toast.error("Failed to save removal", {
        description: "The section was not removed. Please try again.",
      });
    }
  };

  const handleCancelRemove = () => {
    setRemoveDialogOpen(false);
    setSectionToRemove(null);
  };

  const handlePreview = () => {
    if (pageContent?.page_path) {
      window.open(pageContent.page_path, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pageContent) {
    return (
      <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
        <AlertDescription>Page not found</AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Content</h1>
            <p className="text-muted-foreground">{pageContent.page_path}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className={
              !hasChanges 
                ? "opacity-50 cursor-not-allowed" 
                : "bg-primary hover:bg-primary/90 shadow-lg ring-2 ring-primary/20 animate-pulse"
            }
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
            {hasChanges && !saving && (
              <span className="ml-2 text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full">
                Unsaved
              </span>
            )}
        </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You have unsaved changes</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {sections.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No sections yet. Click "Add {pageId === "faq" ? "Question" : "Section"}" to create one.
              </CardContent>
            </Card>
          )}
          {sections.map((section, index) => (
            <Card key={`section-${index}-${section.question || section.heading || index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {pageId === "faq" ? `Question ${index + 1}` : `Section ${index + 1}`}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveClick(index);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pageId === "faq" ? (
                  <>
                    <div>
                      <Label>Question</Label>
                      <Input
                        value={section.question || ""}
                        onChange={(e) => handleUpdateSection(index, "question", e.target.value)}
                        placeholder="Enter question"
                      />
                    </div>
                    <div>
                      <Label>Answer</Label>
                      <Textarea
                        value={section.answer || ""}
                        onChange={(e) => handleUpdateSection(index, "answer", e.target.value)}
                        placeholder="Enter answer"
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Heading</Label>
                      <Input
                        value={section.heading || ""}
                        onChange={(e) => handleUpdateSection(index, "heading", e.target.value)}
                        placeholder="Enter section heading"
                      />
                    </div>
                    <div>
                      <Label>Content</Label>
                      <Textarea
                        value={section.content || ""}
                        onChange={(e) => handleUpdateSection(index, "content", e.target.value)}
                        placeholder="Enter section content"
                        rows={4}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          <Button onClick={handleAddSection} variant="outline" className="w-full">
            + Add {pageId === "faq" ? "Question" : "Section"}
          </Button>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
      <Card>
        <CardHeader>
              <CardTitle>Page Settings</CardTitle>
              <CardDescription>Configure page metadata and SEO</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Page Title</Label>
            <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter page title"
            />
          </div>
          <div>
                <Label>Meta Description (SEO)</Label>
            <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Brief description for search engines (max 160 characters)"
                  rows={3}
                  maxLength={160}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {metaDescription.length}/160 characters
                </p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pageId === "faq" ? "Question" : "Section"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the {pageId === "faq" ? "question" : "section"} from your content and save the changes to the database immediately. 
              <strong className="block mt-2">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemove}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}




























