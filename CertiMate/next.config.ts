import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Performance Optimizations */
  compress: true,
  
  /* Image Optimization */
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  /* Production Optimizations */
  poweredByHeader: false,
  reactStrictMode: true,

  /* Experimental Features */
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  /* Webpack Configuration */
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Copy font files to serverless function output
      config.externals = config.externals || [];
      // Ensure canvas binary dependencies are handled correctly
      if (!Array.isArray(config.externals)) {
        config.externals = [config.externals];
      }
    }
    return config;
  },

  /* Security Headers */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
