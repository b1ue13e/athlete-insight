/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Capacitor 需要静态导出
  output: 'export',
  distDir: 'dist',
  // 动态路由静态化
  trailingSlash: true,
}

module.exports = nextConfig
