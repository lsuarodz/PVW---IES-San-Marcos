import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Ingredient, Recipe, Menu, Provider, StandardWaste, Client, Quote } from '../types';

// ============================================================================
// INTERFACES (Definición de Tipos)
// ============================================================================
// Aquí definimos qué forma tienen los datos que vamos a compartir.
// DataContextType es como un "contrato" que dice: "Quien use este contexto
// recibirá listas de ingredientes, recetas, menús, etc., y un booleano loadingData".
interface DataContextType {
  ingredients: Ingredient[];
  recipes: Recipe[];
  menus: Menu[];
  providers: Provider[];
  standardWastes: StandardWaste[];
  clients: Client[];
  quotes: Quote[];
  loadingData: boolean;
}

// ============================================================================
// CREACIÓN DEL CONTEXTO
// ============================================================================
// Creamos el "Contexto" (el altavoz global). Al principio está vacío (undefined).
const DataContext = createContext<DataContextType | undefined>(undefined);

// ============================================================================
// COMPONENTE PROVEEDOR (DataProvider)
// ============================================================================
// Este componente envuelve a nuestra aplicación (lo vimos en App.tsx).
// Su trabajo es conectarse a la base de datos, descargar la información,
// mantenerla actualizada en tiempo real y repartirla a quien la pida.
export function DataProvider({ children }: { children: React.ReactNode }) {
  // Obtenemos el usuario actual para saber si debemos descargar datos o no.
  const { appUser } = useAuth();
  
  // "useState" crea variables especiales de React. Cuando estas variables cambian,
  // React automáticamente actualiza las pantallas que las estén usando.
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [standardWastes, setStandardWastes] = useState<StandardWaste[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  
  // Estado para saber si seguimos descargando datos de internet.
  const [loadingData, setLoadingData] = useState(true);

  // "useEffect" es un gancho (hook) que ejecuta código cuando algo sucede.
  // En este caso, se ejecuta cada vez que el usuario cambia (appUser).
  useEffect(() => {
    // 1. Si no hay usuario (nadie ha iniciado sesión), vaciamos todo por seguridad.
    if (!appUser) {
      setIngredients([]);
      setRecipes([]);
      setMenus([]);
      setProviders([]);
      setStandardWastes([]);
      setClients([]);
      setQuotes([]);
      setLoadingData(false);
      return; // Salimos de la función, no hacemos nada más.
    }

    // 2. Si hay usuario, empezamos a cargar.
    setLoadingData(true);
    let loadedCount = 0; // Contador para saber cuántas colecciones hemos descargado.
    
    // Función auxiliar: cada vez que termina de descargar una colección, suma 1.
    // Si llega a 7 (porque tenemos 7 colecciones), significa que ya terminó de cargar todo.
    const checkLoading = () => {
      loadedCount++;
      if (loadedCount === 7) setLoadingData(false);
    };

    // 3. CONEXIÓN EN TIEMPO REAL A FIREBASE (onSnapshot)
    // "onSnapshot" es como suscribirse a un canal de YouTube. Cada vez que hay un 
    // cambio en la base de datos (se añade, edita o borra algo), Firebase nos avisa
    // automáticamente y ejecuta esta función.
    
    // Descargar Ingredientes
    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      const data: Ingredient[] = [];
      // Recorremos los documentos que nos manda Firebase y los metemos en un array.
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Ingredient));
      // Ordenamos alfabéticamente y guardamos en el estado.
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

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const data: Client[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Client));
      setClients(data.sort((a, b) => a.name.localeCompare(b.name)));
      checkLoading();
    });

    const unsubQuotes = onSnapshot(collection(db, 'quotes'), (snapshot) => {
      const data: Quote[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Quote));
      setQuotes(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      checkLoading();
    });

    // 4. LIMPIEZA (Cleanup)
    // Cuando el componente se destruye o el usuario cierra sesión, 
    // debemos "desuscribirnos" de Firebase para no gastar memoria ni internet.
    return () => {
      unsubIngredients();
      unsubRecipes();
      unsubMenus();
      unsubProviders();
      unsubStandardWastes();
      unsubClients();
      unsubQuotes();
    };
  }, [appUser]); // El array [appUser] le dice a useEffect: "Solo vuelve a ejecutar esto si appUser cambia".

  // 5. REPARTIR LOS DATOS
  // Aquí devolvemos el "Context.Provider" envolviendo a los "children" (nuestra app).
  // En la propiedad "value" metemos todos los datos que queremos compartir.
  return (
    <DataContext.Provider value={{ ingredients, recipes, menus, providers, standardWastes, clients, quotes, loadingData }}>
      {children}
    </DataContext.Provider>
  );
}

// ============================================================================
// HOOK PERSONALIZADO: useData
// ============================================================================
// Esta es una función "atajo" para que cualquier componente pueda pedir los datos.
// En lugar de escribir mucho código, un componente solo tiene que hacer:
// const { ingredients } = useData();
export const useData = () => {
  const context = useContext(DataContext);
  // Si alguien intenta usar useData fuera del DataProvider, lanzamos un error para avisarle.
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
