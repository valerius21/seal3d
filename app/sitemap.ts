import { MetadataRoute } from 'next';

const baseUrl = `https://${process.env.APP_HOSTNAME}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
