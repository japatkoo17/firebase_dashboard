'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

// Define the shape of company data
export interface CompanyData {
  id?: string; // Optional, as it won't exist for new companies
  name: string;
  ico: string;
  dic: string;
  currency: string;
  accountingStandard: string;
  // New fields for AbraFlexi API
  abraflexiUrl?: string;
  abraflexiUser?: string;
  abraflexiPassword?: string;
}

interface CompanyFormProps {
  onSubmit: (data: CompanyData) => void;
  initialData?: CompanyData | null;
  isLoading?: boolean;
}

export default function CompanyForm({ onSubmit, initialData, isLoading = false }: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyData>({
    name: '',
    ico: '',
    dic: '',
    currency: 'EUR',
    accountingStandard: 'Slovenský',
    abraflexiUrl: '',
    abraflexiUser: '',
    abraflexiPassword: '',
  });

  useEffect(() => {
    if (initialData) {
      // Ensure password is not displayed, but allow setting a new one
      setFormData({ ...initialData, abraflexiPassword: '' });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium">Názov Spoločnosti</label>
        <input id="name" name="name" value={formData.name} onChange={handleChange} className="w-full input" required />
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2"><label htmlFor="ico" className="block text-sm font-medium">IČO</label><input id="ico" name="ico" value={formData.ico} onChange={handleChange} className="w-full input" required/></div>
            <div className="space-y-2"><label htmlFor="dic" className="block text-sm font-medium">DIČ</label><input id="dic" name="dic" value={formData.dic} onChange={handleChange} className="w-full input" /></div>
       </div>
       <div className="border-t border-border pt-4 mt-4 space-y-4">
          <h4 className="font-semibold text-md">AbraFlexi API Pripojenie</h4>
          <div className="space-y-2">
            <label htmlFor="abraflexiUrl" className="block text-sm font-medium">URL Adresa (vrátane `/c/identifikator_firmy/`)</label>
            <input id="abraflexiUrl" name="abraflexiUrl" type="url" value={formData.abraflexiUrl} onChange={handleChange} className="w-full input" placeholder="https://vas-server.flexibee.eu/c/vasa_firma/" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><label htmlFor="abraflexiUser" className="block text-sm font-medium">Používateľ</label><input id="abraflexiUser" name="abraflexiUser" value={formData.abraflexiUser} onChange={handleChange} className="w-full input" /></div>
            <div className="space-y-2"><label htmlFor="abraflexiPassword" className="block text-sm font-medium">Heslo</label><input id="abraflexiPassword" name="abraflexiPassword" type="password" value={formData.abraflexiPassword} onChange={handleChange} className="w-full input" placeholder={initialData ? 'Zadajte pre zmenu' : ''}/></div>
          </div>
       </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Ukladám...' : 'Uložiť Zmeny'}</Button>
      </DialogFooter>
    </form>
  );
}

// Helper CSS class for inputs
const styles = `
  .input {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    background-color: var(--color-bg-muted);
    color: var(--color-text);
  }
`;
const styleSheet = new CSSStyleSheet();
if (typeof window !== 'undefined') {
    styleSheet.replaceSync(styles);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
}
