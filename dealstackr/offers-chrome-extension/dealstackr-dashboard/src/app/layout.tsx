import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dealstackr — My Card Offers',
  description: 'Consolidated Chase & Amex offers from your cards',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

