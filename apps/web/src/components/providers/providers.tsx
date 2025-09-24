'use client';

import { ReactNode, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../../lib/api/query-client';
import { ThemeProvider } from 'next-themes';
import { TenantProvider } from './tenant-provider';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createQueryClient());

  return (
    <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
      <TenantProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </TenantProvider>
    </ThemeProvider>
  );
}
