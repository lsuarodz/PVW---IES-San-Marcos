import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Plus, Coffee, Croissant, HeartHandshake, Trash2 } from 'lucide-react';
import { getGroupColor } from '../utils/groupColors';

interface Idea {
  id: string;
  type: 'coffee' | 'brunch' | 'solidario';
  text: string;
  group: string;
  createdAt: string;
}

interface Characteristic {
  id: string;
  type: 'coffee' | 'brunch' | 'solidario';
  text: string;
  group: string;
  createdAt: string;
}

export default function CoffeeBrunch() {
  const { appUser } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  
  const [newCoffeeIdea, setNewCoffeeIdea] = useState('');
  const [newBrunchIdea, setNewBrunchIdea] = useState('');
  const [newSolidarioIdea, setNewSolidarioIdea] = useState('');
  
  const [newCoffeeChar, setNewCoffeeChar] = useState('');
  const [newBrunchChar, setNewBrunchChar] = useState('');
  const [newSolidarioChar, setNewSolidarioChar] = useState('');

  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  const isSuperAdmin = appUser?.role === 'admin';

  useEffect(() => {
    const qIdeas = query(collection(db, 'jornada1_ideas'), orderBy('createdAt', 'asc'));
    const unsubIdeas = onSnapshot(qIdeas, (snapshot) => {
      const ideasData: Idea[] = [];
      snapshot.forEach((doc) => {
        ideasData.push({ id: doc.id, ...doc.data() } as Idea);
      });
      setIdeas(ideasData);
    });

    const qChars = query(collection(db, 'jornada1_characteristics'), orderBy('createdAt', 'asc'));
    const unsubChars = onSnapshot(qChars, (snapshot) => {
      const charsData: Characteristic[] = [];
      snapshot.forEach((doc) => {
        charsData.push({ id: doc.id, ...doc.data() } as Characteristic);
      });
      setCharacteristics(charsData);
    });

    return () => {
      unsubIdeas();
      unsubChars();
    };
  }, []);

  const handleAddIdea = async (type: 'coffee' | 'brunch' | 'solidario', text: string, setText: (val: string) => void) => {
    if (!text.trim() || !appUser) return;
    try {
      await addDoc(collection(db, 'jornada1_ideas'), {
        type,
        text: text.trim(),
        group: appUser.group || appUser.name,
        createdAt: new Date().toISOString()
      });
      setText('');
    } catch (error) {
      console.error('Error adding idea:', error);
    }
  };

  const handleAddCharacteristic = async (type: 'coffee' | 'brunch' | 'solidario', text: string, setText: (val: string) => void) => {
    if (!text.trim() || !appUser) return;
    try {
      await addDoc(collection(db, 'jornada1_characteristics'), {
        type,
        text: text.trim(),
        group: appUser.group || appUser.name,
        createdAt: new Date().toISOString()
      });
      setText('');
    } catch (error) {
      console.error('Error adding characteristic:', error);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta respuesta?')) {
      try {
        await deleteDoc(doc(db, 'jornada1_ideas', id));
      } catch (error) {
        console.error('Error deleting idea:', error);
      }
    }
  };

  const handleDeleteCharacteristic = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta característica?')) {
      try {
        await deleteDoc(doc(db, 'jornada1_characteristics', id));
      } catch (error) {
        console.error('Error deleting characteristic:', error);
      }
    }
  };

  const coffeeIdeas = ideas.filter(i => i.type === 'coffee');
  const brunchIdeas = ideas.filter(i => i.type === 'brunch');
  const solidarioIdeas = ideas.filter(i => i.type === 'solidario');
  
  const coffeeChars = characteristics.filter(c => c.type === 'coffee');
  const brunchChars = characteristics.filter(c => c.type === 'brunch');
  const solidarioChars = characteristics.filter(c => c.type === 'solidario');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Coffee Break / Brunch / Menú Solidario</h1>
        <p className="text-stone-500 mt-2">Definición y características de cada tipo de servicio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Coffee Break Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
              <Coffee size={24} />
            </div>
            <h2 className="text-xl font-bold text-amber-900">Definición de Coffee Break</h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto bg-stone-50 space-y-3">
            {coffeeIdeas.length === 0 ? (
              <p className="text-stone-400 text-center italic mt-4">Aún no hay ideas. ¡Añade la primera!</p>
            ) : (
              coffeeIdeas.map(idea => (
                <div key={idea.id} className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm relative group">
                  <p className="text-stone-800 pr-6">{idea.text}</p>
                  <div className={`text-sm font-bold mt-2 text-right ${getGroupColor(idea.group)}`}>
                    — {idea.group}
                  </div>
                  {appUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="absolute top-2 right-2 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 bg-white border-t border-stone-200 flex gap-2">
            <input
              type="text"
              value={newCoffeeIdea}
              onChange={(e) => setNewCoffeeIdea(e.target.value)}
              placeholder="Escribe una idea..."
              className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddIdea('coffee', newCoffeeIdea, setNewCoffeeIdea)}
            />
            <button
              onClick={() => handleAddIdea('coffee', newCoffeeIdea, setNewCoffeeIdea)}
              disabled={!newCoffeeIdea.trim()}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              Añadir
            </button>
          </div>
        </div>

        {/* Brunch Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center">
              <Croissant size={24} />
            </div>
            <h2 className="text-xl font-bold text-orange-900">Definición de Brunch</h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto bg-stone-50 space-y-3">
            {brunchIdeas.length === 0 ? (
              <p className="text-stone-400 text-center italic mt-4">Aún no hay ideas. ¡Añade la primera!</p>
            ) : (
              brunchIdeas.map(idea => (
                <div key={idea.id} className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm relative group">
                  <p className="text-stone-800 pr-6">{idea.text}</p>
                  <div className={`text-sm font-bold mt-2 text-right ${getGroupColor(idea.group)}`}>
                    — {idea.group}
                  </div>
                  {appUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="absolute top-2 right-2 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 bg-white border-t border-stone-200 flex gap-2">
            <input
              type="text"
              value={newBrunchIdea}
              onChange={(e) => setNewBrunchIdea(e.target.value)}
              placeholder="Escribe una idea..."
              className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddIdea('brunch', newBrunchIdea, setNewBrunchIdea)}
            />
            <button
              onClick={() => handleAddIdea('brunch', newBrunchIdea, setNewBrunchIdea)}
              disabled={!newBrunchIdea.trim()}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              Añadir
            </button>
          </div>
        </div>

        {/* Solidario Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center">
              <HeartHandshake size={24} />
            </div>
            <h2 className="text-xl font-bold text-rose-900">Definición de Menú Solidario</h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto bg-stone-50 space-y-3">
            {solidarioIdeas.length === 0 ? (
              <p className="text-stone-400 text-center italic mt-4">Aún no hay ideas. ¡Añade la primera!</p>
            ) : (
              solidarioIdeas.map(idea => (
                <div key={idea.id} className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm relative group">
                  <p className="text-stone-800 pr-6">{idea.text}</p>
                  <div className={`text-sm font-bold mt-2 text-right ${getGroupColor(idea.group)}`}>
                    — {idea.group}
                  </div>
                  {appUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="absolute top-2 right-2 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 bg-white border-t border-stone-200 flex gap-2">
            <input
              type="text"
              value={newSolidarioIdea}
              onChange={(e) => setNewSolidarioIdea(e.target.value)}
              placeholder="Escribe una idea..."
              className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddIdea('solidario', newSolidarioIdea, setNewSolidarioIdea)}
            />
            <button
              onClick={() => handleAddIdea('solidario', newSolidarioIdea, setNewSolidarioIdea)}
              disabled={!newSolidarioIdea.trim()}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              Añadir
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Coffee Characteristics */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Coffee size={20} className="text-amber-600" />
            Características Clave: Coffee Break
          </h3>
          
          <div className="space-y-3 mb-4">
            {coffeeChars.length === 0 ? (
              <p className="text-sm text-stone-400 italic">Sin características definidas.</p>
            ) : (
              coffeeChars.map(char => (
                <div key={char.id} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100 relative group">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 pr-6">
                    <p className="text-sm text-stone-800">{char.text}</p>
                    <p className="text-sm mt-1">Aportado por: <span className={`font-bold ${getGroupColor(char.group)}`}>{char.group}</span></p>
                  </div>
                  {appUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteCharacteristic(char.id)}
                      className="absolute top-2 right-2 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-stone-100">
            <input
              type="text"
              value={newCoffeeChar}
              onChange={(e) => setNewCoffeeChar(e.target.value)}
              placeholder="Añadir característica..."
              className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCharacteristic('coffee', newCoffeeChar, setNewCoffeeChar)}
            />
            <button
              onClick={() => handleAddCharacteristic('coffee', newCoffeeChar, setNewCoffeeChar)}
              disabled={!newCoffeeChar.trim()}
              className="p-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 disabled:opacity-50 transition-colors"
              title="Añadir característica"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Brunch Characteristics */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Croissant size={20} className="text-orange-600" />
            Características Clave: Brunch
          </h3>
          
          <div className="space-y-3 mb-4">
            {brunchChars.length === 0 ? (
              <p className="text-sm text-stone-400 italic">Sin características definidas.</p>
            ) : (
              brunchChars.map(char => (
                <div key={char.id} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100 relative group">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 pr-6">
                    <p className="text-sm text-stone-800">{char.text}</p>
                    <p className="text-sm mt-1">Aportado por: <span className={`font-bold ${getGroupColor(char.group)}`}>{char.group}</span></p>
                  </div>
                  {appUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteCharacteristic(char.id)}
                      className="absolute top-2 right-2 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-stone-100">
            <input
              type="text"
              value={newBrunchChar}
              onChange={(e) => setNewBrunchChar(e.target.value)}
              placeholder="Añadir característica..."
              className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCharacteristic('brunch', newBrunchChar, setNewBrunchChar)}
            />
            <button
              onClick={() => handleAddCharacteristic('brunch', newBrunchChar, setNewBrunchChar)}
              disabled={!newBrunchChar.trim()}
              className="p-2 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 disabled:opacity-50 transition-colors"
              title="Añadir característica"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Solidario Characteristics */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <HeartHandshake size={20} className="text-rose-600" />
            Características Clave: Menú Solidario
          </h3>
          
          <div className="space-y-3 mb-4">
            {solidarioChars.length === 0 ? (
              <p className="text-sm text-stone-400 italic">Sin características definidas.</p>
            ) : (
              solidarioChars.map(char => (
                <div key={char.id} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100 relative group">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 pr-6">
                    <p className="text-sm text-stone-800">{char.text}</p>
                    <p className="text-sm mt-1">Aportado por: <span className={`font-bold ${getGroupColor(char.group)}`}>{char.group}</span></p>
                  </div>
                  {appUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteCharacteristic(char.id)}
                      className="absolute top-2 right-2 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-stone-100">
            <input
              type="text"
              value={newSolidarioChar}
              onChange={(e) => setNewSolidarioChar(e.target.value)}
              placeholder="Añadir característica..."
              className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCharacteristic('solidario', newSolidarioChar, setNewSolidarioChar)}
            />
            <button
              onClick={() => handleAddCharacteristic('solidario', newSolidarioChar, setNewSolidarioChar)}
              disabled={!newSolidarioChar.trim()}
              className="p-2 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 disabled:opacity-50 transition-colors"
              title="Añadir característica"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
