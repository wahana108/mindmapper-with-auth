
// src/components/ClientNav.tsx
"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserCircle, LayoutDashboard, Globe, Search as SearchIconLucide } from 'lucide-react'; // Added SearchIconLucide

export default function ClientNav() {
  const { currentUser, signInWithGoogle, signOut, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  if (loading) {
    return (
      <nav className="bg-card text-card-foreground shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-primary">
            MindMapper Lite
          </Link>
          <div className="animate-pulse bg-muted h-8 w-24 rounded-md"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-card text-card-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-2">
        <Link href="/" className="text-xl font-bold text-primary hover:text-primary/80 transition-colors">
          MindMapper Lite
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {currentUser && (
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary px-2">
                <LayoutDashboard size={18} className="mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          )}
          <Link href="/public">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary px-2">
              <Globe size={18} className="mr-0 sm:mr-1" />
              <span className="hidden sm:inline">Public</span>
            </Button>
          </Link>
          {currentUser && (
            <Link href="/search">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary px-2">
                <SearchIconLucide size={18} className="mr-0 sm:mr-1" />
                <span className="hidden sm:inline">My Search</span>
              </Button>
            </Link>
          )}
          {currentUser ? (
            <>
              <span className="text-sm text-muted-foreground hidden md:inline ml-2">
                Hi, {currentUser.displayName?.split(' ')[0] || 'User'}!
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="px-2">
                <LogOut size={18} className="mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <Button onClick={handleSignIn} variant="default" size="sm" className="px-2">
              <LogIn size={18} className="mr-0 sm:mr-1" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
