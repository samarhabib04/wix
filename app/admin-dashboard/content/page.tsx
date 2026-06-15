'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Files, Search, Edit, FileText, Info, Shield, MessageSquare, Save, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const contentPages = [
  {
    id: "boost-carousel",
    title: "Boost Carousel Management",
    path: "/boost-listing",
    description: "Manage boost listing card headings and titles",
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: 4,
    icon: <Search className="h-10 w-10 text-indigo-500" />
  },
  {
    id: "faq",
    title: "Frequently Asked Questions",
    path: "/faq",
    description: "Questions and answers about Dog Quest services",
    lastUpdated: "2023-05-01",
    sections: 8,
    icon: <MessageSquare className="h-10 w-10 text-purple-500" />
  },
  {
    id: "about",
    title: "About Us",
    path: "/about",
    description: "Dog Quest company history and mission",
    lastUpdated: "2023-04-15",
    sections: 6,
    icon: <Info className="h-10 w-10 text-blue-500" />
  },
  {
    id: "terms",
    title: "Terms & Conditions",
    path: "/terms",
    description: "Legal terms for using Dog Quest platform",
    lastUpdated: "2023-03-20",
    sections: 12,
    icon: <FileText className="h-10 w-10 text-amber-500" />
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    path: "/privacy-policy",
    description: "How we handle and protect user data",
    lastUpdated: "2023-03-20",
    sections: 10,
    icon: <Shield className="h-10 w-10 text-green-500" />
  },
  {
    id: "cookies",
    title: "Cookie Policy",
    path: "/cookies",
    description: "Information about cookies and tracking",
    lastUpdated: "2023-03-20",
    sections: 5,
    icon: <Files className="h-10 w-10 text-red-500" />
  }
];

export default function AdminContentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter content pages based on search
  const filteredPages = contentPages.filter(page =>
    searchTerm === "" || page.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePreview = (path: string) => {
    window.open(path, '_blank');
  };

  const handleEdit = (pageId: string) => {
    router.push(`/admin-dashboard/content/edit/${pageId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold">Content Management</h2>
        <div className="flex items-center gap-2">
          <Button>
            <Files className="w-4 h-4 mr-2" />
            Create New Page
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search content pages..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredPages.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No content pages found matching your search
            </div>
          ) : (
            filteredPages.map((page) => (
              <Card key={page.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {page.title}
                      </CardTitle>
                      <CardDescription>
                        {page.description}
                      </CardDescription>
                    </div>
                    <div className="bg-gray-100 p-2 rounded-lg">
                      {page.icon}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Path:</span>
                      <span className="font-mono text-gray-700">{page.path}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Last Updated:</span>
                      <span>{page.lastUpdated}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sections:</span>
                      <Badge variant="outline">{page.sections}</Badge>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3">
                  <div className="flex w-full gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreview(page.path)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleEdit(page.id)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="bg-gray-50 border rounded-lg p-6 mt-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="md:w-1/3">
            <h3 className="text-lg font-semibold mb-2">Content Templates</h3>
            <p className="text-gray-600 text-sm">
              Use our predefined templates to create new content pages quickly. Templates include
              proper structure and placeholder text to help you get started.
            </p>
          </div>

          <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <Button variant="outline" className="justify-start h-auto py-3">
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="font-medium">FAQ Template</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  Q&A format with expandable sections
                </span>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto py-3">
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="font-medium">Legal Document</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  Structured legal text with sections and clauses
                </span>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto py-3">
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  <span className="font-medium">About Us</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  Company story with team and mission sections
                </span>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto py-3">
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span className="font-medium">Contact Page</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  Contact form with office locations and info
                </span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}




























