import { useState, useEffect } from "react";
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

interface EditFileDialogProps {
    open: boolean;
    onClose: () => void;
    file: {
        id: string;
        title: string;
        description: string;
        tags: string[]; // Changed from string to string[]
    } | null;
    onUpdateSuccess?: () => void; // Changed callback signature
}

export function EditFileDialog({ open, onClose, file, onUpdateSuccess }: EditFileDialogProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        tags: "",
        file: null as File | null,
    });

    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Initialize form when file changes or dialog opens
    useEffect(() => {
        if (file && open) {
            setFormData({
                title: file.title,
                description: file.description,
                // Convert array to comma-separated string
                tags: Array.isArray(file.tags) ? file.tags.join(", ") : file.tags,
                file: null,
            });
        }
    }, [file, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFormData((prev) => ({ ...prev, file: selectedFile }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            toast({
                title: "Error",
                description: "No file selected for editing.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);

            // Parse tags from comma-separated string to array
            const tagsArray = formData.tags
                .split(",")
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            // Call backend API
            await memoryApi.update(file.id, {
                title: formData.title,
                text: formData.description,
                tags: tagsArray,
                file: formData.file ?? undefined,
            });

            toast({
                title: "Success",
                description: "Memory updated successfully!",
            });

            // Notify parent to refresh
            onUpdateSuccess?.();
            onClose();
        } catch (error: any) {
            console.error("Update error:", error);
            toast({
                title: "Error",
                description: error?.description || error?.message || "Failed to update memory",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Memory</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-tags">Tags</Label>
                        <Input
                            id="edit-tags"
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="e.g. system, architecture, documentation"
                        />
                        <p className="text-xs text-muted-foreground">
                            Separate multiple tags with commas
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="file">Replace File (optional)</Label>
                        <Input id="file" name="file" type="file" onChange={handleFileChange} />
                    </div>
                    
                    <div className="pt-4 flex justify-end space-x-2">
                        <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
