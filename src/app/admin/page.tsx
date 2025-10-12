import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building, Users, ArrowRight } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Prehľad</h1>
        <p className="text-text-muted">
          Vitajte v administrátorskom paneli. Tu môžete spravovať všetky dôležité aspekty aplikácie.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
                <div className="bg-brand/10 p-3 rounded-md">
                    <Building className="h-6 w-6 text-brand" />
                </div>
                <CardTitle className="text-xl">Spravovať Spoločnosti</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Pridávajte nové firmy, upravujte existujúce dáta a prideľujte prístupy k finančným dashboardom.
            </CardDescription>
            <Button asChild>
                <Link href="/admin/companies" className="flex items-center gap-2">
                    <span>Prejsť na Spoločnosti</span>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <div className="flex items-center gap-4">
                <div className="bg-brand/10 p-3 rounded-md">
                    <Users className="h-6 w-6 text-brand" />
                </div>
                <CardTitle className="text-xl">Spravovať Používateľov</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Spravujte používateľské účty, resetujte heslá a definujte role a povolenia pre prístup k dátam.
            </CardDescription>
            <Button asChild>
                <Link href="/admin/users" className="flex items-center gap-2">
                    <span>Prejsť na Používateľov</span>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
