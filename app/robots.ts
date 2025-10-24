import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [],
        },
        sitemap: 'https://seal3d.vercel.app/sitemap.xml',
    };
}

