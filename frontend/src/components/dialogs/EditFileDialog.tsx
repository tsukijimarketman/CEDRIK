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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface EditFileDialogProps {
    open: boolean;
    onClose: () => void;
    file: {
        id: string;
        title: string;
        description: string;
        category: string;
        tags: string;

    } | null;
    onUpdateFile: (data: {
        id: string;
        title: string;
        description: string;
        category: string;
        tags: string;
        file?: File | null;
    }) => void;
}

export function EditFileDialog({ open, onClose, file, onUpdateFile }: EditFileDialogProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
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
                category: file.category,
                tags: file.tags,
                file: null,
            });
        }
    }, [file, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleTagChange = (value: string) => {
        setFormData((prev) => ({ ...prev, tags: value }));
    };
    const handleCategoryChange = (value: string) => {
        setFormData((prev) => ({ ...prev, category: value }));
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


            await new Promise((resolve) => setTimeout(resolve, 1000));


            onUpdateFile({
                id: file.id,
                title: formData.title,
                description: formData.description,
                category: formData.category,
                tags: formData.tags,
                file: formData.file ?? undefined,
            });

            toast({
                title: "Success",
                description: "File updated successfully!",
            });

            onClose();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Something went wrong",
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
                    <DialogTitle>Edit File</DialogTitle>
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
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={handleCategoryChange}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Documentation">Documentation</SelectItem>
                                <SelectItem value="API">API</SelectItem>
                                <SelectItem value="Database">Database</SelectItem>
                                <SelectItem value="Support">Support</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-tags">Tag</Label>
                        <Select value={formData.tags} onValueChange={handleTagChange}>
                            <SelectTrigger id="edit-tags">
                                <SelectValue placeholder="Select tags" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="architecture">Architecture</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                                <SelectItem value="overview">Overview</SelectItem>
                                <SelectItem value="jwt">JWT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="file">Replace File (optional)</Label>
                        <Input id="file" name="file" type="file" onChange={handleFileChange} />
                    </div>
                    <div className="pt-4 flex justify-end space-x-2">
                        <Button variant="outline" onClick={onClose} disabled={isLoading}>
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
