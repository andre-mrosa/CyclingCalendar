export default function sitemap() {
  return [
    {
      url: 'https://cyclingcalendar.pt',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://cyclingcalendar.pt/contacto',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
