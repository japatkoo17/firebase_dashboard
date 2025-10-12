import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative';
  description?: string;
}

export function StatCard({ title, value, icon, change, changeType, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-text-muted">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn(
            "text-xs text-text-muted",
            changeType === 'positive' && 'text-green-500',
            changeType === 'negative' && 'text-red-500'
          )}>
            {change}
          </p>
        )}
        {description && (
          <p className="text-xs text-text-muted mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
