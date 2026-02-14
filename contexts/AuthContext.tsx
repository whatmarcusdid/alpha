'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { identifyUser } from '@/lib/analytics';

// --- Browser-only Firebase Pattern ---
// This ensures Firebase auth functions are only imported and used on the client-side.
let authFunctions: { onAuthStateChanged?: typeof import('firebase/auth').onAuthStateChanged } = {};
if (typeof window !== 'undefined') {
  const { onAuthStateChanged } = require('firebase/auth');
  authFunctions = { onAuthStateChanged };
}

// --- Context Interface ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// --- Context Definition ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure auth and onAuthStateChanged are available before calling it
    if (auth && authFunctions.onAuthStateChanged) {
      const unsubscribe = authFunctions.onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } else {
      // If on server or auth not initialized, set loading to false as there is no user state
      setLoading(false);
    }
  }, []);

  // Mixpanel identity management - identify user on login/signup
  useEffect(() => {
    if (user?.uid) {
      identifyUser(user.uid);
    }
  }, [user?.uid]);

  const value = { user, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Hook for consuming context ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
