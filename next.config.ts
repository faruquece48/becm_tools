import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/downloader-helper/*": ["./app/Downloader/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "blogger.googleusercontent.com",
        pathname: "/img/**",
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
        pathname: "/images",
      },
      {
        protocol: "https",
        hostname: "static-01.daraz.com.bd",
        pathname: "/p/**",
      },
    ],
  },
};

export default nextConfig;
