'use client';

import { useAuth } from '@/lib/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// This component wraps protected pages and handles redirection
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; // Wait until the auth state is resolved
    }

    const isAuthPage = pathname === '/';

    if (!user && !isAuthPage) {
      // If the user is not logged in and not on the login page, redirect them
      router.replace('/');
    } else if (user && isAuthPage) {
      // If the user is logged in and on the login page, redirect them away
      router.replace(isAdmin ? '/admin' : '/companies');
    }

  }, [user, isAdmin, loading, router, pathname]);
  
  // While loading, show a full-page loader to prevent content flashing
  if (loading && pathname !== '/') {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="flex items-center gap-2 text-text-muted">
          <Loader2 className="animate-spin h-6 w-6" />
          <span>Overujem autorizáciu...</span>
        </div>
      </div>
    );
  }

  // If the user is not logged in and trying to access a protected page,
  // we return null to prevent the page from rendering while redirecting.
  if (!user && pathname !== '/') {
    return null;
  }
  
  // If the user is logged in OR on the login page, render the children.
  return <>{children}</>;
}
