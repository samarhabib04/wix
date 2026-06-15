import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mixed Breed Details | Dog Quest',
  description: 'Learn about mixed breed dogs and find the perfect match for your family.',
};

export default function MixedBreedDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

