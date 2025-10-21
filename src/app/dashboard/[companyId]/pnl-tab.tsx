'use client';

import React, { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ChartControls, ViewType } from '@/components/ui/chart-controls';
import { monthNames } from '@/lib/data';
import { TrendingUp, TrendingDown, DollarSign, Euro } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


// =================================================================================
// STEP 1: DEFINE DETAILED DATA STRUCTURES
// =================================================================================
// These interfaces now reflect the detailed data structure we get from the backend.
// Instead of just 'revenue', we now have a breakdown of all revenue and cost categories.

interface PnlMonthlyEntry {
  month: number;
  // --- AGGREGATES ---
  revenue_total: number;
  costs_total: number;
  profit_before_tax: number;
  profit_after_tax: number;
  // --- REVENUE DETAILS ---
  revenue_sales: number;
  revenue_stock_changes: number;
  revenue_activation: number;
  revenue_other_operating: number;
  revenue_financial: number;
  revenue_other: number;
  // --- COST DETAILS ---
  costs_consumed_purchases: number;
  costs_services: number;
  costs_personnel: number;
  costs_taxes_fees: number;
  costs_other_operating: number;
  costs_depreciation_impairment: number;
  costs_financial: number;
  costs_income_tax: number;
  costs_other: number;
}

// The main data prop type
interface PnlData {
  monthly: PnlMonthlyEntry[];
  // We will add a cumulative type later if needed for detailed drill-down
}

interface PnlTabProps {
  data: PnlData;
}


// =================================================================================
// HELPER FUNCTIONS & CONFIG
// =================================================================================

const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);

// Configuration for our drill-down accordions.
// This makes it easy to add or change categories in the future.
const REVENUE_CATEGORIES: { key: keyof PnlMonthlyEntry, label: string }[] = [
    { key: 'revenue_sales', label: 'Tržby z predaja' },
    { key: 'revenue_stock_changes', label: 'Zmena stavu zásob' },
    { key: 'revenue_activation', label: 'Aktivácia' },
    { key: 'revenue_other_operating', label: 'Ostatné prevádzkové výnosy' },
    { key: 'revenue_financial', label: 'Finančné výnosy' },
    { key: 'revenue_other', label: 'Ostatné (nedefinované) výnosy' },
];

const COST_CATEGORIES: { key: keyof PnlMonthlyEntry, label: string }[] = [
    { key: 'costs_consumed_purchases', label: 'Spotrebované nákupy' },
    { key: 'costs_services', label: 'Služby' },
    { key: 'costs_personnel', label: 'Osobné náklady' },
    { key: 'costs_taxes_fees', label: 'Dane a poplatky' },
    { key: 'costs_other_operating', label: 'Ostatné prevádzkové náklady' },
    { key: 'costs_depreciation_impairment', label: 'Odpisy a opravné položky' },
    { key: 'costs_financial', label: 'Finančné náklady' },
    { key: 'costs_income_tax', label: 'Daň z príjmov' },
    { key: 'costs_other', label: 'Ostatné (nedefinované) náklady' },
];


// =================================================================================
// MAIN COMPONENT
// =================================================================================

export function PnlTab({ data: companyData }: PnlTabProps) {
  // We'll keep the month and view type selection for the main chart
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));
  const [viewType, setViewType] = useState<ViewType>('monthly'); // For now, we focus on monthly

  // The useMemo hook is now even more important to recalculate the complex data structure
  const processedData = useMemo(() => {
    if (!companyData || !companyData.monthly) {
      // Return a default empty state
      const emptyKpis = { totalRevenue: 0, totalCosts: 0, totalProfit: 0, margin: 0 };
      const emptyDetails = { revenue: {}, costs: {} };
      return { kpis: emptyKpis, chartData: [], details: emptyDetails };
    }

    const filteredData = companyData.monthly.filter(d => selectedMonths.includes(d.month));

    if (selectedMonths.length === 0) {
      const emptyKpis = { totalRevenue: 0, totalCosts: 0, totalProfit: 0, margin: 0 };
      const emptyDetails = { revenue: {}, costs: {} };
      return { kpis: emptyKpis, chartData: [], details: emptyDetails };
    }

    // --- 1. Calculate KPIs (Key Performance Indicators) ---
    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue_total, 0);
    const totalCosts = filteredData.reduce((sum, item) => sum + item.costs_total, 0);
    const totalProfit = filteredData.reduce((sum, item) => sum + item.profit_after_tax, 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const kpis = { totalRevenue, totalCosts, totalProfit, margin };

    // --- 2. Prepare Data for the Main Chart ---
    const chartData = filteredData.map(item => ({
      name: monthNames[item.month - 1],
      Tržby: item.revenue_total,
      Náklady: item.costs_total,
      Zisk: item.profit_after_tax,
    }));
      
    // --- 3. Prepare Data for the Drill-Down Detail View ---
    const details = {
        revenue: REVENUE_CATEGORIES.reduce((acc, cat) => {
            acc[cat.label] = filteredData.reduce((sum, item) => sum + (item[cat.key] as number || 0), 0);
            return acc;
        }, {} as Record<string, number>),
        costs: COST_CATEGORIES.reduce((acc, cat) => {
            acc[cat.label] = filteredData.reduce((sum, item) => sum + (item[cat.key] as number || 0), 0);
            return acc;
        }, {} as Record<string, number>),
    };


    return { kpis, chartData, details };
  }, [companyData, selectedMonths, viewType]);

  const { kpis, chartData, details } = processedData;

  const renderDetailSection = (title: string, data: Record<string, number>) => (
    <div className="p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
        <h4 className="text-lg font-semibold mb-3">{title}</h4>
        <div className="space-y-2">
            {Object.entries(data)
                .filter(([, value]) => Math.abs(value) > 0.01) // Hide empty rows
                .map(([key, value]) => (
                <div key={key} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span>{key}</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{formatCurrency(value)}</span>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* --- KPI CARDS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tržby (zvolené obdobie)" value={formatCurrency(kpis.totalRevenue)} icon={<TrendingUp className="h-4 w-4" />}/>
        <StatCard title="Náklady (zvolené obdobie)" value={formatCurrency(kpis.totalCosts)} icon={<TrendingDown className="h-4 w-4" />}/>
        <StatCard title="Zisk po zdanení" value={formatCurrency(kpis.totalProfit)} icon={<Euro className="h-4 w-4" />} changeType={kpis.totalProfit >= 0 ? 'positive' : 'negative'}/>
        <StatCard title="Zisková Marža" value={`${kpis.margin.toFixed(2)}%`} icon={<DollarSign className="h-4 w-4" />} changeType={kpis.margin >= 0 ? 'positive' : 'negative'}/>
      </div>
      
      {/* --- MAIN CHART --- */}
      <Card>
        <CardHeader>
          <CardTitle>Mesačný Prehľad</CardTitle>
          <CardDescription>Zobrazený typ: <span className="font-semibold">{viewType === 'monthly' ? 'Mesačné hodnoty' : 'Kumulatívne hodnoty'}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <ChartControls selectedMonths={selectedMonths} onMonthChange={setSelectedMonths} viewType={viewType} onViewTypeChange={setViewType} showViewTypeToggle={true}/>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" />
              <YAxis stroke="var(--color-text-muted)" tickFormatter={formatCurrency} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-muted)', borderColor: 'var(--color-border)' }} formatter={(value: number) => formatCurrency(value)}/>
              <Legend wrapperStyle={{ color: 'var(--color-text)' }} />
              <Bar dataKey="Tržby" fill="#3b82f6" />
              <Bar dataKey="Náklady" fill="#9ca3af" />
              <Line type="monotone" dataKey="Zisk" stroke="#f97316" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
        
      {/* --- DRILL-DOWN SECTION --- */}
       <Card>
            <CardHeader>
                <CardTitle>Detailný Rozpad (za zvolené obdobie)</CardTitle>
                <CardDescription>Analyzujte štruktúru vašich výnosov a nákladov.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-xl font-bold text-green-600 dark:text-green-500">
                           <div className="flex justify-between w-full pr-4">
                                <span>Celkové Výnosy</span>
                                <span>{formatCurrency(kpis.totalRevenue)}</span>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {renderDetailSection('Štruktúra Výnosov', details.revenue)}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                         <AccordionTrigger className="text-xl font-bold text-red-600 dark:text-red-500">
                           <div className="flex justify-between w-full pr-4">
                                <span>Celkové Náklady</span>
                                <span>{formatCurrency(kpis.totalCosts)}</span>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {renderDetailSection('Štruktúra Nákladov', details.costs)}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
       </Card>
    </div>
  );
}
