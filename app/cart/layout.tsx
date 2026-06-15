import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Cart | Dog Quest Shop',
  description: 'View and manage your shopping cart items.',
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

