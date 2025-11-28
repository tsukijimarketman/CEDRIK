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
import { ConfirmOtpDialog } from "@/components/dialogs/OtpDialog";
import emailjs from "@emailjs/browser";
import { passwordApi } from "@/api/api";

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

export function ForgotPasswordDialog({
  open,
  onClose,
  onSwitchToSignIn,
}: ForgotPasswordDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpass, setOtpass] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Get OTP from backend
      console.log("Requesting OTP for:", email);
      const resOTP = await passwordApi.forgotPassword(email);
      const otp = resOTP.data;
      console.log("OTP received from backend:", otp);
      
      // ✅ Convert OTP to string to ensure consistency
      const otpString = String(otp);
      setOtpass(otpString);
      
      // Step 2: Send email using EmailJS
      const templateParams = {
        email: email,
        otp: otpString, // ✅ Use string version
      };

      console.log("Sending email via EmailJS...");
      await emailjs.send(
        import.meta.env.VITE_SERVICE_ID_EMAILJS,
        import.meta.env.VITE_FORGOT_PASSWORD_TEMPLATE_ID_EMAILJS,
        templateParams,
        import.meta.env.VITE_PUBLIC_KEY_EMAILJS
      );
      console.log("Email sent successfully");

      toast({
        title: "Email Sent",
        description: "Check your inbox for the verification code.",
      });
      
      onClose(); // close forgot password dialog
      setOtpDialogOpen(true); // open OTP dialog
      
    } catch (error: any) {
      // ✅ Enhanced error logging
      console.error("Error in handleSendOTP:", error);
      console.error("Error details:", {
        message: error?.message,
        text: error?.text,
        response: error?.response,
        data: error?.response?.data,
        error: error?.error,
      });

      // ✅ Better error message extraction
      let errorMessage = "Something went wrong. Please try again.";
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.text) {
        errorMessage = error.text;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Remembered your password?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={onSwitchToSignIn}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmOtpDialog
        otpass={otpass}
        open={otpDialogOpen}
        onClose={() => setOtpDialogOpen(false)}
        email={email}
      />
    </>
  );
}