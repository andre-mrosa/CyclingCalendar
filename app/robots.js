export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://cyclingcalendar.vercel.app/sitemap.xml',
  }
}
