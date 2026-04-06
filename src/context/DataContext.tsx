import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Ingredient, Recipe, Menu } from '../types';

interface DataContextType {
  ingredients: Ingredient[];
  recipes: Recipe[];
  menus: Menu[];
  loadingData: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // Solo cargamos los datos si hay un usuario autenticado
    if (!appUser) {
      setIngredients([]);
      setRecipes([]);
      setMenus([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    let loadedCount = 0;
    const checkLoading = () => {
      loadedCount++;
      if (loadedCount === 3) setLoadingData(false);
    };

    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      const data: Ingredient[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Ingredient));
      setIngredients(data.sort((a, b) => a.nameES.localeCompare(b.nameES)));
      checkLoading();
    });

    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const data: Recipe[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Recipe));
      setRecipes(data.sort((a, b) => a.nameES.localeCompare(b.nameES)));
      checkLoading();
    });

    const unsubMenus = onSnapshot(collection(db, 'menus'), (snapshot) => {
      const data: Menu[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Menu));
      setMenus(data.sort((a, b) => a.nameES.localeCompare(b.nameES)));
      checkLoading();
    });

    return () => {
      unsubIngredients();
      unsubRecipes();
      unsubMenus();
    };
  }, [appUser]);

  return (
    <DataContext.Provider value={{ ingredients, recipes, menus, loadingData }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
