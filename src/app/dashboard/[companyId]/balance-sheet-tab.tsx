'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ChartControls } from '@/components/ui/chart-controls';
import { monthNames, monthNamesFull } from '@/lib/data';
import { Landmark, PiggyBank, HandCoins, Building } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// =================================================================================
// STEP 1: DEFINE DETAILED DATA STRUCTURES
// =================================================================================
// This mirrors the detailed structure from ACCOUNT_GROUPS in sync-logic.js

interface BalanceSheetMonthlyEntry {
    month: number;
    // --- MAIN AGGREGATES ---
    assets: number;
    liabilities_and_equity: number;
    equity_total: number;
    liabilities_total: number;

    // --- ASSETS BREAKDOWN ---
    fixed_assets_total: number;
    fixed_assets_intangible: number;
    fixed_assets_tangible_depreciated: number;
    fixed_assets_tangible_non_depreciated: number;
    fixed_assets_in_progress: number;
    fixed_assets_advances: number;
    fixed_assets_financial: number;

    current_assets_total: number;
    inventory_total: number;
    inventory_material: number;
    inventory_own_production: number;
    inventory_goods: number;
    
    receivables_total: number;
    receivables_trade: number;
    receivables_employees_social: number;
    receivables_state_taxes: number;
    receivables_state_subsidies: number;
    receivables_partners: number;
    receivables_other: number;

    financial_assets_total: number;
    financial_cash: number;
    financial_bank: number;
    financial_short_term_assets: number;
    financial_transfers: number;

    accruals_assets: number;

    // --- LIABILITIES & EQUITY BREAKDOWN ---
    liabilities_long_term_total: number;
    liabilities_reserves: number;
    liabilities_bank_loans_long_term: number;
    liabilities_other_long_term: number;
    liabilities_deferred_tax: number;

    liabilities_short_term_total: number;
    liabilities_trade: number;
    liabilities_employees_social: number;
    liabilities_state_taxes: number;
    liabilities_state_subsidies: number;
    liabilities_partners: number;
    liabilities_other: number;
    liabilities_bank_loans_short_term: number;

    accruals_liabilities: number;

    // --- CORRECTIONS (usually negative) ---
    corrections_total: number;
    corrections_depreciation_intangible: number;
    corrections_depreciation_tangible: number;
    corrections_impairment_fixed: number;
    corrections_impairment_inventory: number;
    corrections_impairment_financial_short_term: number;
    corrections_impairment_receivables: number;
}

interface BalanceSheetData {
  monthly: BalanceSheetMonthlyEntry[];
}

interface BalanceSheetTabProps {
  data: BalanceSheetData;
}

// =================================================================================
// HELPER FUNCTIONS & CONFIG
// =================================================================================

const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);

// Configuration for our drill-down accordions
type BalanceSheetCategory = { key: keyof BalanceSheetMonthlyEntry, label: string };

const ASSETS_STRUCTURE: { group: string; totalKey: keyof BalanceSheetMonthlyEntry; categories: BalanceSheetCategory[] }[] = [
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

const LIABILITIES_EQUITY_STRUCTURE: { group: string; totalKey: keyof BalanceSheetMonthlyEntry; categories: BalanceSheetCategory[] }[] = [
    {
        group: 'Vlastné imanie',
        totalKey: 'equity_total',
        categories: [] // Assuming equity is a single value for now
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


// =================================================================================
// MAIN COMPONENT
// =================================================================================

export function BalanceSheetTab({ data: companyData }: BalanceSheetTabProps) {
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));

  const processedData = useMemo(() => {
    if (!companyData?.monthly) {
         const emptyData = { assets: 0, liabilities_and_equity: 0, equity_total: 0, liabilities_total: 0, financial_cash: 0, financial_bank: 0 };
         return { latestData: emptyData, cashTrendData: [], details: { assets: [], liabilities_equity: [] }, lastSelectedMonthName: 'N/A' };
    }
    
    if (selectedMonths.length === 0) {
        const emptyData = { assets: 0, liabilities_and_equity: 0, equity_total: 0, liabilities_total: 0, financial_cash: 0, financial_bank: 0 };
        return { latestData: emptyData, cashTrendData: [], details: { assets: [], liabilities_equity: [] }, lastSelectedMonthName: 'N/A' };
    }

    const lastSelectedMonth = Math.max(...selectedMonths);
    const lastSelectedMonthName = monthNamesFull[lastSelectedMonth - 1] || 'Neznámy';
    const latestData = companyData.monthly.find(d => d.month === lastSelectedMonth) || companyData.monthly[companyData.monthly.length - 1];

    const cashTrendData = companyData.monthly
      .filter(item => item.month === 0 || selectedMonths.includes(item.month))
      .map(item => ({
        name: item.month === 0 ? 'Zač.' : monthNames[item.month - 1],
        Hotovosť: item.financial_cash + item.financial_bank, // Cash is now cash + bank
      }));
      
    // --- Prepare Data for the Drill-Down Detail View ---
    const details = {
        assets: ASSETS_STRUCTURE.map(group => ({
            ...group,
            totalValue: latestData[group.totalKey] as number,
            categories: group.categories.map(cat => ({
                ...cat,
                value: latestData[cat.key] as number
            }))
        })),
        liabilities_equity: LIABILITIES_EQUITY_STRUCTURE.map(group => ({
            ...group,
            totalValue: latestData[group.totalKey] as number,
            categories: group.categories.map(cat => ({
                ...cat,
                value: latestData[cat.key] as number
            }))
        }))
    };

    return { latestData, cashTrendData, details, lastSelectedMonthName };
  }, [companyData, selectedMonths]);

  const { latestData, cashTrendData, details, lastSelectedMonthName } = processedData;

  const renderDetailSection = (data: typeof details.assets) => (
    <div className="space-y-4">
        {data.map(group => (
            <div key={group.group} className="p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
                <h4 className="text-lg font-semibold mb-3 flex justify-between">
                    <span>{group.group}</span>
                    <span>{formatCurrency(group.totalValue)}</span>
                </h4>
                {group.categories.length > 0 && (
                    <div className="space-y-2 pl-4 border-l-2">
                        {group.categories
                            .filter(cat => Math.abs(cat.value) > 0.01)
                            .map(cat => (
                            <div key={cat.key} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                                <span>{cat.label}</span>
                                <span className="font-mono text-gray-700 dark:text-gray-300">{formatCurrency(cat.value)}</span>
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
            <CardDescription>
                Údaje zobrazené ku koncu mesiaca: <span className="font-semibold">{lastSelectedMonthName}</span>
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Celkové Aktíva" value={formatCurrency(latestData.assets)} icon={<Building className="h-4 w-4" />} />
                <StatCard title="Záväzky" value={formatCurrency(latestData.liabilities_total)} icon={<HandCoins className="h-4 w-4" />} />
                <StatCard title="Vlastné Imanie" value={formatCurrency(latestData.equity_total)} icon={<Landmark className="h-4 w-4" />} />
                <StatCard title="Peniaze (banka+pokl.)" value={formatCurrency(latestData.financial_cash + latestData.financial_bank)} icon={<PiggyBank className="h-4 w-4" />} />
            </div>
        </CardContent>
      </Card>

        <Card>
            <CardHeader><CardTitle>Vývoj Peňažných Prostriedkov</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <ChartControls
                    selectedMonths={selectedMonths}
                    onMonthChange={setSelectedMonths}
                    viewType="monthly" 
                    onViewTypeChange={() => {}} 
                    showViewTypeToggle={false}
                />
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cashTrendData} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-text-muted)" />
                    <YAxis stroke="var(--color-text-muted)" tickFormatter={formatCurrency}/>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--color-bg-muted)', borderColor: 'var(--color-border)' }}/>
                    <Legend wrapperStyle={{ color: 'var(--color-text)' }} />
                    <Line type="monotone" dataKey="Hotovosť" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

      {/* --- DRILL-DOWN SECTION --- */}
       <Card>
            <CardHeader>
                <CardTitle>Detailný Rozpad Súvahy (k {lastSelectedMonthName})</CardTitle>
                <CardDescription>Analyzujte štruktúru vašich aktív a pasív.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-xl font-bold text-blue-600 dark:text-blue-500">
                           <div className="flex justify-between w-full pr-4">
                                <span>Celkové Aktíva</span>
                                <span>{formatCurrency(latestData.assets)}</span>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {renderDetailSection(details.assets)}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                         <AccordionTrigger className="text-xl font-bold text-orange-600 dark:text-orange-500">
                           <div className="flex justify-between w-full pr-4">
                                <span>Vlastné Imanie a Záväzky</span>
                                <span>{formatCurrency(latestData.liabilities_and_equity)}</span>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {renderDetailSection(details.liabilities_equity)}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
       </Card>
    </div>
  );
}
