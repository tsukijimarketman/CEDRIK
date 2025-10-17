import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ViewUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  } | null;
}

export function ViewUserDialog({ open, onClose, user }: ViewUserDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Username</Label>
            <p className="text-sm text-muted-foreground">{user.username}</p>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <p className="text-sm text-muted-foreground capitalize">{user.status}</p>
          </div>
          <div className="space-y-1">
            <Label>Created Date</Label>
            <p className="text-sm text-muted-foreground capitalize">{user.createdAt}</p>
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