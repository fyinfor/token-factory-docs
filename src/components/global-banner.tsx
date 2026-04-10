'use client';

import { Banner } from 'fumadocs-ui/components/banner';
import Link from 'next/link';
import type { ComponentProps } from 'react';

// ============================================
// Banner configuration - modify here to update banner content
// ============================================
const BANNER_CONFIG = {
  // Banner unique identifier, used to remember if user has closed it
  id: 'docs-renewal-notice',

  // Banner style: 'rainbow' | 'normal'
  variant: 'rainbow' as const,

  // Link URL
  linkUrl: 'https://doc.tokenfactory.pro',

  // Multi-language text configuration
  text: {
    en: {
      message: 'Documentation renewed! For old docs, visit',
      linkText: 'doc.tokenfactory.pro',
    },
    zh: {
      message: '文档焕新，旧文档请访问',
      linkText: 'doc.tokenfactory.pro',
    },
    ja: {
      message: 'ドキュメントが一新されました！旧ドキュメントは',
      linkText: 'doc.tokenfactory.pro',
    },
  } as Record<string, { message: string; linkText: string }>,
};
// ============================================

type BannerVariant = ComponentProps<typeof Banner>['variant'];

export function GlobalBanner({ lang }: { lang?: string }) {
  const { id, variant, linkUrl, text } = BANNER_CONFIG;
  const content = text[lang || 'en'] || text.en;

  return (
    <Banner id={id} variant={variant as BannerVariant}>
      <span className="text-center">
        {content.message}{' '}
        <Link
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-fd-primary inline-flex font-semibold whitespace-nowrap underline underline-offset-2"
        >
          {content.linkText}
        </Link>
      </span>
    </Banner>
  );
}
