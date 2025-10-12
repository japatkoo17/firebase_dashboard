'use client';

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import UsersTable from './users-table';
import UserForm, { UserFormData, UserProfile } from './user-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-provider';

export default function UsersAdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const listUsers = httpsCallable(functions, 'listUsers');
      const result = await listUsers();
      const data = result.data as { users: UserProfile[] };
      setUsers(data.users);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Nepodarilo sa načítať zoznam používateľov. Uistite sa, že máte oprávnenia a skúste obnoviť stránku.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // We fetch users only when the component mounts and user is logged in.
    // Real-time listener is not used here as user list doesn't change that frequently.
    if (user) {
        fetchUsers();
    }
  }, [user]);

  const handleOpenDialog = (user: UserProfile | null = null) => {
    setEditingUser(user);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    setFormError(null);
    let success = false;
    
    try {
        const functions = getFunctions();
        const setUserRole = httpsCallable(functions, 'setUserRole');
        await setUserRole({ email: data.email, role: data.role });
        success = true;
        await fetchUsers(); // Re-fetch the user list to show updated roles
    } catch (err: any) {
      console.error("Error setting user role: ", err);
      setFormError(err.message || "Vyskytla sa chyba pri ukladaní.");
    } finally {
      setIsSubmitting(false);
      if (success) {
        setIsDialogOpen(false);
        setEditingUser(null);
      }
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
      // Deleting users is a very sensitive operation, so we will add it later if needed.
      // For now, we just show an alert.
      alert("Mazanie používateľov zatiaľ nie je implementované.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Správa Používateľov</h1>
          <p className="text-text-muted">
            Prideľujte role a spravujte prístupy používateľov.
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => handleOpenDialog()}>
          <PlusCircle className="h-4 w-4" />
          <span>Pozvať Používateľa</span>
        </Button>
      </div>
      
      {error && <p className="text-red-500">{error}</p>}

      <UsersTable 
        users={users} 
        onEdit={handleOpenDialog} 
        onDelete={handleDeleteUser}
        isLoading={isLoading}
      />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Upraviť Rolu Používateľa' : 'Pozvať Nového Používateľa'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Zmeňte rolu používateľa.' : 'Zadajte email a rolu. Ak používateľ neexistuje, bude mu vytvorený účet.'}
            </DialogDescription>
          </DialogHeader>
          <UserForm 
            onSubmit={handleFormSubmit}
            initialData={editingUser ? { email: editingUser.email, role: editingUser.role } : null}
            isLoading={isSubmitting}
          />
           {formError && <p className="text-sm text-red-500 mt-2">{formError}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
