import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.1.68", "192.168.1.69"],
  cacheComponents: true,
  experimental: {
    typedEnv: true,
    turbopackRustReactCompiler: true,
    useOffline: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hsl8jk540a.ufs.sh",
      },
    ],
  },
  partialPrefetching: true,
  reactCompiler: true,
  serverExternalPackages: ["prettier"], // This package is required by @react-email/components, so we externalize it instead of installing it as a dependency
  typedRoutes: true,
};

export default nextConfig;
