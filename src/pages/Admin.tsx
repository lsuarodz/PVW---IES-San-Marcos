import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, UserPlus, Settings as SettingsIcon, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import ConfirmModal from '../components/ConfirmModal';

const getAvailableGroups = (course?: string): number[] => {
  switch (course) {
    case '2ºPANADERÍA': return [1, 2, 3];
    case '1ºCOCINA': return [4, 5, 6, 7, 8];
    case '1ºPANADERÍA': return [9, 10, 11];
    case '2ºSUPERIOR COCINA': return Array.from({length: 13}, (_, i) => i + 12);
    default: return Array.from({length: 24}, (_, i) => i + 1); // 2ºCOCINA y fallback
  }
};

interface User {
  uid: string;
  email: string;
  role: 'admin' | 'student' | 'docente';
  name: string;
  course?: string;
  group?: string;
  commission?: string;
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
  const [newCommission, setNewCommission] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de ordenación
  const [sortBy, setSortBy] = useState<'course' | 'name'>('course');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Estado para el logo
  const [logoUrl, setLogoUrl] = useState('');
  const [savingLogo, setSavingLogo] = useState(false);

  useEffect(() => {
    if (settings?.logoUrl) {
      setLogoUrl(settings.logoUrl);
    }
  }, [settings]);

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'course') {
      const courseA = a.course || '';
      const courseB = b.course || '';
      if (courseA < courseB) return sortOrder === 'asc' ? -1 : 1;
      if (courseA > courseB) return sortOrder === 'asc' ? 1 : -1;
      // Secondary sort by name
      return a.name.localeCompare(b.name);
    } else {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    }
  });

  const handleSort = (field: 'course' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

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

  useEffect(() => {
    const available = getAvailableGroups(newCourse);
    if (!available.includes(Number(newGroup))) {
      setNewGroup(String(available[0]));
    }
  }, [newCourse, newGroup]);

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
      
      // Solo guardamos curso y grupo
      if (newRole === 'student' || newRole === 'docente') {
        userData.course = newCourse;
      }
      if (newRole === 'student') {
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
  const handleUpdateCommission = async (uid: string, commission: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { commission });
      showToast('Comisión actualizada correctamente', 'success');
    } catch (error) {
      console.error('Error updating commission:', error);
      showToast('Error al actualizar la comisión', 'error');
    }
  };

  const handleUpdateGroup = async (uid: string, group: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { group });
      showToast('Grupo actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error updating group:', error);
      showToast('Error al actualizar el grupo', 'error');
    }
  };

  const handleUpdateCourse = async (uid: string, course: string) => {
    try {
      const userToUpdate = users.find(u => u.uid === uid);
      const updates: any = { course };
      if (userToUpdate && userToUpdate.role === 'student' && userToUpdate.group) {
        const available = getAvailableGroups(course);
        if (!available.includes(Number(userToUpdate.group))) {
          updates.group = String(available[0]);
        }
      }
      await updateDoc(doc(db, 'users', uid), updates);
      showToast('Curso actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error updating course:', error);
      showToast('Error al actualizar el curso', 'error');
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
    <div className="p-8 w-full max-w-7xl mx-auto">
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
          {(newRole === 'student' || newRole === 'docente') && (
            <div className="w-40">
              <label className="block text-sm font-medium text-stone-700 mb-1">Curso</label>
              <select
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="2ºCOCINA">2º COCINA</option>
                <option value="2ºPANADERÍA">2º PANADERÍA</option>
                <option value="1ºCOCINA">1º COCINA</option>
                <option value="1ºPANADERÍA">1º PANADERÍA</option>
                <option value="2ºSUPERIOR COCINA">2º SUPERIOR COCINA</option>
              </select>
            </div>
          )}
          {newRole === 'student' && (
            <>
              <div className="w-32">
                <label className="block text-sm font-medium text-stone-700 mb-1">Grupo</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {getAvailableGroups(newCourse).map((g) => (
                    <option key={g} value={String(g)}>
                      Grupo {g}
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

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th 
                className="px-6 py-4 text-sm font-semibold text-stone-900 cursor-pointer hover:bg-stone-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Nombre
                  {sortBy === 'name' && (
                    <span className="text-stone-400 text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Correo</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Rol</th>
              <th 
                className="px-6 py-4 text-sm font-semibold text-stone-900 cursor-pointer hover:bg-stone-100 transition-colors"
                onClick={() => handleSort('course')}
              >
                <div className="flex items-center gap-2">
                  Curso
                  {sortBy === 'course' && (
                    <span className="text-stone-400 text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Grupo</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Comisión</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {sortedUsers.map((user) => (
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
                <td className="px-6 py-4 text-sm text-stone-600">
                  {user.role === 'student' || user.role === 'docente' ? (
                    <select
                      value={user.course || ''}
                      onChange={(e) => handleUpdateCourse(user.uid, e.target.value)}
                      className={`px-2 py-1 bg-white border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                        user.course === '2ºPANADERÍA' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                        user.course === '2ºCOCINA' ? 'border-orange-300 text-orange-700 bg-orange-50' :
                        user.course === '1ºPANADERÍA' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                        user.course === '1ºCOCINA' ? 'border-red-300 text-red-700 bg-red-50' :
                        'border-stone-200 text-stone-700'
                      }`}
                    >
                      <option value="">Sin curso</option>
                      <option value="2ºCOCINA">2º COCINA</option>
                      <option value="2ºPANADERÍA">2º PANADERÍA</option>
                      <option value="1ºCOCINA">1º COCINA</option>
                      <option value="1ºPANADERÍA">1º PANADERÍA</option>
                      <option value="2ºSUPERIOR COCINA">2º SUPERIOR COCINA</option>
                    </select>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-stone-600">
                  {user.role === 'student' ? (
                    <select
                      value={user.group || ''}
                      onChange={(e) => handleUpdateGroup(user.uid, e.target.value)}
                      className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">Sin grupo</option>
                      {getAvailableGroups(user.course).map((g) => (
                        <option key={g} value={String(g)}>
                          Grupo {g}
                        </option>
                      ))}
                    </select>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-stone-600">
                  {user.role === 'student' ? (
                    <select
                      value={user.commission || ''}
                      onChange={(e) => handleUpdateCommission(user.uid, e.target.value)}
                      className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">Sin comisión</option>
                      <option value="GASTOS">Gastos</option>
                      <option value="LOGÍSTICA">Logística</option>
                      <option value="DISEÑO Y MARKETING">Diseño y Marketing</option>
                      <option value="SOSTENIBILIDAD">Sostenibilidad</option>
                    </select>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  {(appUser?.role === 'admin' || appUser?.role === 'docente') && user.email !== appUser?.email && (
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
                <td colSpan={7} className="px-6 py-8 text-center text-stone-500">
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
