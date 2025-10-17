import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ViewFileDialogProps {
    open: boolean;
    onClose: () => void;
    file: {
        id: string;
        title: string;
        description: string;
        category: string;
        tags: string;
        author: string;
        createdAt: string;
    } | null;
}

export function ViewFileDialog({ open, onClose, file }: ViewFileDialogProps) {
    if (!file) return null; // nothing to show if no file

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>View File Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>Title</Label>
                        <p className="text-sm text-muted-foreground capitalize">{file.title}</p>
                    </div>

                    <div>
                        <Label>Description</Label>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground capitalize">{file.description}</p>
                    </div>

                    <div>
                        <Label>Category</Label>
                        <p className="text-sm text-muted-foreground capitalize">{file.category}</p>
                    </div>

                    <div>
                        <Label>Tag</Label>
                        <p className="text-sm text-muted-foreground capitalize">
                            {file?.tags?.map((tag: string, i: number) => (
                                <span key={i} className="inline-block mr-2">{tag}</span>
                            ))}
                        </p>
                    </div>
                    <div>
                        <Label>Created By</Label>
                        <p className="text-sm text-muted-foreground capitalize">{file.author}</p>
                    </div>
                    <div>
                        <Label>Created Date</Label>
                        <p className="text-sm text-muted-foreground capitalize">{file.createdAt}</p>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        className="btn btn-outline"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
