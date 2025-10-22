import { useState } from "react";
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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onAddUser: (username: string, email: string, password: string, role: string) => void;
  onAddUserSuccess?: () => void;
}

export function AddUserDialog({
  open,
  onClose,
  onAddUser,
  onAddUserSuccess,
}: AddUserDialogProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user", // default role
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      await authApi.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      toast({
        title: "Success",
        description: "User added successfully!",
      });

      onAddUserSuccess?.();
      onAddUser(formData.username, formData.email, formData.password, formData.role);
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
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
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-username">Username</Label>
            <Input
              id="add-username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Juan_DelaCruz21"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-email">Email</Label>
            <Input
              id="add-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="juandelacruz@gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-password">Password</Label>
            <Input
              id="add-password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-role">Role</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger id="add-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Adding..." : "Add User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
//