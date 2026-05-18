import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BankDetailsSection } from "@/components/settings/BankDetailsSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import type { AccountMeResponse, UpdateProfilePayload } from "@/lib/api/account";
import {
  extractAvtarUrlFromResponse,
  fetchAccountMe,
  formatInstructorFullName,
  changePassword,
  getAccountMeErrorMessage,
  mergeProfilePictureUploadIntoAccountMeCache,
  mergeSavedProfileIntoAccountMeCache,
  parseAccountMePayload,
  updateProfile,
  updateProfilePicture,
} from "@/lib/api/account";
import { useVendorAvatarDisplayUrl } from "@/hooks/use-vendor-avatar-display-url";
import { getVendorAuthToken } from "@/lib/mock-auth";
import {
  INVALID_EMAIL_MESSAGE,
  isValidEmailFormat,
} from "@/lib/api/auth";
import { compressProfileImageIfNeeded } from "@/lib/compress-profile-image";
import { cn } from "@/lib/utils";
import {
  Camera,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Gift,
  Headphones,
  HelpCircle,
  Image as ImageIcon,
  Mail,
  Monitor,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? "support@alpha.study";
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE ?? "+91 9975640109";
const SUPPORT_HOURS = import.meta.env.VITE_SUPPORT_HOURS ?? "Monday – Saturday, 10:00 AM – 6:00 PM IST";

function randomReferralSegment(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const PHOTO_MAX_MB = 5;
/** Target cap for compression output (slightly under hard limit for safety). */
const PHOTO_MAX_BYTES = Math.floor(PHOTO_MAX_MB * 1024 * 1024 * 0.97);
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function profileInitials(displayName: string, email: string): string {
  const n = displayName.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (
        parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)
      ).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = email.trim();
  if (e.includes("@")) {
    return e.slice(0, 2).toUpperCase();
  }
  return "?";
}

/** Outer shell for each settings tab — common in dashboard settings UIs */
function SettingsPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <h3 className="font-heading text-lg font-semibold tracking-tight">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

type UiTheme = "dark" | "light" | "system";

function ProfileAppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mt-6 border-t border-border pt-6">
      <h4 className="mb-1 text-sm font-semibold tracking-tight text-foreground">
        Appearance
      </h4>
      <p className="mb-4 text-xs text-muted-foreground">
        Theme applies on this device only and is remembered in your browser.
      </p>
      <RadioGroup
        value={theme}
        onValueChange={(v) => setTheme(v as UiTheme)}
        className="grid gap-2 sm:grid-cols-3"
      >
        <label
          htmlFor="profile-theme-light"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
            theme === "light"
              ? "border-primary bg-primary/[0.06] shadow-sm"
              : "border-border bg-card hover:bg-muted/40"
          )}
        >
          <RadioGroupItem value="light" id="profile-theme-light" />
          <Sun className="h-4 w-4 shrink-0 text-foreground opacity-80" aria-hidden />
          <span className="text-sm font-medium leading-none">Light</span>
        </label>
        <label
          htmlFor="profile-theme-dark"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
            theme === "dark"
              ? "border-primary bg-primary/[0.06] shadow-sm"
              : "border-border bg-card hover:bg-muted/40"
          )}
        >
          <RadioGroupItem value="dark" id="profile-theme-dark" />
          <Moon className="h-4 w-4 shrink-0 text-foreground opacity-80" aria-hidden />
          <span className="text-sm font-medium leading-none">Dark</span>
        </label>
        <label
          htmlFor="profile-theme-system"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors sm:col-span-1",
            theme === "system"
              ? "border-primary bg-primary/[0.06] shadow-sm"
              : "border-border bg-card hover:bg-muted/40"
          )}
        >
          <RadioGroupItem value="system" id="profile-theme-system" />
          <Monitor className="h-4 w-4 shrink-0 text-foreground opacity-80" aria-hidden />
          <span className="text-sm font-medium leading-none">System</span>
        </label>
      </RadioGroup>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoFileRef = useRef<File | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  /** Ensures avatar path is known immediately after save (GET /me can lag behind or omit path one tick). */
  const [persistedAvatarPath, setPersistedAvatarPath] = useState<string | null>(
    null
  );
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [verificationPane, setVerificationPane] = useState<"kyc" | "bank">("kyc");

  const {
    data: meData,
    isPending: profileLoading,
    isError: profileError,
    error: profileQueryError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["vendor", "account", "me"],
    queryFn: fetchAccountMe,
    staleTime: 60_000,
  });

  const profile = useMemo(
    () => (meData ? parseAccountMePayload(meData) : null),
    [meData]
  );

  const effectiveAvatarStoredPath =
    profile?.avatarUrl?.trim() || persistedAvatarPath || undefined;

  const avatarDisplaySrc = useVendorAvatarDisplayUrl(
    photoPreview,
    effectiveAvatarStoredPath
  );

  const profilePhotoPreviewSrc = photoPreview ?? avatarDisplaySrc;
  const canPreviewProfilePhoto = Boolean(profilePhotoPreviewSrc);

  const [profilePhotoPreviewOpen, setProfilePhotoPreviewOpen] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitLoading, setPasswordSubmitLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    const p = profile?.avatarUrl?.trim();
    if (persistedAvatarPath && p && p === persistedAvatarPath) {
      setPersistedAvatarPath(null);
    }
  }, [profile?.avatarUrl, persistedAvatarPath]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }
    setIsPhotoProcessing(true);
    try {
      let toUse = file;
      if (file.size > PHOTO_MAX_BYTES) {
        try {
          toUse = await compressProfileImageIfNeeded(file, PHOTO_MAX_BYTES);
        } catch (compressErr) {
          toast({
            title: "Could not optimize image",
            description:
              compressErr instanceof Error
                ? compressErr.message
                : "Try a smaller image or a different format.",
            variant: "destructive",
          });
          return;
        }
      }
      const hardCap = PHOTO_MAX_MB * 1024 * 1024;
      if (toUse.size > hardCap) {
        toast({
          title: "File still too large",
          description: `After optimization the image is still over ${PHOTO_MAX_MB}MB. Try another photo.`,
          variant: "destructive",
        });
        return;
      }
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      pendingPhotoFileRef.current = toUse;
      setPhotoPreview(URL.createObjectURL(toUse));
    } finally {
      setIsPhotoProcessing(false);
    }
  };

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    pendingPhotoFileRef.current = null;
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const cancelProfileEdit = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    pendingPhotoFileRef.current = null;
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setIsEditingProfile(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrim = profileEmail.trim();
    if (!isValidEmailFormat(emailTrim)) {
      toast({
        title: "Invalid email",
        description: INVALID_EMAIL_MESSAGE,
        variant: "destructive",
      });
      return;
    }
    if (!getVendorAuthToken()) {
      toast({
        title: "Not signed in",
        description:
          "Your session has no auth token. Sign out and sign in again, then try saving.",
        variant: "destructive",
      });
      return;
    }
    const name = formatInstructorFullName(
      profileFirstName,
      profileLastName
    ).trim();
    setSaveProfileLoading(true);
    try {
      let avtarUrl = profile?.avatarUrl;
      const pendingFile = pendingPhotoFileRef.current;
      if (pendingFile) {
        const picRes = await updateProfilePicture(pendingFile);
        const fromPicture = extractAvtarUrlFromResponse(picRes);
        if (!fromPicture) {
          toast({
            title: "Photo upload unclear",
            description:
              "The server accepted the file but the response did not include a recognizable path (e.g. avtarPath). Check the POST /api/account/update_profile_picture JSON shape.",
            variant: "destructive",
          });
          return;
        }
        avtarUrl = fromPicture;
        queryClient.setQueryData(
          ["vendor", "account", "me"],
          (prev: AccountMeResponse | undefined) =>
            mergeProfilePictureUploadIntoAccountMeCache(prev, fromPicture)
        );
      }

      const payload: UpdateProfilePayload = {
        name,
        email: emailTrim,
      };
      if (avtarUrl) {
        payload.avtarUrl = avtarUrl;
      }

      await updateProfile(payload);

      if (payload.avtarUrl) {
        setPersistedAvatarPath(payload.avtarUrl);
      }

      queryClient.setQueryData(
        ["vendor", "account", "me"],
        (prev: AccountMeResponse | undefined) =>
          mergeSavedProfileIntoAccountMeCache(prev, payload)
      );

      pendingPhotoFileRef.current = null;
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      setIsEditingProfile(false);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });

      void queryClient.invalidateQueries({
        queryKey: ["vendor", "account", "me"],
      });
    } catch (err) {
      toast({
        title: "Could not save profile",
        description: getAccountMeErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSaveProfileLoading(false);
    }
  };

  const handleStartKyc = () => {
    const hostedUrl = import.meta.env.VITE_RAZORPAY_KYC_URL?.trim();
    if (hostedUrl) {
      window.open(hostedUrl, "_blank", "noopener,noreferrer");
      toast({
        title: "Razorpay KYC",
        description: "Complete verification in the new tab. This window will update once your backend confirms status.",
      });
      return;
    }
    toast({
      title: "Connect Razorpay KYC",
      description:
        "Your server should create a KYC session (Razorpay Accounts / Route stakeholder APIs) and return a hosted link. Set VITE_RAZORPAY_KYC_URL to open it from here, or wire this button to your API.",
    });
  };

  const handleGenerateReferral = () => {
    setReferralCode(`BKB-${randomReferralSegment()}`);
    toast({ title: "Referral code generated", description: "Share it with new authors to track sign-ups." });
  };

  const handleCopyReferral = useCallback(async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({ title: "Copied", description: "Referral code copied to clipboard." });
    } catch {
      toast({ title: "Could not copy", description: "Copy the code manually.", variant: "destructive" });
    }
  }, [referralCode, toast]);

  const handleChangePasswordSubmit = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Validation error",
        description: "Please fill all fields.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword === currentPassword) {
      toast({
        title: "Choose a different password",
        description: "New password must be different from your current password.",
        variant: "destructive",
      });
      return;
    }
    if (!getVendorAuthToken()) {
      toast({
        title: "Not signed in",
        description: "Sign in again, then change your password.",
        variant: "destructive",
      });
      return;
    }
    setPasswordSubmitLoading(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      toast({
        title: "Password updated",
        description: "Your password was changed successfully.",
      });
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      toast({
        title: "Could not change password",
        description: getAccountMeErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setPasswordSubmitLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, toast]);

  const razorpayKeyConfigured = Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID?.trim());

  const tabTriggerClass =
    "gap-2 rounded-md px-3 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm lg:w-full lg:justify-start";

  const verificationSubTabClass =
    "gap-2 rounded-md px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      <Dialog
        open={profilePhotoPreviewOpen}
        onOpenChange={setProfilePhotoPreviewOpen}
      >
        <DialogContent className="max-w-[min(96vw,44rem)] gap-0 overflow-hidden p-0 sm:rounded-lg">
          <DialogHeader className="border-b border-border px-6 py-4 text-left">
            <DialogTitle className="font-heading text-lg">Profile photo</DialogTitle>
            <DialogDescription>
              Full-size preview of your profile picture.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[min(75vh,36rem)] items-center justify-center bg-muted/40 p-4 sm:p-8">
            {canPreviewProfilePhoto ? (
              <img
                src={profilePhotoPreviewSrc}
                alt="Profile"
                className="max-h-[min(70vh,34rem)] w-full max-w-full rounded-md object-contain shadow-sm"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          setPasswordOpen(open);
          if (!open) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setPasswordSubmitLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new one. The new password must be different from the current one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2 relative">
              <Label>Current password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordSubmitLoading}
                  autoComplete="current-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label>New password</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordSubmitLoading}
                  autoComplete="new-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label>Confirm password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordSubmitLoading}
                  autoComplete="new-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={passwordSubmitLoading}
              onClick={() => setPasswordOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="gradient-gold text-primary-foreground font-semibold"
              disabled={passwordSubmitLoading}
              onClick={() => void handleChangePasswordSubmit()}
            >
              {passwordSubmitLoading ? "Updating…" : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mb-8 pl-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <aside className="shrink-0 lg:w-56">
            <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:block">
              Categories
            </p>
            <TabsList className="flex h-auto w-full flex-row gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1 lg:flex-col lg:overflow-visible">
              <TabsTrigger value="profile" className={tabTriggerClass}>
                <UserRound className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Profile
              </TabsTrigger>
              <TabsTrigger value="verification" className={tabTriggerClass}>
                <ShieldCheck className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Verification
              </TabsTrigger>
              <TabsTrigger value="referral" className={tabTriggerClass}>
                <Gift className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Referral
              </TabsTrigger>
              <TabsTrigger value="help" className={tabTriggerClass}>
                <HelpCircle className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Help
              </TabsTrigger>
            </TabsList>
          </aside>

          <div className="min-w-0 flex-1">
            <TabsContent
              value="profile"
              className="m-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
            >
              <SettingsPanel
                title="Profile"
                description="Your public author details and account email. Changes apply after you save."
              >
                {profileLoading ? (
                  <div className="mx-auto max-w-lg space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
                      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-2">
                        <Skeleton className="h-9 w-28" />
                        <Skeleton className="h-9 w-full max-w-[200px]" />
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-full max-w-md" />
                      <Skeleton className="h-4 w-20 pt-4" />
                      <Skeleton className="h-5 w-full max-w-md" />
                    </div>
                  </div>
                ) : profileError ? (
                  <Alert variant="destructive" className="mx-auto max-w-lg">
                    <AlertTitle>Could not load profile</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm">
                        {getAccountMeErrorMessage(profileQueryError)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => void refetchProfile()}
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                <form onSubmit={handleSave} className="mx-auto max-w-xl space-y-8">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <Avatar className="mx-auto h-28 w-28 shrink-0 border-2 border-background shadow-sm sm:mx-0">
                      {photoPreview ||
                      effectiveAvatarStoredPath ||
                      avatarDisplaySrc ? (
                        <AvatarImage
                          key={
                            effectiveAvatarStoredPath ||
                            photoPreview ||
                            "avatar"
                          }
                          src={avatarDisplaySrc}
                          alt="Profile photo"
                        />
                      ) : null}
                      <AvatarFallback className="bg-muted text-muted-foreground text-xl font-semibold">
                        {profile ? (
                          profileInitials(
                            formatInstructorFullName(
                              profile.firstName,
                              profile.lastName
                            ),
                            profile.email
                          )
                        ) : (
                          <UserRound className="h-12 w-12" aria-hidden />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
                      <div>
                        <h4 className="text-sm font-semibold tracking-tight text-foreground">
                          Profile photo
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {isEditingProfile
                            ? `JPG, PNG, WebP, or GIF · max ${PHOTO_MAX_MB}MB (larger files are auto-optimized before upload). Your new photo is saved when you click Save changes.`
                            : "Shown on your author profile. Select Edit profile to upload or replace your photo."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        {canPreviewProfilePhoto ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                            onClick={() => setProfilePhotoPreviewOpen(true)}
                          >
                            <ImageIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                            Preview
                          </Button>
                        ) : null}
                        {isEditingProfile ? (
                          <>
                            <input
                              ref={photoInputRef}
                              type="file"
                              accept={PHOTO_ACCEPT}
                              className="sr-only"
                              id="profile-photo"
                              disabled={isPhotoProcessing}
                              onChange={handlePhotoChange}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              asChild
                              disabled={isPhotoProcessing}
                            >
                              <label
                                htmlFor="profile-photo"
                                className={cn(
                                  "gap-2",
                                  isPhotoProcessing
                                    ? "pointer-events-none cursor-wait opacity-70"
                                    : "cursor-pointer"
                                )}
                              >
                                <Camera className="h-4 w-4 shrink-0" aria-hidden />
                                {isPhotoProcessing ? "Optimizing…" : "Change photo"}
                              </label>
                            </Button>
                            {photoPreview ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                disabled={isPhotoProcessing}
                                onClick={handleRemovePhoto}
                              >
                                <X className="mr-2 h-4 w-4" aria-hidden />
                                Remove
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {isEditingProfile ? (
                    <>
                      <div>
                        <h4 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
                          Account details
                        </h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="profile-first-name">First name</Label>
                          <Input
                            id="profile-first-name"
                            name="firstName"
                            value={profileFirstName}
                            onChange={(e) => setProfileFirstName(e.target.value)}
                            placeholder="First name"
                            autoComplete="given-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-last-name">Last name</Label>
                          <Input
                            id="profile-last-name"
                            name="lastName"
                            value={profileLastName}
                            onChange={(e) => setProfileLastName(e.target.value)}
                            placeholder="Last name"
                            autoComplete="family-name"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                      </div>
                      <ProfileAppearanceSection />
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                          type="submit"
                          className="gradient-gold text-primary-foreground font-semibold"
                          disabled={saveProfileLoading}
                        >
                          {saveProfileLoading ? "Saving…" : "Save changes"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={saveProfileLoading}
                          onClick={cancelProfileEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
                          Account details
                        </h4>
                      <div className="grid grid-cols-1 gap-6 pb-1 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-muted-foreground">Instructor name</Label>
                          <p className="font-medium text-foreground">
                            {profile
                              ? formatInstructorFullName(
                                  profile.firstName,
                                  profile.lastName
                                ).trim() || "—"
                              : "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium text-foreground">
                            {profile?.email?.trim() ? profile.email : "—"}
                          </p>
                        </div>
                        {profile?.phone?.trim() ? (
                          <div className="space-y-1">
                            <Label className="text-muted-foreground">Phone</Label>
                            <p className="font-medium text-foreground">{profile.phone}</p>
                          </div>
                        ) : null}
                      </div>
                      <ProfileAppearanceSection />
                      </div>
                      
                      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                        <Button
                          type="button"
                          onClick={() => {
                            if (photoPreview) URL.revokeObjectURL(photoPreview);
                            pendingPhotoFileRef.current = null;
                            setPhotoPreview(null);
                            if (photoInputRef.current) photoInputRef.current.value = "";
                            setProfileFirstName(profile?.firstName ?? "");
                            setProfileLastName(profile?.lastName ?? "");
                            setProfileEmail(profile?.email ?? "");
                            setIsEditingProfile(true);
                          }}
                          className="gradient-gold text-primary-foreground font-semibold"
                        >
                          Edit Profile
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setPasswordOpen(true)}>
                          Change Password
                        </Button>
                      </div>
                    </>
                  )}
                </form>
                )}
              </SettingsPanel>
            </TabsContent>

            <TabsContent
              value="verification"
              className="m-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
            >
              <SettingsPanel
                title="Verification"
                description="Razorpay identity checks and bank details for payouts."
              >
                <Tabs
                  value={verificationPane}
                  onValueChange={(v) => setVerificationPane(v as "kyc" | "bank")}
                  className="w-full"
                >
                  <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
                    <TabsTrigger value="kyc" className={verificationSubTabClass}>
                      Razorpay KYC
                    </TabsTrigger>
                    <TabsTrigger value="bank" className={verificationSubTabClass}>
                      Bank details
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="kyc"
                    className="m-0 mt-0 space-y-6 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
                  >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                      Razorpay
                    </Badge>
                    <Badge variant="outline" className="border-primary/25">
                      Verification pending
                    </Badge>
                  </div>

                  <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Integration overview</p>
                    <p className="mt-2 leading-relaxed">
                      PAN, bank, and compliance checks run in Razorpay&apos;s flow. Your backend should create the KYC
                      session via their APIs and return a hosted URL for the author to complete.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key status</p>
                      <p className="mt-2 text-sm">
                        Razorpay key:{" "}
                        <span className="font-medium text-foreground">{razorpayKeyConfigured ? "Configured" : "Not set"}</span>
                      </p>
                      {!razorpayKeyConfigured ? (
                        <p className="mt-2 text-xs text-muted-foreground leading-snug">
                          Use VITE_RAZORPAY_KEY_ID for client checkout. KYC links should be issued by your server.
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-md border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typical flow</p>
                      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
                        <li>Backend creates a Razorpay KYC session and stores ids.</li>
                        <li>User opens the hosted URL (from env or API).</li>
                        <li>Webhooks or polling update status in your app.</li>
                      </ol>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleStartKyc} className="gradient-gold text-primary-foreground font-semibold">
                      Start verification
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a href="https://razorpay.com/docs/api/" target="_blank" rel="noopener noreferrer">
                        API documentation
                        <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
                      </a>
                    </Button>
                  </div>
                  </TabsContent>

                  <TabsContent
                    value="bank"
                    className="m-0 mt-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
                  >
                    <BankDetailsSection />
                  </TabsContent>
                </Tabs>
              </SettingsPanel>
            </TabsContent>

            <TabsContent
              value="referral"
              className="m-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
            >
              <SettingsPanel
                title="Referral program"
                description="Generate a code to share with new authors. Redemption and rewards should be enforced on your backend."
              >
                <div className="mx-auto max-w-lg space-y-6">
                  {referralCode ? (
                    <div className="rounded-md border border-primary/20 bg-primary/[0.06] px-4 py-5 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active code</p>
                      <p className="mt-2 font-mono text-2xl font-semibold tracking-wider text-foreground">{referralCode}</p>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="referral">Referral code</Label>
                    <Input
                      id="referral"
                      readOnly
                      placeholder="Generate a code to get started"
                      value={referralCode ?? ""}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={handleGenerateReferral}>
                      Generate new code
                    </Button>
                    <Button type="button" variant="secondary" disabled={!referralCode} onClick={handleCopyReferral}>
                      <Copy className="mr-2 h-4 w-4" aria-hidden />
                      Copy to clipboard
                    </Button>
                  </div>
                </div>
              </SettingsPanel>
            </TabsContent>

            <TabsContent
              value="help"
              className="m-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
            >
              <SettingsPanel
                title="Help & support"
                description="Contact us for payouts, verification, or account issues."
              >
                <div className="space-y-4">
                  <div className="flex gap-4 rounded-md border border-border p-4 transition-colors hover:bg-muted/30">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Email</p>
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm text-primary hover:underline">
                        {SUPPORT_EMAIL}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-4 rounded-md border border-border p-4 transition-colors hover:bg-muted/30">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Phone className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Phone</p>
                      <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="text-sm text-primary hover:underline">
                        {SUPPORT_PHONE}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-4 rounded-md border border-border p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Support hours</p>
                      <p className="text-sm text-muted-foreground">{SUPPORT_HOURS}</p>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Headphones className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    For urgent payout or KYC blocks, include your account email in your message.
                  </p>
                </div>
              </SettingsPanel>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
