
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (!user && pathname !== '/login' && pathname !== '/public') {
        // Allow access to /public even if not logged in
        // router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [pathname, router]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      router.push('/'); // Redirect to home after successful login
    } catch (error) {
      console.error("Error signing in with Google:", error);
      // Handle error (e.g., show a toast notification)
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      router.push('/login'); // Redirect to login after sign out
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Client-side route protection for static export
  useEffect(() => {
    if (!loading && !currentUser && pathname !== '/login' && pathname !== '/public' && !pathname.startsWith('/_next/')) {
        // Special condition to allow accessing log detail page if it's a public log
        // This is a simplified check; more robust would involve fetching log's isPublic status
        if (pathname.startsWith('/logs/') && !pathname.endsWith('/edit')) {
            // For now, assume if they are trying to access a log detail page directly
            // and not logged in, we allow it and the page itself should fetch and check isPublic.
            // This part is tricky with static export and needs careful handling on the page itself.
            // For a stricter approach, we'd redirect all non-public, non-login paths.
        } else {
            router.push('/login');
        }
    }
  }, [loading, currentUser, pathname, router]);


  if (loading && pathname !== '/public' && !pathname.startsWith('/logs/')) { // Don't show full page loader for public or direct log access
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }


  return (
    <AuthContext.Provider value={{ currentUser, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
