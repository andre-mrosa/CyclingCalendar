const { withWorkflow } = require("workflow/next");
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/termos', destination: '/terms-of-service', permanent: true }, { source: '/privacidade', destination: '/privacy-policy', permanent: true }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
      ] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
  images: {
    remotePatterns: []
  },
  turbopack: {}
};

module.exports = withWorkflow(nextConfig);
