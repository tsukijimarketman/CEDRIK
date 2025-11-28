import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export function SettingsDialog({ 
  open, 
  onClose, 
  onSave, 
  currentUsername, 
  currentEmail 
}) {
  const [username, setUsername] = useState(currentUsername);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [temperatureLevel, setTemperatureLevel] = useState(1);
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(currentUsername);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setIsChangingPassword(false);
    }
  }, [open, currentUsername]);

  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem("ai_temperature_level");
        const n = Number(saved);
        if (!Number.isNaN(n) && n >= 0 && n <= 2) {
          setTemperatureLevel(n);
        }
      } catch {
        setTemperatureLevel(1);
      }
    }
  }, [open]);

  const validatePasswordChange = () => {
    if (isChangingPassword) {
      if (!currentPassword) {
        setPasswordError('Current password is required');
        return false;
      }
      if (!newPassword) {
        setPasswordError('New password is required');
        return false;
      }
      if (newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters');
        return false;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return false;
      }
      if (currentPassword === newPassword) {
        setPasswordError('New password must be different');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validatePasswordChange()) {
      return;
    }

    try {
      localStorage.setItem("ai_temperature_level", String(temperatureLevel));
    } catch {}
    
    const currentPass = isChangingPassword ? currentPassword : '';
    const newPass = isChangingPassword ? newPassword : '';
    
    onSave(username, currentPass, newPass);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              value={currentEmail} 
              disabled 
              className="opacity-70" 
            />
          </div>

          {/* Password Change Toggle */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsChangingPassword(!isChangingPassword);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
              >
                {isChangingPassword ? 'Cancel' : 'Change Password'}
              </Button>
            </div>

            {isChangingPassword && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Enter current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">{passwordError}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Response Style */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Response Style</Label>
            <Slider
              value={[temperatureLevel]}
              onValueChange={(v) => setTemperatureLevel(v[0] ?? 1)}
              min={0}
              max={2}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Balanced</span>
              <span>Deterministic</span>
              <span>Poetic</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}