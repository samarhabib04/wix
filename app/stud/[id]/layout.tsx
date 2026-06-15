import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stud Service Details | Dog Quest',
  description: 'View detailed information about this stud service.',
};

export default function StudDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






























