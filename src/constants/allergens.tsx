import React from 'react';
import { Wheat, Fish, Egg, Milk, Nut, Bean, Leaf, Droplet, Wine, Shell, CircleDashed } from 'lucide-react';

export const ALLERGENS = [
  { id: 'gluten', name: 'Gluten', nameEN: 'Gluten', icon: <Wheat size={16} /> },
  { id: 'crustaceans', name: 'Crustáceos', nameEN: 'Crustaceans', icon: <Shell size={16} /> },
  { id: 'eggs', name: 'Huevos', nameEN: 'Eggs', icon: <Egg size={16} /> },
  { id: 'fish', name: 'Pescado', nameEN: 'Fish', icon: <Fish size={16} /> },
  { id: 'peanuts', name: 'Cacahuetes', nameEN: 'Peanuts', icon: <Bean size={16} /> },
  { id: 'soy', name: 'Soja', nameEN: 'Soy', icon: <Leaf size={16} /> },
  { id: 'dairy', name: 'Lácteos', nameEN: 'Dairy', icon: <Milk size={16} /> },
  { id: 'nuts', name: 'Frutos de cáscara', nameEN: 'Tree Nuts', icon: <Nut size={16} /> },
  { id: 'celery', name: 'Apio', nameEN: 'Celery', icon: <Leaf size={16} /> },
  { id: 'mustard', name: 'Mostaza', nameEN: 'Mustard', icon: <CircleDashed size={16} /> },
  { id: 'sesame', name: 'Sésamo', nameEN: 'Sesame', icon: <CircleDashed size={16} /> },
  { id: 'sulphites', name: 'Sulfitos', nameEN: 'Sulphites', icon: <Wine size={16} /> },
  { id: 'lupins', name: 'Altramuces', nameEN: 'Lupins', icon: <Leaf size={16} /> },
  { id: 'molluscs', name: 'Moluscos', nameEN: 'Molluscs', icon: <Shell size={16} /> }
];
