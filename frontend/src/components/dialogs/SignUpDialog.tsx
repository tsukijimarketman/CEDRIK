import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignUpDialogProps {
  open: boolean;
  onClose: () => void;
  onSignUp: (username: string, email: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
}

export function SignUpDialog({
  open,
  onClose,
  onSignUp,
  onSwitchToLogin,
}: SignUpDialogProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSignUp(formData.username, formData.email, formData.password);
      
      // Success toast
      toast({
        title: "Account created successfully!",
        description: "Please log in with your new account.",
      });

      // Reset form
      setFormData({
        username: "",
        email: "",
        password: "",
      });

      onClose();
    } catch (error: any) {
      // Error handling with proper toast
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error) {
        errorMessage = error.error.password;
      } else if (error?.response?.data?.validation_error) {
        const validationErrors = error.response.data.validation_error;
        errorMessage = Object.values(validationErrors).flat().join(", ");
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Sign up failed",
        description: errorMessage,
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
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-username">Username</Label>
            <Input
              id="signup-username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Creating..." : "Create Account"}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}