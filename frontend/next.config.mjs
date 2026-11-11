const rawBackendTarget = (
  process.env.BACKEND_PROXY_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://app360-50047570620.development.catalystappsail.in'
)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${rawBackendTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
