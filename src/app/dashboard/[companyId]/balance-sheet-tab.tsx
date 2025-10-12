'use client';

import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ChartControls } from '@/components/ui/chart-controls';
import { monthNames, monthNamesFull } from '@/lib/data';
import { Landmark, PiggyBank, HandCoins, Building } from 'lucide-react';

interface BalanceSheetTabProps {
  data: any; // Data is now passed from the parent page
}

const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);

const COLORS = ['#3b82f6', '#16a34a', '#f97316', '#9ca3af'];

export function BalanceSheetTab({ data: companyData }: BalanceSheetTabProps) {
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));

  const processedData = useMemo(() => {
    if (!companyData?.monthly) return null;

    if (selectedMonths.length === 0) {
      const emptyData = { assets: 0, liabilities: 0, equity: 0, cash: 0, fixedAssets: 0, receivables: 0, payables: 0, otherAssets: 0, otherLiabilities: 0 };
      return {
        latestData: emptyData,
        assetsData: [],
        liabilitiesData: [],
        cashTrendData: [],
        lastSelectedMonthName: 'N/A',
      };
    }
    
    const lastSelectedMonth = Math.max(...selectedMonths);
    const lastSelectedMonthName = monthNamesFull[lastSelectedMonth - 1];
    const latestData = companyData.monthly.find((d:any) => d.month === lastSelectedMonth) || companyData.monthly[companyData.monthly.length - 1];

    const assetsData = [
      { name: 'Dlhodobý majetok', value: latestData.fixedAssets },
      { name: 'Pohľadávky', value: latestData.receivables },
      { name: 'Hotovosť', value: latestData.cash },
      { name: 'Ostatné aktíva', value: latestData.otherAssets },
    ].filter(d => d.value > 0);

    const liabilitiesData = [
      { name: 'Vlastné imanie', value: latestData.equity },
      { name: 'Záväzky', value: latestData.payables },
      { name: 'Ostatné pasíva', value: latestData.otherLiabilities },
    ].filter(d => d.value > 0);

    const cashTrendData = companyData.monthly
      .filter((item: any) => item.month === 0 || selectedMonths.includes(item.month))
      .map((item: any) => ({
        name: item.month === 0 ? 'Zač.' : monthNames[item.month - 1],
        Hotovosť: item.cash,
      }));
      
    return { latestData, assetsData, liabilitiesData, cashTrendData, lastSelectedMonthName };

  }, [companyData, selectedMonths]);


  if (!processedData) {
    return <div className="text-center p-8 text-text-muted">Dáta pre súvahu neboli nájdené.</div>;
  }

  const { latestData, assetsData, liabilitiesData, cashTrendData, lastSelectedMonthName } = processedData;

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
                <StatCard title="Záväzky" value={formatCurrency(latestData.liabilities)} icon={<HandCoins className="h-4 w-4" />} />
                <StatCard title="Vlastné Imanie" value={formatCurrency(latestData.equity)} icon={<Landmark className="h-4 w-4" />} />
                <StatCard title="Hotovosť" value={formatCurrency(latestData.cash)} icon={<PiggyBank className="h-4 w-4" />} />
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
            <Card>
                <CardHeader><CardTitle>Vývoj Hotovosti</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <ChartControls
                        selectedMonths={selectedMonths}
                        onMonthChange={setSelectedMonths}
                        viewType="monthly" 
                        onViewTypeChange={() => {}} 
                        showViewTypeToggle={false}
                    />
                    <ResponsiveContainer width="100%" height={350}>
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
        </div>
        <div className="lg:col-span-2 space-y-6">
             <Card>
                <CardHeader><CardTitle>Štruktúra Aktív</CardTitle></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                    <Pie data={assetsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} >
                        {assetsData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--color-bg-muted)', borderColor: 'var(--color-border)' }}/>
                    <Legend wrapperStyle={{ color: 'var(--color-text)' }} />
                    </PieChart>
                </ResponsiveContainer></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Štruktúra Pasív</CardTitle></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                    <Pie data={liabilitiesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false}>
                        {liabilitiesData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--color-bg-muted)', borderColor: 'var(--color-border)' }}/>
                    <Legend wrapperStyle={{ color: 'var(--color-text)' }} />
                    </PieChart>
                </ResponsiveContainer></CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
