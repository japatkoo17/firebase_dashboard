'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserProfile } from '../users/user-form';
import { Company } from '../companies/companies-table';
import { Check, Loader2 } from 'lucide-react';

export default function PermissionsManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({}); // { userId: [companyId1, companyId2] }

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 1. Fetch all users and companies
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        setUsers(usersData);

        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        const companiesData = companiesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Company));
        setCompanies(companiesData);

        if (usersData.length > 0) {
          setSelectedUserId(usersData[0].uid);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Listen for permission changes in real-time
  useEffect(() => {
    const permissionsRef = collection(db, 'permissions');
    const unsubscribe = onSnapshot(permissionsRef, (snapshot) => {
      const permsData: Record<string, string[]> = {};
      snapshot.forEach(doc => {
        permsData[doc.id] = doc.data().allowedCompanies || [];
      });
      setPermissions(permsData);
    });
    return () => unsubscribe();
  }, []);

  const handlePermissionChange = (companyId: string, isChecked: boolean) => {
    if (!selectedUserId) return;

    const currentPermissions = permissions[selectedUserId] || [];
    let updatedPermissions;

    if (isChecked) {
      updatedPermissions = [...currentPermissions, companyId];
    } else {
      updatedPermissions = currentPermissions.filter(id => id !== companyId);
    }
    
    // Optimistically update UI
    setPermissions(prev => ({
      ...prev,
      [selectedUserId]: updatedPermissions,
    }));
  };

  const handleSaveChanges = async () => {
    if (!selectedUserId) return;
    setIsSaving(true);

    try {
        const userPermissionsRef = doc(db, 'permissions', selectedUserId);
        await setDoc(userPermissionsRef, { allowedCompanies: permissions[selectedUserId] || [] });
        
        // Show success indicator
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);

    } catch (error) {
        console.error("Error saving permissions:", error);
    } finally {
        setIsSaving(false);
    }
  };
  
  const userPermissions = useMemo(() => permissions[selectedUserId] || [], [permissions, selectedUserId]);

  if (isLoading) {
    return <Card className="flex items-center justify-center p-8"><Loader2 className="animate-spin mr-2" /> Načítavam dáta...</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manažér Prístupov</CardTitle>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mt-2">
            <label htmlFor="user-select" className="font-semibold">Používateľ:</label>
            <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full max-w-xs p-2 border border-border rounded-md bg-bg-muted text-text"
            >
                {users.map(user => (
                    <option key={user.uid} value={user.uid}>
                        {user.displayName || user.email}
                    </option>
                ))}
            </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <h3 className="font-semibold mb-2">Prístup k Spoločnostiam</h3>
            <div className="space-y-2">
                {companies.map(company => (
                    <label key={company.id} className="flex items-center p-3 rounded-md bg-bg-muted hover:bg-border transition-colors">
                        <input
                            type="checkbox"
                            checked={userPermissions.includes(company.id)}
                            onChange={(e) => handlePermissionChange(company.id, e.target.checked)}
                            className="h-5 w-5 rounded text-brand focus:ring-brand"
                            disabled={!selectedUserId}
                        />
                        <span className="ml-3 font-medium">{company.name}</span>
                        <span className="ml-auto text-sm text-text-muted">IČO: {company.ico}</span>
                    </label>
                ))}
            </div>
        </div>
        <div className="flex justify-end items-center gap-4">
            {showSuccess && <div className="text-green-500 flex items-center gap-1 text-sm"><Check className="h-4 w-4" /> Zmeny úspešne uložené!</div>}
            <Button onClick={handleSaveChanges} disabled={!selectedUserId || isSaving}>
                {isSaving ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Ukladám...</> : 'Uložiť Zmeny'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
