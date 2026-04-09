import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Save, CheckCircle2, FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getGroupColor } from '../utils/groupColors';
import ConfirmModal from '../components/ConfirmModal';

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
  // Obtenemos el usuario actual
  const { appUser } = useAuth();
  const { showToast } = useToast();
  
  // Estado para almacenar la respuesta del usuario actual
  const [answer, setAnswer] = useState<StandardizationAnswer | null>(null);
  
  // Estados para controlar la interfaz de usuario durante el guardado
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Estado para almacenar los datos del formulario (las 5 preguntas)
  const [formData, setFormData] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: ''
  });

  // Estado para almacenar todas las respuestas (solo visible para admin/docente)
  const [allAnswers, setAllAnswers] = useState<StandardizationAnswer[]>([]);
  
  // Estado para controlar qué respuesta está expandida en la vista de administrador
  const [expandedAdminView, setExpandedAdminView] = useState<string | null>(null);

  // Estados para el modal de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Efecto para cargar los datos desde Firestore
  useEffect(() => {
    if (!appUser) return;

    // Consulta para obtener la respuesta del usuario actual
    const q = query(collection(db, 'jornada1_standardization'), where('userId', '==', appUser.email));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Si ya ha respondido, cargamos sus datos en el estado y en el formulario
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
        // Si no ha respondido, reseteamos
        setAnswer(null);
        setFormData({ q1: '', q2: '', q3: '', q4: '', q5: '' });
      }
    });

    let unsubAll: () => void;
    // Si es administrador o docente, cargamos TODAS las respuestas de todos los usuarios
    if (appUser.role === 'admin' || appUser.role === 'docente') {
      const qAll = query(collection(db, 'jornada1_standardization'));
      unsubAll = onSnapshot(qAll, (snapshot) => {
        const data: StandardizationAnswer[] = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as StandardizationAnswer));
        // Ordenamos primero por grupo y luego por nombre
        setAllAnswers(data.sort((a, b) => a.userGroup.localeCompare(b.userGroup) || a.userName.localeCompare(b.userName)));
      });
    }

    // Limpiamos los listeners al desmontar
    return () => {
      unsub();
      if (unsubAll) unsubAll();
    };
  }, [appUser]);

  // Función para eliminar una respuesta (solo admin)
  const handleDeleteAnswer = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Respuestas',
      message: '¿Estás seguro de eliminar las respuestas de este alumno? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'jornada1_standardization', id));
          showToast('Respuestas eliminadas', 'success');
        } catch (error) {
          console.error('Error deleting answer:', error);
          showToast('Error al eliminar las respuestas', 'error');
        }
      }
    });
  };

  // Función para guardar las respuestas del usuario actual
  const handleSave = async () => {
    if (!appUser) return;
    setIsSaving(true);

    try {
      // Usamos el email como ID del documento para asegurar que solo haya una respuesta por usuario
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
      showToast('Respuestas guardadas correctamente', 'success');
    } catch (error) {
      console.error('Error saving answers:', error);
      showToast('Error al guardar las respuestas', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isDestructive={confirmModal.isDestructive}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Estandarización de la oferta</h1>
        <p className="text-stone-500 mt-2">Cuestionario individual sobre la importancia y métodos de estandarización.</p>
      </div>

      {(appUser?.role === 'admin' || appUser?.role === 'docente') && (
        <div className="mb-12 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-sky-900">
              Respuestas de los Alumnos (Vista {appUser?.role === 'admin' ? 'Tutor' : 'Docente'})
            </h2>
            <span className="bg-sky-200 text-sky-800 py-1 px-3 rounded-full text-sm font-bold">
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
                    {appUser?.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteAnswer(ans.id)}
                        className="ml-4 p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Eliminar respuesta"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
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
            <div className="w-10 h-10 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Cuestionario del Alumno</h2>
              <p className="text-sm text-stone-500">{appUser?.name} {appUser?.group ? `(${appUser.group})` : ''}</p>
            </div>
          </div>
          {answer && (
            <div className="text-xs text-stone-500 flex items-center gap-1">
              <CheckCircle2 size={14} className="text-sky-600" />
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
              className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
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
              className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
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
                className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
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
                className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
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
                className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                placeholder="Escribe tu propuesta de estandarización para el Menú Solidario..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-stone-50 border-t border-stone-200 flex justify-end items-center gap-4">
          {showSuccess && (
            <span className="text-sky-600 font-medium flex items-center gap-2">
              <CheckCircle2 size={18} />
              Guardado correctamente
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {isSaving ? 'Guardando...' : 'Guardar Respuestas'}
          </button>
        </div>
      </div>
    </div>
  );
}
