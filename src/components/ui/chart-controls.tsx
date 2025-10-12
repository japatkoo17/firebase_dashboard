'use client';

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { monthNamesFull } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Settings2 } from 'lucide-react';

export type ViewType = 'monthly' | 'cumulative';

interface ChartControlsProps {
  selectedMonths: number[];
  onMonthChange: (months: number[]) => void;
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
  showViewTypeToggle?: boolean;
}

export function ChartControls({
  selectedMonths,
  onMonthChange,
  viewType,
  onViewTypeChange,
  showViewTypeToggle = false,
}: ChartControlsProps) {

  const handleMonthCheckboxChange = (monthIndex: number) => {
    const month = monthIndex + 1;
    if (selectedMonths.includes(month)) {
      onMonthChange(selectedMonths.filter(m => m !== month));
    } else {
      onMonthChange([...selectedMonths, month].sort((a, b) => a - b));
    }
  };

  const selectAll = () => onMonthChange(Array.from({ length: 12 }, (_, i) => i + 1));
  const deselectAll = () => onMonthChange([]);

  return (
    <Accordion type="single" collapsible className="w-full bg-bg-muted rounded-lg px-4">
      <AccordionItem value="controls">
        <AccordionTrigger>
            <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span>Možnosti Zobrazenia</span>
            </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pt-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">Výber Mesiacov</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {monthNamesFull.map((name, index) => (
                <label key={index} className="flex items-center space-x-2 text-sm font-normal">
                  <input
                    type="checkbox"
                    checked={selectedMonths.includes(index + 1)}
                    onChange={() => handleMonthCheckboxChange(index)}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-2 mt-4">
              <Button onClick={selectAll} className="text-xs h-8">Vybrať Všetko</Button>
              <Button onClick={deselectAll} className="text-xs h-8 bg-bg text-text hover:bg-border">Zrušiť Výber</Button>
            </div>
          </div>

          {showViewTypeToggle && (
            <div>
              <h4 className="font-semibold mb-2 text-sm">Typ Zobrazenia</h4>
               <div className="inline-flex bg-bg rounded-lg p-1">
                  <button
                      onClick={() => onViewTypeChange('monthly')}
                      className={cn(
                          'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                          viewType === 'monthly' ? 'bg-bg-muted shadow-sm' : 'text-text-muted'
                      )}
                  >
                      Mesačne
                  </button>
                  <button
                      onClick={() => onViewTypeChange('cumulative')}
                      className={cn(
                          'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                          viewType === 'cumulative' ? 'bg-bg-muted shadow-sm' : 'text-text-muted'
                      )}
                  >
                      Kumulatívne
                  </button>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
