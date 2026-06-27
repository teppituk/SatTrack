import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ไม่เปิดเผยเทคโนโลยีผ่าน header x-powered-by
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "exceljs"],
};

export default nextConfig;
