import { MetadataRoute } from 'next';

const baseUrl = `https://${process.env.APP_HOSTNAME}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
