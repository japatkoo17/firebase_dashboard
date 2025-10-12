'use client';

import React, { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ChartControls } from '@/components/ui/chart-controls';
import { mockAccountList, mockAccountDetails, monthNamesFull, monthNames } from '@/lib/data';
import { BookOpen, TrendingUp, TrendingDown, Scale } from 'lucide-react';

const formatCurrency = (value: number) => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(value);

export function AccountExplorerTab() {
  const [selectedAccount, setSelectedAccount] = useState(mockAccountList[0].ucet);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));

  const accountData = useMemo(() => {
    return mockAccountDetails[selectedAccount];
  }, [selectedAccount]);
  
  const handleAccountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccount(event.target.value);
  };

  const filteredMonthlyDetails = useMemo(() => {
    return accountData?.monthlyDetails.filter((item: any) => selectedMonths.includes(item.month)) || [];
  }, [accountData, selectedMonths]);

  const chartData = filteredMonthlyDetails.map((item: any) => ({
    name: monthNames[item.month - 1],
    'Obrat MD': item.turnoverMd,
    'Obrat DAL': item.turnoverDal,
    'Konečný Zostatok': item.closingBalance,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nastavenia Prieskumníka</CardTitle>
          <CardDescription>Vyberte účet a časové obdobie pre detailnú analýzu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <label className="block text-sm font-semibold mb-2">Výber Účtu</label>
                <select
                    value={selectedAccount}
                    onChange={handleAccountChange}
                    className="w-full max-w-xs p-2 border border-border rounded-md bg-bg-muted text-text"
                >
                    {mockAccountList.map(account => (
                    <option key={account.ucet} value={account.ucet}>
                        {account.ucet} - {account.nazev}
                    </option>
                    ))}
                </select>
            </div>
          <ChartControls
            selectedMonths={selectedMonths}
            onMonthChange={setSelectedMonths}
            viewType="monthly"
            onViewTypeChange={() => {}}
            showViewTypeToggle={false}
          />
        </CardContent>
      </Card>
      
      {accountData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Číslo Účtu" value={accountData.accountNumber} icon={<BookOpen className="h-4 w-4" />} />
            <StatCard title="Počiatočný Stav (Rok)" value={formatCurrency(accountData.openingBalanceYear)} icon={<Scale className="h-4 w-4" />} />
            <StatCard title="Obraty MD (zvolené)" value={formatCurrency(filteredMonthlyDetails.reduce((sum: number, item: any) => sum + item.turnoverMd, 0))} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard title="Obraty DAL (zvolené)" value={formatCurrency(filteredMonthlyDetails.reduce((sum: number, item: any) => sum + item.turnoverDal, 0))} icon={<TrendingDown className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Grafické Znázornenie</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-text-muted)" />
                    <YAxis yAxisId="left" stroke="var(--color-text-muted)" tickFormatter={formatCurrency} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--color-text-muted)" tickFormatter={formatCurrency} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'var(--color-bg-muted)', borderColor: 'var(--color-border)' }}
                    />
                    <Legend wrapperStyle={{ color: 'var(--color-text)' }} />
                    <Bar yAxisId="left" dataKey="Obrat MD" fill="#16a34a" />
                    <Bar yAxisId="left" dataKey="Obrat DAL" fill="#f97316" />
                    <Line yAxisId="right" type="monotone" dataKey="Konečný Zostatok" stroke="#3b82f6" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                  <CardTitle>Mesačný Prehľad v Tabuľke</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-bg-muted">
                          <tr>
                              <th scope="col" className="px-6 py-3">Mesiac</th>
                              <th scope="col" className="px-6 py-3 text-right">Obrat MD</th>
                              <th scope="col" className="px-6 py-3 text-right">Obrat DAL</th>
                              <th scope="col" className="px-6 py-3 text-right">Konečný Stav</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredMonthlyDetails.map((m: any) => (
                              <tr key={m.month} className="border-b border-border">
                                  <th scope="row" className="px-6 py-4 font-medium whitespace-nowrap">{monthNamesFull[m.month - 1]}</th>
                                  <td className="px-6 py-4 text-green-500 text-right">{formatCurrency(m.turnoverMd)}</td>
                                  <td className="px-6 py-4 text-red-500 text-right">{formatCurrency(m.turnoverDal)}</td>
                                  <td className="px-6 py-4 font-bold text-right">{formatCurrency(m.closingBalance)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
