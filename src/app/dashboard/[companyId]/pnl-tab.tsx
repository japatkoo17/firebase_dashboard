'use client';

import React, { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ChartControls, ViewType } from '@/components/ui/chart-controls';
import { monthNames } from '@/lib/data';
import { TrendingUp, TrendingDown, DollarSign, Euro } from 'lucide-react';

interface PnlTabProps {
  data: any; // Data is now passed from the parent page
}

const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);

export function PnlTab({ data: companyData }: PnlTabProps) {
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));
  const [viewType, setViewType] = useState<ViewType>('monthly');

  const processedData = useMemo(() => {
    if (!companyData) return { kpis: { totalRevenue: 0, totalCosts: 0, totalProfit: 0, margin: 0 }, chartData: [] };
    
    const sourceData = companyData[viewType];
    const filteredData = sourceData.filter((d: any) => selectedMonths.includes(d.month));

    if (selectedMonths.length === 0) {
      return {
        kpis: { totalRevenue: 0, totalCosts: 0, totalProfit: 0, margin: 0 },
        chartData: [],
      };
    }

    let kpis;
    if (viewType === 'monthly') {
      const totalRevenue = filteredData.reduce((sum: number, item: any) => sum + item.revenue, 0);
      const totalCosts = filteredData.reduce((sum: number, item: any) => sum + item.costs, 0);
      const totalProfit = totalRevenue - totalCosts;
      const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      kpis = { totalRevenue, totalCosts, totalProfit, margin };
    } else { // cumulative
      const lastMonthData = filteredData[filteredData.length - 1] || { revenue: 0, costs: 0, profit: 0 };
      const firstMonthData = sourceData[Math.min(...selectedMonths) - 2] || { revenue: 0, costs: 0, profit: 0 };
      const totalRevenue = lastMonthData.revenue - firstMonthData.revenue;
      const totalCosts = lastMonthData.costs - firstMonthData.costs;
      const totalProfit = totalRevenue - totalCosts;
      const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      kpis = { totalRevenue, totalCosts, totalProfit, margin };
    }

    const chartData = filteredData.map((item: any) => ({
      name: monthNames[item.month - 1],
      Tržby: item.revenue,
      Náklady: item.costs,
      Zisk: item.profit,
    }));

    return { kpis, chartData };
  }, [companyData, selectedMonths, viewType]);

  const { kpis, chartData } = processedData;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tržby (zvolené obdobie)" value={formatCurrency(kpis.totalRevenue)} icon={<TrendingUp className="h-4 w-4" />}/>
        <StatCard title="Náklady (zvolené obdobie)" value={formatCurrency(kpis.totalCosts)} icon={<TrendingDown className="h-4 w-4" />}/>
        <StatCard title="Zisk (zvolené obdobie)" value={formatCurrency(kpis.totalProfit)} icon={<Euro className="h-4 w-4" />} changeType={kpis.totalProfit >= 0 ? 'positive' : 'negative'}/>
        <StatCard title="Zisková Marža" value={`${kpis.margin.toFixed(2)}%`} icon={<DollarSign className="h-4 w-4" />} changeType={kpis.margin >= 0 ? 'positive' : 'negative'}/>
      </div>
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
    </div>
  );
}
