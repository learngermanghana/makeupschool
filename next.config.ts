import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.sedifex.com' },
      { protocol: 'https', hostname: 'sedifex.com' },
      { protocol: 'https', hostname: 'us-central1-sedifex-web.cloudfunctions.net' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' }
    ]
  }
};

export default nextConfig;
