import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/lib/query/QueryProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'ClientPulse — Client Project Health & Delivery Dashboard',
  description:
    'One place to track delivery, budget, resources, risks, and client communication.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary/20">
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
