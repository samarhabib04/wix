import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout | Dog Quest Shop',
  description: 'Complete your purchase from Dog Quest Shop',
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

