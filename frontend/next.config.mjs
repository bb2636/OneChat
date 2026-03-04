/** @type {import('next').NextConfig} */
const devDomain = process.env.REPLIT_DEV_DOMAIN;
const nextConfig = {
  ...(devDomain ? {
    allowedDevOrigins: [
      `https://${devDomain}`,
      "https://*.replit.dev",
      "http://127.0.0.1:5000",
    ],
  } : {}),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

