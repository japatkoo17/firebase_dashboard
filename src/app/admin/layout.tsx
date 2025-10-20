'use client';

import Link from 'next/link';
import { Building, Users, LayoutDashboard, KeyRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/companies', label: 'Spoločnosti', icon: Building },
    { href: '/admin/users', label: 'Používatelia', icon: Users },
    { href: '/admin/permissions', label: 'Prístupy', icon: KeyRound },
  ];

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-bg-muted lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link className="flex items-center gap-2 font-semibold" href="/admin">
              <LayoutDashboard className="h-6 w-6" />
              <span>Admin Panel</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-text-muted transition-all hover:text-text",
                    { "bg-bg text-text": pathname === href }
                  )}
                  href={href}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// The withAuth HOC is no longer needed here, ClientLayout handles protection globally.
export default AdminLayout;
