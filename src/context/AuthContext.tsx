import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

// Definición de la estructura de datos de nuestro usuario en la aplicación
interface AppUser {
  uid: string;
  email: string;
  role: 'admin' | 'student' | 'docente';
  name: string;
  group?: string;
  commission?: string;
}

// Definición de lo que va a proveer nuestro contexto de autenticación
interface AuthContextType {
  user: User | null; // Usuario de Firebase Auth
  appUser: AppUser | null; // Datos extendidos del usuario desde Firestore
  loading: boolean; // Estado de carga mientras verificamos la sesión
  viewAsStudent: boolean;
  setViewAsStudent: (value: boolean) => void;
  commissionMode: boolean;
  setCommissionMode: (value: boolean) => void;
  login: () => Promise<void>; // Función para iniciar sesión
  logout: () => Promise<void>; // Función para cerrar sesión
}

// Creamos el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Componente proveedor que envolverá nuestra aplicación para darle acceso a la autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsStudent, setViewAsStudent] = useState(false);
  const [commissionMode, setCommissionMode] = useState(true);

  // Efecto que se ejecuta al cargar la aplicación para verificar si hay una sesión activa
  useEffect(() => {
    // onAuthStateChanged escucha los cambios en el estado de autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Si hay un usuario logueado en Firebase, buscamos sus datos en nuestra base de datos (Firestore)
        const userEmail = firebaseUser.email?.toLowerCase();
        if (!userEmail) {
          setAppUser(null);
          setLoading(false);
          return;
        }

        try {
          // Buscamos el documento del usuario usando su email como ID
          const userDocRef = doc(db, 'users', userEmail);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            // Si el usuario existe en nuestra base de datos, guardamos sus datos en el estado
            setAppUser({ uid: firebaseUser.uid, ...userDoc.data() } as AppUser);
          } else if (userEmail === 'lsuarodzmail.com@gmail.com') {
            // Caso especial: Si es el email del administrador principal y no existe, lo creamos automáticamente
            const newAdmin: Omit<AppUser, 'uid'> = {
              email: userEmail,
              role: 'admin',
              name: firebaseUser.displayName || 'Admin',
            };
            await setDoc(userDocRef, { ...newAdmin, createdAt: new Date().toISOString() });
            setAppUser({ uid: firebaseUser.uid, ...newAdmin } as AppUser);
          } else {
            // Si el usuario se loguea con Google pero no está registrado en nuestra base de datos por un admin, no le damos acceso
            setAppUser(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setAppUser(null);
        }
      } else {
        // Si no hay usuario en Firebase, limpiamos el estado
        setAppUser(null);
      }
      // Terminamos el estado de carga
      setLoading(false);
    });

    // Limpiamos el listener cuando el componente se desmonta
    return unsubscribe;
  }, []);

  // Función para iniciar sesión usando el popup de Google
  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Proveemos los valores y funciones al resto de la aplicación
  return (
    <AuthContext.Provider value={{ 
      user, 
      appUser, 
      loading, 
      viewAsStudent, 
      setViewAsStudent, 
      commissionMode, 
      setCommissionMode, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto de autenticación fácilmente en cualquier componente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
