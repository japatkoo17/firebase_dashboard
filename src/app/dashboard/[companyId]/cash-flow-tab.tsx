'use client';

import React from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Coins, ArrowUpRight, ArrowDownLeft, Banknote } from 'lucide-react';

// Define specific types for the data structures to avoid 'any'
interface MonthlyIncomeData {
  profit: number;
  depreciation: number;
}

interface MonthlyBalanceData {
  cash: number;
  receivables: number;
  payables: number;
  otherAssets: number;
  fixedAssets: number;
}

interface BalanceSheetData {
    monthly: MonthlyBalanceData[];
}
interface FinancialData {
  incomeStatement: {
    monthly: MonthlyIncomeData[];
  };
  balanceSheet: BalanceSheetData
}

interface CashFlowTabProps {
  data: FinancialData;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);

export function CashFlowTab({ data: financialData }: CashFlowTabProps) {
  
  if (!financialData?.incomeStatement?.monthly || !financialData?.balanceSheet?.monthly) {
    return <div className="text-center p-8 text-text-muted">Dáta pre Cash Flow neboli nájdené alebo sú nekompletné.</div>;
  }
  
  const incomeData = financialData.incomeStatement.monthly;
  const balanceData = financialData.balanceSheet.monthly;

  const startBalance = balanceData[0];
  const endBalance = balanceData[balanceData.length - 1];

  const openingCash = startBalance.cash;
  const closingCash = endBalance.cash;

  const periodProfit = incomeData.reduce((sum: number, d: MonthlyIncomeData) => sum + d.profit, 0);
  const periodDepreciation = incomeData.reduce((sum: number, d: MonthlyIncomeData) => sum + d.depreciation, 0);

  const changeInReceivables = -(endBalance.receivables - startBalance.receivables);
  const changeInPayables = endBalance.payables - startBalance.payables;
  const changeInOtherAssets = -(endBalance.otherAssets - startBalance.otherAssets);
  const changeInFixedAssets = -(endBalance.fixedAssets - startBalance.fixedAssets);
  
  const operatingCashFlow = periodProfit + periodDepreciation + changeInReceivables + changeInPayables + changeInOtherAssets;

  const waterfallData = [
    { name: 'Poč. stav', value: [0, openingCash], color: '#3b82f6' },
    { name: 'Zisk', value: periodProfit, color: '#16a34a' },
    { name: 'Odpisy', value: periodDepreciation, color: '#16a34a' },
    { name: 'Pohľadávky', value: changeInReceivables, color: changeInReceivables >= 0 ? '#16a34a' : '#f97316' },
    { name: 'Záväzky', value: changeInPayables, color: changeInPayables >= 0 ? '#16a34a' : '#f97316' },
    { name: 'Ostatné aktíva', value: changeInOtherAssets, color: changeInOtherAssets >= 0 ? '#16a34a' : '#f97316' },
    { name: 'Investície', value: changeInFixedAssets, color: '#f97316' },
    { name: 'Kon. stav', value: [0, closingCash], color: '#3b82f6' },
  ];

  let cumulative = 0;
  const processedWaterfallData = waterfallData.map((d, i) => {
    if (i === 0 || i === waterfallData.length - 1) {
      return { ...d, range: d.value };
    }
    const start = cumulative;
    cumulative += d.value as number;
    const end = cumulative;
    return { ...d, range: d.value >= 0 ? [start, end] : [end, start] };
  });

  return (
    <div className="space-y-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Počiatočná Hotovosť" value={formatCurrency(openingCash)} icon={<ArrowDownLeft className="h-4 w-4" />}/>
        <StatCard title="Konečná Hotovosť" value={formatCurrency(closingCash)} icon={<ArrowUpRight className="h-4 w-4" />}/>
        <StatCard title="Operating Cash Flow" value={formatCurrency(operatingCashFlow)} icon={<Coins className="h-4 w-4" />} changeType={operatingCashFlow >= 0 ? 'positive' : 'negative'}/>
        <StatCard title="Čistá Zmena" value={formatCurrency(closingCash - openingCash)} icon={<Banknote className="h-4 w-4" />} changeType={closingCash - openingCash >= 0 ? 'positive' : 'negative'}/>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Vodopádový Graf</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={processedWaterfallData} margin={{ top: 20, right: 20, bottom: 20, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" />
              <YAxis tickFormatter={formatCurrency} stroke="var(--color-text-muted)" />
              <Tooltip
                formatter={(value: number | [number, number]) => {
                    if (Array.isArray(value)) return formatCurrency(value[1] - value[0]);
                    return formatCurrency(value);
                }}
                contentStyle={{ backgroundColor: 'var(--color-bg-muted)', borderColor: 'var(--color-border)' }}
              />
              <Bar dataKey="range">
                {processedWaterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
