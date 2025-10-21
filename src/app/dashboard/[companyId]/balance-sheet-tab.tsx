'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ChartControls } from '@/components/ui/chart-controls';
import { monthNames, monthNamesFull } from '@/lib/data';
import { Landmark, PiggyBank, HandCoins, Building } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';

// This is the data structure we now expect from props (pre-processed on the server)
interface BalanceSheetMonthlyEntry {
    month: number;
    assets: number;
    liabilities_and_equity: number;
    equity_total: number;
    liabilities_total: number;
    financial_cash: number;
    financial_bank: number;
    [key: string]: any;
}

interface BalanceSheetData {
  monthly: BalanceSheetMonthlyEntry[];
}

interface BalanceSheetTabProps {
  data: BalanceSheetData;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);

// Configuration for the detail sections
const ASSETS_STRUCTURE = [
    { 
        group: 'Dlhodobý majetok', 
        totalKey: 'fixed_assets_total',
        categories: [
            { key: 'fixed_assets_intangible', label: 'Nehmotný majetok' },
            { key: 'fixed_assets_tangible_depreciated', label: 'Hmotný majetok - odpisovaný' },
            { key: 'fixed_assets_tangible_non_depreciated', label: 'Hmotný majetok - neodpisovaný' },
            { key: 'fixed_assets_in_progress', label: 'Obstaranie dlhodobého majetku' },
            { key: 'fixed_assets_advances', label: 'Poskytnuté preddavky' },
            { key: 'fixed_assets_financial', label: 'Finančný majetok' },
        ] 
    },
    {
        group: 'Obežný majetok',
        totalKey: 'current_assets_total',
        categories: [
            { key: 'inventory_total', label: 'Zásoby' },
            { key: 'receivables_total', label: 'Pohľadávky' },
            { key: 'financial_assets_total', label: 'Finančný majetok' },
        ]
    },
    {
        group: 'Časové rozlíšenie',
        totalKey: 'accruals_assets',
        categories: []
    }
];

const LIABILITIES_EQUITY_STRUCTURE = [
    {
        group: 'Vlastné imanie',
        totalKey: 'equity_total',
        categories: []
    },
    {
        group: 'Dlhodobé záväzky',
        totalKey: 'liabilities_long_term_total',
        categories: [
            { key: 'liabilities_reserves', label: 'Rezervy' },
            { key: 'liabilities_bank_loans_long_term', label: 'Bankové úvery' },
            { key: 'liabilities_other_long_term', label: 'Ostatné dlhodobé záväzky' },
            { key: 'liabilities_deferred_tax', label: 'Odložená daň' },
        ]
    },
    {
        group: 'Krátkodobé záväzky',
        totalKey: 'liabilities_short_term_total',
        categories: [
             { key: 'liabilities_trade', label: 'Záväzky z obch. styku' },
             { key: 'liabilities_employees_social', label: 'Záväzky voči zamestnancom a inštitúciám' },
             { key: 'liabilities_state_taxes', label: 'Daňové záväzky' },
             { key: 'liabilities_partners', label: 'Záväzky voči spoločníkom' },
             { key: 'liabilities_other', label: 'Ostatné záväzky' },
             { key: 'liabilities_bank_loans_short_term', label: 'Bankové úvery' },
        ]
    },
     {
        group: 'Časové rozlíšenie',
        totalKey: 'accruals_liabilities',
        categories: []
    }
];

export function BalanceSheetTab({ data: companyData }: BalanceSheetTabProps) {
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));

  const processedData = useMemo(() => {
    if (!companyData?.monthly) {
        return { latestData: {}, cashTrendData: [], details: { assets: [], liabilities_equity: [] }, lastSelectedMonthName: 'N/A' };
    }
    
    const lastSelectedMonth = selectedMonths.length > 0 ? Math.max(...selectedMonths) : 12;
    const lastSelectedMonthName = monthNamesFull[lastSelectedMonth - 1] || 'Neznámy';
    const latestData = companyData.monthly.find(d => d.month === lastSelectedMonth) || companyData.monthly[companyData.monthly.length - 1];

    const cashTrendData = companyData.monthly
      .filter(item => item.month === 0 || selectedMonths.includes(item.month))
      .map(item => ({
        name: item.month === 0 ? 'Zač.' : monthNames[item.month - 1],
        Hotovosť: (item.financial_cash || 0) + (item.financial_bank || 0),
      }));
      
    const details = {
        assets: ASSETS_STRUCTURE.map(group => ({
            ...group,
            totalValue: latestData[group.totalKey],
            categories: group.categories.map(cat => ({...cat, value: latestData[cat.key]}))
        })),
        liabilities_equity: LIABILITIES_EQUITY_STRUCTURE.map(group => ({
            ...group,
            totalValue: latestData[group.totalKey],
            categories: group.categories.map(cat => ({...cat, value: latestData[cat.key]}))
        }))
    };

    return { latestData, cashTrendData, details, lastSelectedMonthName };
  }, [companyData, selectedMonths]);

  if (!companyData) {
      return <Skeleton className="w-full h-[80vh]" />;
  }
  
  const { latestData, cashTrendData, details, lastSelectedMonthName } = processedData;

  const renderDetailSection = (data: typeof details.assets) => (
    <div className="space-y-4">
        {data.map(group => (
            <div key={group.group} className="p-4 border rounded-lg bg-gray-50/50">
                <h4 className="text-lg font-semibold mb-3 flex justify-between">
                    <span>{group.group}</span>
                    <span>{formatCurrency(group.totalValue)}</span>
                </h4>
                {group.categories.length > 0 && (
                    <div className="space-y-2 pl-4 border-l-2">
                        {group.categories
                            .filter(cat => Math.abs(cat.value) > 0.01)
                            .map(cat => (
                            <div key={cat.key} className="flex justify-between items-center text-sm p-2 rounded-md">
                                <span>{cat.label}</span>
                                <span className="font-mono">{formatCurrency(cat.value)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <CardTitle>Prehľad Súvahy</CardTitle>
            <CardDescription>Údaje ku koncu mesiaca: <span className="font-semibold">{lastSelectedMonthName}</span></CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Celkové Aktíva" value={formatCurrency(latestData.assets)} icon={<Building />} />
                <StatCard title="Záväzky" value={formatCurrency(latestData.liabilities_total)} icon={<HandCoins />} />
                <StatCard title="Vlastné Imanie" value={formatCurrency(latestData.equity_total)} icon={<Landmark />} />
                <StatCard title="Peniaze" value={formatCurrency((latestData.financial_cash || 0) + (latestData.financial_bank || 0))} icon={<PiggyBank />} />
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Vývoj Peňažných Prostriedkov</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <ChartControls selectedMonths={selectedMonths} onMonthChange={setSelectedMonths} viewType="monthly" onViewTypeChange={()=>{}} showViewTypeToggle={false}/>
            <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatCurrency}/>
                <Tooltip formatter={(value: number) => formatCurrency(value)}/>
                <Legend />
                <Line type="monotone" dataKey="Hotovosť" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
       <Card>
            <CardHeader>
                <CardTitle>Detailný Rozpad Súvahy (k {lastSelectedMonthName})</CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-xl font-bold text-blue-600">
                           <div className="flex justify-between w-full pr-4"><span>Celkové Aktíva</span><span>{formatCurrency(latestData.assets)}</span></div>
                        </AccordionTrigger>
                        <AccordionContent>{renderDetailSection(details.assets)}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                         <AccordionTrigger className="text-xl font-bold text-orange-600">
                           <div className="flex justify-between w-full pr-4"><span>Vlastné Imanie a Záväzky</span><span>{formatCurrency(latestData.liabilities_and_equity)}</span></div>
                         </AccordionTrigger>
                         <AccordionContent>{renderDetailSection(details.liabilities_equity)}</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
       </Card>
    </div>
  );
}
