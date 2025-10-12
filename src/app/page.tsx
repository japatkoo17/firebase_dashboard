'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithRedirect,
    getRedirectResult 
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// A simple component for the Google icon
const GoogleIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.319,44,30.023,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true to handle redirect

  // Handle the result of the redirect
  useEffect(() => {
    const processRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User has successfully signed in
          const user = result.user;
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName,
              role: 'viewer',
            });
          }
          router.push('/companies');
        } else {
          // No redirect result, so it's a normal page load
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Redirect Sign-In Error:", err);
        setError("Prihlásenie cez Google zlyhalo. Skúste to znova.");
        setLoading(false);
      }
    };

    processRedirectResult();
  }, [router]);


  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    // Start the redirect process
    await signInWithRedirect(auth, provider);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/companies');
    } catch (err: any) {
      setError("Nesprávny email alebo heslo.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
        <main className="flex h-screen items-center justify-center gap-2 text-text-muted">
            <Loader2 className="animate-spin h-6 w-6" />
            <span>Overujem prihlásenie...</span>
        </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-bg">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Vitajte!</CardTitle>
          <CardDescription>Prihláste sa pre prístup k vášmu dashboardu.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button variant="outline" className="w-full flex items-center gap-2" onClick={handleGoogleSignIn} disabled={loading}>
                <GoogleIcon />
                <span>Prihlásiť sa cez Google</span>
            </Button>
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-bg px-2 text-text-muted">Alebo pokračujte s emailom</span></div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-text">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.com" className="w-full px-3 py-2 border border-border rounded-md bg-bg-muted text-text" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-text">Heslo</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-bg-muted text-text" required />
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Prihlasujem...' : 'Prihlásiť sa'}</Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
