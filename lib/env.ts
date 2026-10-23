// Central place for environment configuration and feature flags.
export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Monta <onboarding@resend.dev>",
  scannerSecret: process.env.SCANNER_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret",
  cronSecret: process.env.CRON_SECRET ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
  payments: {
    // Test mode: simulated payments so the whole flow works before Stripe exists.
    mock: process.env.PAYMENTS_MOCK === "true",
    stripe: process.env.PAYMENTS_STRIPE_ENABLED === "true" && !!process.env.STRIPE_SECRET_KEY,
    yappy: process.env.PAYMENTS_YAPPY_ENABLED === "true" && !!process.env.YAPPY_SECRET_KEY,
  },
};

export const isConfigured = () => !!(env.supabaseUrl && env.supabaseAnonKey);
