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
import { authApi, otpApi } from "@/api/api";
import emailjs from "@emailjs/browser";

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
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpass, setOtpass] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

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
      try {
        await authApi.login({
          email: formData.email,
          password: formData.password,
        });
      } catch (err: any) {
        let errorMessage = "Invalid email or password.";
        if (err?.error) errorMessage = err.error;
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const resOTP = await otpApi.loginOtp(formData.email);
      const code = resOTP.data;
      setOtpass(code);

      const templateParams = {
        email: formData.email,
        otp: code,
      };

      await emailjs.send(
        import.meta.env.VITE_SERVICE_ID_EMAILJS,
        import.meta.env.VITE_TEMPLATE_ID_EMAILJS,
        templateParams,
        import.meta.env.VITE_PUBLIC_KEY_EMAILJS
      );

      toast({
        title: "OTP Sent",
        description: "Please check your email for the verification code.",
      });
      onClose();
      setOtpDialogOpen(true);
    } catch (error: any) {
      console.error("OTP send error:", error);
      let errorMessage = "Failed to send OTP. Please try again.";
      if (error?.message) errorMessage = error.message;
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
              {isLoading ? "Sending OTP..." : "Sign In"}
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

      <Dialog open={otpDialogOpen} onOpenChange={(isOpen) => !isOpen && setOtpDialogOpen(false)}>
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
      </Dialog>
    </>
  );
}
