'use client';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound, useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PnlTab } from './pnl-tab';
import { BalanceSheetTab } from './balance-sheet-tab';
import { CashFlowTab } from './cash-flow-tab';
import { AccountExplorerTab } from './account-explorer-tab';
import { Building2, Loader2, AlertTriangle, Clock } from "lucide-react";

interface FinancialData {
    incomeStatement: Record<string, unknown>;
    balanceSheet: Record<string, unknown>;
    lastSync: string; // ISO 8601 string format
}

interface CompanyData {
    name: string;
}

// Helper to format the timestamp
const formatLastSync = (isoString: string | undefined): string => {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('sk-SK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch (e) {
        return 'Neplatný dátum';
    }
};


function DashboardPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [companyName, setCompanyName] = useState<string>('');
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchCompanyName = async () => {
        try {
            const companyDocRef = doc(db, 'companies', companyId);
            const companySnap = await getDoc(companyDocRef);
            if (companySnap.exists()) {
                setCompanyName((companySnap.data() as CompanyData).name);
            } else {
                return notFound();
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Nepodarilo sa načítať informácie o spoločnosti: ${errorMessage}`);
        }
    };
    
    fetchCompanyName();

    const dataDocRef = doc(db, 'companies', companyId, 'financial_data', 'latest');
    const unsubscribe = onSnapshot(dataDocRef, (doc) => {
      if (doc.exists()) {
        setFinancialData(doc.data() as FinancialData);
        setError(null);
      } else {
        setFinancialData(null); 
      }
      setIsLoading(false);
    }, (err: FirestoreError) => {
      console.error("Error fetching financial data:", err);
      if (err.code === 'permission-denied') {
          setError("Nemáte oprávnenie na zobrazenie dát pre túto spoločnosť. Kontaktujte administrátora.");
      } else {
          setError(`Chyba pri načítavaní finančných dát: ${err.message}`);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);
  
  if (isLoading) {
      return (
          <div className="flex h-screen items-center justify-center gap-2 text-text-muted">
              <Loader2 className="animate-spin h-6 w-6" />
              <span>Načítavam dáta dashboardu...</span>
          </div>
      );
  }

  return (
    <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
            <Building2 className="h-8 w-8 text-brand" />
            <h1 className="text-3xl font-bold tracking-tight">{companyName}</h1>
        </div>
        {/* --- LAST SYNC DISPLAY --- */}
        {financialData?.lastSync && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 mr-2" />
                <span>Posledná aktualizácia: <strong>{formatLastSync(financialData.lastSync)}</strong></span>
            </div>
        )}
      </div>

      {error && (
          <div className="flex items-center gap-3 bg-red-500/10 text-red-500 p-4 rounded-md">
              <AlertTriangle className="h-6 w-6" />
              <p>{error}</p>
          </div>
      )}

      {!financialData && !error && (
           <div className="text-center bg-bg-muted p-8 rounded-lg">
                <h3 className="text-xl font-semibold">Žiadne Finančné Dáta</h3>
                <p className="text-text-muted mt-2">Pre túto spoločnosť zatiaľ neboli synchronizované žiadne dáta.</p>
            </div>
      )}
      
      {financialData && (
        <Tabs defaultValue="pnl" className="space-y-4">
            <TabsList>
            <TabsTrigger value="pnl">Výkaz Ziskov a Strát</TabsTrigger>
            <TabsTrigger value="bs">Súvaha</TabsTrigger>
            <TabsTrigger value="cf">Cash Flow</TabsTrigger>
            <TabsTrigger value="explorer">Prieskumník Dát</TabsTrigger>
            </TabsList>

            <TabsContent value="pnl">
              <PnlTab data={financialData.incomeStatement as any} />
            </TabsContent>
            <TabsContent value="bs">
              <BalanceSheetTab data={financialData.balanceSheet as any} />
            </TabsContent>
            <TabsContent value="cf">
              <CashFlowTab data={financialData as any} />
            </TabsContent>
            <TabsContent value="explorer">
                <AccountExplorerTab companyId={companyId} />
            </TabsContent>
        </Tabs>
      )}
    </main>
  );
}

export default DashboardPage;
