import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface User {
  uid: string;
  email: string;
  role: 'admin' | 'student' | 'docente';
  name: string;
  course?: string;
  group?: string;
  createdAt: string;
}

export default function Admin() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'student' | 'docente'>('student');
  const [newCourse, setNewCourse] = useState('2ºCOCINA');
  const [newGroup, setNewGroup] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
    });

    return unsubscribe;
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    
    setLoading(true);
    try {
      // We use the email as the document ID for pre-registration, 
      // but wait, Firebase Auth uses UID. 
      // If we create a document with a random ID, the user won't be able to log in because the AuthContext checks `doc(db, 'users', firebaseUser.uid)`.
      // Ah! The AuthContext needs to check if the email is allowed, or we just create the user document with the UID when they first log in IF their email is in an "allowed_emails" list.
      // Let's adjust the logic: Admin adds allowed emails.
      // Actually, since we don't know their UID yet, let's store them in `users` with their email as the document ID temporarily, or just let them log in and if they aren't in `users`, they get rejected.
      // Wait, if we use their email as the doc ID, when they log in, `firebaseUser.uid` won't match.
      // Let's modify AuthContext to query by email instead of UID, or use a separate `allowed_students` collection.
      // Let's just use the `users` collection but query by email.
      
      // Use email as document ID
      const emailLower = newEmail.toLowerCase();
      const newUserRef = doc(db, 'users', emailLower);
      const userData: any = {
        email: emailLower,
        name: newName,
        role: newRole,
        createdAt: new Date().toISOString()
      };
      
      if (newRole === 'student') {
        userData.course = newCourse;
        userData.group = newGroup;
      }

      await setDoc(newUserRef, userData);
      setNewEmail('');
      setNewName('');
      setNewGroup('1');
      setNewCourse('2ºCOCINA');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error al añadir usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar a este usuario?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Gestión de Usuarios</h1>
        <p className="text-stone-500 mt-2">Añade los correos de los alumnos y docentes para darles acceso a la plataforma.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-emerald-600" />
          Añadir Nuevo Usuario
        </h2>
        <form onSubmit={handleAddStudent} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej. Juan Pérez"
              required
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-stone-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="usuario@gmail.com"
              required
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-stone-700 mb-1">Rol</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'student' | 'docente')}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="student">Alumno</option>
              <option value="docente">Docente</option>
              <option value="admin">Administrador (Tutor)</option>
            </select>
          </div>
          {newRole === 'student' && (
            <>
              <div className="w-40">
                <label className="block text-sm font-medium text-stone-700 mb-1">Curso</label>
                <select
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="2ºCOCINA">2º COCINA</option>
                  <option value="2ºPANADERÍA">2º PANADERÍA</option>
                </select>
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-stone-700 mb-1">Grupo</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      Grupo {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-medium transition-colors h-[42px]"
          >
            {loading ? 'Añadiendo...' : 'Añadir'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Nombre</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Correo</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Rol</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Curso</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Grupo</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {users.map((user) => (
              <tr key={user.uid} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 text-sm text-stone-900 font-medium">{user.name}</td>
                <td className="px-6 py-4 text-sm text-stone-600">{user.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                    user.role === 'docente' ? 'bg-blue-100 text-blue-700' : 
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.role === 'admin' ? 'Tutor' : user.role === 'docente' ? 'Docente' : 'Alumno'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-stone-600">{user.course || '-'}</td>
                <td className="px-6 py-4 text-sm text-stone-600">{user.group ? `Grupo ${user.group}` : '-'}</td>
                <td className="px-6 py-4 text-sm text-right">
                  {appUser?.role === 'admin' && user.email !== appUser?.email && (
                    <button
                      onClick={() => handleDelete(user.uid)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar acceso"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-stone-500">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
