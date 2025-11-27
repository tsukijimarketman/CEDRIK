import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

interface SignUpDialogProps {
  open: boolean;
  onClose: () => void;
  onSignUp: (username: string, email: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
}

export function SignUpDialog({
  open,
  onClose,
  onSignUp,
  onSwitchToLogin,
}: SignUpDialogProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [hasScrolledPrivacy, setHasScrolledPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const termsScrollRef = useRef<HTMLDivElement>(null);
  const privacyScrollRef = useRef<HTMLDivElement>(null);
  
  // CAPTCHA state
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: "" });
  const [captchaValid, setCaptchaValid] = useState(false);

  // Generate new CAPTCHA
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ num1, num2, answer: "" });
    setCaptchaValid(false);
  };

  // Generate CAPTCHA when dialog opens
  useEffect(() => {
    if (open) {
      generateCaptcha();
    }
  }, [open]);

  // Reset scroll state when dialogs open
  useEffect(() => {
    if (showTerms) {
      setHasScrolledTerms(false);
    }
  }, [showTerms]);

  useEffect(() => {
    if (showPrivacy) {
      setHasScrolledPrivacy(false);
    }
  }, [showPrivacy]);

  // Check if user has scrolled to bottom of Terms
  const handleTermsScroll = () => {
    const element = termsScrollRef.current;
    if (element) {
      const isAtBottom = Math.abs(
        element.scrollHeight - element.scrollTop - element.clientHeight
      ) < 10;
      if (isAtBottom) {
        setHasScrolledTerms(true);
      }
    }
  };

  // Check if user has scrolled to bottom of Privacy Policy
  const handlePrivacyScroll = () => {
    const element = privacyScrollRef.current;
    if (element) {
      const isAtBottom = Math.abs(
        element.scrollHeight - element.scrollTop - element.clientHeight
      ) < 10;
      if (isAtBottom) {
        setHasScrolledPrivacy(true);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCaptchaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCaptcha((prev) => ({ ...prev, answer: value }));
    
    // Check if answer is correct
    const correctAnswer = captcha.num1 + captcha.num2;
    setCaptchaValid(parseInt(value) === correctAnswer);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Username validation
    if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Terms validation
    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the Terms of Service";
    }

    // Privacy validation
    if (!agreedToPrivacy) {
      newErrors.privacy = "You must agree to the Privacy Policy";
    }

    // CAPTCHA validation
    if (!captchaValid) {
      newErrors.captcha = "Please solve the math problem correctly";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await onSignUp(formData.username, formData.email, formData.password);
      
      // Reset form
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setAgreedToTerms(false);
      setAgreedToPrivacy(false);
      generateCaptcha();

      onClose();
    } catch (error: any) {
      // Error handling
      let errorMessage = "Failed to create account. Please try again.";
      
      console.log("Signup error:", error); // Debug log
      
      // The axios interceptor extracts error.response.data, so error IS the data object
      if (error?.error) {
        // This is the main error message from the backend
        errorMessage = error.error;
      } else if (error?.description) {
        // Fallback to description if error field not present
        errorMessage = error.description;
      } else if (error?.validation_error) {
        // Handle validation errors from mongoengine
        const validationErrors = error.validation_error;
        const errorMessages = [];
        
        for (const [field, messages] of Object.entries(validationErrors)) {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(", ")}`);
          } else {
            errorMessages.push(`${field}: ${messages}`);
          }
        }
        errorMessage = errorMessages.join("; ");
      } else if (error?.msg) {
        errorMessage = error.msg;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setErrors({ general: errorMessage });
      // Also generate a new CAPTCHA on error
      generateCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
            <DialogDescription>
              Join our cybersecurity education platform
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="signup-username">Username</Label>
              <Input
                id="signup-username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* CAPTCHA */}
            <div className="space-y-2">
              <Label htmlFor="captcha">Verify you're human</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-lg">
                  {captcha.num1} + {captcha.num2} = ?
                </div>
                <Input
                  id="captcha"
                  type="number"
                  value={captcha.answer}
                  onChange={handleCaptchaChange}
                  placeholder="Answer"
                  className={`w-24 ${errors.captcha ? "border-red-500" : captchaValid ? "border-green-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateCaptcha}
                >
                  Refresh
                </Button>
              </div>
              {errors.captcha && (
                <p className="text-sm text-red-500">{errors.captcha}</p>
              )}
            </div>

            {/* Terms of Service */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  disabled={!hasScrolledTerms}
                  className={errors.terms ? "border-red-500" : ""}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setShowTerms(true)}
                    >
                      Terms of Service
                    </button>
                    {!hasScrolledTerms && (
                      <span className="text-muted-foreground ml-1">(Read first)</span>
                    )}
                  </label>
                </div>
              </div>
              {errors.terms && (
                <p className="text-sm text-red-500">{errors.terms}</p>
              )}
            </div>

            {/* Privacy Policy */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="privacy"
                  checked={agreedToPrivacy}
                  onCheckedChange={(checked) => setAgreedToPrivacy(checked === true)}
                  disabled={!hasScrolledPrivacy}
                  className={errors.privacy ? "border-red-500" : ""}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="privacy"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setShowPrivacy(true)}
                    >
                      Privacy Policy
                    </button>
                    {!hasScrolledPrivacy && (
                      <span className="text-muted-foreground ml-1">(Read first)</span>
                    )}
                  </label>
                </div>
              </div>
              {errors.privacy && (
                <p className="text-sm text-red-500">{errors.privacy}</p>
              )}
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Creating..." : "Create Account"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={onSwitchToLogin}
              >
                Sign in
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <div 
            ref={termsScrollRef}
            onScroll={handleTermsScroll}
            className="space-y-4 text-sm overflow-y-auto flex-1 pr-2"
          >
            <section>
              <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground">
                By accessing and using this cybersecurity education platform, you accept and agree to be bound by the terms and conditions of this agreement.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Educational Purpose</h3>
              <p className="text-muted-foreground">
                This platform is designed solely for educational purposes in the field of cybersecurity. All content, tools, and techniques provided are intended to help users understand security concepts and protect systems, not to exploit them.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. Ethical Use Policy</h3>
              <p className="text-muted-foreground">
                You agree to use the knowledge and skills gained from this platform ethically and legally. You must:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground space-y-1">
                <li>Only test security on systems you own or have explicit written permission to test</li>
                <li>Comply with all applicable local, state, national, and international laws</li>
                <li>Not use this knowledge to cause harm, damage, or unauthorized access to any system</li>
                <li>Practice responsible disclosure if you discover vulnerabilities</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Account Responsibilities</h3>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Prohibited Activities</h3>
              <p className="text-muted-foreground">
                You may not use this platform to:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground space-y-1">
                <li>Engage in any illegal activities or promote illegal activities</li>
                <li>Attempt to gain unauthorized access to any systems or networks</li>
                <li>Share or distribute malicious code or exploits for harmful purposes</li>
                <li>Violate the privacy or security of others</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Content and Intellectual Property</h3>
              <p className="text-muted-foreground">
                All educational content, materials, and resources provided on this platform are protected by copyright and other intellectual property laws. You may use them for personal educational purposes only.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Disclaimer of Warranties</h3>
              <p className="text-muted-foreground">
                This platform and its content are provided "as is" without any warranties, express or implied. We do not guarantee the accuracy, completeness, or usefulness of any information provided.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Limitation of Liability</h3>
              <p className="text-muted-foreground">
                We shall not be liable for any damages arising from the use or inability to use this platform or its content. You assume full responsibility for any consequences of applying the knowledge gained here.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">9. Account Termination</h3>
              <p className="text-muted-foreground">
                We reserve the right to terminate or suspend your account at any time if we believe you have violated these terms or engaged in unethical or illegal activities.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">10. Changes to Terms</h3>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">11. Contact</h3>
              <p className="text-muted-foreground">
                If you have any questions about these terms, please contact us through the platform's support channels.
              </p>
            </section>

            <p className="text-xs text-muted-foreground mt-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
          
          {!hasScrolledTerms && (
            <p className="text-sm text-amber-600 text-center py-2">
              ⬇️ Please scroll to the bottom to continue
            </p>
          )}
          
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowTerms(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setAgreedToTerms(true);
                setShowTerms(false);
              }}
              disabled={!hasScrolledTerms}
            >
              I Agree
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <div 
            ref={privacyScrollRef}
            onScroll={handlePrivacyScroll}
            className="space-y-4 text-sm overflow-y-auto flex-1 pr-2"
          >
            <section>
              <h3 className="font-semibold mb-2">1. Information We Collect</h3>
              <p className="text-muted-foreground mb-2">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside ml-4 text-muted-foreground space-y-1">
                <li>Account information (username, email address, password)</li>
                <li>Profile information you choose to provide</li>
                <li>Communications with us and other users</li>
                <li>Learning progress and course interactions</li>
                <li>Files and content you upload to the platform</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Automatically Collected Information</h3>
              <p className="text-muted-foreground mb-2">
                When you use our platform, we automatically collect certain information, including:
              </p>
              <ul className="list-disc list-inside ml-4 text-muted-foreground space-y-1">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Log data (access times, error logs, system activity)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. How We Use Your Information</h3>
              <p className="text-muted-foreground mb-2">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside ml-4 text-muted-foreground space-y-1">
                <li>Provide, maintain, and improve our educational services</li>
                <li>Personalize your learning experience</li>
                <li>Communicate with you about updates, security alerts, and support</li>
                <li>Monitor and analyze usage patterns to improve our platform</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Enforce our terms of service and protect user safety</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Information Sharing and Disclosure</h3>
              <p className="text-muted-foreground mb-2">
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside ml-4 text-muted-foreground space-y-1">
                <li>With your consent or at your direction</li>
                <li>With service providers who assist in operating our platform</li>
                <li>To comply with legal obligations or respond to lawful requests</li>
                <li>To protect the rights, property, and safety of our users and the public</li>
                <li>In connection with a merger, sale, or acquisition of our business</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Data Security</h3>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Data Retention</h3>
              <p className="text-muted-foreground">
                We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information within a reasonable timeframe.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Your Rights and Choices</h3>
              <p className="text-muted-foreground mb-2">
                You have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside ml-4 text-muted-foreground space-y-1">
                <li>Access and update your account information at any time</li>
                <li>Request a copy of your personal data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of marketing communications</li>
                <li>Disable cookies through your browser settings</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Cookies and Tracking Technologies</h3>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to authenticate users, remember preferences, analyze usage, and improve our services. You can control cookies through your browser settings, but disabling them may affect platform functionality.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">9. Third-Party Services</h3>
              <p className="text-muted-foreground">
                Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing them with any personal information.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">10. Children's Privacy</h3>
              <p className="text-muted-foreground">
                Our platform is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">11. International Data Transfers</h3>
              <p className="text-muted-foreground">
                Your information may be transferred to and processed in countries other than your own. By using our platform, you consent to such transfers. We ensure appropriate safeguards are in place to protect your data.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">12. Changes to This Privacy Policy</h3>
              <p className="text-muted-foreground">
                We may update this privacy policy from time to time. We will notify you of significant changes by posting the new policy on our platform and updating the "Last updated" date. Your continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">13. Contact Us</h3>
              <p className="text-muted-foreground">
                If you have questions or concerns about this privacy policy or our data practices, please contact us through our support channels. We will respond to your inquiry within a reasonable timeframe.
              </p>
            </section>

            <p className="text-xs text-muted-foreground mt-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
          
          {!hasScrolledPrivacy && (
            <p className="text-sm text-amber-600 text-center py-2">
              ⬇️ Please scroll to the bottom to continue
            </p>
          )}
          
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowPrivacy(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setAgreedToPrivacy(true);
                setShowPrivacy(false);
              }}
              disabled={!hasScrolledPrivacy}
            >
              I Agree
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}