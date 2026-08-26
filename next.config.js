const withPWAInit = require("@ducanh2912/next-pwa").default;

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|webp|gif|ico)/i,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
        },
      },
      {
        urlPattern: /\/api\/events.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "api-events-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 14 * 24 * 60 * 60, // 14 Days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /\/api\/calendar\/events.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-calendar-cache",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
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
