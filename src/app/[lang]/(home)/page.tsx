import { redirect } from 'next/navigation';
import { i18n } from '@/lib/i18n';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/docs`);
}

export async function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}
