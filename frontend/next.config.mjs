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
};

export default nextConfig;

