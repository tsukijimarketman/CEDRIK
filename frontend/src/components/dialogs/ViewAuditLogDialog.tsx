import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ViewAuditLogDialogProps {
    open: boolean;
    onClose: () => void;
    log: {
        id: string;
        timestamp: string;
        user: string;
        action: string;
        ipAddress: string;
    } | null;
}



export function ViewAuditLogDialog({ open, onClose, log }: ViewAuditLogDialogProps) {
    if (!log) return null;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Audit Log Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label>Id</Label>
                        <p className="text-sm text-muted-foreground">{log.id}</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Timestamp</Label>
                        <p className="text-sm text-muted-foreground">{log.timestamp}</p>
                    </div>
                    <div className="space-y-1">
                        <Label>User</Label>
                        <p className="text-sm text-muted-foreground capitalize">{log.user}</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Action</Label>
                        <p className="text-sm text-muted-foreground capitalize">{log.action}</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Ip Address</Label>
                        <p className="text-sm text-muted-foreground capitalize">{log.ipAddress}</p>
                    </div>
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
//