
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ChromeIcon } from 'lucide-react'; // Using Chrome icon as a generic Google icon

export default function LoginPage() {
  const { currentUser, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.push('/'); // Redirect if already logged in
    }
  }, [currentUser, loading, router]);

  if (loading || (!loading && currentUser)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-4">
      <div className="w-full max-w-sm p-8 bg-card shadow-xl rounded-lg border">
        <h1 className="text-3xl font-bold text-center text-primary mb-2">Welcome!</h1>
        <p className="text-center text-muted-foreground mb-8">Sign in to continue to MindMapper Lite.</p>
        <button
          onClick={signInWithGoogle}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg text-sm px-5 py-3 text-center flex items-center justify-center transition-colors duration-150"
          disabled={loading}
        >
          <ChromeIcon className="w-5 h-5 mr-3" />
          Sign in with Google
        </button>
        {loading && <p className="text-center mt-4 text-sm text-muted-foreground">Signing in...</p>}
      </div>
    </div>
  );
}
