
'use client';

import { createContext, useContext, ReactNode, useState, useMemo } from 'react';

interface TenantContextType {
  tenantId: string | null;
  setTenantId: (id: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  // In a real app, you might get this from a subdomain, user session, etc.
  const [tenantId, setTenantId] = useState<string | null>('clxne49ac000008l3df4u372a'); // Hardcoded for now

  const value = useMemo(() => ({ tenantId, setTenantId }), [tenantId]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
