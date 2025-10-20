'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserProfile } from '../users/user-form';
import { Company } from '../companies/companies-table';
import { Check, Loader2, AlertTriangle } from 'lucide-react';

export default function PermissionsManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [originalUserPermissions, setOriginalUserPermissions] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsInitialLoading(true);
      try {
        const [usersSnapshot, companiesSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'companies'))
        ]);

        const usersData = usersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        setUsers(usersData);

        const companiesData = companiesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Company));
        setCompanies(companiesData);

        if (usersData.length > 0) {
          setSelectedUserId(usersData[0].uid);
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError("Nepodarilo sa načítať základné dáta.");
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchPermissionsForUser = useCallback(async (userId: string) => {
    if (!userId) return;

    setIsPermissionsLoading(true);
    setError(null);
    try {
      // NEW LOGIC: Read from the user's document directly
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);
      const permissionsData = docSnap.exists() ? docSnap.data().allowedCompanies || [] : [];
      setUserPermissions(permissionsData);
      setOriginalUserPermissions(permissionsData);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setError("Nepodarilo sa načítať povolenia pre používateľa.");
      setUserPermissions([]);
      setOriginalUserPermissions([]);
    } finally {
      setIsPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissionsForUser(selectedUserId);
  }, [selectedUserId, fetchPermissionsForUser]);


  const handlePermissionChange = (companyId: string, isChecked: boolean) => {
    setUserPermissions(prev => isChecked ? [...prev, companyId] : prev.filter(id => id !== companyId));
  };

  const handleSaveChanges = async () => {
    if (!selectedUserId) return;

    setIsSaving(true);
    setError(null);
    setShowSuccess(false);

    try {
        // NEW LOGIC: Update the user's document in the 'users' collection
        const userDocRef = doc(db, 'users', selectedUserId);
        await updateDoc(userDocRef, { allowedCompanies: userPermissions });
        
        setOriginalUserPermissions(userPermissions);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);

    } catch (err) {
        console.error("Error saving permissions:", err);
        setError("Chyba pri ukladaní. Skúste to znova.");
        setUserPermissions(originalUserPermissions);
    } finally {
        setIsSaving(false);
    }
  };
  
  if (isInitialLoading) {
    return <Card className="flex items-center justify-center p-8"><Loader2 className="animate-spin mr-2" /> Načítavam dáta...</Card>;
  }
  
  // Render logic remains the same...
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manažér Prístupov</CardTitle>
        {users.length === 0 ? (
            <CardDescription>V systéme nie sú žiadni používatelia.</CardDescription>
        ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-4 mt-2">
                <label htmlFor="user-select" className="font-semibold shrink-0">Používateľ:</label>
                <select
                    id="user-select"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full max-w-xs p-2 border border-border rounded-md bg-bg-muted text-text"
                    disabled={isPermissionsLoading || isSaving}
                >
                    {users.map(user => (
                        <option key={user.uid} value={user.uid}>
                            {user.displayName || user.email}
                        </option>
                    ))}
                </select>
            </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isPermissionsLoading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin mr-2" /> Načítavam povolenia...</div>
        ) : companies.length === 0 ? (
            <p className="text-text-muted text-center py-4">V systéme nie sú žiadne spoločnosti.</p>
        ) : (
            <div>
                <h3 className="font-semibold mb-2">Prístup k Spoločnostiam</h3>
                <div className="space-y-2">
                    {companies.map(company => (
                        <label key={company.id} className="flex items-center p-3 rounded-md bg-bg-muted hover:bg-border transition-colors cursor-pointer">
                            <input
                                type="checkbox"
                                checked={userPermissions.includes(company.id)}
                                onChange={(e) => handlePermissionChange(company.id, e.target.checked)}
                                className="h-5 w-5 rounded text-brand focus:ring-brand"
                                disabled={!selectedUserId || isSaving}
                            />
                            <span className="ml-3 font-medium">{company.name}</span>
                        </label>
                    ))}
                </div>
            </div>
        )}
        <div className="flex justify-end items-center gap-4 h-10">
            {error && <div className="text-red-500 flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" /> {error}</div>}
            {showSuccess && <div className="text-green-500 flex items-center gap-1 text-sm"><Check className="h-4 w-4" /> Zmeny úspešne uložené!</div>}
            <Button 
                onClick={handleSaveChanges} 
                disabled={!selectedUserId || isSaving || isPermissionsLoading || users.length === 0 || companies.length === 0}
                className="w-36"
            >
                {isSaving ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Ukladám...</> : 'Uložiť Zmeny'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
