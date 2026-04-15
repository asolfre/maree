import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Allow OpenStreetMap tiles used by MapCard component */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tile.openstreetmap.org",
      },
    ],
  },
};

export default nextConfig;
