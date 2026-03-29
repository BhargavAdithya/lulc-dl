import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LandCoverAI — Sentinel-2 Classification',
  description: 'Upload a Sentinel-2 TIF image and get AI-powered land cover segmentation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}