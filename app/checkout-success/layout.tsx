import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Confirmation | Dog Quest Shop',
  description: 'Thank you for your order with Dog Quest Shop',
};

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

