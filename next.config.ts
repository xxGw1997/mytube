import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "8xyqgi6gvm.ufs.sh",
      },
    ],
  },
};

export default nextConfig;
