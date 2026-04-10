import type { Metadata } from 'next';

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    icons: {
      icon: '/favicon.png',
      shortcut: '/favicon.png',
      apple: '/assets/logo.png',
    },
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: 'https://www.tokenfactoryopen.com',
      images: '/assets/logo.png',
      siteName: 'TokenFactory',
      type: 'website',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/assets/logo.png',
      ...override.twitter,
    },
  };
}

function resolveBaseUrl(): URL {
  const explicit = process.env.DOCS_PUBLIC_URL?.trim();
  if (explicit) {
    const u = explicit.replace(/\/+$/, '');
    return new URL(u.startsWith('http') ? u : `https://${u}`);
  }
  if (process.env.NODE_ENV === 'development') {
    return new URL('http://localhost:3000');
  }
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) {
    return new URL(`https://${vercelHost}`);
  }
  return new URL('http://localhost:3000');
}

export const baseUrl = resolveBaseUrl();
