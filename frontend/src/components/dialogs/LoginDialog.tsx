import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/api/api";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  onLoginSuccess?: () => void;
  onSwitchToSignUp: () => void;
}

export function LoginDialog({
  open,
  onClose,
  onLogin,
  onLoginSuccess,
  onSwitchToSignUp,
}: LoginDialogProps) {
  const [formData, setFormData] = useState({ email: "", password: "" });

  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Make login request
      const loginResponse = await authApi.login({
        email: formData.email,
        password: formData.password,
      });

      // Store user data from login response
      const userData = loginResponse.data;
      if (userData) {
        localStorage.setItem("user", JSON.stringify(userData));

        // Call the login handler with user data
        if (onLogin) {
          onLogin(formData.email, formData.password);
        }

        // Verify the session by making a me request
        try {
          const meResponse = await authApi.me();
          if (meResponse.data) {
            // Update user data with any additional info from /me
            localStorage.setItem("user", JSON.stringify(meResponse.data));
          }
        } catch (meError) {
          console.warn("Could not fetch user details:", meError);
          // Continue with the login even if /me fails, as login was successful
        }

        toast({
          title: "Success",
          description: "Login successful!",
        });

        // Call the success handler if provided
        onLoginSuccess?.();
        // Close the dialog
        onClose();
      }
    } catch (error: unknown) {
      console.error("Login error:", error);

      let errorMessage = "Failed to login. Please check your credentials.";
      if (
        error instanceof Error &&
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      ) {
        errorMessage = (error as { response?: { data?: { message?: string } } })
          .response.data.message;
      }

      toast({
        title: "Error",
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
          <DialogTitle>Sign In</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="login-password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Sign In
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={onSwitchToSignUp}
            >
              Sign up
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
