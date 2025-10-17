import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Tag,
  Clock,
} from "lucide-react";

import { AddFileDialog } from "@/components/dialogs/NewFIleDialog";
import { EditFileDialog } from "@/components/dialogs/EditFileDialog";
import { ViewFileDialog } from "@/components/dialogs/ViewFileDialog";



interface KnowledgeBaseItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  // views: number;
}

export function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [knowledgeItems] = useState<KnowledgeBaseItem[]>([
    {
      id: "1",
      title: "System Architecture Overview",
      description:
        "This document provides a comprehensive overview of the system architecture, including component interactions, data flow, and integration points.",
      category: "Documentation",
      tags: ["architecture", "system", "overview"],
      author: "admin_user",
      createdAt: "2024-01-15",
      updatedAt: "2024-01-20",
      // views: 1250,
    },
    {
      id: "2",
      title: "API Authentication Guide",
      description:
        "Complete guide for implementing API authentication, including JWT token management, refresh tokens, and security best practices.",
      category: "API",
      tags: ["api", "authentication", "jwt", "security"],
      author: "tech_lead",
      createdAt: "2024-01-10",
      updatedAt: "2024-01-18",
      // views: 890,
    },
    {
      id: "3",
      title: "Database Schema Reference",
      description:
        "Detailed reference of all database tables, relationships, and constraints used in the system.",
      category: "Database",
      tags: ["database", "schema", "reference"],
      author: "db_admin",
      createdAt: "2024-01-05",
      updatedAt: "2024-01-15",
      // views: 2100,
    },
    {
      id: "4",
      title: "Troubleshooting Common Issues",
      description:
        "Collection of common issues and their solutions, including error messages, causes, and step-by-step resolution procedures.",
      category: "Support",
      tags: ["troubleshooting", "errors", "support"],
      author: "support_team",
      createdAt: "2024-01-12",
      updatedAt: "2024-01-19",
      // views: 3400,
    },
  ]);

  const categories = ["all", "Documentation", "API", "Database", "Support"];
  const tags = [
    "all",
    "architecture", "system", "overview",
    "api", "authentication", "jwt", "security",
    "database", "schema", "reference",
    "troubleshooting", "errors", "support"
  ];

  const filteredItems = knowledgeItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const [files, setFiles] = useState<File[]>([]);
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<KnowledgeBaseItem | null>(null);




  const getCategoryBadge = (category: string) => {
    const colors = {
      Documentation: "bg-blue-100 text-blue-800",
      API: "bg-green-100 text-green-800",
      Database: "bg-purple-100 text-purple-800",
      Support: "bg-orange-100 text-orange-800",
    };
    return (
      <Badge
        className={
          colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800"
        }
      >
        {category}
      </Badge>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Knowledge Base
            </h1>
            <p className="text-muted-foreground">
              Centralized documentation and reference materials
            </p>
          </div>
          <div className="flex gap-2">

            <Button className="gap-2" onClick={() => setIsAddFileOpen(true)}>
              <Plus className="h-4 w-4" />
              New File
            </Button></div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles, content, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

        </div>

        {/* Stats Cards */}


        {/* Articles Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {getCategoryBadge(item.category)}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedFile(item);
                    setIsViewOpen(true);
                  }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {item.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>


                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    Updated {item.updatedAt}
                  </span>
                  <div className="flex gap-1" >
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedFile(item);
                      setIsEditOpen(true);
                    }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card className="mt-6">
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or browse different categories.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <AddFileDialog
        open={isAddFileOpen}
        onClose={() => setIsAddFileOpen(false)}
        onAddFile={({ title, description, tag, file }) => {
          interface UploadedFile {
            id: string;
            title: string;
            description?: string;
            tag?: string;
            filename: string;
            uploadedAt: string;
            raw?: File;
          }

          const [files, setFiles] = useState<UploadedFile[]>([]);
          const newFile: UploadedFile = {
            id: Date.now().toString(),
            title,
            description,
            tag,
            filename: file?.name ?? "unknown",
            uploadedAt: new Date().toISOString(),
            raw: file,
          };

          setFiles((prev) => [...prev, newFile]);
        }}
      />

      {/* Edit File Dialog */}
      <EditFileDialog
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        onUpdateFile={(updatedFile) => {

          console.log("Updated file:", updatedFile);
        }}
      />
      {/* View File Dialog */}
      <ViewFileDialog
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
      />


    </div>



  );
}
