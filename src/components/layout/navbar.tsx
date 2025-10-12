'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import { LogOut, User, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirect to login page after logout
  };

  return (
    <nav className="bg-bg-muted border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/companies" className="flex items-center gap-2 text-xl font-bold text-text">
                <LayoutDashboard className="h-6 w-6 text-brand" />
                <span>Finančný Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-24 bg-border rounded-md animate-pulse" />
            ) : user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <User className="h-4 w-4" />
                  <span>{user.displayName || user.email}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Odhlásiť sa">
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
