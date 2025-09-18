import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { authApi } from "@/api/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DialogType = "settings" | "help" | "logout" | "login" | "signup" | null;

interface UserData {
  _id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface UserDialogsProps {
  open: boolean;
  type: DialogType;
  user: UserData | null;
  onClose: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  onLogout: () => void;
  onUserUpdate: (userData: Partial<UserData>) => void;
}

export function UserDialogs({
  open,
  type,
  user,
  onClose,
  onLogin,
  onSignUp,
  onLogout,
  onUserUpdate,
}: UserDialogsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    newPassword: "",
  });

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        username: user.username,
        email: user.email,
        password: "",
        newPassword: "",
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const updateData: { username?: string; password?: string } = {};

      if (formData.username !== user.username) {
        updateData.username = formData.username;
      }

      if (formData.password && formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      if (Object.keys(updateData).length > 0) {
        //u
        const response = await authApi.me();
        onUserUpdate(response.data);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutConfirm = () => {
    onLogout();
    onClose();
  };

  const renderContent = () => {
    switch (type) {
      case "settings":
        return (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="col-span-3"
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="col-span-3 opacity-70"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currentPassword" className="text-right">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Required for password change"
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newPassword" className="text-right">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Leave empty to keep current password"
                  disabled={isLoading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onClose} variant="outline" disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </>
        );

      case "help":
        return (
          <div className="py-4">
            <p>In case of emergency and concern, contact</p>
            <br />
            <p>
              <strong>
                Ma'am Flordeliza <span className="text-red-500">(Thonie)</span>{" "}
                Fernandez
              </strong>
            </p>
            <div className="mt-6 flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        );

      case "logout":
        return (
          <div className="py-4">
            <p>Are you sure you want to logout?</p>
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogoutConfirm}
                disabled={isLoading}
              >
                {isLoading ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    switch (type) {
      case "settings":
        return "Settings";
      case "help":
        return "Help";
      case "logout":
        return "Logout";
      case "login":
        return "Sign In";
      case "signup":
        return "Create Account";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
