import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Ingredient, Recipe, Menu, Provider, StandardWaste } from '../types';

interface DataContextType {
  ingredients: Ingredient[];
  recipes: Recipe[];
  menus: Menu[];
  providers: Provider[];
  standardWastes: StandardWaste[];
  loadingData: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [standardWastes, setStandardWastes] = useState<StandardWaste[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // Solo cargamos los datos si hay un usuario autenticado
    if (!appUser) {
      setIngredients([]);
      setRecipes([]);
      setMenus([]);
      setProviders([]);
      setStandardWastes([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    let loadedCount = 0;
    const checkLoading = () => {
      loadedCount++;
      if (loadedCount === 5) setLoadingData(false);
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

    const unsubProviders = onSnapshot(collection(db, 'providers'), (snapshot) => {
      const data: Provider[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Provider));
      setProviders(data.sort((a, b) => a.name.localeCompare(b.name)));
      checkLoading();
    });

    const unsubStandardWastes = onSnapshot(collection(db, 'standard_wastes'), (snapshot) => {
      const data: StandardWaste[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as StandardWaste));
      setStandardWastes(data.sort((a, b) => a.item.localeCompare(b.item)));
      checkLoading();
    });

    return () => {
      unsubIngredients();
      unsubRecipes();
      unsubMenus();
      unsubProviders();
      unsubStandardWastes();
    };
  }, [appUser]);

  return (
    <DataContext.Provider value={{ ingredients, recipes, menus, providers, standardWastes, loadingData }}>
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
