import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service Details | Dog Quest',
  description: 'View detailed information about this pet service provider.',
};

export default function ServiceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























