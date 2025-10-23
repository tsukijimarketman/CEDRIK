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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {


      const templateParams = {
        user_email: email,

      };

      // Send email using EmailJS
      await emailjs.send(
        "service_y4eazat",       // Your Service ID
        "template_lf7k96h",      // Your Template ID
        { email: email },       // template parameters
        "qGqmEJpufN8ZsSFLq"     // Your Public Key
      );

      toast({
        title: "Email Sent",
        description: "Check your inbox for the verification code.",
      });
      onClose(); // close forgot password dialog
      setOtpDialogOpen(true); // open OTP dialog
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.text || error?.message || "Something went wrong. Please try again.",
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
        open={otpDialogOpen}
        onClose={() => setOtpDialogOpen(false)}
        email={email}
      />
    </>
  );
}
