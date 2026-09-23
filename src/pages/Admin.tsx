import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Trash2, UserPlus, Settings as SettingsIcon, Image as ImageIcon, 
  Bug, CheckCircle2, Clock, MessageSquare, AlertTriangle,
  Share2, Copy, Check, ExternalLink, Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import ConfirmModal from '../components/ConfirmModal';
import BackupRestore from '../components/BackupRestore';

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
  role: 'admin' | 'student' | 'docente' | 'compras';
  name: string;
  course?: string;
  group?: string;
  commission?: string;
  createdAt: string;
}

interface ErrorReport {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  description: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export default function Admin() {
  // Obtenemos el usuario actual para verificar sus permisos
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const { settings, ingredients, recipes, menus } = useData();
  
  // Estados para almacenar la lista de usuarios y los datos del nuevo usuario a crear
  const [users, setUsers] = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'student' | 'docente' | 'compras'>('student');
  const [newCourse, setNewCourse] = useState('2ºCOCINA');
  const [newGroup, setNewGroup] = useState('1');
  const [newCommission, setNewCommission] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de ordenación
  const [sortBy, setSortBy] = useState<'course' | 'name' | 'role'>('course');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Estado para el logo
  const [logoUrl, setLogoUrl] = useState('');
  const [savingLogo, setSavingLogo] = useState(false);

  // Estados para incidencias / reportes de error
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [reportFilter, setReportFilter] = useState<'pending' | 'all' | 'resolved'>('pending');

  // Estados para compartir enlace de acceso
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const accessUrl = 'https://pvw-ies-san-marcos.onrender.com';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(accessUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = accessUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      showToast('Enlace de acceso copiado al portapapeles', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Error copying link:', err);
      showToast('No se pudo copiar automáticamente. Por favor, selecciona y copia el enlace manualmente.', 'error');
    }
  };

  const handleCopyMessage = async () => {
    const invitationMessage = `Estimado/a docente,\n\nAquí tienes el enlace de acceso a la aplicación de gestión de cocina, recetas y pedidos del centro:\n${accessUrl}\n\nPuedes acceder directamente identificándote con tu cuenta de Google.`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(invitationMessage);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = invitationMessage;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedMessage(true);
      showToast('Mensaje de invitación copiado al portapapeles', 'success');
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch (err) {
      console.error('Error copying invitation message:', err);
      showToast('No se pudo copiar el mensaje automáticamente.', 'error');
    }
  };

  useEffect(() => {
    if (settings?.logoUrl) {
      setLogoUrl(settings.logoUrl);
    }
  }, [settings]);

  // Efecto para escuchar los reportes de error en tiempo real
  useEffect(() => {
    if (appUser?.role === 'admin' || appUser?.role === 'docente') {
      const unsubscribe = onSnapshot(collection(db, 'error_reports'), (snapshot) => {
        const reports: ErrorReport[] = [];
        snapshot.forEach((doc) => {
          reports.push({ id: doc.id, ...doc.data() } as ErrorReport);
        });
        reports.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setErrorReports(reports);
      });
      return unsubscribe;
    }
  }, [appUser]);

  const handleToggleReportStatus = async (reportId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
      await updateDoc(doc(db, 'error_reports', reportId), {
        status: nextStatus,
        resolvedAt: nextStatus === 'resolved' ? new Date().toISOString() : null,
        resolvedBy: nextStatus === 'resolved' ? (appUser?.name || 'Admin') : null
      });
      showToast(`Incidencia marcada como ${nextStatus === 'resolved' ? 'resuelta' : 'pendiente'}`, 'success');
    } catch (err) {
      console.error('Error actualizando incidencia:', err);
      showToast('Error al actualizar el estado de la incidencia', 'error');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Reporte de Error',
      message: '¿Estás seguro de que deseas eliminar este reporte de error?',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'error_reports', reportId));
          showToast('Reporte eliminado', 'success');
        } catch (err) {
          console.error('Error eliminando reporte:', err);
          showToast('Error al eliminar el reporte', 'error');
        }
      }
    });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'course') {
      const courseA = a.course || '';
      const courseB = b.course || '';
      if (courseA < courseB) return sortOrder === 'asc' ? -1 : 1;
      if (courseA > courseB) return sortOrder === 'asc' ? 1 : -1;
      // Secondary sort by name
      return (a.name || '').localeCompare(b.name || '');
    } else if (sortBy === 'role') {
      const roleA = a.role || '';
      const roleB = b.role || '';
      if (roleA < roleB) return sortOrder === 'asc' ? -1 : 1;
      if (roleA > roleB) return sortOrder === 'asc' ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '');
    } else {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    }
  });

  const handleSort = (field: 'course' | 'name' | 'role') => {
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
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData: User[] = [];
        snapshot.forEach((doc) => {
          usersData.push({ uid: doc.id, ...doc.data() } as User);
        });
        setUsers(usersData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    );

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
      const emailLower = newEmail.toLowerCase().trim();
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Tutor (Admin)';
      case 'docente': return 'Docente';
      case 'compras': return 'Compras';
      case 'student': return 'Alumno';
      default: return role;
    }
  };

  const handleUpdateRole = async (uid: string, newRole: 'admin' | 'student' | 'docente' | 'compras') => {
    const userToUpdate = users.find(u => u.uid === uid);
    if (!userToUpdate || userToUpdate.role === newRole) return;

    // Advertencia de seguridad si el usuario autenticado está cambiando su propio rol de administrador
    if (userToUpdate.email === appUser?.email && newRole !== 'admin') {
      setConfirmModal({
        isOpen: true,
        title: 'Cambiar tu propio rol',
        message: 'Estás a punto de quitarte los permisos de Administrador/Tutor. Si continúas, perderás el acceso a este panel de administración. ¿Deseas continuar?',
        isDestructive: true,
        onConfirm: async () => {
          try {
            await updateDoc(doc(db, 'users', uid), { role: newRole });
            showToast(`Tu rol ha sido actualizado a ${getRoleLabel(newRole)}`, 'success');
          } catch (error) {
            console.error('Error updating role:', error);
            showToast('Error al actualizar el rol', 'error');
            handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
          }
        }
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      showToast(`Rol de ${userToUpdate.name || userToUpdate.email} actualizado a ${getRoleLabel(newRole)}`, 'success');
    } catch (error) {
      console.error('Error updating role:', error);
      showToast('Error al actualizar el rol', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
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

  const handleCleanStudentData = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar datos de alumnos',
      message: '¿Estás completamente seguro de que deseas eliminar todas las recetas, ingredientes y menús creados por alumnos de la base de datos? Esta acción es irreversible.',
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const studentUsers = users.filter(u => u.role === 'student');
          const teacherAndAdminUsers = users.filter(u => u.role === 'admin' || u.role === 'docente');
          
          // Construir identificadores de profesores y administradores para proteger sus datos
          const teacherAndAdminIdentifiers = new Set<string>();
          teacherAndAdminIdentifiers.add("lsuarodzmail.com@gmail.com");
          teacherAndAdminIdentifiers.add("admin");
          teacherAndAdminUsers.forEach(u => {
            if (u.name) teacherAndAdminIdentifiers.add(u.name.toLowerCase().trim());
            if (u.email) teacherAndAdminIdentifiers.add(u.email.toLowerCase().trim());
            if (u.uid) teacherAndAdminIdentifiers.add(u.uid.toLowerCase().trim());
          });

          // Construir identificadores de alumnos
          const studentIdentifiers = new Set<string>();
          studentUsers.forEach(u => {
            if (u.name) studentIdentifiers.add(u.name.toLowerCase().trim());
            if (u.email) studentIdentifiers.add(u.email.toLowerCase().trim());
            if (u.uid) studentIdentifiers.add(u.uid.toLowerCase().trim());
            if (u.group) {
              const g = u.group.toLowerCase().trim();
              studentIdentifiers.add(g);
              studentIdentifiers.add(`grupo ${g}`);
            }
          });

          // Función auxiliar para determinar si un elemento es del alumnado
          const isStudentItem = (item: { id?: string; createdBy?: string; group?: string }) => {
            if (!item.id) return false;
            
            const createdByLower = item.createdBy?.toLowerCase().trim() || '';
            const groupLower = item.group?.toLowerCase().trim() || '';

            // Si es un creador explícitamente docente o admin, protegerlo
            if (createdByLower !== '' && teacherAndAdminIdentifiers.has(createdByLower)) {
              return false;
            }

            // Si tiene grupo asignado, o el creador contiene "grupo", o el creador es solo un dígito (ej. "5")
            if (groupLower !== '' || createdByLower.includes('grupo') || /^\d+$/.test(createdByLower)) {
              return true;
            }

            // Si el creador coincide con algún identificador de alumno conocido
            if (createdByLower !== '' && studentIdentifiers.has(createdByLower)) {
              return true;
            }

            // Si algún alumno tiene ese grupo asignado
            if (groupLower !== '' && studentUsers.some(su => su.group && su.group.toLowerCase().trim() === groupLower)) {
              return true;
            }

            return false;
          };

          const recipesToDelete = recipes.filter(isStudentItem);
          const ingredientsToDelete = ingredients.filter(isStudentItem);
          const menusToDelete = menus.filter(isStudentItem);

          console.log(`Eliminando de alumnos: ${recipesToDelete.length} recetas, ${ingredientsToDelete.length} ingredientes, ${menusToDelete.length} menús.`);

          // Ejecutamos las eliminaciones en paralelo para que sea hiper-rápido y no se quede colgado
          const recipePromises = recipesToDelete.map(recipe => deleteDoc(doc(db, 'recipes', recipe.id)));
          const ingredientPromises = ingredientsToDelete.map(ingredient => deleteDoc(doc(db, 'ingredients', ingredient.id)));
          const menuPromises = menusToDelete.map(menu => deleteDoc(doc(db, 'menus', menu.id)));

          await Promise.all([...recipePromises, ...ingredientPromises, ...menuPromises]);

          showToast(`Limpieza completada: Se eliminaron ${recipesToDelete.length} recetas, ${ingredientsToDelete.length} ingredientes y ${menusToDelete.length} menús de alumnos.`, 'success');
        } catch (error) {
          console.error('Error cleaning student data:', error);
          showToast('Error al limpiar los datos de alumnos', 'error');
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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

      {/* Tarjeta de Enlace de Acceso para Docentes */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8 border-l-4 border-l-teal-600">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
              <Share2 size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                Enlace de Acceso al Programa
                <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  Para Docentes
                </span>
              </h2>
              <p className="text-sm text-stone-500">
                Comparte este enlace directo con los profesores y el equipo educativo para que puedan acceder e iniciar sesión en la plataforma.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 sm:p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 flex items-center bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 font-mono select-all overflow-x-auto shadow-inner">
              <LinkIcon size={16} className="text-stone-400 mr-2 shrink-0" />
              <span className="truncate">{accessUrl}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium text-xs sm:text-sm transition-all shadow-sm active:scale-95"
                title="Copiar enlace directo al portapapeles"
              >
                {copiedLink ? (
                  <>
                    <Check size={16} className="text-teal-200" />
                    <span>¡Enlace copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg font-medium text-xs sm:text-sm transition-all shadow-sm active:scale-95"
                title="Copiar mensaje de invitación redactado"
              >
                {copiedMessage ? (
                  <>
                    <Check size={16} className="text-teal-600" />
                    <span>¡Mensaje copiado!</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} className="text-stone-500" />
                    <span className="hidden sm:inline">Copiar Mensaje</span>
                    <span className="sm:hidden">Mensaje</span>
                  </>
                )}
              </button>

              <a
                href={accessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-2.5 bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 rounded-lg transition-colors shadow-sm"
                title="Abrir programa en una nueva pestaña"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 text-xs text-stone-600 bg-teal-50/60 p-3 rounded-lg border border-teal-100">
          <CheckCircle2 size={16} className="text-teal-700 mt-0.5 shrink-0" />
          <p>
            <strong>¿Cómo acceden los docentes?</strong> Los profesores solo necesitan abrir el enlace e identificarse con su cuenta de Google. Si aún no tienen el rol de docente asignado, puedes crearlos con antelación o cambiar su rol a <span className="font-semibold text-teal-800">docente</span> en la sección de <em>Gestión de Usuarios</em> que encontrarás más abajo.
          </p>
        </div>
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

      <BackupRestore />

      {/* Sección de Reportes de Error e Incidencias */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8 border-l-4 border-l-amber-500">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
              <Bug size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                Reportes de Error e Incidencias
                {errorReports.filter(r => r.status === 'pending').length > 0 && (
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {errorReports.filter(r => r.status === 'pending').length} pendientes
                  </span>
                )}
              </h2>
              <p className="text-sm text-stone-500">
                Incidencias y errores reportados por los usuarios desde la aplicación.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                reportFilter === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Pendientes ({errorReports.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setReportFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                reportFilter === 'resolved'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Resueltos ({errorReports.filter(r => r.status === 'resolved').length})
            </button>
            <button
              onClick={() => setReportFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                reportFilter === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Todos ({errorReports.length})
            </button>
          </div>
        </div>

        {errorReports.filter(r => reportFilter === 'all' ? true : r.status === reportFilter).length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-100 text-stone-500 text-sm">
            No hay reportes de error {reportFilter === 'pending' ? 'pendientes' : reportFilter === 'resolved' ? 'resueltos' : 'registrados'}.
          </div>
        ) : (
          <div className="space-y-3">
            {errorReports
              .filter(r => reportFilter === 'all' ? true : r.status === reportFilter)
              .map((report) => (
                <div
                  key={report.id}
                  className={`p-4 rounded-xl border transition-all ${
                    report.status === 'resolved'
                      ? 'bg-stone-50 border-stone-200 opacity-75'
                      : 'bg-red-50/40 border-red-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        report.status === 'resolved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {report.status === 'resolved' ? 'Resuelto' : 'Pendiente'}
                      </span>
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <Clock size={13} />
                        {report.createdAt ? new Date(report.createdAt).toLocaleString('es-ES') : 'Fecha desconocida'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleReportStatus(report.id, report.status)}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          report.status === 'resolved'
                            ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {report.status === 'resolved' ? 'Marcar Pendiente' : 'Marcar Resuelto'}
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar reporte"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-stone-600 mb-2 font-medium">
                    Reportado por: <span className="text-stone-900 font-semibold">{report.userName || 'Desconocido'}</span> ({report.userEmail || 'Sin email'}) &bull; Rol: <span className="capitalize">{report.userRole || 'Sin rol'}</span>
                  </div>

                  <p className="text-sm text-stone-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-stone-200/80 font-mono text-xs leading-relaxed">
                    {report.description}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Sección de Mantenimiento de Datos */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8 border-l-4 border-l-red-500">
        <h2 className="text-lg font-semibold text-stone-900 mb-2 flex items-center gap-2">
          <Trash2 size={20} className="text-red-600" />
          Mantenimiento de Base de Datos
        </h2>
        <p className="text-sm text-stone-600 mb-4 max-w-3xl">
          Esta herramienta permite limpiar el catálogo eliminando de forma definitiva todas las recetas (tanto los elaborados como los platos), ingredientes y menús que hayan sido creados por usuarios con rol de <strong>Alumno</strong>.
        </p>
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl max-w-2xl mb-4 flex items-start gap-3">
          <div className="text-red-600 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-xs text-red-800 font-medium leading-relaxed">
            <strong>ADVERTENCIA:</strong> Esta acción es irreversible. Se eliminarán permanentemente todas las recetas, ingredientes y menús creados por alumnos. No afectará a los datos de docentes o administradores.
          </p>
        </div>
        <button
          onClick={handleCleanStudentData}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
          {loading ? 'Procesando eliminación...' : 'Eliminar Recetas, Ingredientes y Menús de Alumnos'}
        </button>
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
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'student' | 'docente' | 'compras')}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="student">Alumno</option>
              <option value="docente">Docente</option>
              <option value="compras">Compras</option>
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
                <option value="1ºFPBásica">1º FPBásica</option>
                <option value="2ºFPBásica">2º FPBásica</option>
                <option value="1ºSemiCocina">1º SemiCocina</option>
                <option value="3ºSemiCocina">3º SemiCocina</option>
                <option value="2ºServicios">2º Servicios</option>
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
              <th 
                className="px-6 py-4 text-sm font-semibold text-stone-900 cursor-pointer hover:bg-stone-100 transition-colors"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center gap-2">
                  Rol
                  {sortBy === 'role' && (
                    <span className="text-stone-400 text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
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
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.uid, e.target.value as 'admin' | 'student' | 'docente' | 'compras')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all ${
                      user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100' : 
                      user.role === 'docente' ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' : 
                      user.role === 'compras' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' : 
                      'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                    title="Haz clic para cambiar el rol de este usuario"
                  >
                    <option value="student">Alumno</option>
                    <option value="docente">Docente</option>
                    <option value="compras">Compras</option>
                    <option value="admin">Tutor (Admin)</option>
                  </select>
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
                        user.course === '2ºSUPERIOR COCINA' ? 'border-teal-300 text-teal-700 bg-teal-50' :
                        user.course === '1ºFPBásica' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                        user.course === '2ºFPBásica' ? 'border-green-300 text-green-700 bg-green-50' :
                        user.course === '1ºSemiCocina' ? 'border-cyan-300 text-cyan-700 bg-cyan-50' :
                        user.course === '3ºSemiCocina' ? 'border-indigo-300 text-indigo-700 bg-indigo-50' :
                        user.course === '2ºServicios' ? 'border-rose-300 text-rose-700 bg-rose-50' :
                        'border-stone-200 text-stone-700'
                      }`}
                    >
                      <option value="">Sin curso</option>
                      <option value="2ºCOCINA">2º COCINA</option>
                      <option value="2ºPANADERÍA">2º PANADERÍA</option>
                      <option value="1ºCOCINA">1º COCINA</option>
                      <option value="1ºPANADERÍA">1º PANADERÍA</option>
                      <option value="2ºSUPERIOR COCINA">2º SUPERIOR COCINA</option>
                      <option value="1ºFPBásica">1º FPBásica</option>
                      <option value="2ºFPBásica">2º FPBásica</option>
                      <option value="1ºSemiCocina">1º SemiCocina</option>
                      <option value="3ºSemiCocina">3º SemiCocina</option>
                      <option value="2ºServicios">2º Servicios</option>
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
