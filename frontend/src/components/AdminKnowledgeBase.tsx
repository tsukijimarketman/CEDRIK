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
import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Eye,
  BookOpen,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { AddFileDialog } from "@/components/dialogs/NewFIleDialog";
import { EditFileDialog } from "@/components/dialogs/EditFileDialog";
import { ViewFileDialog } from "@/components/dialogs/ViewFileDialog";
import { memoryApi, type MemoryItem } from "@/api/api";

const PAGE_SIZE = 30;

interface KnowledgeBaseItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  author?: string;
  createdAt: string;
  updatedAt: string;
  mem_type: string;
}

export function AdminKnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeBaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<KnowledgeBaseItem | null>(null);
  const [permissionError, setPermissionError] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalPages, setTotalPage] = useState(0);

  const { toast } = useToast();

  // Fetch memories from backend
  const fetchMemories = async () => {
    try {
      setIsLoading(true);
      setPermissionError(false);
      
      const response = await memoryApi.get(
        {},
        { 
          archive: false,
          offset: Math.max(0, currentPage) - 1,
          maxItems: PAGE_SIZE
        }
      );

      setCurrentPage(response.data.page);
      setTotalPage(Math.ceil(response.data.total / PAGE_SIZE));

      // Transform backend data to frontend format
      const items: KnowledgeBaseItem[] = response.data.items.map((item: MemoryItem) => ({
        id: item.id,
        title: item.title,
        description: item.text.substring(0, 150) + (item.text.length > 150 ? "..." : ""),
        tags: item.tags,
        author: "system",
        createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A",
        updatedAt: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "N/A",
        mem_type: item.mem_type,
      }));

      setKnowledgeItems(items);
    } catch (error: any) {
      console.error("Failed to fetch memories:", error);
      
      // Check if it's a 403 permission error
      if (error?.status === 403 || error?.msg?.includes("403") || error?.msg?.includes("Forbidden")) {
        setPermissionError(true);
        toast({
          title: "Access Restricted",
          description: "You don't have permission to view the knowledge base. Please contact a SuperAdmin.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error?.description || error?.msg || "Failed to load knowledge base items",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [currentPage]);

  // Filter items based on search
  const filteredItems = knowledgeItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesSearch;
  });

  const handleAddFileSuccess = () => {
    fetchMemories();
  };

  const handleUpdateSuccess = () => {
    fetchMemories();
  };

  const getMemoryTypeIcon = (memType: string) => {
    return memType === "FILE" ? <FileText className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />;
  };

  const getMemoryTypeBadge = (memType: string) => {
    const colors = {
      FILE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      TEXT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return (
      <Badge
        className={
          colors[memType as keyof typeof colors] || "bg-gray-100 text-gray-800"
        }
      >
        {memType}
      </Badge>
    );
  };

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPageInput(value);

    if (value === "") {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      const clamped = Math.min(Math.max(numericValue, 1), totalPages);
      setCurrentPage(clamped);
    }
  };

  // If there's a permission error, show a clear message
  if (permissionError && !isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Knowledge Base
              </h1>
              <p className="text-muted-foreground">
                View and manage documentation and reference materials
              </p>
            </div>
          </div>

          <Alert variant="destructive" className="max-w-2xl mx-auto mt-12">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have sufficient permissions to access the Knowledge Base.
              <br />
              <br />
              Please contact a SuperAdmin to:
              <ul className="list-disc list-inside mt-2 ml-2">
                <li>Grant you access to this section</li>
                <li>Upgrade your account permissions</li>
                <li>Request specific knowledge base access</li>
              </ul>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setPermissionError(false);
                    fetchMemories();
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Knowledge Base
              </h1>
              <p className="text-muted-foreground">
                View and manage documentation and reference materials
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchMemories}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button className="gap-2" onClick={() => setIsAddFileOpen(true)}>
                <Plus className="h-4 w-4" />
                New Memory
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, content, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Loading State */}
          {isLoading && knowledgeItems.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Articles Grid */}
          {!isLoading && filteredItems.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getMemoryTypeIcon(item.mem_type)}
                          {getMemoryTypeBadge(item.mem_type)}
                        </div>
                        <CardTitle className="text-lg line-clamp-2">
                          {item.title}
                        </CardTitle>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedFile(item);
                          setIsViewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={`${item.id}-tag-${index}`} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge key={`${item.id}-more-tags`} variant="secondary" className="text-xs">
                          +{item.tags.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">
                        Updated {item.updatedAt}
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedFile(item);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredItems.length === 0 && knowledgeItems.length === 0 && (
            <Card className="mt-6">
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? "No results found" : "No memories yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? "Try adjusting your search terms."
                    : "Get started by creating your first memory."}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsAddFileOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Memory
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogs */}
        <AddFileDialog
          open={isAddFileOpen}
          onClose={() => setIsAddFileOpen(false)}
          onAddFileSuccess={handleAddFileSuccess}
        />

        <EditFileDialog
          open={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedFile(null);
          }}
          file={selectedFile}
          onUpdateSuccess={handleUpdateSuccess}
        />

        <ViewFileDialog
          open={isViewOpen}
          onClose={() => {
            setIsViewOpen(false);
            setSelectedFile(null);
          }}
          file={selectedFile}
        />
      </div>
      {!permissionError && knowledgeItems.length > 0 && (
        <div className="m-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFirstPage}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLastPage}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              className="w-20"
              placeholder="Go to"
              inputMode="numeric"
            />
          </div>
        </div>
      )}
    </>
  );
}