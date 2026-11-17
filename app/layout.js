import './globals.css';
import Shell from '@/components/Shell';

export const metadata = {
  title: 'Fitness-Dashboard',
  description: 'Training, Ernährung und Fortschritt an einem Ort',
  icons: { icon: '/icon-192.png' },
};

export const viewport = {
  themeColor: '#0d1012',
  width: 'device-width',
  initialScale: 1,
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
