import './globals.css';
import Shell from '@/components/Shell';

export const metadata = {
  title: 'Aufbau',
  description: 'Training, Ernährung und Fortschritt an einem Ort',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Aufbau', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon-192.png', apple: '/icon-180.png' },
};

export const viewport = {
  themeColor: '#0d1012',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
