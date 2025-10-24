import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://seal3d.vercel.app',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 1,
        },
    ];
}

