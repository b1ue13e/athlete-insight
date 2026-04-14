/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  images: {
    unoptimized: true,
  },
  // Capacitor requires a static export build.
  output: "export",
  distDir: "dist",
  // Trailing slashes keep exported routes working on static hosts.
  trailingSlash: true,
}

module.exports = nextConfig
