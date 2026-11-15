/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Next 14 forks several static workers by default. On Node 24 that exhausts
  // the process address space during `next build`, so keep a single worker.
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
