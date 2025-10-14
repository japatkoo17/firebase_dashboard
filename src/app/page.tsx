'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithRedirect,
    User
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';

// A simple component for the Google icon
const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.319,44,30.023,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // This effect handles redirection for already logged-in users.
    if (!authLoading && user) {
      if (isAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/companies');
      }
    }
  }, [user, isAdmin, authLoading, router]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    // We don't need to handle the result here, onIdTokenChanged in AuthProvider will.
    await signInWithRedirect(auth, provider);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Force refresh of the ID token to get the latest claims
      await userCredential.user.getIdToken(true);
      // The useEffect hook will now have the correct isAdmin status and handle the redirect.
    } catch {
      setError("Nesprávny email alebo heslo. Skontrolujte svoje údaje a skúste to znova.");
      setIsSigningIn(false);
    }
  };

  // While auth state is loading or if a user is found (and redirect is imminent), show a loader.
  if (authLoading || user) {
    return (
        <main className="flex h-screen items-center justify-center bg-bg">
            <Loader2 className="animate-spin h-8 w-8 text-brand" />
        </main>
    );
  }

  // Only show the login form if auth is resolved and there's no user.
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="hidden bg-bg-muted lg:flex lg:flex-col items-center justify-center p-10 text-center">
        <div className="max-w-md">
            <TrendingUp className="h-16 w-16 mx-auto text-brand mb-6" />
            <h1 className="text-4xl font-bold text-text mb-4">
                Váš Partner pre Finančný Prehľad
            </h1>
            <p className="text-lg text-text-muted">
                Získajte okamžitý prístup k vizualizovaným finančným dátam vašej firmy. Naša platforma vám prináša jasnosť a kontrolu nad vašimi financiami.
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Vitajte späť</h1>
            <p className="text-balance text-text-muted">
              Prihláste sa pre prístup k vášmu dashboardu
            </p>
          </div>
          <div className="grid gap-4">
            <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.com" className="w-full px-3 py-2 border border-border rounded-md bg-bg-muted text-text focus:ring-brand focus:border-brand" required />
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <label htmlFor="password">Heslo</label>
                    </div>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 border border-border rounded-md bg-bg-muted text-text focus:ring-brand focus:border-brand" required />
                </div>
                {error && <p className="text-sm text-red-500 text-center bg-red-500/10 p-3 rounded-md">{error}</p>}
                <Button type="submit" className="w-full flex items-center gap-2" disabled={isSigningIn}>
                    {isSigningIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    <span>{isSigningIn ? 'Overujem...' : 'Prihlásiť sa'}</span>
                </Button>
            </form>
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-text-muted">Alebo</span></div>
            </div>
            <Button variant="outline" className="w-full flex items-center gap-3" onClick={handleGoogleSignIn} disabled={isSigningIn}>
                <GoogleIcon />
                Prihlásiť sa cez Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
