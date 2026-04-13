import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { db } from '../firebase';
import { collection, getDocs, query, doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Users, Send, CheckCircle, Printer, AlertCircle, Dices, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const questions = [
  { id: 1, category: "Costes", text: "Si el presupuesto total es de 12€ por persona, detallad el porcentaje de gasto para: Materia prima (alimentos), Bebidas y Menaje desechable. ¿Cuánto sobra para margen de imprevistos?" },
  { id: 2, category: "Costes", text: "Identificar el ingrediente más caro de vuestra propuesta. ¿Por qué otro ingrediente de menor coste podríais sustituirlo sin que el cliente perciba una bajada de calidad?" },
  { id: 3, category: "Logística", text: "Diseñad el 'Minuto a Minuto': ¿A qué hora exacta debe llegar el equipo al lugar para que el café esté recién hecho y la comida a la temperatura ideal a las 11:00 AM?" },
  { id: 4, category: "Liderazgo", text: "Notas que un miembro de la comisión de Logística está de brazos cruzados porque dice que 'no tiene nada que hacer hasta el día del evento'. ¿Qué tarea estratégica le asignarías ahora mismo para que se sienta útil y aporte valor al grupo?" },
  { id: 5, category: "Costes", text: "Tenéis dos proveedores de café: uno premium a 18€/kg y uno estándar a 12€/kg. Si elegís el caro, ¿qué ingrediente del menú sacrificaríais para no subir el precio final al cliente?" },
  { id: 6, category: "Diseño", text: "El cliente pide que el coffee-break sea 'estilo rústico' pero se celebra en una oficina de cristal y acero. ¿Cómo unificáis ambos conceptos en el montaje?" },
  { id: 7, category: "Logística", text: "Tenéis que llevar todo en un solo coche pequeño. ¿Qué va primero, qué va al final?" },
  { id: 8, category: "Logística", text: "La primera persona se para a poner azúcar, la segunda espera, y se crea una cola de 20 metros mientras el resto de la mesa está vacía. ¿Cómo solucionamos ese problema?" },
  { id: 9, category: "Diseño", text: "El cliente es una empresa de tecnología que quiere transmitir 'innovación' y 'limpieza'. ¿Qué paleta de colores elegirías para el mantel y la decoración, y qué elemento visual sorprendente pondríais en el centro de la mesa que no sea el típico jarrón con flores?" },
  { id: 10, category: "Diseño", text: "Tenéis un presupuesto de solo 20€ para toda la decoración de una mesa de 50 personas. ¿Qué tres materiales económicos y fáciles de conseguir compraríais en un bazar o papelería para que el montaje parezca de lujo?" },
  { id: 11, category: "Liderazgo", text: "Faltan 20 minutos para el inicio. Ocurren tres cosas a la vez: 1. El café no ha llegado. 2. Un camarero se ha cortado un dedo. 3. Los carteles del menú tienen una falta de ortografía. Dime en qué orden exacto resuelves estos problemas y a quién delegas cada uno." },
  { id: 12, category: "Liderazgo", text: "Cada comisión está trabajando de forma aislada y el proyecto parece tres eventos distintos en lugar de uno solo. ¿Qué herramienta o reunión diaria implementarías para asegurar que todos los departamentos estén coordinados sin perder tiempo en reuniones largas?" }
];

export default function WorkTeam() {
  // Obtenemos el usuario actual
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const { settings } = useData();
  
  // Estados para la primera parte (borrador de ideas)
  const [draft, setDraft] = useState('');
  const [draftSubmitted, setDraftSubmitted] = useState(false);
  
  // Estados para la segunda parte (respuestas a preguntas y líderes)
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [leaders, setLeaders] = useState<Record<number, string>>({});
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  
  // Estados de control de la interfaz
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para la vista de administrador
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Estados para la herramienta de generación de grupos aleatorios
  const [numGroups, setNumGroups] = useState(4);
  const [randomGroups, setRandomGroups] = useState<any[][]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estados para el modal de borrado
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Verificamos si el usuario tiene permisos de administrador o docente
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  // Efecto para cargar los datos iniciales al montar el componente
  useEffect(() => {
    loadSubmission();
    loadStudents();
    if (isAdmin) {
      loadAllSubmissions();
    }
  }, [appUser]);

  // Función para generar grupos aleatorios de estudiantes
  const generateRandomGroups = () => {
    setIsGenerating(true);
    // Simulamos un pequeño retraso para mostrar la animación de carga
    setTimeout(() => {
      // Barajamos el array de estudiantes aleatoriamente
      const shuffled = [...students].sort(() => 0.5 - Math.random());
      // Creamos un array de arrays vacío para los grupos
      const groups: any[][] = Array.from({ length: numGroups }, () => []);
      // Repartimos los estudiantes uno a uno en los grupos
      shuffled.forEach((student, index) => {
        groups[index % numGroups].push(student);
      });
      setRandomGroups(groups);
      setIsGenerating(false);
    }, 600);
  };

  // Función para cargar la lista de estudiantes desde Firestore
  const loadStudents = async () => {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      // Filtramos solo los usuarios que tienen el rol 'student'
      const users = snapshot.docs.map(doc => doc.data()).filter(u => u.role === 'student');
      setStudents(users);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  // Función para cargar las respuestas del usuario actual
  const loadSubmission = async () => {
    if (!appUser) return;
    try {
      // Buscamos el documento del usuario en la colección 'work_team_submissions'
      const docRef = doc(db, 'work_team_submissions', appUser.email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Restauramos los estados con los datos guardados
        setDraft(data.draft || '');
        setDraftSubmitted(!!data.draft);
        setAnswers(data.answers || {});
        setLeaders(data.leaders || {});
        setFinalSubmitted(data.finalSubmitted || false);
      }
    } catch (error) {
      console.error("Error loading submission:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar todas las respuestas (solo para admin/docente)
  const loadAllSubmissions = async () => {
    try {
      const q = query(collection(db, 'work_team_submissions'));
      const snapshot = await getDocs(q);
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllSubmissions(subs);
    } catch (error) {
      console.error("Error loading all submissions:", error);
    }
  };

  const handleDraftSubmit = async () => {
    if (!appUser || !draft.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'work_team_submissions', appUser.email), {
        userId: appUser.uid,
        userEmail: appUser.email,
        userName: appUser.name,
        group: appUser.group || 'Sin grupo',
        draft,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setDraftSubmitted(true);
      showToast('Borrador guardado correctamente', 'success');
    } catch (error) {
      console.error("Error saving draft:", error);
      showToast('Error al guardar el borrador. Revisa la consola para más detalles.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!appUser) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'work_team_submissions', appUser.email), {
        answers,
        leaders,
        finalSubmitted: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setFinalSubmitted(true);
      showToast('Respuestas guardadas correctamente', 'success');
    } catch (error) {
      console.error("Error saving final answers:", error);
      showToast('Error al guardar las respuestas. Revisa la consola para más detalles.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteAllSubmissions = async () => {
    setIsDeleting(true);
    try {
      const q = query(collection(db, 'work_team_submissions'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'work_team_submissions', d.id)));
      await Promise.all(deletePromises);
      setAllSubmissions([]);
      setShowDeleteModal(false);
      showToast('Respuestas borradas correctamente', 'success');
    } catch (error) {
      console.error("Error deleting submissions:", error);
      showToast('Error al borrar las respuestas. Revisa la consola.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Respuesta',
      message: '¿Estás seguro de eliminar esta respuesta completa? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'work_team_submissions', id));
          setAllSubmissions(prev => prev.filter(sub => sub.id !== id));
          showToast('Respuesta eliminada', 'success');
        } catch (error) {
          console.error("Error deleting submission:", error);
          showToast('Error al eliminar la respuesta.', 'error');
        }
      }
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-stone-500">Cargando...</div>;
  }

  // Admin View
  if (isAdmin) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto print:p-0 print:max-w-none">
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          isDestructive={confirmModal.isDestructive}
        />
        
        {/* Print Header Logo */}
        {settings?.logoUrl && (
          <div className="hidden print:block mb-8 text-center">
            <img src={settings.logoUrl} alt="Logo" className="h-16 object-contain mx-auto" crossOrigin="anonymous" />
          </div>
        )}

        <div className="flex justify-between items-center mb-8 print:hidden">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-sky-100 text-sky-600 rounded-2xl">
              <Users size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Respuestas de Equipos</h1>
              <p className="text-stone-500 mt-1">Caso Práctico: Coffee Break</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {allSubmissions.length > 0 && appUser?.role === 'admin' && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors border border-red-200"
              >
                <Trash2 size={20} />
                Borrar Todo
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-colors"
            >
              <Printer size={20} />
              Imprimir / PDF
            </button>
          </div>
        </div>

        {showDeleteModal && (
          <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle size={28} />
                <h3 className="text-xl font-bold">¿Borrar todas las respuestas?</h3>
              </div>
              <p className="text-stone-600 mb-6">
                Esta acción eliminará permanentemente todas las respuestas y borradores de los alumnos. <strong>No se puede deshacer.</strong>
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAllSubmissions}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors font-medium flex items-center gap-2"
                >
                  {isDeleting ? 'Borrando...' : 'Sí, borrar todo'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-12">
          {/* Generador de Equipos */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 print:hidden break-inside-avoid">
            <div className="flex items-center gap-3 mb-4 text-sky-700">
              <Dices size={28} />
              <h2 className="text-2xl font-bold text-stone-900">Sorteo de Equipos</h2>
            </div>
            <p className="text-stone-600 mb-6 text-lg">Agrupa a los alumnos aleatoriamente para que se sienten juntos y comiencen el caso práctico.</p>
            
            <div className="flex items-center gap-4 mb-8 bg-stone-50 p-4 rounded-xl border border-stone-100">
              <label className="font-medium text-stone-700 text-lg">Número de equipos a formar:</label>
              <input 
                type="number" 
                min="2" 
                max="10" 
                value={numGroups} 
                onChange={(e) => setNumGroups(Number(e.target.value))}
                className="w-24 p-2 border border-stone-200 rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-sky-500"
              />
              <button 
                onClick={generateRandomGroups}
                disabled={isGenerating || students.length === 0}
                className="flex items-center gap-2 bg-sky-600 text-white px-6 py-2.5 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 font-medium text-lg ml-auto"
              >
                <Dices size={24} className={isGenerating ? "animate-spin" : ""} />
                {isGenerating ? 'Sorteando...' : '¡Sortear Equipos!'}
              </button>
            </div>

            {randomGroups.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {randomGroups.map((group, i) => (
                  <div key={i} className="bg-white border-2 border-sky-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-sky-500"></div>
                    <h3 className="font-bold text-xl text-sky-800 mb-4 flex items-center gap-2">
                      <Users size={20} />
                      Equipo {i + 1}
                    </h3>
                    <ul className="space-y-3">
                      {group.map(student => (
                        <li key={student.email} className="text-stone-700 flex items-center gap-3 font-medium">
                          <div className="w-2 h-2 rounded-full bg-sky-400"></div>
                          {student.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Global Leadership Table */}
          {allSubmissions.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 print:shadow-none print:border-none print:p-0 break-inside-avoid">
              <h2 className="text-xl font-bold text-stone-900 mb-4">Tabla Global de Respuestas</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-stone-500 uppercase bg-stone-50">
                    <tr>
                      <th className="px-2 py-2 rounded-tl-lg w-48">Grupo / Equipo</th>
                      {questions.map(q => (
                        <th key={q.id} className="px-2 py-2 text-center leading-tight" title={q.category}>
                          <div>Q{q.id}</div>
                          <div className="text-[10px] font-normal text-stone-400 lowercase">({q.category})</div>
                        </th>
                      ))}
                      {appUser?.role === 'admin' && (
                        <th className="px-2 py-2 text-center rounded-tr-lg w-16 print:hidden">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {allSubmissions.map(sub => (
                      <tr key={sub.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                        <td className="px-2 py-2 font-medium text-stone-900 text-xs leading-tight min-w-[120px]">
                          <div>{sub.userName}</div>
                          <div className="text-stone-500 font-normal">{sub.group}</div>
                        </td>
                        {questions.map(q => (
                          <td key={q.id} className="px-2 py-2 text-stone-600 text-xs text-center">
                            {sub.leaders?.[q.id] || '-'}
                          </td>
                        ))}
                        {appUser?.role === 'admin' && (
                          <td className="px-2 py-2 text-center print:hidden">
                            <button
                              onClick={() => handleDeleteSubmission(sub.id)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar respuesta"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {allSubmissions.length === 0 ? (
            <p className="text-stone-500 text-center py-12 bg-white rounded-2xl border border-stone-200 print:hidden">
              No hay respuestas enviadas todavía.
            </p>
          ) : (
            allSubmissions.map((sub) => (
              <div key={sub.id} className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 print:shadow-none print:border-none print:p-0 print:mb-12 break-inside-avoid">
                <div className="border-b border-stone-200 pb-4 mb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900">{sub.userName}</h2>
                    <p className="text-sky-600 font-medium">Grupo: {sub.group}</p>
                  </div>
                  {appUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteSubmission(sub.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors print:hidden"
                      title="Eliminar respuesta"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-stone-800 mb-3">Borrador de Menú y Coste Estimado</h3>
                  <div className="bg-stone-50 p-4 rounded-xl text-stone-700 whitespace-pre-wrap border border-stone-100">
                    {sub.draft || <span className="text-stone-400 italic">No enviado</span>}
                  </div>
                </div>

                {sub.finalSubmitted && (
                  <div>
                    <h3 className="text-lg font-semibold text-stone-800 mb-4">Respuestas a Preguntas</h3>
                    <div className="space-y-6">
                      {questions.map((q) => (
                        <div key={q.id} className="break-inside-avoid">
                          <p className="font-medium text-stone-900 mb-2">
                            <span className="text-sky-600 mr-2">Pregunta {q.id} ({q.category}):</span>
                            {q.text}
                          </p>
                          <div className="bg-stone-50 p-4 rounded-xl text-stone-700 whitespace-pre-wrap border border-stone-100">
                            {sub.answers?.[q.id] || <span className="text-stone-400 italic">Sin respuesta</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Student View
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-4 bg-sky-100 text-sky-600 rounded-2xl">
          <Users size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Equipo de Trabajo</h1>
          <p className="text-stone-500 mt-1 text-lg">Caso Práctico</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 mb-8">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <AlertCircle size={28} />
          <h2 className="text-2xl font-semibold">Situación</h2>
        </div>
        <div className="p-6 bg-amber-50 rounded-xl border border-amber-100 text-amber-900 text-lg leading-relaxed">
          "Mañana hay un Coffee Break para 50 empresarios del sector de Hostelería. Salen de una reunión a las 11 y tienen 20 minutos para el coffee break. El presupuesto es de sólo 12€ por persona. Tenemos 2 personas veganas, 2 intolerantes al gluten, 1 alérgico al marisco y 4 intolerantes a la lactosa. Tenéis 20 minutos para presentar un borrador de menú y el coste estimado."
        </div>
      </div>

      {!draftSubmitted ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-xl font-semibold text-stone-900 mb-4">Borrador de Menú y Coste Estimado</h3>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe aquí vuestra propuesta de menú y el coste estimado..."
            className="w-full h-48 p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none mb-4"
          />
          <button
            onClick={handleDraftSubmit}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Guardando...' : 'Enviar Borrador'}
            <Send size={20} />
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sky-700">
              <CheckCircle className="shrink-0" size={28} />
              <h3 className="text-xl font-bold">¡Borrador enviado con éxito!</h3>
            </div>
            <div className="pl-10">
              <h4 className="text-sm font-semibold text-sky-800 uppercase tracking-wider mb-2">Vuestra propuesta:</h4>
              <p className="text-sky-900 whitespace-pre-wrap bg-white/60 p-4 rounded-xl border border-sky-200/60">{draft}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Preguntas de Desarrollo</h2>
            
            <div className="space-y-8">
              {questions.map((q) => (
                <div key={q.id} className="space-y-3">
                  <label className="block text-lg font-medium text-stone-900">
                    <span className="text-sky-600 font-bold mr-2">Pregunta {q.id} ({q.category}):</span>
                    {q.text}
                  </label>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    disabled={finalSubmitted}
                    placeholder="Escribe tu respuesta aquí..."
                    className="w-full h-32 p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none disabled:bg-stone-100 disabled:text-stone-600"
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <label className="text-sm font-medium text-stone-700">Líder de esta respuesta:</label>
                    <select
                      value={leaders[q.id] || ''}
                      onChange={(e) => setLeaders({ ...leaders, [q.id]: e.target.value })}
                      disabled={finalSubmitted}
                      className="p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 disabled:bg-stone-100 disabled:text-stone-600"
                    >
                      <option value="">-- Seleccionar alumno --</option>
                      {students.map(s => (
                        <option key={s.email} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {!finalSubmitted ? (
              <div className="mt-8 pt-6 border-t border-stone-200">
                <button
                  onClick={handleFinalSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 bg-sky-600 text-white px-8 py-4 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg w-full justify-center"
                >
                  {saving ? 'Guardando...' : 'Enviar Respuestas Finales'}
                  <Send size={24} />
                </button>
              </div>
            ) : (
              <div className="mt-8 p-6 bg-stone-50 rounded-xl border border-stone-200 text-center text-stone-600 font-medium flex items-center justify-center gap-2">
                <CheckCircle className="text-sky-600" size={24} />
                Respuestas finales enviadas correctamente
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
