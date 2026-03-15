import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, query, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Users, Send, CheckCircle, Printer, AlertCircle } from 'lucide-react';

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
  const { appUser } = useAuth();
  const [draft, setDraft] = useState('');
  const [draftSubmitted, setDraftSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  useEffect(() => {
    loadSubmission();
    if (isAdmin) {
      loadAllSubmissions();
    }
  }, [appUser]);

  const loadSubmission = async () => {
    if (!appUser) return;
    try {
      const docRef = doc(db, 'work_team_submissions', appUser.email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDraft(data.draft || '');
        setDraftSubmitted(!!data.draft);
        setAnswers(data.answers || {});
        setFinalSubmitted(data.finalSubmitted || false);
      }
    } catch (error) {
      console.error("Error loading submission:", error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("Error al guardar el borrador. Revisa la consola para más detalles.");
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
        finalSubmitted: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setFinalSubmitted(true);
    } catch (error) {
      console.error("Error saving final answers:", error);
      alert("Error al guardar las respuestas. Revisa la consola para más detalles.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center text-stone-500">Cargando...</div>;
  }

  // Admin View
  if (isAdmin) {
    return (
      <div className="p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
              <Users size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Respuestas de Equipos</h1>
              <p className="text-stone-500 mt-1">Caso Práctico: Coffee Break</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-colors"
          >
            <Printer size={20} />
            Imprimir / PDF
          </button>
        </div>

        <div className="space-y-12">
          {allSubmissions.length === 0 ? (
            <p className="text-stone-500 text-center py-12 bg-white rounded-2xl border border-stone-200 print:hidden">
              No hay respuestas enviadas todavía.
            </p>
          ) : (
            allSubmissions.map((sub) => (
              <div key={sub.id} className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 print:shadow-none print:border-none print:p-0 print:mb-12 break-inside-avoid">
                <div className="border-b border-stone-200 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-stone-900">{sub.userName}</h2>
                  <p className="text-emerald-600 font-medium">Grupo: {sub.group}</p>
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
                            <span className="text-emerald-600 mr-2">Pregunta {q.id} ({q.category}):</span>
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
        <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
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
            className="w-full h-48 p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none mb-4"
          />
          <button
            onClick={handleDraftSubmit}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Guardando...' : 'Enviar Borrador'}
            <Send size={20} />
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle className="shrink-0" size={28} />
              <h3 className="text-xl font-bold">¡Borrador enviado con éxito!</h3>
            </div>
            <div className="pl-10">
              <h4 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-2">Vuestra propuesta:</h4>
              <p className="text-emerald-900 whitespace-pre-wrap bg-white/60 p-4 rounded-xl border border-emerald-200/60">{draft}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Preguntas de Desarrollo</h2>
            
            <div className="space-y-8">
              {questions.map((q) => (
                <div key={q.id} className="space-y-3">
                  <label className="block text-lg font-medium text-stone-900">
                    <span className="text-emerald-600 font-bold mr-2">Pregunta {q.id} ({q.category}):</span>
                    {q.text}
                  </label>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    disabled={finalSubmitted}
                    placeholder="Escribe tu respuesta aquí..."
                    className="w-full h-32 p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none disabled:bg-stone-100 disabled:text-stone-600"
                  />
                </div>
              ))}
            </div>

            {!finalSubmitted ? (
              <div className="mt-8 pt-6 border-t border-stone-200">
                <button
                  onClick={handleFinalSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg w-full justify-center"
                >
                  {saving ? 'Guardando...' : 'Enviar Respuestas Finales'}
                  <Send size={24} />
                </button>
              </div>
            ) : (
              <div className="mt-8 p-6 bg-stone-50 rounded-xl border border-stone-200 text-center text-stone-600 font-medium flex items-center justify-center gap-2">
                <CheckCircle className="text-emerald-600" size={24} />
                Respuestas finales enviadas correctamente
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
