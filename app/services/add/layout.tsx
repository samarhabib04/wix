import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Business Listing | Dog Quest',
  description: 'Add your business to the Dog Quest directory',
};

export default function ServiceSubmissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

