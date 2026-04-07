/**
 * Special Thanks Build Script
 * Fetches data from GitHub Contributors API and Afdian API and generates special thanks page during build time
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const SOURCE_REPO = process.env.SOURCE_REPO || 'fyinfor/token-factory';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const AFDIAN_USER_ID = process.env.AFDIAN_USER_ID || '';
const AFDIAN_TOKEN = process.env.AFDIAN_TOKEN || '';
const MAX_CONTRIBUTORS = 50;

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

interface Sponsor {
  name: string;
  avatar: string;
  amount: number;
}

interface SponsorsData {
  gold: Sponsor[];
  silver: Sponsor[];
  bronze: Sponsor[];
}

interface AfdianSponsorUser {
  name: string;
  avatar: string;
}

interface AfdianSponsorItem {
  user: AfdianSponsorUser;
  all_sum_amount: string;
}

interface AfdianResponse {
  ec: number;
  em: string;
  data: {
    list: AfdianSponsorItem[];
    total_page: number;
    total_count: number;
  };
}

// i18n Configuration
const SPECIAL_THANKS_I18N = {
  zh: {
    title: '# 🙏 特别鸣谢',
    intro:
      'TokenFactory 的开发离不开社区的支持和贡献。在此特别感谢所有为项目提供帮助的个人和组织。',
    sponsorsTitle: '## ❤️ 赞助商',
    sponsorsIntro:
      '以下是所有为项目提供资金支持的赞助商。感谢他们的慷慨捐助，让项目能够持续发展！',
    sponsorsInfoTitle: '赞助商信息 · 数据更新于',
    sponsorsInfoDesc:
      '以下赞助商数据从爱发电平台自动获取。根据累计赞助金额，分为金牌、银牌和铜牌三个等级。如果您也想为项目提供资金支持，欢迎前往 [爱发电](https://afdian.com/a/token-factory) 平台进行捐赠。',
    contributorsTitle: '## 👨‍💻 开发贡献者',
    contributorsIntro:
      '以下是所有为项目做出贡献的开发者列表。在此感谢他们的辛勤工作和创意！',
    contributorsInfoTitle: '贡献者信息 · 数据更新于',
    contributorsInfoDesc: `以下贡献者数据从 [GitHub Contributors 页面](https://github.com/${SOURCE_REPO}/graphs/contributors) 自动获取前50名。贡献度前三名分别以金、银、铜牌边框标识。如果您也想为项目做出贡献，欢迎提交 Pull Request。`,
    contributions: '贡献次数',
    totalSponsored: '累计赞助',
    unknownUser: '未知用户',
    anonymousSponsor: '匿名赞助者',
    goldSponsor: '金牌赞助商',
    silverSponsor: '银牌赞助商',
    bronzeSponsor: '铜牌赞助商',
    goldSponsorDesc: '感谢以下金牌赞助商（赞助金额 ≥ 10001元）的慷慨支持！',
    silverSponsorDesc:
      '感谢以下银牌赞助商（赞助金额 1001-10000元）的慷慨支持！',
    bronzeSponsorDesc: '感谢以下铜牌赞助商（赞助金额 0-1000元）的支持！',
  },
  en: {
    title: '# 🙏 Special Thanks',
    intro:
      'The development of TokenFactory would not be possible without the support and contributions of the community. We would like to express our special gratitude to all individuals and organizations who have helped with this project.',
    sponsorsTitle: '## ❤️ Sponsors',
    sponsorsIntro:
      'Below are all the sponsors who have provided financial support for the project. Thank you for their generous donations that allow the project to continue developing!',
    sponsorsInfoTitle: 'Sponsor Information · Data updated at',
    sponsorsInfoDesc:
      'The following sponsor data is automatically retrieved from the Afdian platform. Based on the cumulative sponsorship amount, they are divided into three levels: Gold, Silver, and Bronze. If you would also like to provide financial support for the project, you are welcome to make a donation on the [Afdian](https://afdian.com/a/token-factory) platform.',
    contributorsTitle: '## 👨‍💻 Developer Contributors',
    contributorsIntro:
      'Below is a list of all developers who have contributed to the project. We thank them for their hard work and creativity!',
    contributorsInfoTitle: 'Contributor Information · Data updated at',
    contributorsInfoDesc: `The following contributor data is automatically retrieved from the [GitHub Contributors page](https://github.com/${SOURCE_REPO}/graphs/contributors) for the top 50 contributors. The top three contributors are marked with gold, silver, and bronze borders respectively. If you would also like to contribute to the project, you are welcome to submit a Pull Request.`,
    contributions: 'Contributions',
    totalSponsored: 'Total Sponsored',
    unknownUser: 'Unknown User',
    anonymousSponsor: 'Anonymous Sponsor',
    goldSponsor: 'Gold Sponsors',
    silverSponsor: 'Silver Sponsors',
    bronzeSponsor: 'Bronze Sponsors',
    goldSponsorDesc:
      'Thank you to the following gold sponsors (sponsorship amount ≥ ¥10,001) for their generous support!',
    silverSponsorDesc:
      'Thank you to the following silver sponsors (sponsorship amount ¥1,001-¥10,000) for their generous support!',
    bronzeSponsorDesc:
      'Thank you to the following bronze sponsors (sponsorship amount ¥0-¥1,000) for their support!',
  },
  ja: {
    title: '# 🙏 スペシャルサンクス',
    intro:
      'TokenFactory の開発は、コミュニティのサポートと貢献なしには実現できませんでした。プロジェクトに協力してくださったすべての個人と組織に特別な感謝を申し上げます。',
    sponsorsTitle: '## ❤️ スポンサー',
    sponsorsIntro:
      '以下は、プロジェクトに財政的支援を提供してくださったすべてのスポンサーです。プロジェクトが継続的に発展できるよう、寛大な寄付をしてくださったことに感謝します！',
    sponsorsInfoTitle: 'スポンサー情報 · データ更新日時',
    sponsorsInfoDesc:
      '以下のスポンサーデータは、Afdian プラットフォームから自動的に取得されます。累計スポンサー金額に基づいて、ゴールド、シルバー、ブロンズの3つのレベルに分類されます。プロジェクトに財政的支援を提供したい場合は、[Afdian](https://afdian.com/a/token-factory) プラットフォームで寄付を歓迎します。',
    contributorsTitle: '## 👨‍💻 開発貢献者',
    contributorsIntro:
      '以下は、プロジェクトに貢献してくださったすべての開発者のリストです。彼らの勤勉な作業と創造性に感謝します！',
    contributorsInfoTitle: '貢献者情報 · データ更新日時',
    contributorsInfoDesc: `以下の貢献者データは、[GitHub Contributors ページ](https://github.com/${SOURCE_REPO}/graphs/contributors)から上位50名を自動的に取得します。貢献度上位3名は、それぞれゴールド、シルバー、ブロンズの枠で識別されます。プロジェクトに貢献したい場合は、プルリクエストを送信してください。`,
    contributions: '貢献回数',
    totalSponsored: '累計スポンサー',
    unknownUser: '不明なユーザー',
    anonymousSponsor: '匿名スポンサー',
    goldSponsor: 'ゴールドスポンサー',
    silverSponsor: 'シルバースポンサー',
    bronzeSponsor: 'ブロンズスポンサー',
    goldSponsorDesc:
      '以下のゴールドスポンサー（スポンサー金額 ≥ ¥10,001）の寛大なサポートに感謝します！',
    silverSponsorDesc:
      '以下のシルバースポンサー（スポンサー金額 ¥1,001-¥10,000）の寛大なサポートに感謝します！',
    bronzeSponsorDesc:
      '以下のブロンズスポンサー（スポンサー金額 ¥0-¥1,000）のサポートに感謝します！',
  },
};

async function fetchGitHubContributors(): Promise<Contributor[]> {
  const headers: Record<string, string> = {
    'User-Agent': 'New-API-Docs-Builder/1.0',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    console.log('✓ Using GitHub Token for authentication');
  } else {
    console.warn(
      '⚠ GitHub Token not configured, API rate limit: 60 requests/hour'
    );
  }

  const url = `https://api.github.com/repos/${SOURCE_REPO}/contributors?per_page=${MAX_CONTRIBUTORS}`;

  try {
    console.log(`Fetching Contributors: ${url}`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `GitHub API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as Contributor[];
    console.log(`✓ Successfully fetched ${data.length} contributors`);
    return data;
  } catch (error) {
    console.error('✗ Failed to fetch GitHub Contributors:', error);
    return [];
  }
}

async function fetchAfdianSponsors(): Promise<SponsorsData | null> {
  if (!AFDIAN_USER_ID || !AFDIAN_TOKEN) {
    console.warn(
      '⚠ Afdian API credentials not configured, skipping sponsor data fetch'
    );
    return null;
  }

  try {
    console.log('Fetching Afdian sponsor data...');

    // Afdian API endpoint
    const API_URL = 'https://afdian.com/api/open/query-sponsor';
    const crypto = await import('crypto');

    let allSponsors: AfdianSponsorItem[] = [];
    let currentPage = 1;
    let totalPage = 1;

    // Fetch all pages
    while (currentPage <= totalPage) {
      console.log(`Fetching page ${currentPage}/${totalPage}...`);

      // Generate timestamp and signature for this page
      const timestamp = Math.floor(Date.now() / 1000);
      const params = JSON.stringify({
        page: currentPage,
      });

      // Calculate signature: MD5(token + "params" + params + "ts" + ts + "user_id" + user_id)
      const signStr = `${AFDIAN_TOKEN}params${params}ts${timestamp}user_id${AFDIAN_USER_ID}`;
      const sign = crypto.createHash('md5').update(signStr).digest('hex');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: AFDIAN_USER_ID,
          params,
          ts: timestamp,
          sign,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Afdian API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as AfdianResponse;

      if (data.ec !== 200) {
        throw new Error(`Afdian API returned error: ${data.em}`);
      }

      // Add sponsors from this page
      const pageSponsors = data.data.list || [];
      allSponsors = allSponsors.concat(pageSponsors);

      // Update total page count from first response
      if (currentPage === 1) {
        totalPage = data.data.total_page || 1;
        console.log(
          `✓ Total sponsors: ${data.data.total_count || 0}, Total pages: ${totalPage}`
        );
      }

      currentPage++;

      // Wait 1 second between requests to avoid rate limiting
      if (currentPage <= totalPage) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const sponsors = allSponsors;
    console.log(
      `✓ Successfully fetched ${sponsors.length} sponsors from all pages`
    );

    // Categorize by sponsorship amount
    const result: SponsorsData = {
      gold: [],
      silver: [],
      bronze: [],
    };

    let skippedCount = 0;
    for (const sponsor of sponsors) {
      const totalAmount = parseFloat(sponsor.all_sum_amount || '0');

      // Skip sponsors with zero amount (refunds or redemption codes)
      if (totalAmount <= 0) {
        skippedCount++;
        continue;
      }

      const sponsorData: Sponsor = {
        name: sponsor.user.name || 'Anonymous Sponsor',
        avatar:
          sponsor.user.avatar ||
          'https://pic1.afdiancdn.com/default/avatar/default-avatar.png',
        amount: totalAmount,
      };

      if (totalAmount >= 10001) {
        result.gold.push(sponsorData);
      } else if (totalAmount >= 1001) {
        result.silver.push(sponsorData);
      } else {
        result.bronze.push(sponsorData);
      }
    }

    if (skippedCount > 0) {
      console.log(
        `ℹ Skipped ${skippedCount} sponsors with zero amount (refunds/redemption codes)`
      );
    }

    // Sort by amount
    result.gold.sort((a, b) => b.amount - a.amount);
    result.silver.sort((a, b) => b.amount - a.amount);
    result.bronze.sort((a, b) => b.amount - a.amount);

    return result;
  } catch (error) {
    console.error('✗ Failed to fetch Afdian sponsors:', error);
    console.log('⚠ Will skip sponsor data');
    return null;
  }
}

function formatContributorsMarkdown(
  contributors: Contributor[],
  lang: keyof typeof SPECIAL_THANKS_I18N
): string {
  if (!contributors?.length) {
    return '';
  }

  const i18n = SPECIAL_THANKS_I18N[lang];
  let markdown = '';

  for (let index = 0; index < contributors.length; index++) {
    const { login, avatar_url, html_url, contributions } = contributors[index];
    const username = login || i18n.unknownUser;

    // Determine border style class based on ranking
    let borderClass = '';
    let medalEmoji = '';
    if (index === 0) {
      borderClass = 'border-4 border-yellow-400 shadow-lg shadow-yellow-400/50';
      medalEmoji = '🥇';
    } else if (index === 1) {
      borderClass = 'border-4 border-gray-400 shadow-lg shadow-gray-400/50';
      medalEmoji = '🥈';
    } else if (index === 2) {
      borderClass = 'border-4 border-orange-600 shadow-lg shadow-orange-600/50';
      medalEmoji = '🥉';
    }

    markdown += `### ${medalEmoji} ${username}\n\n`;
    markdown += `<div className="flex items-center mb-5">\n`;
    markdown += `  <div className="mr-4">\n`;
    markdown += `    <img src="${avatar_url}" alt="${username}" className="w-16 h-16 rounded-full ${borderClass}" />\n`;
    markdown += `  </div>\n`;
    markdown += `  <div className="flex flex-col">\n`;
    markdown += `    <a href="${html_url}" target="_blank" rel="noopener noreferrer" className="font-medium no-underline mb-1">${username}</a>\n`;
    markdown += `    <span className="text-sm text-muted-foreground">${i18n.contributions}: ${contributions}</span>\n`;
    markdown += `  </div>\n`;
    markdown += `</div>\n\n`;
    markdown += '---\n\n';
  }

  return markdown;
}

function formatSponsorsMarkdown(
  sponsors: SponsorsData,
  lang: keyof typeof SPECIAL_THANKS_I18N
): string {
  if (
    !sponsors ||
    (!sponsors.gold.length &&
      !sponsors.silver.length &&
      !sponsors.bronze.length)
  ) {
    return '';
  }

  const i18n = SPECIAL_THANKS_I18N[lang];
  let markdown = '';

  const levels: Array<{
    key: keyof SponsorsData;
    emoji: string;
    title: string;
    desc: string;
    borderClass: string;
  }> = [
    {
      key: 'gold',
      emoji: '🥇',
      title: i18n.goldSponsor,
      desc: i18n.goldSponsorDesc,
      borderClass: 'border-4 border-yellow-400 shadow-lg shadow-yellow-400/50',
    },
    {
      key: 'silver',
      emoji: '🥈',
      title: i18n.silverSponsor,
      desc: i18n.silverSponsorDesc,
      borderClass: 'border-4 border-gray-400 shadow-lg shadow-gray-400/50',
    },
    {
      key: 'bronze',
      emoji: '🥉',
      title: i18n.bronzeSponsor,
      desc: i18n.bronzeSponsorDesc,
      borderClass: 'border-4 border-orange-600 shadow-lg shadow-orange-600/50',
    },
  ];

  for (const level of levels) {
    const sponsorList = sponsors[level.key];
    if (!sponsorList?.length) continue;

    markdown += `### ${level.emoji} ${level.title}\n\n`;
    markdown += `${level.desc}\n\n`;

    for (const sponsor of sponsorList) {
      const { name, avatar, amount } = sponsor;
      markdown += `<div className="flex items-center mb-5 p-4 rounded-lg bg-fd-muted/30">\n`;
      markdown += `  <div className="mr-5">\n`;
      markdown += `    <img src="${avatar}" alt="${name}" className="w-20 h-20 rounded-full ${level.borderClass}" />\n`;
      markdown += `  </div>\n`;
      markdown += `  <div className="flex flex-col">\n`;
      markdown += `    <span className="text-lg font-semibold mb-1">${name}</span>\n`;
      markdown += `    <span className="text-sm text-muted-foreground">${i18n.totalSponsored}: ¥${amount.toFixed(2)}</span>\n`;
      markdown += `  </div>\n`;
      markdown += `</div>\n\n`;
    }

    markdown += '---\n\n';
  }

  return markdown;
}

function generateSpecialThanksContent(
  contributors: Contributor[],
  sponsors: SponsorsData | null,
  lang: keyof typeof SPECIAL_THANKS_I18N
): string {
  const currentTime = new Date()
    .toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false,
    })
    .replace(/\//g, '-');

  const i18n = SPECIAL_THANKS_I18N[lang];
  const parts: string[] = [];

  // Add frontmatter
  const titleMap = {
    zh: '特别鸣谢',
    en: 'Special Thanks',
    ja: 'スペシャルサンクス',
  };
  parts.push(`---\ntitle: ${titleMap[lang]}\n---\n\n`);

  parts.push(`import { Callout } from 'fumadocs-ui/components/callout';\n\n`);
  parts.push(`${i18n.intro}\n\n`);

  // Sponsors section
  if (
    sponsors &&
    (sponsors.gold.length || sponsors.silver.length || sponsors.bronze.length)
  ) {
    parts.push(`${i18n.sponsorsTitle}\n\n`);
    parts.push(`${i18n.sponsorsIntro}\n\n`);
    parts.push(
      `<Callout title="${i18n.sponsorsInfoTitle} ${currentTime} (UTC+8)">\n`
    );
    parts.push(`${i18n.sponsorsInfoDesc}\n`);
    parts.push(`</Callout>\n\n`);
    parts.push(formatSponsorsMarkdown(sponsors, lang));
  }

  // Contributors section
  if (contributors.length) {
    parts.push(`${i18n.contributorsTitle}\n\n`);
    parts.push(`${i18n.contributorsIntro}\n\n`);
    parts.push(
      `<Callout title="${i18n.contributorsInfoTitle} ${currentTime} (UTC+8)">\n`
    );
    parts.push(`${i18n.contributorsInfoDesc}\n`);
    parts.push(`</Callout>\n\n`);
    parts.push(formatContributorsMarkdown(contributors, lang));
  }

  return parts.join('');
}

async function generateSpecialThanks() {
  console.log('\n🚀 Starting to generate Special Thanks...\n');

  try {
    // Fetch data
    const [contributors, sponsors] = await Promise.all([
      fetchGitHubContributors(),
      fetchAfdianSponsors(),
    ]);

    if (!contributors.length && !sponsors) {
      console.warn('⚠ No data was fetched');
      return;
    }

    // Generate files for each language
    const languages = ['zh', 'en', 'ja'] as const;

    for (const lang of languages) {
      console.log(`\n📝 Generating ${lang.toUpperCase()} version...`);

      const markdown = generateSpecialThanksContent(
        contributors,
        sponsors,
        lang
      );
      const outputPath = path.join(
        process.cwd(),
        'content',
        'docs',
        lang,
        'guide',
        'wiki',
        'special-thanks.mdx'
      );

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(outputPath, markdown, 'utf-8');
      console.log(`✓ Generated: ${outputPath}`);
    }

    console.log('\n✅ Special Thanks generation completed!\n');
  } catch (error) {
    console.error('\n❌ Special Thanks generation failed:', error);
    // Don't throw error, use existing files if they exist
    console.log('⚠ Will use existing special-thanks files if available\n');
  }
}

// Execute generation
if (require.main === module) {
  generateSpecialThanks();
}

export { generateSpecialThanks };
