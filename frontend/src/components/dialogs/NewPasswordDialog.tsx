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
import { passwordApi } from "@/api/api";

interface ResetPasswordDialogProps {
    open: boolean;
    onClose: () => void;
    email: string;
}

export function ResetPasswordDialog({ open, onClose, email }: ResetPasswordDialogProps) {
    const { toast } = useToast();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwordsMatch) {
            toast({
                title: "Error",
                description: "Passwords do not match.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            await passwordApi.resetPassword(email, newPassword);
            toast({
                title: "Success",
                description: "Your password has been reset successfully.",
            });
            onClose();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to reset password. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="Enter new password"
                            disabled={loading}
                            minLength={6}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm new password"
                            disabled={loading}
                            minLength={6}
                        />
                    </div>
                    {!passwordsMatch && confirmPassword.length > 0 && (
                        <p className="text-destructive text-sm">Passwords do not match.</p>
                    )}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || !passwordsMatch}
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
