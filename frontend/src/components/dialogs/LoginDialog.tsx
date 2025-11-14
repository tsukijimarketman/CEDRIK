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
import { useUser } from "@/contexts/UserContext";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  onLoginSuccess?: () => void;
  onSwitchToSignUp: () => void;
  onSwitchToForgot: () => void;
}

export function LoginDialog({
  open,
  onClose,
  onLogin,
  onLoginSuccess,
  onSwitchToSignUp,
  onSwitchToForgot,
}: LoginDialogProps) {
  const [formData, setFormData] = useState({ email: "", password: "" });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useUser();

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
      await login(formData.email, formData.password);
      onClose();
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || "Login failed. Please try again.";
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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
                  onClick={onSwitchToForgot}
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
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

      {/* <Dialog open={otpDialogOpen} onOpenChange={(isOpen) => !isOpen && setOtpDialogOpen(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter OTP</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setOtpLoading(true);
              try {
                if (otp === otpass) {
                  await onLogin(formData.email, formData.password);
                  setOtpDialogOpen(false);
                  setOtp("");
                } else {
                  toast({
                    title: "Invalid OTP",
                    description: "Please try again.",
                    variant: "destructive",
                  });
                }
              } finally {
                setOtpLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="login-otp">6-digit OTP</Label>
              <Input
                id="login-otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d{0,6}$/.test(val)) setOtp(val);
                }}
                required
                placeholder="123456"
                maxLength={6}
                minLength={6}
                disabled={otpLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={otpLoading || otp.length !== 6}>
              {otpLoading ? "Verifying..." : "Confirm OTP"}
            </Button>
          </form>
        </DialogContent>
      </Dialog> */}
    </>
  );
}
