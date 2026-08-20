const withPWAInit = require("@ducanh2912/next-pwa").default;

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fpciclismo.pt' },
      { protocol: 'https', hostname: 'www.fpciclismo.pt' },
      { protocol: 'https', hostname: 'cabreirasolutions.com' },
      { protocol: 'https', hostname: 'www.cabreirasolutions.com' }
    ]
  },
  turbopack: {}
};

module.exports = withPWA(nextConfig);
