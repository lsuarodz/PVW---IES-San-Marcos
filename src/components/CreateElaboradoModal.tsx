import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Recipe } from '../types';

interface CreateElaboradoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newElaboradoId: string) => void;
}

export default function CreateElaboradoModal({ isOpen, onClose, onSuccess }: CreateElaboradoModalProps) {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nameES, setNameES] = useState('');
  const [yieldUnit, setYieldUnit] = useState<'kg' | 'L' | 'ud'>('kg');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !nameES.trim()) return;
    
    setLoading(true);
    const id = doc(collection(db, 'recipes')).id;
    
    // We explicitly cast creation to any to avoid strict typescript missing fields
    // Because we just want a skeleton recipe
    const recipeData: Record<string, any> = {
      type: 'elaborado',
      nameES: nameES.trim(),
      nameEN: '',
      descriptionES: '',
      descriptionEN: '',
      yieldUnit,
      steps: [],
      stepsEN: [],
      equipment: [],
      miseEnPlace: '',
      sustainabilityTips: [],
      ingredients: [],
      totalCost: 0,
      createdBy: appUser.name || appUser.email || 'Usuario',
      group: appUser.group || '',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'recipes', id), recipeData);
      if (onSuccess) onSuccess(id);
      showToast('Elaborado creado. Puedes ir a añadirle detalle luego.', 'success');
      setNameES('');
      setYieldUnit('kg');
      onClose();
    } catch (error) {
      console.error('Error saving elaborado:', error);
      showToast('Error al guardar el elaborado', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="p-6 border-b border-stone-200/50">
          <h2 className="text-xl font-bold text-stone-900">
            Nuevo Elaborado Rápido
          </h2>
          <p className="text-sm text-stone-500 mt-1">Crea un elaborado básico ahora para añadirlo a la receta, y detállalo más tarde.</p>
        </div>
        <div className="p-6">
          <form id="create-elaborado-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={nameES}
                onChange={(e) => setNameES(e.target.value)}
                autoFocus
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej. Salsa Brava, Caldo de pollo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Unidad de medida (Rendimiento)</label>
              <select
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value as 'kg' | 'L' | 'ud')}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="kg">Kilogramos (kg)</option>
                <option value="L">Litros (L)</option>
                <option value="ud">Unidades (ud)</option>
              </select>
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-stone-200/50 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-stone-600 hover:bg-stone-200/50 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-elaborado-form"
            disabled={loading || !nameES.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            {loading ? 'Guardando...' : 'Crear Elaborado'}
          </button>
        </div>
      </div>
    </div>
  );
}
