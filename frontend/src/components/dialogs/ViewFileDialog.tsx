import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ViewFileDialogProps {
    open: boolean;
    onClose: () => void;
    file: {
        id: string;
        title: string;
        description: string;
        tags: string[]; // Changed from string to string[]
        author?: string;
        createdAt: string;
        updatedAt?: string;
        mem_type?: string;
    } | null;
}

export function ViewFileDialog({ open, onClose, file }: ViewFileDialogProps) {
    if (!file) return null;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>View Memory Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>Title</Label>
                        <p className="text-sm text-foreground mt-1">{file.title}</p>
                    </div>

                    <div>
                        <Label>Description</Label>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                            {file.description}
                        </p>
                    </div>

                    {file.mem_type && (
                        <div>
                            <Label>Type</Label>
                            <p className="text-sm text-foreground mt-1 capitalize">
                                {file.mem_type}
                            </p>
                        </div>
                    )}

                    <div>
                        <Label>Tags</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {file.tags && file.tags.length > 0 ? (
                                file.tags.map((tag: string, i: number) => (
                                    <Badge key={i} variant="secondary">
                                        {tag}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground">No tags</span>
                            )}
                        </div>
                    </div>

                    {file.author && (
                        <div>
                            <Label>Created By</Label>
                            <p className="text-sm text-foreground mt-1 capitalize">
                                {file.author}
                            </p>
                        </div>
                    )}

                    <div>
                        <Label>Created Date</Label>
                        <p className="text-sm text-foreground mt-1">{file.createdAt}</p>
                    </div>

                    {file.updatedAt && (
                        <div>
                            <Label>Last Updated</Label>
                            <p className="text-sm text-foreground mt-1">{file.updatedAt}</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}