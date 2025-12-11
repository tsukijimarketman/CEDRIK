import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Help</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4">
            For assistance with CEDRIK, please contact us at:
          </p>
          <p className="mb-4 font-medium">
            <a 
              href="mailto:aicedrik@gmail.com" 
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              aicedrik@gmail.com
            </a>
          </p>
          <p className="text-sm text-gray-600">
            We'll respond to your inquiry as soon as possible.
          </p>
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}