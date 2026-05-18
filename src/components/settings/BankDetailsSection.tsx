import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import {
  addBankAccount,
  getAccountMeErrorMessage,
  type AddBankPayload,
} from "@/lib/api/account";
import { getVendorAuthToken } from "@/lib/mock-auth";
import { Building2, Landmark } from "lucide-react";

const BUSINESS_TYPES = [
  { value: "proprietorship", label: "Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llp", label: "LLP" },
  { value: "private_limited", label: "Private limited" },
  { value: "public_limited", label: "Public limited" },
  { value: "other", label: "Other" },
] as const;

const BUSINESS_TYPE_OPTIONS: SearchableSelectOption[] = BUSINESS_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
}));

type BankFormState = {
  businessName: string;
  businessType: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  pan: string;
  gst: string;
  account_number: string;
  ifsc_code: string;
  beneficiary_name: string;
};

const initialForm: BankFormState = {
  businessName: "",
  businessType: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  pan: "",
  gst: "",
  account_number: "",
  ifsc_code: "",
  beneficiary_name: "",
};

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
const PIN_RE = /^\d{6}$/;

function validateBankForm(f: BankFormState): string | null {
  if (!f.businessName.trim()) return "Business name is required.";
  if (!f.businessType.trim()) return "Business type is required.";
  if (!f.street1.trim()) return "Address line 1 is required.";
  if (!f.city.trim()) return "City is required.";
  if (!f.state.trim()) return "State is required.";
  if (!PIN_RE.test(f.postalCode.trim())) return "Postal code must be 6 digits.";
  const pan = f.pan.trim().toUpperCase();
  if (!PAN_RE.test(pan)) return "PAN must be 10 characters (e.g. ABCDE1234F).";
  const ifsc = f.ifsc_code.trim().toUpperCase();
  if (!IFSC_RE.test(ifsc)) return "IFSC must be 11 characters (e.g. SBIN0001234).";
  if (!f.account_number.trim()) return "Account number is required.";
  if (!f.beneficiary_name.trim()) return "Beneficiary name is required.";
  return null;
}

function buildPayload(f: BankFormState): AddBankPayload {
  const gst = f.gst.trim().toUpperCase();
  const street2 = f.street2.trim();
  return {
    businessName: f.businessName.trim(),
    businessType: f.businessType,
    address: {
      street1: f.street1.trim(),
      ...(street2 ? { street2 } : {}),
      city: f.city.trim(),
      state: f.state.trim(),
      postalCode: f.postalCode.trim(),
    },
    legalInfo: {
      pan: f.pan.trim().toUpperCase(),
      ...(gst ? { gst } : {}),
    },
    bankAccount: {
      account_number: f.account_number.trim(),
      ifsc_code: f.ifsc_code.trim().toUpperCase(),
      beneficiary_name: f.beneficiary_name.trim(),
    },
  };
}

export function BankDetailsSection() {
  const { toast } = useToast();
  const [form, setForm] = useState<BankFormState>(initialForm);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof BankFormState>(key: K, value: BankFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateBankForm(form);
    if (err) {
      toast({ title: "Check the form", description: err, variant: "destructive" });
      return;
    }
    if (!getVendorAuthToken()) {
      toast({
        title: "Not signed in",
        description: "Sign in again, then save your bank details.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await addBankAccount(buildPayload(form));
      toast({
        title: "Bank details saved",
        description: "Your business and payout information was submitted successfully.",
      });
    } catch (error) {
      toast({
        title: "Could not save bank details",
        description: getAccountMeErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Register or update the business address, tax IDs, and payout bank account for your vendor
        profile.
      </p>
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8 pt-2">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Building2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <h4 className="text-sm font-semibold tracking-tight">Business</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-business-name">Business name</Label>
              <Input
                id="bank-business-name"
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                placeholder="Registered business name"
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-business-type">Business type</Label>
              <SearchableSelect
                id="bank-business-type"
                options={BUSINESS_TYPE_OPTIONS}
                value={form.businessType}
                onValueChange={(v) => update("businessType", v)}
                allowDeselect
                placeholder="Select type"
                searchPlaceholder="Search business type…"
                triggerClassName="h-10"
                minDropdownWidth={260}
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">Address</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-street1">Street line 1</Label>
              <Input
                id="bank-street1"
                value={form.street1}
                onChange={(e) => update("street1", e.target.value)}
                placeholder="Building, street"
                autoComplete="street-address"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-street2">Street line 2 (optional)</Label>
              <Input
                id="bank-street2"
                value={form.street2}
                onChange={(e) => update("street2", e.target.value)}
                placeholder="Area, landmark"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-city">City</Label>
              <Input
                id="bank-city"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="City"
                autoComplete="address-level2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-state">State</Label>
              <Input
                id="bank-state"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="State"
                autoComplete="address-level1"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-postal">Postal code</Label>
              <Input
                id="bank-postal"
                value={form.postalCode}
                onChange={(e) => update("postalCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="560034"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">Legal</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank-pan">PAN</Label>
              <Input
                id="bank-pan"
                value={form.pan}
                onChange={(e) => update("pan", e.target.value.toUpperCase().slice(0, 10))}
                placeholder="ABCDE1234F"
                autoComplete="off"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-gst">GST (optional)</Label>
              <Input
                id="bank-gst"
                value={form.gst}
                onChange={(e) => update("gst", e.target.value.toUpperCase().slice(0, 15))}
                placeholder="22AAAAA0000A1Z5"
                className="font-mono uppercase"
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Landmark className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <h4 className="text-sm font-semibold tracking-tight">Bank account</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-beneficiary">Beneficiary name</Label>
              <Input
                id="bank-beneficiary"
                value={form.beneficiary_name}
                onChange={(e) => update("beneficiary_name", e.target.value)}
                placeholder="Name as on bank account"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-account">Account number</Label>
              <Input
                id="bank-account"
                value={form.account_number}
                onChange={(e) => update("account_number", e.target.value.replace(/\s/g, ""))}
                placeholder="Account number"
                inputMode="numeric"
                autoComplete="off"
                className="font-mono"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-ifsc">IFSC code</Label>
              <Input
                id="bank-ifsc"
                value={form.ifsc_code}
                onChange={(e) => update("ifsc_code", e.target.value.toUpperCase().slice(0, 11))}
                placeholder="SBIN0001234"
                autoComplete="off"
                className="font-mono uppercase"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            className="gradient-gold text-primary-foreground font-semibold"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save bank details"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setForm(initialForm)}
          >
            Reset form
          </Button>
        </div>
      </form>
    </div>
  );
}
