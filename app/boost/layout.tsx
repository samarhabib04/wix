import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boost Your Listings | Dog Quest - Maximize Your Puppy Sales',
  description: 'Learn about Dog Quest\'s boost options to maximize your puppy listing visibility. Choose from Gold, Elite, Premium, or Standard boosts with guaranteed placement.',
};

export default function BoostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

