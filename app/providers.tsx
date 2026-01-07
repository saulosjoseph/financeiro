'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Navbar />
      <Toaster 
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            padding: '16px',
          },
        }}
      />
      {children}
    </SessionProvider>
  );
}
