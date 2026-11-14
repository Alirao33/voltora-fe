/** @type {import('next').NextConfig} */
const API_URL = (process.env.VOLTORA_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
  // Proxy all backend calls through /api-proxy so the browser never hits CORS.
  async rewrites() {
    return [{ source: '/api-proxy/:path*', destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
