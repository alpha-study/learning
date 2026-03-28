import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  Clock,
  Copy,
  ExternalLink,
  Gift,
  Headphones,
  HelpCircle,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? "support@bookbinder.com";
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE ?? "+91 1800-123-4567";
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
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

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

export default function SettingsPage() {
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }
    if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Images must be ${PHOTO_MAX_MB}MB or smaller.`,
        variant: "destructive",
      });
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings saved",
      description: photoPreview
        ? "Your profile and photo will sync once your API is connected."
        : "Your changes have been saved.",
    });
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

  const razorpayKeyConfigured = Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID?.trim());

  const tabTriggerClass =
    "gap-2 rounded-md px-3 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm lg:w-full lg:justify-start";

  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Manage your profile, verification, referrals, and how to reach support.
        </p>
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
                <form onSubmit={handleSave} className="mx-auto max-w-lg space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Avatar className="h-24 w-24 shrink-0 border border-border">
                      {photoPreview ? <AvatarImage src={photoPreview} alt="Profile photo" /> : null}
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <UserRound className="h-10 w-10" aria-hidden />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept={PHOTO_ACCEPT}
                        className="sr-only"
                        id="profile-photo"
                        onChange={handlePhotoChange}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <label htmlFor="profile-photo" className="cursor-pointer">
                            <Camera className="mr-2 h-4 w-4" aria-hidden />
                            Change photo
                          </label>
                        </Button>
                        {photoPreview ? (
                          <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto}>
                            <X className="mr-2 h-4 w-4" aria-hidden />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or GIF · max {PHOTO_MAX_MB}MB</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" name="name" placeholder="Your name" autoComplete="name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
                  </div>

                  <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                    <Button type="submit" className="gradient-gold text-primary-foreground font-semibold">
                      Save changes
                    </Button>
                  </div>
                </form>
              </SettingsPanel>
            </TabsContent>

            <TabsContent
              value="verification"
              className="m-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
            >
              <SettingsPanel
                title="Verify account (KYC)"
                description="Complete identity verification through Razorpay before payouts or certain publisher actions."
              >
                <div className="space-y-6">
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
                </div>
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
