import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // resend optionally imports @react-email/render; we send plain HTML, so keep it out of the bundle.
  serverExternalPackages: ["resend"],
  images: { remotePatterns: [{ hostname: "images.unsplash.com" }, { hostname: "*.supabase.co" }] },
};

export default nextConfig;
