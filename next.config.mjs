/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    cpus: 1,
  },
  // Отключаем проверку TypeScript при деплое
  typescript: {
    ignoreBuildErrors: true,
  },
  // Отключаем ошибки ESLint при деплое
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;