'use client';

import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import React from 'react';

// This is a Higher-Order Component (HOC) that wraps a component
// and ensures that only authenticated users can access it.
export default function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  // The new component that will be returned
  const WithAuthComponent = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // If the loading is finished and there is no user, redirect to login page.
      if (!loading && !user) {
        router.replace('/'); // Using replace to avoid adding the admin page to history
      }
    }, [user, loading, router]);

    // While loading, we can show a loader or null
    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <p>Načítavam...</p>
        </div>
      );
    }

    // If there is a user, render the wrapped component with its props.
    if (user) {
      return <WrappedComponent {...props} />;
    }

    // If there is no user, we return null because the redirect is in progress.
    return null;
  };

  return WithAuthComponent;
}
