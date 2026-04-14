import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, UserPlus, Settings as SettingsIcon, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import ConfirmModal from '../components/ConfirmModal';

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
  // Obtenemos el usuario actual para verificar sus permisos
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const { settings } = useData();
  
  // Estados para almacenar la lista de usuarios y los datos del nuevo usuario a crear
  const [users, setUsers] = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'student' | 'docente'>('student');
  const [newCourse, setNewCourse] = useState('2ºCOCINA');
  const [newGroup, setNewGroup] = useState('1');
  const [loading, setLoading] = useState(false);

  // Estado para el logo
  const [logoUrl, setLogoUrl] = useState('');
  const [savingLogo, setSavingLogo] = useState(false);

  useEffect(() => {
    if (settings?.logoUrl) {
      setLogoUrl(settings.logoUrl);
    }
  }, [settings]);

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

  // Efecto para cargar la lista de usuarios desde Firestore en tiempo real
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

  // Función para añadir un nuevo usuario (alumno, docente o admin)
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    
    setLoading(true);
    try {
      // Usamos el email como ID del documento para facilitar la validación en el login
      const emailLower = newEmail.toLowerCase();
      const newUserRef = doc(db, 'users', emailLower);
      const userData: any = {
        email: emailLower,
        name: newName,
        role: newRole,
        createdAt: new Date().toISOString()
      };
      
      // Solo guardamos curso y grupo si el rol es estudiante
      if (newRole === 'student') {
        userData.course = newCourse;
        userData.group = newGroup;
      }

      // Guardamos el usuario en Firestore
      await setDoc(newUserRef, userData);
      
      // Limpiamos el formulario
      setNewEmail('');
      setNewName('');
      setNewGroup('1');
      setNewCourse('2ºCOCINA');
      showToast('Usuario añadido correctamente', 'success');
    } catch (error) {
      console.error('Error adding user:', error);
      showToast('Error al añadir usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar el acceso de un usuario
  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: '¿Estás seguro de que quieres eliminar a este usuario?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', id));
          showToast('Usuario eliminado', 'success');
        } catch (error) {
          console.error('Error deleting user:', error);
          showToast('Error al eliminar usuario', 'error');
        }
      }
    });
  };

  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLogo(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), { logoUrl }, { merge: true });
      showToast('Logo actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error saving logo:', error);
      showToast('Error al guardar el logo', 'error');
    } finally {
      setSavingLogo(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isDestructive={confirmModal.isDestructive}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Administración</h1>
        <p className="text-stone-500 mt-2">Gestiona los usuarios y la configuración global de la plataforma.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <SettingsIcon size={20} className="text-amber-600" />
          Configuración Global
        </h2>
        <form onSubmit={handleSaveLogo} className="flex flex-wrap gap-4 items-end max-w-2xl">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center gap-2">
              <ImageIcon size={16} />
              URL del Logo del Centro
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="https://ejemplo.com/logo.png o /logo.png"
            />
            <p className="text-xs text-stone-500 mt-1">Esta imagen aparecerá en la cabecera de los presupuestos y menús impresos.</p>
          </div>
          <button
            type="submit"
            disabled={savingLogo}
            className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2 rounded-xl font-medium transition-colors h-[42px]"
          >
            {savingLogo ? 'Guardando...' : 'Guardar Logo'}
          </button>
        </form>
        {logoUrl && (
          <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-200 inline-block">
            <p className="text-xs font-medium text-stone-500 mb-2 uppercase tracking-wider">Vista previa</p>
            <img src={logoUrl} alt="Logo preview" className="h-16 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-amber-600" />
          Añadir Nuevo Usuario
        </h2>
        <form onSubmit={handleAddStudent} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="usuario@gmail.com"
              required
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-stone-700 mb-1">Rol</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'student' | 'docente')}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl font-medium transition-colors h-[42px]"
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
                    'bg-amber-100 text-amber-700'
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
