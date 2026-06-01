import React, { useState } from 'react';
import { Palette, Megaphone, Image as ImageIcon, CheckCircle2, Search, Type, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Menu, CanvasElement } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { canViewItem } from '../utils/visibility';
import MarketingCanvas from '../components/MarketingCanvas';

export default function Marketing() {
  const { appUser, commissionMode, viewAsStudent } = useAuth();
  const { menus, users } = useData();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    marketingDescription: '',
    marketingImageUrl: '',
    marketingStatus: 'boceto' as 'boceto' | 'publicado',
    marketingCanvasElements: [] as CanvasElement[]
  });

  // Filtramos los menús que estén disponibles
  const availableMenus = menus.filter(m => canViewItem(m, appUser, users, {
    commissionMode,
    viewAsStudent,
  })).filter(m => 
    m.nameES.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectMenu = (menu: Menu) => {
    setSelectedMenu(menu);
    setFormData({
      marketingDescription: menu.marketingDescription || '',
      marketingImageUrl: menu.marketingImageUrl || '',
      marketingStatus: menu.marketingStatus || 'boceto',
      marketingCanvasElements: menu.marketingCanvasElements || []
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selectedMenu) return;

    try {
      const menuRef = doc(db, 'menus', selectedMenu.id);
      await updateDoc(menuRef, {
        marketingDescription: formData.marketingDescription,
        marketingImageUrl: formData.marketingImageUrl,
        marketingStatus: formData.marketingStatus,
        marketingCanvasElements: formData.marketingCanvasElements
      });
      showToast('Datos de comercialización guardados con éxito', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating menu marketing details:', error);
      showToast('Error al guardar', 'error');
    }
  };

  const addCanvasText = () => {
    setFormData(prev => ({
      ...prev,
      marketingCanvasElements: [
        ...prev.marketingCanvasElements,
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 50,
          y: 50,
          text: 'Nuevo Texto',
          fontSize: 24,
          fontFamily: 'Inter',
          fill: '#000000'
        }
      ]
    }));
  };

  const addCanvasImage = () => {
    const url = prompt('Introduce la URL de la imagen:');
    if (url) {
      setFormData(prev => ({
        ...prev,
        marketingCanvasElements: [
          ...prev.marketingCanvasElements,
          {
            id: crypto.randomUUID(),
            type: 'image',
            x: 50,
            y: 50,
            src: url,
            width: 150,
            height: 150
          }
        ]
      }));
    }
  };

  const removeLastElement = () => {
    if (formData.marketingCanvasElements.length > 0) {
      setFormData(prev => ({
        ...prev,
        marketingCanvasElements: prev.marketingCanvasElements.slice(0, -1)
      }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shadow-inner">
            <Palette size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Marketing y Catálogo</h1>
            <p className="text-stone-500 mt-1">Diseño y comercialización de menús para el catálogo público.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de menús */}
        <div className="lg:col-span-1 border-r border-stone-200 pr-8 flex flex-col h-[calc(100vh-200px)]">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Buscar menú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {availableMenus.length === 0 ? (
              <div className="text-center py-8 text-stone-500 text-sm">No hay menús disponibles.</div>
            ) : (
              availableMenus.map(menu => (
                <button
                  key={menu.id}
                  onClick={() => handleSelectMenu(menu)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedMenu?.id === menu.id
                      ? 'bg-rose-50 border-rose-200 shadow-sm border'
                      : 'bg-white border-stone-200 border hover:border-rose-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-stone-800">{menu.nameES}</div>
                    {menu.marketingStatus === 'publicado' ? (
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-stone-300 mt-1.5 flex-shrink-0"></div>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 uppercase tracking-widest mt-1">{menu.type}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panel de edición / maquetación */}
        <div className="lg:col-span-2">
          {selectedMenu ? (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full">
              <div className="border-b border-stone-200 p-6 flex justify-between items-center bg-stone-50">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">{selectedMenu.nameES}</h2>
                  <p className="text-sm text-stone-500 mt-0.5">Precio de venta: {selectedMenu.price > 0 ? `${selectedMenu.price.toFixed(2)}€` : 'Pendiente'}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          handleSelectMenu(selectedMenu); // reset
                        }}
                        className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors"
                      >
                        Guardar Cambios
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl font-medium transition-colors shadow-sm"
                    >
                      Editar Maquetación
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto grid md:grid-cols-2 gap-8">
                {/* Formulario */}
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-stone-900 mb-2">
                      <ImageIcon size={16} className="text-stone-400" /> URL de la Imagen
                    </label>
                    <input
                      type="url"
                      value={formData.marketingImageUrl}
                      onChange={e => setFormData({ ...formData, marketingImageUrl: e.target.value })}
                      disabled={!isEditing}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-75"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-stone-900 mb-2">
                      <Type size={16} className="text-stone-400" /> Texto Comercial (Copy)
                    </label>
                    <textarea
                      rows={5}
                      value={formData.marketingDescription}
                      onChange={e => setFormData({ ...formData, marketingDescription: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Escribe un texto atractivo para vender este menú..."
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-75 resize-none"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-stone-900 mb-2">
                      <Megaphone size={16} className="text-stone-400" /> Estado en Catálogo
                    </label>
                    <select
                      value={formData.marketingStatus}
                      onChange={e => setFormData({ ...formData, marketingStatus: e.target.value as 'boceto' | 'publicado' })}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-75"
                    >
                      <option value="boceto">Boceto (No visible para clientes)</option>
                      <option value="publicado">Publicado (Visible en el catálogo)</option>
                    </select>
                  </div>
                </div>

                {/* Editor Avanzado de Lienzo */}
                <div className="flex flex-col h-full min-h-[500px]">
                  <div className="flex justify-between items-end mb-4 border-b border-stone-200 pb-2">
                    <h3 className="text-sm font-semibold text-stone-900 tracking-wide uppercase">Editor de Composición</h3>
                    {isEditing && (
                      <div className="flex gap-2">
                        <button onClick={addCanvasText} className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors" title="Añadir Texto">
                          <Type size={16} />
                        </button>
                        <button onClick={addCanvasImage} className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors" title="Añadir Imagen/Sello">
                          <ImageIcon size={16} />
                        </button>
                        <button onClick={removeLastElement} className="p-2 border border-rose-200 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors" title="Deshacer Último Elemento">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full bg-stone-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center relative">
                    {formData.marketingStatus === 'boceto' && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-stone-900 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded z-10">Boceto</div>
                    )}
                    <MarketingCanvas
                      elements={formData.marketingCanvasElements}
                      onChange={(newElements) => setFormData(prev => ({ ...prev, marketingCanvasElements: newElements }))}
                      readOnly={!isEditing}
                      width={400}
                      height={500}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 h-[calc(100vh-200px)] flex flex-col items-center justify-center p-8 text-center text-stone-500">
              <Megaphone size={48} className="text-stone-300 mb-4" />
              <h3 className="text-lg font-medium text-stone-900 mb-1">Selecciona un menú</h3>
              <p className="text-sm">Escoge un menú de la lista para ver o editar su ficha comercial.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
