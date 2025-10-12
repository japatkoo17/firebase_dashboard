'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import CompaniesTable, { Company } from './companies-table';
import CompanyForm, { CompanyData } from './company-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function CompaniesAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null); // For loading state on sync button

  useEffect(() => {
    const companiesCollectionRef = collection(db, 'companies');
    const unsubscribe = onSnapshot(companiesCollectionRef, (snapshot) => {
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Company));
      setCompanies(companiesData);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching companies: ", err);
      setError("Nepodarilo sa načítať dáta.");
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
    } catch (err) {
      console.error("Error saving company: ", err);
      alert(`Vyskytla sa chyba: ${err.message}`);
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
      } catch (err) {
        console.error("Error deleting company: ", err);
      }
    }
  };

  const handleSync = async (companyId: string) => {
    setSyncingId(companyId);
    try {
        const functions = getFunctions();
        const runCompanySync = httpsCallable(functions, 'runCompanySync');
        const result = await runCompanySync({ companyId });
        alert(`Synchronizácia úspešne dokončená! Správa: ${(result.data as any).message}`);
    } catch (error) {
        console.error("Error running sync:", error);
        alert(`Chyba pri synchronizácii: ${error.message}`);
    } finally {
        setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Správa Spoločností</h1>
          <p className="text-text-muted">Prehľad všetkých spoločností v systéme.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => handleOpenDialog()}>
          <PlusCircle className="h-4 w-4" />
          <span>Pridať Spoločnosť</span>
        </Button>
      </div>
      
      {error && <p className="text-red-500">{error}</p>}

      <CompaniesTable 
        companies={companies} 
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
