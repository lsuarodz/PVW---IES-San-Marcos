import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

interface AppUser {
  uid: string;
  email: string;
  role: 'admin' | 'student' | 'docente';
  name: string;
  group?: string;
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if user exists in Firestore using email as document ID
        const userEmail = firebaseUser.email?.toLowerCase();
        if (!userEmail) {
          setAppUser(null);
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', userEmail);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setAppUser({ uid: firebaseUser.uid, ...userDoc.data() } as AppUser);
        } else if (userEmail === 'lsuarodzmail.com@gmail.com') {
          // Auto-create admin if it's the specific email
          const newAdmin: Omit<AppUser, 'uid'> = {
            email: userEmail,
            role: 'admin',
            name: firebaseUser.displayName || 'Admin',
          };
          await setDoc(userDocRef, { ...newAdmin, createdAt: new Date().toISOString() });
          setAppUser({ uid: firebaseUser.uid, ...newAdmin } as AppUser);
        } else {
          // Not registered
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
