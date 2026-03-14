import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Save, CheckCircle2, FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getGroupColor } from '../utils/groupColors';

interface StandardizationAnswer {
  id: string;
  userId: string;
  userName: string;
  userGroup: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  updatedAt: string;
}

export default function Standardization() {
  const { appUser } = useAuth();
  const [answer, setAnswer] = useState<StandardizationAnswer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: ''
  });

  const [allAnswers, setAllAnswers] = useState<StandardizationAnswer[]>([]);
  const [expandedAdminView, setExpandedAdminView] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser) return;

    const q = query(collection(db, 'jornada1_standardization'), where('userId', '==', appUser.email));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data() as StandardizationAnswer;
        setAnswer({ id: snapshot.docs[0].id, ...docData });
        setFormData({
          q1: docData.q1 || '',
          q2: docData.q2 || '',
          q3: docData.q3 || '',
          q4: docData.q4 || '',
          q5: docData.q5 || ''
        });
      } else {
        setAnswer(null);
        setFormData({ q1: '', q2: '', q3: '', q4: '', q5: '' });
      }
    });

    let unsubAll: () => void;
    if (appUser.role === 'admin') {
      const qAll = query(collection(db, 'jornada1_standardization'));
      unsubAll = onSnapshot(qAll, (snapshot) => {
        const data: StandardizationAnswer[] = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as StandardizationAnswer));
        setAllAnswers(data.sort((a, b) => a.userGroup.localeCompare(b.userGroup) || a.userName.localeCompare(b.userName)));
      });
    }

    return () => {
      unsub();
      if (unsubAll) unsubAll();
    };
  }, [appUser]);

  const handleDeleteAnswer = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar las respuestas de este alumno?')) {
      try {
        await deleteDoc(doc(db, 'jornada1_standardization', id));
      } catch (error) {
        console.error('Error deleting answer:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!appUser) return;
    setIsSaving(true);

    try {
      const docRef = doc(db, 'jornada1_standardization', appUser.email);
      await setDoc(docRef, {
        userId: appUser.email,
        userName: appUser.name,
        userGroup: appUser.group || '',
        q1: formData.q1,
        q2: formData.q2,
        q3: formData.q3,
        q4: formData.q4,
        q5: formData.q5,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving answers:', error);
      alert('Error al guardar las respuestas');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Estandarización de la oferta</h1>
        <p className="text-stone-500 mt-2">Cuestionario individual sobre la importancia y métodos de estandarización.</p>
      </div>

      {appUser?.role === 'admin' && (
        <div className="mb-12 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-emerald-900">Respuestas de los Alumnos (Vista Admin)</h2>
            <span className="bg-emerald-200 text-emerald-800 py-1 px-3 rounded-full text-sm font-bold">
              {allAnswers.length} respuestas
            </span>
          </div>
          <div className="divide-y divide-stone-200">
            {allAnswers.length === 0 ? (
              <p className="p-8 text-center text-stone-500 italic">No hay respuestas guardadas aún.</p>
            ) : (
              allAnswers.map(ans => (
                <div key={ans.id} className="p-6 bg-white hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => setExpandedAdminView(expandedAdminView === ans.id ? null : ans.id)}
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-stone-900">{ans.userName}</h3>
                        <p className={`text-sm font-bold mt-1 ${getGroupColor(ans.userGroup)}`}>
                          Grupo: {ans.userGroup || 'Sin grupo'}
                        </p>
                      </div>
                      <div className="text-sm text-stone-500 flex items-center gap-4">
                        <span>{new Date(ans.updatedAt).toLocaleDateString()}</span>
                        {expandedAdminView === ans.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAnswer(ans.id)}
                      className="ml-4 p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar respuesta"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  {expandedAdminView === ans.id && (
                    <div className="mt-6 space-y-6 pt-6 border-t border-stone-100">
                      <div>
                        <h4 className="text-sm font-bold text-stone-500 mb-2">1. ¿Por qué es necesaria una estandarización de la oferta?</h4>
                        <p className="text-stone-800 bg-stone-100 p-4 rounded-xl whitespace-pre-wrap">{ans.q1 || <span className="text-stone-400 italic">Sin respuesta</span>}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-500 mb-2">2. ¿Cómo se estandariza la oferta?</h4>
                        <p className="text-stone-800 bg-stone-100 p-4 rounded-xl whitespace-pre-wrap">{ans.q2 || <span className="text-stone-400 italic">Sin respuesta</span>}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-500 mb-2">3. Estandarización del Brunch propuesto</h4>
                        <p className="text-stone-800 bg-stone-100 p-4 rounded-xl whitespace-pre-wrap">{ans.q3 || <span className="text-stone-400 italic">Sin respuesta</span>}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-500 mb-2">4. Estandarización del Coffee Break propuesto</h4>
                        <p className="text-stone-800 bg-stone-100 p-4 rounded-xl whitespace-pre-wrap">{ans.q4 || <span className="text-stone-400 italic">Sin respuesta</span>}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-500 mb-2">5. Estandarización del Menú Solidario propuesto</h4>
                        <p className="text-stone-800 bg-stone-100 p-4 rounded-xl whitespace-pre-wrap">{ans.q5 || <span className="text-stone-400 italic">Sin respuesta</span>}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Cuestionario del Alumno</h2>
              <p className="text-sm text-stone-500">{appUser?.name} {appUser?.group ? `(${appUser.group})` : ''}</p>
            </div>
          </div>
          {answer && (
            <div className="text-xs text-stone-500 flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Última actualización: {new Date(answer.updatedAt).toLocaleString()}
            </div>
          )}
        </div>

        <div className="p-8 space-y-8">
          {/* Pregunta 1 */}
          <div>
            <label className="block text-lg font-bold text-stone-800 mb-2">
              1. ¿Por qué es necesaria una estandarización de la oferta?
            </label>
            <p className="text-sm text-stone-500 mb-3">
              Explica con tus propias palabras la importancia de estandarizar recetas y procesos en una cocina profesional.
            </p>
            <textarea
              value={formData.q1}
              onChange={(e) => setFormData({ ...formData, q1: e.target.value })}
              className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Escribe tu respuesta aquí..."
            />
          </div>

          {/* Pregunta 2 */}
          <div>
            <label className="block text-lg font-bold text-stone-800 mb-2">
              2. ¿Cómo se estandariza la oferta?
            </label>
            <p className="text-sm text-stone-500 mb-3">
              Detalla los pasos o herramientas necesarias para llevar a cabo una correcta estandarización.
            </p>
            <textarea
              value={formData.q2}
              onChange={(e) => setFormData({ ...formData, q2: e.target.value })}
              className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Escribe tu respuesta aquí..."
            />
          </div>

          <div className="border-t border-stone-200 pt-8">
            <h3 className="text-xl font-bold text-stone-900 mb-6">Casos Prácticos</h3>
            
            {/* Pregunta 3 */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-stone-800 mb-2">
                3. Estandarización del Brunch propuesto
              </label>
              <p className="text-sm text-stone-500 mb-3">
                Basándote en el menú Brunch propuesto en clase, ¿cómo aplicarías la estandarización a su oferta?
              </p>
              <textarea
                value={formData.q3}
                onChange={(e) => setFormData({ ...formData, q3: e.target.value })}
                className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Escribe tu propuesta de estandarización para el Brunch..."
              />
            </div>

            {/* Pregunta 4 */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-stone-800 mb-2">
                4. Estandarización del Coffee Break propuesto
              </label>
              <p className="text-sm text-stone-500 mb-3">
                Basándote en el menú Coffee Break propuesto en clase, ¿cómo aplicarías la estandarización a su oferta?
              </p>
              <textarea
                value={formData.q4}
                onChange={(e) => setFormData({ ...formData, q4: e.target.value })}
                className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Escribe tu propuesta de estandarización para el Coffee Break..."
              />
            </div>

            {/* Pregunta 5 */}
            <div>
              <label className="block text-lg font-bold text-stone-800 mb-2">
                5. Estandarización del Menú Solidario propuesto
              </label>
              <p className="text-sm text-stone-500 mb-3">
                Basándote en el Menú Solidario propuesto en clase, ¿cómo aplicarías la estandarización a su oferta?
              </p>
              <textarea
                value={formData.q5}
                onChange={(e) => setFormData({ ...formData, q5: e.target.value })}
                className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Escribe tu propuesta de estandarización para el Menú Solidario..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-stone-50 border-t border-stone-200 flex justify-end items-center gap-4">
          {showSuccess && (
            <span className="text-emerald-600 font-medium flex items-center gap-2">
              <CheckCircle2 size={18} />
              Guardado correctamente
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {isSaving ? 'Guardando...' : 'Guardar Respuestas'}
          </button>
        </div>
      </div>
    </div>
  );
}
