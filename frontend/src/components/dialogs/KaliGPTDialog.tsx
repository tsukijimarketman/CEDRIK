import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface KaliGPTDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function KaliGPTDialog({ open, onClose, onConfirm }: KaliGPTDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");

  // Reset states when dialog is opened
  useEffect(() => {
    if (open) {
      setIsLoading(false);
      setShowSuccess(false);
      setConnectionMessage("");
    }
  }, [open]);

  const handleYes = async () => {
  setIsLoading(true);
  
  try {
    // Open CEDRIK Labs in a new tab
    const labsUrl = 'http://localhost:8069'; // CEDRIK Labs URL
    const labWindow = window.open(labsUrl, '_blank');
    
    if (labWindow) {
      setConnectionMessage('Connected Successfully - Labs opened in new tab');
      setIsLoading(false);
      setShowSuccess(true);
      
      // Auto-close after showing success
      setTimeout(() => {
        onConfirm();
        onClose();
        setShowSuccess(false);
        setConnectionMessage("");
      }, 2000);
    } else {
      throw new Error('Popup blocked');
    }
  } catch (error) {
    console.error('Failed to connect to CEDRIK Labs:', error);
    setConnectionMessage('Connection Failed. Please allow popups and try again.');
    setIsLoading(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      onClose();
      setShowSuccess(false);
      setConnectionMessage("");
    }, 2000);
  }
};

  const handleNo = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isLoading && !showSuccess && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {showSuccess ? 'Connection Status' : isLoading ? 'Connecting to CEDRIK Labs' : 'Connection Request'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-8">
              {/* Success/Error Icon */}
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                connectionMessage.includes('Successfully') ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {connectionMessage.includes('Successfully') ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-8 h-8 text-green-600"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-8 h-8 text-red-600"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p className={`mt-4 text-lg font-medium ${
                connectionMessage.includes('Successfully') ? 'text-green-600' : 'text-red-600'
              }`}>
                {connectionMessage}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              {/* Circular loading animation */}
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-gray-200"></div>
                <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground animate-pulse">
                Establishing connection to CEDRIK Labs...
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-lg font-medium mb-6">Are you sure you want to connect to CEDRIK Labs?</p>
              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={handleNo}
                  className="w-24"
                  disabled={isLoading}
                >
                  No
                </Button>
                <Button 
                  onClick={handleYes}
                  className="w-24"
                  disabled={isLoading}
                >
                  Yes
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
