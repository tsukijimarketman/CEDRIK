import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import {
  Search,
  RotateCcw,
  Eye,
  FileText,
  BookOpen,
  Loader2,
  RefreshCw,
  Archive,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { ViewFileDialog } from "@/components/dialogs/ViewFileDialog";
import { memoryApi, type MemoryItem } from "@/api/api";

interface ArchivedMemoryItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  author?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  mem_type: string;
}

const PAGE_SIZE = 30;

export function MemoryArchive() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [dateQFilter, setDateQFilter] = useState<Date | null>(null);
  const [dateQOrderFilter, setDateQOrderFilter] = useState<"gte" | "lte">("gte");
  const [archivedItems, setArchivedItems] = useState<ArchivedMemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ArchivedMemoryItem | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalPages, setTotalPage] = useState(0);
  
  const { toast } = useToast();

  // Fetch archived memories from backend
  const fetchArchivedMemories = async () => {
    try {
      setIsLoading(true);
      const response = await memoryApi.get(
        {},
        { 
          archive: true,  // Get deleted items
          offset: Math.max(0, currentPage) - 1,
          maxItems: PAGE_SIZE,
          deletedAt: dateQFilter,
          deletedAtDir: dateQOrderFilter
        }
      );

      setCurrentPage(response.data.page)
      setTotalPage(Math.ceil(response.data.total / PAGE_SIZE))

      // Transform backend data to frontend format
      const items: ArchivedMemoryItem[] = response.data.items.map((item: MemoryItem) => ({
        id: item.id,
        title: item.title,
        description: item.text.substring(0, 150) + (item.text.length > 150 ? "..." : ""),
        tags: item.tags,
        author: "system",
        createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A",
        updatedAt: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "N/A",
        deletedAt: item.deleted_at ? new Date(item.deleted_at).toLocaleDateString() : "N/A",
        mem_type: item.mem_type,
      }));

      setArchivedItems(items);
    } catch (error: any) {
      console.error("Failed to fetch archived memories:", error);
      toast({
        title: "Error",
        description: error?.description || "Failed to load archived items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchArchivedMemories();
  }, [currentPage, dateQFilter]);
  useEffect(() => {
    let now = new Date(Date.now());
    switch (dateFilter) {
      case "all":
      case "today":
        now = null;
        setDateQOrderFilter("gte");
        break;
      case "week":
        now.setDate(now.getDate() - 7)
        setDateQOrderFilter("gte");
        break;
      case "month":
        now.setMonth(now.getMonth() - 1)
        setDateQOrderFilter("gte");
        break;
      case "older":
        now.setMonth(now.getMonth() - 1)
        setDateQOrderFilter("lte");
        break;
    }
    setDateQFilter(now);
  }, [dateFilter]);

  // Filter items based on search and date
  // const filteredItems = archivedItems.filter((item) => {
  //   const matchesSearch =
  //     item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     item.tags.some((tag) =>
  //       tag.toLowerCase().includes(searchTerm.toLowerCase())
  //     );
  //
  //   let matchesDate = true;
  //   if (dateFilter !== "all" && item.deletedAt) {
  //     const deletedDate = new Date(item.deletedAt);
  //     const now = new Date();
  //     const daysDiff = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
  //     setDateQFilter(new Date(now.getTime() - deletedDate.getTime()));
  //
  //     switch (dateFilter) {
  //       case "today":
  //         matchesDate = daysDiff === 0;
  //         break;
  //       case "week":
  //         matchesDate = daysDiff <= 7;
  //         break;
  //       case "month":
  //         matchesDate = daysDiff <= 30;
  //         break;
  //       case "older":
  //         matchesDate = daysDiff > 30;
  //         break;
  //     }
  //   }
  //
  //   return matchesSearch && matchesDate;
  // });

  const handleRestore = async (memoryId: string) => {
    try {
      setIsRestoring(memoryId);
      
      await memoryApi.restore(memoryId);

      toast({
        title: "Success",
        description: "Memory restored successfully!",
      });

      // Refresh the list
      fetchArchivedMemories();
    } catch (error: any) {
      console.error("Restore error:", error);
      toast({
        title: "Error",
        description: error?.description || error?.message || "Failed to restore memory",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!memoryToDelete) return;

    try {
      setIsDeleting(true);
      
      await memoryApi.permanentDelete(memoryToDelete);

      toast({
        title: "Success",
        description: "Memory permanently deleted!",
      });

      // Refresh the list
      fetchArchivedMemories();
      setDeleteConfirmOpen(false);
      setMemoryToDelete(null);
    } catch (error: any) {
      console.error("Permanent delete error:", error);
      toast({
        title: "Error",
        description: error?.description || error?.message || "Failed to delete memory",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
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


  return (
    <>
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold text-foreground">
                Memory Archive
              </h1>
            </div>
            <p className="text-muted-foreground">
              Deleted memories - restore or permanently remove
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchArchivedMemories}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search archived memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="older">Older than 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && archivedItems.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Archives Grid */}
        {!isLoading && archivedItems.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {archivedItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow border-red-200 dark:border-red-900">
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

                  <div className="text-xs text-muted-foreground mb-4">
                    <p>Deleted: {item.deletedAt}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      Created {item.createdAt}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRestore(item.id)}
                        disabled={isRestoring === item.id}
                        className="gap-1"
                      >
                        {isRestoring === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setMemoryToDelete(item.id);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && archivedItems.length === 0 && (
          <Card className="mt-6">
            <CardContent className="text-center py-8">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? "No results found" : "Archive is empty"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Try adjusting your search terms."
                  : "Deleted memories will appear here."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Dialog */}
      <ViewFileDialog
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Permanently Delete Memory?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the memory
              and remove all associated data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
    </>
  );
}
