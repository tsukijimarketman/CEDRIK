import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { memoryApi } from "@/api/api"; 

interface AddFileDialogProps {
    open: boolean;
    onClose: () => void;
    onAddFileSuccess?: () => void;
}

export function AddFileDialog({
    open,
    onClose,
    onAddFileSuccess,
}: AddFileDialogProps) {
    const [formData, setFormData] = useState({
        title: "",
        text: "",
        tags: "",
        file: null as File | null,
    });

    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFormData((prev) => ({ ...prev, file }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast({
                title: "Error",
                description: "Title is required.",
                variant: "destructive",
            });
            return;
        }

        if (!formData.text.trim() && !formData.file) {
            toast({
                title: "Error",
                description: "Please provide either text content or upload a file.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);

            // Parse tags from comma-separated string
            const tagsArray = formData.tags
                .split(",")
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            // Call the backend API
            await memoryApi.create({
                title: formData.title,
                text: formData.text,
                tags: tagsArray,
                file: formData.file,
            });

            toast({
                title: "Success",
                description: formData.file 
                    ? "File uploaded successfully!" 
                    : "Memory created successfully!",
            });

            // Reset form
            setFormData({
                title: "",
                text: "",
                tags: "",
                file: null,
            });

            // Notify parent component to refresh data
            onAddFileSuccess?.();
            onClose();
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "Error",
                description: error?.description || error?.message || "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            // Reset form on close
            setFormData({
                title: "",
                text: "",
                tags: "",
                file: null,
            });
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add New Memory</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="Enter memory title"
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="text">Text Content {!formData.file && "*"}</Label>
                        <Textarea
                            id="text"
                            name="text"
                            value={formData.text}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Enter text content or upload a file below"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Provide text content or upload a file (or both)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                            id="tags"
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="e.g. system, architecture, documentation"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Separate multiple tags with commas
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">Upload File (Optional)</Label>
                        <Input
                            id="file"
                            name="file"
                            type="file"
                            onChange={handleFileChange}
                            disabled={isLoading}
                        />
                        {formData.file && (
                            <p className="text-xs text-muted-foreground">
                                Selected: {formData.file.name}
                            </p>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {formData.file ? "Uploading..." : "Creating..."}
                                </>
                            ) : (
                                "Create Memory"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}