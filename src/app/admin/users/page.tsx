'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, Search } from 'lucide-react';
import UsersTable from './users-table';
import UserForm, { UserFormData, UserProfile } from './user-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-provider';
import { Input } from '@/components/ui/input';

// Define types for the data returned by the cloud functions
interface ListUsersData {
  users: UserProfile[];
}

export default function UsersAdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const listUsers = httpsCallable(functions, 'listUsers');
      const result: HttpsCallableResult<ListUsersData> = await listUsers();
      setUsers(result.data.users);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Error fetching users:", err);
      setError(`Nepodarilo sa načítať zoznam používateľov. Uistite sa, že máte oprávnenia. Chyba: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const handleOpenDialog = (userToEdit: UserProfile | null = null) => {
    setEditingUser(userToEdit);
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
        await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Vyskytla sa chyba pri ukladaní.";
      console.error("Error setting user role: ", err);
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
      if (success) {
        setIsDialogOpen(false);
        setEditingUser(null);
      }
    }
  };
  
  const handleDeleteUser = async (uid: string) => {
      if (window.confirm('Naozaj si prajete vymazať tohto používateľa? Táto akcia je nezvratná.')) {
        try {
            const functions = getFunctions();
            const deleteUser = httpsCallable(functions, 'deleteUser');
            await deleteUser({ uid });
            alert('Používateľ bol úspešne vymazaný.');
            await fetchUsers(); // Re-fetch the user list
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Vyskytla sa chyba pri mazaní.";
            console.error("Error deleting user: ", err);
            alert(`Chyba pri mazaní používateľa: ${errorMessage}`);
        }
      }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      (user.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Správa Používateľov</h1>
          <p className="text-text-muted">
            Prideľujte role a spravujte prístupy používateľov.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-text-muted" />
                <Input 
                    placeholder="Hľadať podľa mena alebo emailu..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button className="flex items-center gap-2" onClick={() => handleOpenDialog()}>
                <PlusCircle className="h-4 w-4" />
                <span>Pozvať</span>
            </Button>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 text-red-500 p-4 rounded-md">
            <AlertTriangle className="h-6 w-6" />
            <p>{error}</p>
        </div>
      )}

      <UsersTable 
        users={filteredUsers} 
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
