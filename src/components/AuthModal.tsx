import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { persistVendorLogin } from "@/lib/mock-auth";
import {
  login,
  getLoginErrorMessage,
  validateLoginResponseBody,
  forgotPassword,
  getForgotPasswordErrorMessage,
  isValidEmailFormat,
  INVALID_EMAIL_MESSAGE,
} from "@/lib/api/auth";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setForgotOpen(false);
      setForgotEmailError(null);
      setShowPassword(false);
    }
  }, [open]);

  const openForgotDialog = () => {
    setForgotEmail(email.trim());
    setForgotEmailError(null);
    setForgotOpen(true);
  };

  const handleForgotOpenChange = (next: boolean) => {
    setForgotOpen(next);
    if (!next) {
      setForgotEmailError(null);
      setForgotLoading(false);
    }
  };

  const handleForgotEmailChange = (value: string) => {
    setForgotEmail(value);
    if (forgotEmailError) setForgotEmailError(null);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!isValidEmailFormat(trimmed)) {
      setForgotEmailError(INVALID_EMAIL_MESSAGE);
      return;
    }
    setForgotEmailError(null);
    setForgotLoading(true);
    try {
      await forgotPassword({ email: trimmed });
      toast({
        title: "Check your email",
        description:
          "If an account exists for this address, you will receive reset instructions shortly.",
      });
      handleForgotOpenChange(false);
      setForgotEmail("");
    } catch (err) {
      toast({
        title: "Forgot password",
        description: getForgotPasswordErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const data = await login({
        email: email.trim(),
        password,
      });
      const accepted = validateLoginResponseBody(data);
      if (!accepted.ok) {
        toast({
          title: "Login failed",
          description: accepted.message,
          variant: "destructive",
        });
        return;
      }
      persistVendorLogin(data);
      onOpenChange(false);
      toast({
        title: "Signed in",
        description: "Welcome back.",
      });
    } catch (err) {
      toast({
        title: "Login failed",
        description: getLoginErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-popover">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-center">
              Welcome Back
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none ring-offset-background transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full gradient-gold text-primary-foreground font-semibold"
              disabled={loading || forgotLoading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              disabled={loading || forgotLoading}
              onClick={openForgotDialog}
            >
              Forgot password?
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={forgotOpen} onOpenChange={handleForgotOpenChange}>
        <DialogContent className="sm:max-w-md bg-popover">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-center">
              Reset password
            </DialogTitle>
            <DialogDescription className="text-center">
              Enter the email for your account. We will send reset instructions if
              it exists.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email address</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => handleForgotEmailChange(e.target.value)}
                aria-invalid={Boolean(forgotEmailError)}
                aria-describedby={
                  forgotEmailError ? "forgot-email-error" : undefined
                }
                className={forgotEmailError ? "border-destructive" : undefined}
              />
              {forgotEmailError ? (
                <p
                  id="forgot-email-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {forgotEmailError}
                </p>
              ) : null}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="submit"
                className="w-full gradient-gold text-primary-foreground font-semibold"
                disabled={forgotLoading}
              >
                {forgotLoading ? "Sending…" : "Send reset link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={forgotLoading}
                onClick={() => handleForgotOpenChange(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
