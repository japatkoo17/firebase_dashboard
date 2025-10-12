'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FilePenLine, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from './user-form'; // Import the shared interface

interface UsersTableProps {
  users: UserProfile[];
  onEdit: (user: UserProfile) => void;
  onDelete: (userId: string) => void;
  isLoading: boolean;
}

export default function UsersTable({ users, onEdit, onDelete, isLoading }: UsersTableProps) {
  if (isLoading) {
    return <div className="text-center p-8">Načítavam používateľov...</div>;
  }
  
  if (users.length === 0) {
    return <div className="text-center p-8 text-text-muted">Žiadni používatelia neboli nájdení.</div>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-bg-muted">
              <tr>
                <th scope="col" className="px-6 py-3">Meno / Email</th>
                <th scope="col" className="px-6 py-3">Rola</th>
                <th scope="col" className="px-6 py-3 text-right">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uid} className="border-b border-border">
                  <td scope="row" className="px-6 py-4 font-medium whitespace-nowrap">
                    <div>{user.displayName || 'Nezadané'}</div>
                    <div className="text-xs text-text-muted">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="px-2 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand">
                        {user.role}
                     </span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onEdit(user)}>
                      <FilePenLine className="h-4 w-4" />
                      <span className="sr-only">Upraviť</span>
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:border-red-500/50" onClick={() => onDelete(user.uid)}>
                      <Trash2 className="h-4 w-4" />
                       <span className="sr-only">Vymazať</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
