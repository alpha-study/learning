/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAZORPAY_KEY_ID?: string;
  /** Hosted KYC URL from your backend (Razorpay onboarding / verification link) */
  readonly VITE_RAZORPAY_KYC_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_PHONE?: string;
  readonly VITE_SUPPORT_HOURS?: string;
}
