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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // assuming you have this

interface AddFileDialogProps {
    open: boolean;
    onClose: () => void;
    onAddFile: (data: {
        title: string;
        description: string;
        category: string;
        tag: string;
        file: File | null;
    }) => void;
    onAddFileSuccess?: () => void;
}

export function AddFileDialog({
    open,
    onClose,
    onAddFile,
    onAddFileSuccess,
}: AddFileDialogProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        tag: "system",
        file: null as File | null,
    });

    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleTagChange = (value: string) => {
        setFormData((prev) => ({ ...prev, tag: value }));
    };
    const handleCategoryChange = (value: string) => {
        setFormData((prev) => ({ ...prev, category: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFormData((prev) => ({ ...prev, file }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.file) {
            toast({
                title: "Error",
                description: "Please select a file to upload.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);

            // Simulate or replace with your API call
            const uploadData = new FormData();
            uploadData.append("title", formData.title);
            uploadData.append("description", formData.description);
            uploadData.append("tag", formData.tag);
            uploadData.append("file", formData.file);

            // await fileApi.upload(uploadData); // ← use your actual API

            toast({
                title: "Success",
                description: "File uploaded successfully!",
            });

            onAddFile({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                tag: formData.tag,
                file: formData.file,
            });

            onAddFileSuccess?.();
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
                    <DialogTitle>Add New File</DialogTitle>
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
                            placeholder="Title"
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
                            placeholder="Description"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={handleCategoryChange}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="documentation">Documentation</SelectItem>
                                <SelectItem value="api">API</SelectItem>
                                <SelectItem value="database">Database</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tag">Tags</Label>
                        <Select value={formData.tag} onValueChange={handleTagChange}>
                            <SelectTrigger id="tag">
                                <SelectValue placeholder="Select tag" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="system">System</SelectItem>
                                <SelectItem value="architecture">Architecture</SelectItem>
                                <SelectItem value="schema">Schema</SelectItem>
                                <SelectItem value="jwt">JWT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="file">Upload File</Label>
                        <Input
                            id="file"
                            name="file"
                            type="file"
                            onChange={handleFileChange}
                            required
                        />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                "Upload File"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
