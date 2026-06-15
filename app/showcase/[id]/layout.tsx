import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Showcase Details | Dog Quest',
  description: 'View detailed information about this showcase listing.',
};

export default function ShowcaseDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























