'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FilePenLine, Trash2, RefreshCw } from 'lucide-react';
import { CompanyData } from './company-form';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export interface Company extends CompanyData {
  id: string;
}

interface CompaniesTableProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (companyId: string) => void;
  onSync: (companyId: string) => void; // Prop for triggering sync
  syncingId: string | null; // To show loading state on a specific button
  isLoading: boolean;
}

export default function CompaniesTable({ companies, onEdit, onDelete, onSync, syncingId, isLoading }: CompaniesTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <TableSkeleton />
        </CardContent>
      </Card>
    );
  }
  
  if (companies.length === 0) {
    return <div className="text-center p-8 text-text-muted">Zatiaľ neboli pridané žiadne spoločnosti.</div>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-bg-muted">
              <tr>
                <th scope="col" className="px-6 py-3">Názov Spoločnosti</th>
                <th scope="col" className="px-6 py-3">IČO</th>
                <th scope="col" className="px-6 py-3">DIČ</th>
                <th scope="col" className="px-6 py-3 text-right">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-border">
                  <th scope="row" className="px-6 py-4 font-medium whitespace-nowrap">{company.name}</th>
                  <td className="px-6 py-4">{company.ico}</td>
                  <td className="px-6 py-4">{company.dic}</td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8" 
                        title="Synchronizovať dáta" 
                        onClick={() => onSync(company.id)}
                        disabled={syncingId === company.id}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncingId === company.id ? 'animate-spin' : ''}`} />
                      <span className="sr-only">Synchronizovať dáta</span>
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Upraviť" onClick={() => onEdit(company)}>
                      <FilePenLine className="h-4 w-4" />
                      <span className="sr-only">Upraviť</span>
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:border-red-500/50" title="Vymazať" onClick={() => onDelete(company.id)}>
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
