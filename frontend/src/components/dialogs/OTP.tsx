import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OtpToggleModalProps {
    open: boolean;
    onClose: () => void;
    otpEnabled: boolean;
    onToggleOtp: (enabled: boolean) => void;
}

export function OtpToggleModal({
    open,
    onClose,
    otpEnabled,
    onToggleOtp,
}: OtpToggleModalProps) {
    const handleConfirm = () => {
        onToggleOtp(!otpEnabled);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{otpEnabled ? "Disable OTP?" : "Enable OTP?"}</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">
                    {otpEnabled
                        ? "Are you sure you want to turn off OTP? Users will no longer be required to enter a one-time password when logging in."
                        : "Are you sure you want to turn on OTP? Users will be required to enter a one-time password when logging in."}
                </div>
                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>
                        {otpEnabled ? "Turn Off OTP" : "Turn On OTP"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}