'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Loader2 } from 'lucide-react';
import withAuth from '@/lib/with-auth';

interface CompanyForDisplay {
  id: string;
  name: string;
  ico: string;
  currency: string;
  accountingStandard: string;
}

function CompaniesPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth(); // Get user and isAdmin status

  const [companies, setCompanies] = useState<CompanyForDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchCompanies = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let companiesQuery;
        if (isAdmin) {
          // Admin sees all companies
          companiesQuery = query(collection(db, 'companies'));
        } else {
          // Regular user sees only allowed companies
          const permissionsDocRef = doc(db, 'permissions', user.uid);
          const permissionsSnap = await getDoc(permissionsDocRef);

          if (!permissionsSnap.exists() || !permissionsSnap.data().allowedCompanies?.length) {
            setCompanies([]);
            setIsLoading(false);
            return;
          }
          const allowedCompanyIds = permissionsSnap.data().allowedCompanies as string[];
          companiesQuery = query(collection(db, 'companies'), where('__name__', 'in', allowedCompanyIds));
        }
        
        const companiesSnapshot = await getDocs(companiesQuery);
        const userCompanies = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          ico: doc.data().ico,
          currency: doc.data().currency,
          accountingStandard: doc.data().accountingStandard,
        } as CompanyForDisplay));

        setCompanies(userCompanies);

      } catch (err) {
        console.error("Error fetching companies:", err);
        setError("Nepodarilo sa načítať vaše spoločnosti. Skúste to prosím neskôr.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [user, isAdmin]);

  const handleCompanySelect = (companyId: string) => {
    router.push(`/dashboard/${companyId}`);
  };

  if (isLoading) {
      return (
        <main className="flex items-center justify-center min-h-screen bg-bg">
            <div className="flex items-center gap-2 text-text-muted">
                <Loader2 className="animate-spin h-6 w-6" />
                <span>Načítavam vaše spoločnosti...</span>
            </div>
        </main>
      );
  }

  return (
    <main className="min-h-screen bg-bg p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Vaše Spoločnosti
          </h1>
          <p className="text-text-muted mt-1">
            Vyberte si firmu, ktorej dáta chcete zobraziť.
          </p>
        </header>
        
        {error && <p className="text-red-500 bg-red-500/10 p-4 rounded-md">{error}</p>}
        
        {!isLoading && !error && companies.length === 0 && (
            <div className="text-center bg-bg-muted p-8 rounded-lg">
                <h3 className="text-xl font-semibold">Žiadne spoločnosti</h3>
                <p className="text-text-muted mt-2">
                    {isAdmin 
                        ? "V systéme zatiaľ nie sú žiadne spoločnosti. Pridajte ich v admin paneli."
                        : "Momentálne nemáte priradený prístup k žiadnej spoločnosti. Kontaktujte prosím administrátora."
                    }
                </p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies.map((company) => (
            <Card
              key={company.id}
              className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onClick={() => handleCompanySelect(company.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <Briefcase className="w-8 h-8 text-brand" />
                  <div>
                    <CardTitle className="text-xl">{company.name}</CardTitle>
                    <CardDescription>IČO: {company.ico}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-text-muted space-y-2">
                  <p><strong>Mena:</strong> {company.currency}</p>
                  <p><strong>Účtovný štandard:</strong> {company.accountingStandard}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

export default withAuth(CompaniesPage);
