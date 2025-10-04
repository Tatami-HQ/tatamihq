/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbo: {
      rules: {
        // Helps prevent turbo root confusion
        ignoreLintErrors: true,
      },
    },
  },
};

module.exports = nextConfig;
