'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ChartControls } from '@/components/ui/chart-controls';
import { monthNamesFull, monthNames } from '@/lib/data';
import { BookOpen, TrendingUp, TrendingDown, Scale, ChevronsRight, Folder, File, Loader2, Briefcase } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Skeleton } from '@/components/ui/skeleton';
import { PnlTab } from './pnl-tab'; // Re-using our detailed PNL tab
import { BalanceSheetTab } from './balance-sheet-tab'; // Re-using our detailed Balance Sheet tab
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// =================================================================================
// HELPER FUNCTIONS (MOVED TO TOP LEVEL SCOPE)
// =================================================================================
const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);


// =================================================================================
// TYPES (from pnl-tab.tsx and balance-sheet-tab.tsx)
// =================================================================================
interface PnlMonthlyEntry { /* ... */ }
interface PnlData { monthly: PnlMonthlyEntry[] }
interface BalanceSheetMonthlyEntry { /* ... */ }
interface BalanceSheetData { monthly: BalanceSheetMonthlyEntry[] }

interface ManagerialData {
    incomeStatement: PnlData;
    balanceSheet: BalanceSheetData;
}
// =================================================================================
// ACCOUNTING VIEW: Types & Components (from previous step)
// =================================================================================

interface MonthlyDetail {
  month: number;
  turnoverMd: number;
  turnoverDal: number;
  closingBalance: number;
}
interface Account {
    accountNumber: string;
    accountName: string;
    openingBalanceYear: number;
    monthlyDetails: MonthlyDetail[];
}
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  account?: Account;
}

const buildAccountTree = (accounts: Account[]): TreeNode[] => {
    const treeRoot: TreeNode = { id: 'root', name: 'root', children: [] };
    accounts.forEach(account => {
        let currentLevel = treeRoot.children!;
        let path = '';
        // Ensure account number is a string and long enough
        const accNumStr = String(account.accountNumber);
        for (let i = 0; i < 3; i++) {
             if(accNumStr.length <= i) continue;
             path += accNumStr[i];
             let node = currentLevel.find(child => child.id === path);
             if (!node) {
                 node = { id: path, name: `Účty ${path}xx`, children: [] };
                 currentLevel.push(node);
             }
             if(!node.children) node.children = [];
             currentLevel = node.children;
        }
         currentLevel.push({
            id: accNumStr,
            name: `${accNumStr} - ${account.accountName}`,
            account,
        });
    });
    return treeRoot.children || [];
};

const TreeView = ({ nodes, onSelect, selectedAccountId }: { nodes: TreeNode[], onSelect: (account: Account) => void, selectedAccountId: string | null }) => {
    const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});
    const toggleNode = (id: string) => setOpenNodes(prev => ({...prev, [id]: !prev[id]}));
    const handleSelect = (node: TreeNode) => node.account ? onSelect(node.account) : toggleNode(node.id);

    return (
        <ul className="space-y-1">
            {nodes.map(node => (
                <li key={node.id}>
                    <div 
                        className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${node.account && selectedAccountId === node.account.accountNumber ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                        onClick={() => handleSelect(node)}
                    >
                        {node.children && node.children.length > 0 ? (
                            <>
                                <ChevronsRight className={`h-4 w-4 mr-2 transform transition-transform ${openNodes[node.id] ? 'rotate-90' : ''}`} />
                                <Folder className="h-5 w-5 mr-2 text-yellow-500" />
                                <span className="font-semibold">{node.name}</span>
                            </>
                        ) : (
                            <>
                                <File className="h-5 w-5 mr-2 ml-6 text-gray-500" />
                                <span>{node.name}</span>
                            </>
                        )}
                    </div>
                    {node.children && node.children.length > 0 && openNodes[node.id] && (
                        <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-700 ml-4">
                            <TreeView nodes={node.children} onSelect={onSelect} selectedAccountId={selectedAccountId} />
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
};


// =================================================================================
// MAIN COMPONENT with VIEW SWITCHER
// =================================================================================

type ViewMode = 'accounting' | 'managerial';

export function AccountExplorerTab({ companyId }: { companyId: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>('accounting');
  
  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Prieskumník Dát</CardTitle>
          <CardDescription>Vyberte si medzi detailným účtovným pohľadom a agregovaným manažérskym prehľadom.</CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="accounting"><BookOpen className="h-4 w-4 mr-2" />Účtovný pohľad</TabsTrigger>
                <TabsTrigger value="managerial"><Briefcase className="h-4 w-4 mr-2" />Manažérsky pohľad</TabsTrigger>
            </TabsList>
           </Tabs>
        </CardContent>
      </Card>

      {viewMode === 'accounting' ? (
        <AccountingView companyId={companyId} />
      ) : (
        <ManagerialView companyId={companyId} />
      )}
    </div>
  );
}


// =================================================================================
// ACCOUNTING VIEW COMPONENT
// =================================================================================
function AccountingView({ companyId }: { companyId: string }) {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [accountTree, setAccountTree] = useState<TreeNode[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true); setError(null);
      try {
        const functions = getFunctions();
        const getAccounts = httpsCallable(functions, 'getAccountExplorerData');
        const result = await getAccounts({ companyId }) as { data: { accounts: Account[], lastSync: string }};
        const fetchedAccounts = result.data.accounts;
        setAllAccounts(fetchedAccounts);
        setAccountTree(buildAccountTree(fetchedAccounts));
        if (fetchedAccounts.length > 0) setSelectedAccount(fetchedAccounts[0]);
      } catch (err: any) {
        setError(err.message || 'Nepodarilo sa načítať dáta pre účtovný pohľad.');
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, [companyId]);

  const filteredMonthlyDetails = useMemo(() => selectedAccount?.monthlyDetails.filter(item => selectedMonths.includes(item.month)) || [], [selectedAccount, selectedMonths]);
  const chartData = filteredMonthlyDetails.map(item => ({ name: monthNames[item.month - 1], 'Obrat MD': item.turnoverMd, 'Obrat DAL': item.turnoverDal, 'Konečný Zostatok': item.closingBalance }));
  const kpis = useMemo(() => ({
    turnoverMd: filteredMonthlyDetails.reduce((sum, item) => sum + item.turnoverMd, 0),
    turnoverDal: filteredMonthlyDetails.reduce((sum, item) => sum + item.turnoverDal, 0),
  }), [filteredMonthlyDetails]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <Card className="p-8 text-center text-red-500">{error}</Card>;

  return (
    <div className="space-y-6">
      <Card><CardContent className="p-4"><ChartControls selectedMonths={selectedMonths} onMonthChange={setSelectedMonths} viewType="monthly" onViewTypeChange={() => {}} showViewTypeToggle={false}/></CardContent></Card>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1"><CardHeader><CardTitle>Účtovná Osnova</CardTitle></CardHeader><CardContent className="max-h-[800px] overflow-y-auto"><TreeView nodes={accountTree} onSelect={setSelectedAccount} selectedAccountId={selectedAccount?.accountNumber || null} /></CardContent></Card>
        <div className="lg:col-span-2 space-y-6">
          {selectedAccount ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><StatCard title="Č. Účtu" value={selectedAccount.accountNumber} /><StatCard title="Poč. Stav (Rok)" value={formatCurrency(selectedAccount.openingBalanceYear)} /><StatCard title="Obraty MD" value={formatCurrency(kpis.turnoverMd)} /><StatCard title="Obraty DAL" value={formatCurrency(kpis.turnoverDal)} /></div>
              <Card><CardHeader><CardTitle>Graf pre: {selectedAccount.accountName}</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><ComposedChart data={chartData}><CartesianGrid /><XAxis dataKey="name" /><YAxis yAxisId="left" tickFormatter={formatCurrency} /><YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Legend /><Bar yAxisId="left" dataKey="Obrat MD" fill="#16a34a" /><Bar yAxisId="left" dataKey="Obrat DAL" fill="#ef4444" /><Line yAxisId="right" type="monotone" dataKey="Konečný Zostatok" stroke="#3b82f6" /></ComposedChart></ResponsiveContainer></CardContent></Card>
              <Card><CardHeader><CardTitle>Tabuľka</CardTitle></CardHeader><CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="px-2 py-2">Mesiac</th><th className="px-2 py-2 text-right">Obrat MD</th><th className="px-2 py-2 text-right">Obrat DAL</th><th className="px-2 py-2 text-right">Konečný Stav</th></tr></thead>
                    <tbody>{filteredMonthlyDetails.map(m => (<tr key={m.month} className="border-b dark:border-gray-700"><th>{monthNamesFull[m.month - 1]}</th><td className="text-right">{formatCurrency(m.turnoverMd)}</td><td className="text-right">{formatCurrency(m.turnoverDal)}</td><td className="text-right">{formatCurrency(m.closingBalance)}</td></tr>))}</tbody>
                </table>
              </CardContent></Card>
            </>
          ) : <Card className="flex items-center justify-center h-full"><div className="text-center p-8">Vyberte účet z osnovy.</div></Card>}
        </div>
      </div>
    </div>
  );
}

// =================================================================================
// MANAGERIAL VIEW COMPONENT
// =================================================================================
function ManagerialView({ companyId }: { companyId: string }) {
    const [data, setData] = useState<ManagerialData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); setError(null);
            try {
                const functions = getFunctions();
                const getData = httpsCallable(functions, 'getManagerialData');
                const result = await getData({ companyId });
                setData(result.data as ManagerialData);
            } catch (err: any) {
                setError(err.message || 'Nepodarilo sa načítať dáta pre manažérsky pohľad.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [companyId]);
    
    if (loading) return <Skeleton className="h-96 w-full" />;
    if (error) return <Card className="p-8 text-center text-red-500">{error}</Card>;
    if (!data) return <Card className="p-8 text-center">Žiadne dáta na zobrazenie.</Card>;

    return (
        <Tabs defaultValue="pnl" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pnl">Výkaz Ziskov a Strát</TabsTrigger>
                <TabsTrigger value="balanceSheet">Súvaha</TabsTrigger>
            </TabsList>
            <TabsContent value="pnl">
                <PnlTab data={data.incomeStatement as any} />
            </TabsContent>
            <TabsContent value="balanceSheet">
                <BalanceSheetTab data={data.balanceSheet as any} />
            </TabsContent>
        </Tabs>
    );
}
