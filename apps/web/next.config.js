/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  experimental: {
    optimizePackageImports: ["@workspace/ui"]
  }
};

module.exports = nextConfig;
