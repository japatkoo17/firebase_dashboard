'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, FirestoreError } from 'firebase/firestore';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, Search } from 'lucide-react';
import CompaniesTable, { Company } from './companies-table';
import CompanyForm, { CompanyData } from './company-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// Define a type for the data returned by the 'runCompanySync' function
interface SyncResultData {
  message: string;
}

interface HttpsError extends Error {
    code: string;
    details?: any;
}

function CompaniesAdmin() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const companiesCollectionRef = collection(db, 'companies');
    const unsubscribe = onSnapshot(companiesCollectionRef, (snapshot) => {
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Company));
      setCompanies(companiesData);
      setIsLoading(false);
    }, (err: FirestoreError) => {
      console.error("Error fetching companies: ", err);
      setError(`Nepodarilo sa načítať dáta: ${err.message}`);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenDialog = (company: Company | null = null) => {
    setEditingCompany(company);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (data: CompanyData) => {
    setIsSubmitting(true);
    let success = false;
    
    const { abraflexiPassword, ...companyDetails } = data;

    try {
      if (editingCompany) {
        const companyDocRef = doc(db, 'companies', editingCompany.id);
        await updateDoc(companyDocRef, companyDetails);

        if (abraflexiPassword) {
            const functions = getFunctions();
            const setSecret = httpsCallable(functions, 'setAbraFlexiSecret');
            await setSecret({ companyId: editingCompany.id, password: abraflexiPassword });
            alert('Heslo pre AbraFlexi bolo bezpečne aktualizované.');
        }

      } else {
        const docRef = await addDoc(collection(db, 'companies'), companyDetails);
        
        if (abraflexiPassword) {
            const functions = getFunctions();
            const setSecret = httpsCallable(functions, 'setAbraFlexiSecret');
            await setSecret({ companyId: docRef.id, password: abraflexiPassword });
            alert('Spoločnosť vytvorená a heslo pre AbraFlexi bolo bezpečne uložené.');
        }
      }
      success = true;
    } catch (err: unknown) { // Better error handling
      console.error("Error saving company: ", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Vyskytla sa chyba: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      if (success) {
        setIsDialogOpen(false);
        setEditingCompany(null);
      }
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (window.confirm('Naozaj si prajete vymazať túto spoločnosť?')) {
      try {
        await deleteDoc(doc(db, 'companies', companyId));
      } catch (err: unknown) {
        console.error("Error deleting company: ", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`Chyba pri mazaní: ${errorMessage}`);
      }
    }
  };

  const handleSync = async (companyId: string) => {
    setSyncingId(companyId);
    try {
        const functions = getFunctions();
        const runCompanySync = httpsCallable(functions, 'runCompanySync');
        const result: HttpsCallableResult<SyncResultData> = await runCompanySync({ companyId });
        const message = result.data.message;
        alert(`Synchronizácia úspešne dokončená! Správa: ${message}`);
    } catch (error: unknown) {
        console.error("Error running sync:", error);
        const err = error as HttpsError;
        // Display the detailed error from the backend
        const detailMessage = err.details ? ` Detail: ${err.details}` : '';
        alert(`Chyba pri synchronizácii: ${err.message}${detailMessage}`);
    } finally {
        setSyncingId(null);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.ico && company.ico.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [companies, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Správa Spoločností</h1>
          <p className="text-text-muted">Prehľad všetkých spoločností v systéme.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-text-muted" />
                <Input 
                    placeholder="Hľadať podľa názvu alebo IČO..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button className="flex items-center gap-2" onClick={() => handleOpenDialog()}>
                <PlusCircle className="h-4 w-4" />
                <span>Pridať</span>
            </Button>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 text-red-500 p-4 rounded-md">
            <AlertTriangle className="h-6 w-6" />
            <p>{error}</p>
        </div>
      )}

      <CompaniesTable 
        companies={filteredCompanies} 
        onEdit={handleOpenDialog} 
        onDelete={handleDeleteCompany} 
        onSync={handleSync}
        syncingId={syncingId}
        isLoading={isLoading} 
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Upraviť Spoločnosť' : 'Pridať Novú Spoločnosť'}</DialogTitle>
            <DialogDescription>Vyplňte detaily a uložte zmeny.</DialogDescription>
          </DialogHeader>
          <CompanyForm 
            onSubmit={handleFormSubmit}
            initialData={editingCompany}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CompaniesAdminPage() {
    return <CompaniesAdmin />;
}
