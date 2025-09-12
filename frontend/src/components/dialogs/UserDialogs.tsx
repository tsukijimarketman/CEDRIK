import { useState } from "react";
import { Button } from "@/components/ui/button";
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

interface UserDialogsProps {
  open: boolean;
  type: DialogType;
  onClose: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  onLogout: () => void;
}

export function UserDialogs({
  open,
  type,
  onClose,
  onLogin,
  onSignUp,
  onLogout,
}: UserDialogsProps) {
  const [formData, setFormData] = useState({
    username: "user123",
    email: "user@example.com",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    // Add your save logic here
    console.log("Saving settings:", formData);
    onClose();
  };

  const handleLogoutConfirm = () => {
    onLogout();
    onClose();
  };

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ username: '', email: '', password: '' });

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login data:', loginData);
    onLogin();
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Signup data:', signupData);
    onSignUp();
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
                <Label htmlFor="password" className="text-right">
                  New Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Leave empty to keep current"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSave}>Save changes</Button>
            </DialogFooter>
          </>
        );

      case "help":
        return (
          <div className="py-4">
            <p>
              In case of emergency and concern, contact sir Mark (chatgpt)
              Asuncion
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
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLogoutConfirm}>
                Confirm
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
