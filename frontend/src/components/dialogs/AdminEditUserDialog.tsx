import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { authApi } from "@/api/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AdminEditUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    status: "active" | "inactive";
  } | null;
  onUpdateUser: (
    id: string,
    username: string,
    email: string,
    role: string,
    status: "active" | "inactive"
  ) => void;
  onUpdateUserSuccess?: () => void;
}

type UserFormState = {
  username: string;
  email: string;
  role: string;
  status: "active" | "inactive";
};

export function AdminEditUserDialog({
  open,
  onClose,
  user,
  onUpdateUser,
  onUpdateUserSuccess,
}: AdminEditUserDialogProps) {
  const [formData, setFormData] = useState<UserFormState>({
    username: "",
    email: "",
    role: "user",
    status: "active",
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if user is a superadmin (which admins cannot edit)
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";

  // preload form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    // Prevent setting role to superadmin
    if (value === "superadmin") {
      toast({
        title: "Permission Denied",
        description: "Admins cannot assign SuperAdmin role. Contact a SuperAdmin for this action.",
        variant: "destructive",
      });
      return;
    }
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleStatusChange = (value: string) => {
    const normalized = value === "inactive" ? "inactive" : "active";
    setFormData((prev) => ({ ...prev, status: normalized }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Double check role isn't superadmin
    if (formData.role === "superadmin") {
      toast({
        title: "Permission Denied",
        description: "Admins cannot assign SuperAdmin role.",
        variant: "destructive",
      });
      return;
    }

    // Prevent editing superadmins
    if (isSuperAdmin) {
      toast({
        title: "Permission Denied",
        description: "Admins cannot edit SuperAdmin accounts. Contact a SuperAdmin for assistance.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      await authApi.updateUser(user.id, {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        status: formData.status,
      });

      toast({
        title: "Success",
        description: "User updated successfully!",
      });

      onUpdateUser(user.id, formData.username, formData.email, formData.role, formData.status);
      onUpdateUserSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions
          </DialogDescription>
        </DialogHeader>

        {isSuperAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You cannot edit SuperAdmin accounts. Only SuperAdmins can modify other SuperAdmin users.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isSuperAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isSuperAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={handleRoleChange}
              disabled={isSuperAdmin}
            >
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {/* SuperAdmin option is hidden for regular admins */}
              </SelectContent>
            </Select>
            {!isSuperAdmin && (
              <p className="text-xs text-muted-foreground">
                Note: SuperAdmin role can only be assigned by SuperAdmins
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={handleStatusChange}
              disabled={isSuperAdmin}
            >
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isSuperAdmin}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}