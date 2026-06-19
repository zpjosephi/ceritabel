import type { NextConfig } from "next";

// Security headers applied to every response.
const securityHeaders = [
  // Don't let other sites embed this app in an <iframe> (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Block MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit how much referrer info is shared.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features we never use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
