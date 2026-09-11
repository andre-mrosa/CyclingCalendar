const { withWorkflow } = require("workflow/next");
const withPWAInit = require("@ducanh2912/next-pwa").default;

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  fallbacks: {
    document: "/~offline",
  },
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // Operational state and mutating endpoints must never fall back to an
        // old successful response from the offline cache.
        urlPattern: ({ url }) => /^\/(?:admin(?:\/|$)|api\/(?:admin(?:\/|$)|force-scrape(?:-all)?(?:\/|$)|cron(?:\/|$)))/.test(url.pathname),
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-cache-v1.2",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
        },
      },
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
        handler: "NetworkFirst",
        options: {
          cacheName: "api-events-cache-v3",
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
        // Account calendar responses must not be reused across sessions.
          urlPattern: /\/api\/calendar\//i,
        handler: "NetworkOnly",
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

module.exports = withWorkflow(withPWA(nextConfig));
