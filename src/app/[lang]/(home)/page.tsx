import Link from 'next/link';
import { Github, BookOpen } from 'lucide-react';
import { Hero } from './page.client';
import { getLocalePath, i18n } from '@/lib/i18n';
import Image from 'next/image';
import { AntifraudDialog } from '@/components/antifraud-dialog';

const contentMap: Record<
  string,
  {
    badge: string;
    title: string;
    subtitle: string;
    highlight: string;
    getStarted: string;
    github: string;
    partnersTitle: string;
    partnersSubtitle: string;
    sponsorPartnersTitle: string;
    sponsorPartnersSubtitle: string;
    devContributorsTitle: string;
    docsContributorsTitle: string;
  }
> = {
  en: {
    badge: 'The Foundation of Your AI Universe',
    title: 'Unified input for large language models',
    subtitle: 'build the',
    highlight: 'future',
    getStarted: 'Getting Started',
    github: 'GitHub',
    partnersTitle: 'Our Partners & Clients',
    partnersSubtitle: 'In no particular order',
    sponsorPartnersTitle: 'Sponsor Partners',
    sponsorPartnersSubtitle: 'Trusted sponsor collaborations',
    devContributorsTitle: 'Development Contributors',
    docsContributorsTitle: 'Documentation Contributors',
  },
  zh: {
    badge: '人工智能应用基座',
    title: '大语言模型的统一入口',
    subtitle: '连接',
    highlight: '未来',
    getStarted: '快速开始',
    github: 'GitHub',
    partnersTitle: '我们的合作伙伴与客户',
    partnersSubtitle: '排名不分先后',
    sponsorPartnersTitle: '赞助合作伙伴',
    sponsorPartnersSubtitle: '值得信赖的赞助合作',
    devContributorsTitle: '开发贡献者',
    docsContributorsTitle: '文档贡献者',
  },
  ja: {
    badge: 'あなたの AI ユニバースの基盤',
    title: 'すべての AI プロバイダーを接続し、AI アセットを管理し、',
    subtitle: '',
    highlight: '未来を構築',
    getStarted: 'はじめに',
    github: 'GitHub',
    partnersTitle: '私たちのパートナーとお客様',
    partnersSubtitle: '順不同',
    sponsorPartnersTitle: 'スポンサーパートナー',
    sponsorPartnersSubtitle: '信頼できるスポンサー協力',
    devContributorsTitle: '開発貢献者',
    docsContributorsTitle: 'ドキュメント貢献者',
  },
} as const;

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const content = contentMap[lang] || contentMap.en;

  const partners = [
    {
      name: 'Cherry Studio',
      url: 'https://www.cherry-ai.com/',
      logo: '/assets/partner/cherry-studio.png',
    },
    {
      name: 'AionUi',
      url: 'https://github.com/iOfficeAI/AionUi',
      logo: '/assets/partner/aionui.png',
    },
    {
      name: 'Peking University',
      url: 'https://bda.pku.edu.cn/',
      logo: '/assets/partner/pku.png',
    },
    {
      name: 'UCloud',
      url: 'https://www.compshare.cn/?ytag=GPU_yy_gh_newapi',
      logo: '/assets/partner/ucloud.png',
    },
    {
      name: 'Alibaba Cloud',
      url: 'https://www.aliyun.com/',
      logo: '/assets/partner/aliyun.png',
    },
    {
      name: 'IO.NET',
      url: 'https://io.net/',
      logo: '/assets/partner/io-net.png',
    },
  ];

  const sponsorPartners = [
    {
      name: 'RixAPI',
      url: 'https://rixapi.com/',
      lightLogo: '/assets/partner/rixapi-black.png',
      darkLogo: '/assets/partner/rixapi-white.png',
    },
  ];

  return (
    <main className="text-landing-foreground dark:text-landing-foreground-dark pt-4 pb-6 md:pb-12">
      <div className="home-banner-bg w-full min-h-[400px] md:min-h-[500px] flex items-center justify-center">
        <div className="flex items-center justify-center h-full px-4 py-16 md:py-20">
          <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight mb-4">
              {content.title}
              {/* <br />
              {content.subtitle}{' '}
              <span className="text-brand">{content.highlight}</span>. */}
            </h1>
            {/* <p className="text-sm md:text-base mb-8 opacity-80">
              {content.badge}
            </p> */}
            
            <div className="flex flex-row gap-3 justify-center items-center">
              <Link
                href={getLocalePath(lang, 'docs')}
                className="bg-brand text-brand-foreground hover:bg-brand-200 inline-flex items-center justify-center gap-2 rounded-md px-8 py-3 font-medium transition-colors max-sm:text-sm"
              >
                <BookOpen className="size-4" />
                {content.getStarted}
              </Link>
              <a
                href="https://github.com/fyinfor/token-factory"
                target="_blank"
                rel="noreferrer noopener"
                className="bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent inline-flex items-center justify-center gap-2 rounded-md border px-8 py-3 font-medium transition-colors max-sm:text-sm"
              >
                <Github className="size-4" />
                {content.github}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Partners Section */}
      {/* <section className="mx-auto mt-12 max-w-[1400px] px-4 text-center">
        <h2 className="text-2xl font-semibold md:text-3xl">
          {content.partnersTitle}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {content.partnersSubtitle}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {partners.map((partner) => (
            <a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 grayscale-[50%] transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            >
              <Image
                src={partner.logo}
                alt={partner.name}
                width={72}
                height={60}
                className="h-[50px] w-auto md:h-[60px]"
                loading="lazy"
                decoding="async"
              />
            </a>
          ))}
        </div>
      </section> */}

      {/* Sponsor Partners Section */}
      {/* <section className="mx-auto mt-16 max-w-[1400px] px-4 text-center">
        <h2 className="text-2xl font-semibold md:text-3xl">
          {content.sponsorPartnersTitle}
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {sponsorPartners.map((partner) => (
            <a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 grayscale-[50%] transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            >
              <Image
                src={partner.lightLogo}
                alt={partner.name}
                width={120}
                height={60}
                className="block h-[50px] w-auto dark:hidden md:h-[60px]"
                loading="lazy"
                decoding="async"
              />
              <Image
                src={partner.darkLogo}
                alt={partner.name}
                width={120}
                height={60}
                className="hidden h-[50px] w-auto dark:block md:h-[60px]"
                loading="lazy"
                decoding="async"
              />
            </a>
          ))}
        </div>
      </section> */}

      {/* Development Contributors Section */}
      {/* <section className="mx-auto mt-16 max-w-[1400px] px-4 text-center">
        <h2 className="text-2xl font-semibold md:text-3xl">
          {content.devContributorsTitle}
        </h2>
        <div className="mt-8 flex justify-center">
          <a
            href="https://github.com/fyinfor/token-factory/graphs/contributors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://contrib.rocks/image?repo=fyinfor/token-factory"
              alt="Development Contributors"
              loading="lazy"
              decoding="async"
              className="max-w-full"
            />
          </a>
        </div>
      </section> */}

      {/* Documentation Contributors Section */}
      {/* <section className="mx-auto mt-16 max-w-[1400px] px-4 text-center">
        <h2 className="text-2xl font-semibold md:text-3xl">
          {content.docsContributorsTitle}
        </h2>
        <div className="mt-8 flex justify-center">
          <a
            href="https://github.com/fyinfor/token-factory-docs/graphs/contributors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://contrib.rocks/image?repo=fyinfor/token-factory-docs"
              alt="Documentation Contributors"
              loading="lazy"
              decoding="async"
              className="max-w-full"
            />
          </a>
        </div>
      </section> */}

      <AntifraudDialog lang={lang} />
    </main>
  );
}

export async function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}
