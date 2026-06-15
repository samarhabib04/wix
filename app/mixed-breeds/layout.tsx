import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Mixed Breeds | Dog Quest',
  description: 'Find your perfect mixed breed dog by browsing different crossbreeds. Filter by size, grooming needs, and energy level to find the right match for your family.',
};

export default function MixedBreedsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

