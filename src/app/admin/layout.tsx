'use client';

import Link from 'next/link';
import { Building, Users, LayoutDashboard, KeyRound } from 'lucide-react';
import withAuth from '@/lib/with-auth';

function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 flex-col border-r bg-bg-muted p-4 md:flex">
        <div className="mb-8 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-brand" />
            <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="flex flex-col gap-2">
          <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-muted transition-all hover:text-text">
            <LayoutDashboard className="h-4 w-4" />
            Prehľad
          </Link>
          <Link href="/admin/companies" className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-muted transition-all hover:text-text">
            <Building className="h-4 w-4" />
            Spoločnosti
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-muted transition-all hover:text-text">
            <Users className="h-4 w-4" />
            Používatelia
          </Link>
           <Link href="/admin/permissions" className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-muted transition-all hover:text-text">
            <KeyRound className="h-4 w-4" />
            Prístupy
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

// Wrap the layout with the withAuth HOC before exporting
export default withAuth(AdminLayout);
