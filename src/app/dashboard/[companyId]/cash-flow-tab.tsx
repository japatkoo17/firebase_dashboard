'use client';

import React, { useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Coins, ArrowUpRight, ArrowDownLeft, Banknote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Expected data structures from the pre-processed data
interface PnlData {
    monthly: { profit_before_tax: number; costs_depreciation_impairment: number; [key: string]: any; }[];
}

interface BalanceSheetData {
    monthly: { financial_cash: number; financial_bank: number; fixed_assets_total: number; [key: string]: any; }[];
}

interface CashFlowTabProps {
  data: {
      incomeStatement: PnlData;
      balanceSheet: BalanceSheetData;
  };
}

const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);
}

export function CashFlowTab({ data: financialData }: CashFlowTabProps) {

  const processedData = useMemo(() => {
    if (!financialData?.incomeStatement?.monthly || !financialData?.balanceSheet?.monthly || financialData.balanceSheet.monthly.length < 13) {
      return null;
    }
    
    const pnlData = financialData.incomeStatement.monthly;
    const balanceData = financialData.balanceSheet.monthly;

    const startBalance = balanceData[0]; 
    const endBalance = balanceData[12];

    const openingCash = (startBalance.financial_cash || 0) + (startBalance.financial_bank || 0);
    const closingCash = (endBalance.financial_cash || 0) + (endBalance.financial_bank || 0);

    const periodProfit = pnlData.reduce((sum, d) => sum + (d.profit_before_tax || 0), 0);
    const periodDepreciation = pnlData.reduce((sum, d) => sum + (d.costs_depreciation_impairment || 0), 0);

    const calculateChange = (keys: string[]) => {
        const startValue = keys.reduce((sum, key) => sum + (startBalance[key] || 0), 0);
        const endValue = keys.reduce((sum, key) => sum + (endBalance[key] || 0), 0);
        return endValue - startValue;
    };
    
    const changeInReceivables = -calculateChange(['receivables_trade', 'receivables_state_taxes', 'receivables_employees_social', 'receivables_partners', 'receivables_other']);
    const changeInPayables = calculateChange(['liabilities_trade', 'liabilities_state_taxes', 'liabilities_employees_social', 'liabilities_partners', 'liabilities_other']);
    const changeInInventory = -calculateChange(['inventory_total']);
    const changeInAccruals = -calculateChange(['accruals_assets']);
    const changeInFixedAssets = -(endBalance.fixed_assets_total - startBalance.fixed_assets_total);
      
    const operatingCashFlow = periodProfit + periodDepreciation + changeInReceivables + changeInPayables + changeInInventory + changeInAccruals;
    const investingCashFlow = changeInFixedAssets;
    
    const waterfallData = [
        { name: 'Poč. stav', value: [0, openingCash] },
        { name: 'Zisk', value: periodProfit },
        { name: 'Odpisy', value: periodDepreciation },
        { name: 'Pohľadávky', value: changeInReceivables },
        { name: 'Zásoby', value: changeInInventory },
        { name: 'Záväzky', value: changeInPayables },
        { name: 'Čas. rozl.', value: changeInAccruals },
        { name: 'Investície', value: investingCashFlow },
        { name: 'Kon. stav', value: [0, closingCash] },
    ];
      
    let cumulative = 0;
    const processedWaterfallData = waterfallData.map((d, i) => {
        const isStartOrEnd = i === 0 || i === waterfallData.length - 1;
        const value = isStartOrEnd ? (d.value as [number, number])[1] : d.value as number;
        let range: [number, number];
        let color: string;
        if (isStartOrEnd) {
            range = d.value as [number, number];
            color = '#3b82f6';
        } else {
            const start = cumulative;
            cumulative += value;
            range = value >= 0 ? [start, cumulative] : [cumulative, start];
            color = value >= 0 ? '#16a34a' : '#ef4444';
        }
        return { ...d, range, color, value: isStartOrEnd ? range[1] - range[0] : value };
    });

    return { openingCash, closingCash, operatingCashFlow, processedWaterfallData };

  }, [financialData]);

  if (!processedData) {
      return (
          <div className="space-y-6">
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
               <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-[400px]" /></CardContent></Card>
          </div>
      );
  }

  const { openingCash, closingCash, operatingCashFlow, processedWaterfallData } = processedData;

  return (
    <div className="space-y-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Počiatočná Hotovosť" value={formatCurrency(openingCash)} icon={<ArrowDownLeft />}/>
        <StatCard title="Konečná Hotovosť" value={formatCurrency(closingCash)} icon={<ArrowUpRight />}/>
        <StatCard title="Operating Cash Flow" value={formatCurrency(operatingCashFlow)} icon={<Coins />} changeType={operatingCashFlow >= 0 ? 'positive' : 'negative'}/>
        <StatCard title="Čistá Zmena" value={formatCurrency(closingCash - openingCash)} icon={<Banknote />} changeType={closingCash - openingCash >= 0 ? 'positive' : 'negative'}/>
      </div>
      <Card>
        <CardHeader><CardTitle>Cash Flow Vodopádový Graf</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={processedWaterfallData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number, name: string, props: any) => formatCurrency(props.payload.value) }/>
              <Bar dataKey="range" isAnimationActive={false}>
                {processedWaterfallData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
