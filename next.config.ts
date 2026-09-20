import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "web-push"],
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Client router keeps visited screens warm so back/forward and tabs feel instant.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        { key: "Cache-Control", value: "public, max-age=3600" },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
