'use client';

import React, { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ChartControls, ViewType } from '@/components/ui/chart-controls';
import { monthNames } from '@/lib/data';
import { TrendingUp, TrendingDown, DollarSign, Euro } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';

// This is the data structure we now expect from props (pre-processed on the server)
interface PnlMonthlyEntry {
  month: number;
  revenue_total: number;
  costs_total: number;
  profit_after_tax: number;
  [key: string]: any;
}

interface PnlData {
  monthly: PnlMonthlyEntry[];
}

interface PnlTabProps {
  data: PnlData;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);

// Configuration for the detail sections
const REVENUE_CATEGORIES = [
    { key: 'revenue_sales', label: 'Tržby z predaja' },
    { key: 'revenue_stock_changes', label: 'Zmena stavu zásob' },
    { key: 'revenue_activation', label: 'Aktivácia' },
    { key: 'revenue_other_operating', label: 'Ostatné prevádzkové výnosy' },
    { key: 'revenue_financial', label: 'Finančné výnosy' },
    { key: 'revenue_other', label: 'Ostatné (nedefinované) výnosy' },
];

const COST_CATEGORIES = [
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


export function PnlTab({ data: companyData }: PnlTabProps) {
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));
  const [viewType, setViewType] = useState<ViewType>('monthly');

  const processedData = useMemo(() => {
    // If there's no data, return an empty state.
    if (!companyData || !companyData.monthly) {
      return { kpis: { totalRevenue: 0, totalCosts: 0, totalProfit: 0, margin: 0 }, chartData: [], details: { revenue: {}, costs: {} } };
    }

    const filteredData = companyData.monthly.filter(d => selectedMonths.includes(d.month));

    if (filteredData.length === 0) {
      return { kpis: { totalRevenue: 0, totalCosts: 0, totalProfit: 0, margin: 0 }, chartData: [], details: { revenue: {}, costs: {} } };
    }

    let displayData = filteredData;
    if (viewType === 'cumulative') {
        let cumulativeRevenue = 0, cumulativeCosts = 0, cumulativeProfit = 0;
        displayData = filteredData.map(item => {
            cumulativeRevenue += item.revenue_total;
            cumulativeCosts += item.costs_total;
            cumulativeProfit += item.profit_after_tax;
            return { ...item, revenue_total: cumulativeRevenue, costs_total: cumulativeCosts, profit_after_tax: cumulativeProfit };
        });
    }

    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue_total, 0);
    const totalCosts = filteredData.reduce((sum, item) => sum + item.costs_total, 0);
    const totalProfit = filteredData.reduce((sum, item) => sum + item.profit_after_tax, 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const kpis = { totalRevenue, totalCosts, totalProfit, margin };

    const chartData = displayData.map(item => ({
      name: monthNames[item.month - 1],
      Tržby: item.revenue_total,
      Náklady: item.costs_total,
      Zisk: item.profit_after_tax,
    }));
      
    const details = {
        revenue: REVENUE_CATEGORIES.reduce((acc, cat) => {
            acc[cat.label] = filteredData.reduce((sum, item) => sum + (item[cat.key] || 0), 0);
            return acc;
        }, {} as Record<string, number>),
        costs: COST_CATEGORIES.reduce((acc, cat) => {
            acc[cat.label] = filteredData.reduce((sum, item) => sum + (item[cat.key] || 0), 0);
            return acc;
        }, {} as Record<string, number>),
    };

    return { kpis, chartData, details };
  }, [companyData, selectedMonths, viewType]);

  if (!companyData) {
      return <Skeleton className="w-full h-[80vh]" />;
  }

  const { kpis, chartData, details } = processedData;

  const renderDetailSection = (data: Record<string, number>) => (
    <div className="p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
        <div className="space-y-2">
            {Object.entries(data)
                .filter(([, value]) => Math.abs(value) > 0.01)
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tržby" value={formatCurrency(kpis.totalRevenue)} icon={<TrendingUp />} />
        <StatCard title="Náklady" value={formatCurrency(kpis.totalCosts)} icon={<TrendingDown />} />
        <StatCard title="Zisk po zdanení" value={formatCurrency(kpis.totalProfit)} icon={<Euro />} changeType={kpis.totalProfit >= 0 ? 'positive' : 'negative'}/>
        <StatCard title="Zisková Marža" value={`${kpis.margin.toFixed(2)}%`} icon={<DollarSign />} changeType={kpis.margin >= 0 ? 'positive' : 'negative'}/>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Mesačný Prehľad</CardTitle>
          <CardDescription>Zobrazený typ: <span className="font-semibold">{viewType === 'monthly' ? 'Mesačné hodnoty' : 'Kumulatívne hodnoty'}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <ChartControls selectedMonths={selectedMonths} onMonthChange={setSelectedMonths} viewType={viewType} onViewTypeChange={setViewType} showViewTypeToggle={true}/>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(value)}/>
              <Legend/>
              <Bar dataKey="Tržby" fill="#3b82f6" />
              <Bar dataKey="Náklady" fill="#9ca3af" />
              <Line type="monotone" dataKey="Zisk" stroke="#f97316" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
        
       <Card>
            <CardHeader>
                <CardTitle>Detailný Rozpad (za zvolené obdobie)</CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-xl font-bold text-green-600">
                           <div className="flex justify-between w-full pr-4"><span>Celkové Výnosy</span><span>{formatCurrency(kpis.totalRevenue)}</span></div>
                        </AccordionTrigger>
                        <AccordionContent>{renderDetailSection(details.revenue)}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                         <AccordionTrigger className="text-xl font-bold text-red-600">
                           <div className="flex justify-between w-full pr-4"><span>Celkové Náklady</span><span>{formatCurrency(kpis.totalCosts)}</span></div>
                        </AccordionTrigger>
                        <AccordionContent>{renderDetailSection(details.costs)}</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
       </Card>
    </div>
  );
}
