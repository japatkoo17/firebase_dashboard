'use client';

import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// This HOC ensures that only authenticated users can access a page.
export default function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  
  const WithAuthComponent = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // If loading is finished and there's no user, redirect to the login page.
      if (!loading && !user) {
        router.replace('/');
      }
    }, [user, loading, router]);

    // While loading or if there's no user (and redirect is imminent), show a loader.
    if (loading || !user) {
      return (
        <div className="flex h-screen items-center justify-center bg-bg">
          <div className="flex items-center gap-2 text-text-muted">
            <Loader2 className="animate-spin h-6 w-6" />
            <span>Overujem autorizáciu...</span>
          </div>
        </div>
      );
    }

    // If there is a user, render the wrapped component.
    return <WrappedComponent {...props} />;
  };

  // Add a display name for better debugging
  WithAuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithAuthComponent;
}
