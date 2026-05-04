import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Lightbulb } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { AppUser, CommissionTask } from '../types';

const COMMISSIONS = [
  'GASTOS',
  'LOGÍSTICA',
  'DISEÑO Y MARKETING',
  'SOSTENIBILIDAD'
];

export default function Commissions() {
  const { appUser, commissionMode } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<CommissionTask[]>([]);
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    // Escuchar usuarios para ver comisiones
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const uData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
      setUsers(uData);
    });

    // Escuchar tareas
    const qTasks = query(collection(db, 'commission_tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const tData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionTask));
      setTasks(tData);
    }, (error) => {
        console.error("Error fetching tasks:", error);
    });

    return () => {
      unsubUsers();
      unsubTasks();
    };
  }, []);

  const handleAddTask = async (commission: string) => {
    const ideaText = newTaskTexts[commission]?.trim();
    if (!ideaText) return;

    if (!appUser) {
      showToast('Debes iniciar sesión para añadir ideas', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'commission_tasks'), {
        commission,
        idea: ideaText,
        createdBy: appUser.name,
        createdAt: new Date().toISOString()
      });
      showToast('Idea añadida', 'success');
      setNewTaskTexts(prev => ({ ...prev, [commission]: '' }));
    } catch (error) {
      console.error('Error adding task:', error);
      showToast('Error al añadir idea', 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    // Only admin can delete
    if (appUser?.role !== 'admin') {
      showToast('No tienes permiso para borrar esta idea', 'error');
      return;
    }

    try {
      await deleteDoc(doc(db, 'commission_tasks', id));
      showToast('Idea eliminada', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast('Error al eliminar', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
          <Users size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Jornada 3: Comisiones</h1>
          <p className="text-stone-500 mt-1">Gestión de miembros y lluvia de ideas de responsabilidades por comisión.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {COMMISSIONS.map(commission => {
          const commissionUsers = users.filter(u => u.commission === commission);
          const commissionTasks = tasks.filter(t => t.commission === commission);
          
          return (
            <div key={commission} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full">
              <div className="bg-stone-50 border-b border-stone-200 p-4">
                <h2 className="text-lg font-bold text-stone-900 tracking-tight">{commission}</h2>
                <div className="mt-2 text-sm text-stone-600">
                  <span className="font-semibold text-stone-700">Miembros asignados:</span>{' '}
                  {commissionUsers.length > 0 ? (
                    commissionUsers.map(u => u.name).join(', ')
                  ) : (
                    <span className="text-stone-400 italic">Sin miembros asignados mediante el administrador</span>
                  )}
                </div>
              </div>
              
              <div className="p-4 flex-1 flex flex-col h-[350px]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-500" />
                  Ideas y Responsabilidades
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4">
                  {commissionTasks.length === 0 ? (
                    <div className="text-center py-6 text-stone-400 text-sm italic">
                      Aún no hay ideas para esta comisión. ¡Añade la primera!
                    </div>
                  ) : (
                    commissionTasks.map(task => (
                      <div key={task.id} className="bg-stone-50 p-3 rounded-xl border border-stone-100 relative group">
                        <p className="text-stone-800 text-sm whitespace-pre-wrap pr-8">{task.idea}</p>
                        <div className="text-[10px] text-stone-400 mt-2 uppercase tracking-wide">
                          Añadido por {task.createdBy}
                        </div>
                        {appUser?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="absolute top-2 right-2 p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                {appUser && (appUser.role === 'admin' || appUser.role === 'docente' || (commissionMode && (appUser.commission === commission || appUser.commission === ''))) && (
                  <div className="mt-auto pt-4 border-t border-stone-100">
                    <div className="flex gap-2 relative">
                      <textarea
                        value={newTaskTexts[commission] || ''}
                        onChange={(e) => setNewTaskTexts(prev => ({ ...prev, [commission]: e.target.value }))}
                        placeholder="Añade una nueva idea o responsabilidad..."
                        className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none h-20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddTask(commission);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddTask(commission)}
                        disabled={!(newTaskTexts[commission]?.trim())}
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 disabled:bg-stone-100 p-2 rounded-xl transition-colors self-end absolute right-2 bottom-2"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
