import { useCallback, useState } from "react";
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
import { passwordApi } from "@/api/api";
import { ResetPasswordDialog } from "@/components/dialogs/NewPasswordDialog";

interface ConfirmOtpDialogProps {
  otpass: string;
  open: boolean;
  onClose: () => void;
  email: string;
}

export function ConfirmOtpDialog({
  otpass,
  open,
  onClose,
  email,
}: ConfirmOtpDialogProps) {
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleConfirmOTP = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        if (otp === otpass) {
          toast({
            title: "OTP Verified",
            description: "You can now reset your password.",
          });
          onClose();
          setResetDialogOpen(true);
        } else {
          toast({
            title: "Error",
            description: "Invalid OTP. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Invalid OTP. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [otp]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter OTP</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp-code">6-digit OTP</Label>
              <Input
                id="otp-code"
                type="text"
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d{0,6}$/.test(val)) setOtp(val);
                }}
                required
                placeholder="123456"
                maxLength={6}
                minLength={6}
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Confirm OTP"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        email={email}
      />
    </>
  );
}
