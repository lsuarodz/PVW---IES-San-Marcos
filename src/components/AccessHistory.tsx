import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AccessLog } from '../types';
import { useToast } from '../context/ToastContext';
import { 
  History, Search, Filter, Download, Trash2, Smartphone, Monitor, Tablet, 
  CheckCircle, AlertCircle, Clock, Calendar, UserCheck, ShieldAlert,
  Users, RefreshCw, ChevronLeft, ChevronRight, Laptop
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface AccessHistoryProps {
  currentAdminEmail?: string;
}

export default function AccessHistory({ currentAdminEmail }: AccessHistoryProps) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'docente' | 'student' | 'compras' | 'unregistered'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'unauthorized'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  // Escuchar logs de acceso en tiempo real (últimos 400 registros)
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'access_logs'), orderBy('timestamp', 'desc'), limit(400));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: AccessLog[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as AccessLog);
        });
        setLogs(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching access logs:', error);
        handleFirestoreError(error, OperationType.GET, 'access_logs');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Calcular métricas
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    let todayCount = 0;
    const uniqueUsersToday = new Set<string>();
    const uniqueUsersWeek = new Set<string>();
    let unauthorizedCount = 0;

    logs.forEach((log) => {
      const logTime = new Date(log.timestamp).getTime();
      if (log.status === 'unauthorized') {
        unauthorizedCount++;
      }
      if (logTime >= startOfToday) {
        todayCount++;
        if (log.userEmail) uniqueUsersToday.add(log.userEmail.toLowerCase());
      }
      if (logTime >= sevenDaysAgo) {
        if (log.userEmail) uniqueUsersWeek.add(log.userEmail.toLowerCase());
      }
    });

    return {
      total: logs.length,
      today: todayCount,
      uniqueToday: uniqueUsersToday.size,
      uniqueWeek: uniqueUsersWeek.size,
      unauthorized: unauthorizedCount
    };
  }, [logs]);

  // Filtrado de logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const searchTerm = search.toLowerCase().trim();

    return logs.filter((log) => {
      // Filtro de búsqueda
      if (searchTerm) {
        const matchesName = (log.userName || '').toLowerCase().includes(searchTerm);
        const matchesEmail = (log.userEmail || '').toLowerCase().includes(searchTerm);
        const matchesCourse = (log.userCourse || '').toLowerCase().includes(searchTerm);
        const matchesDevice = (log.device || '').toLowerCase().includes(searchTerm);
        if (!matchesName && !matchesEmail && !matchesCourse && !matchesDevice) {
          return false;
        }
      }

      // Filtro de rol
      if (roleFilter !== 'all' && log.userRole !== roleFilter) {
        return false;
      }

      // Filtro de estado
      if (statusFilter !== 'all' && log.status !== statusFilter) {
        return false;
      }

      // Filtro de periodo
      if (periodFilter !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        if (periodFilter === 'today' && logTime < startOfToday) return false;
        if (periodFilter === '7days' && logTime < sevenDaysAgo) return false;
        if (periodFilter === '30days' && logTime < thirtyDaysAgo) return false;
      }

      return true;
    });
  }, [logs, search, roleFilter, statusFilter, periodFilter]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, periodFilter]);

  // Función para exportar a CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('No hay registros de acceso para exportar con los filtros seleccionados', 'info');
      return;
    }

    try {
      const headers = [
        'Fecha y Hora',
        'Usuario',
        'Correo Electrónico',
        'Rol',
        'Curso',
        'Grupo',
        'Dispositivo',
        'Plataforma (SO)',
        'Navegador',
        'Estado de Acceso',
        'Tipo de Acción'
      ];

      const rows = filteredLogs.map((log) => {
        const dateObj = new Date(log.timestamp);
        const formattedDate = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleString('es-ES', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })
          : log.timestamp;

        return [
          `"${formattedDate}"`,
          `"${(log.userName || '').replace(/"/g, '""')}"`,
          `"${(log.userEmail || '').replace(/"/g, '""')}"`,
          `"${(log.userRole || '').replace(/"/g, '""')}"`,
          `"${(log.userCourse || '').replace(/"/g, '""')}"`,
          `"${(log.userGroup || '').replace(/"/g, '""')}"`,
          `"${(log.device || '').replace(/"/g, '""')}"`,
          `"${(log.platform || '').replace(/"/g, '""')}"`,
          `"${(log.browser || '').replace(/"/g, '""')}"`,
          `"${log.status === 'success' ? 'Autorizado' : 'Rechazado (No registrado)'}"`,
          `"${log.action || 'login'}"`
        ].join(';');
      });

      // Añadir BOM (\uFEFF) para que Excel reconozca tildes y caracteres en español
      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `historial_accesos_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Historial de accesos exportado correctamente a CSV', 'success');
    } catch (err) {
      console.error('Error exportando CSV:', err);
      showToast('Error al generar el archivo CSV', 'error');
    }
  };

  // Función para purgar logs antiguos (> 30 días)
  const handleCleanOldLogs = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpiar Historial Antiguo',
      message: '¿Deseas eliminar los registros de acceso con más de 30 días de antigüedad para mantener la base de datos optimizada?',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const snapshot = await getDocs(collection(db, 'access_logs'));
          const batch = writeBatch(db);
          let count = 0;

          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            if (data.timestamp && data.timestamp < thirtyDaysAgo) {
              batch.delete(docSnapshot.ref);
              count++;
            }
          });

          if (count > 0) {
            await batch.commit();
            showToast(`Se han eliminado ${count} registros antiguos con éxito`, 'success');
          } else {
            showToast('No hay registros de más de 30 días para eliminar', 'info');
          }
        } catch (err) {
          console.error('Error limpiando logs antiguos:', err);
          showToast('Error al limpiar registros antiguos', 'error');
        }
      }
    });
  };

  // Formato de tiempo relativo
  const formatTimeAgo = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Desconocida';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const getDeviceIcon = (deviceStr?: string, platform?: string) => {
    const text = `${deviceStr || ''} ${platform || ''}`.toLowerCase();
    if (text.includes('tablet') || text.includes('ipad')) {
      return <Tablet size={16} className="text-purple-600 shrink-0" />;
    }
    if (text.includes('móvil') || text.includes('movil') || text.includes('iphone') || text.includes('android')) {
      return <Smartphone size={16} className="text-blue-600 shrink-0" />;
    }
    return <Laptop size={16} className="text-stone-600 shrink-0" />;
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md text-[11px] font-bold">Tutor (Admin)</span>;
      case 'docente':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-bold">Docente</span>;
      case 'compras':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-bold">Compras</span>;
      case 'student':
        return <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold">Alumno</span>;
      case 'unregistered':
        return <span className="bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-md text-[11px] font-bold">No Registrado</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md text-[11px] font-medium">{role || 'Usuario'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isDestructive={confirmModal.isDestructive}
      />

      {/* Cabecera y descripción de la sección */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 border-l-4 border-l-teal-600">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                Historial y Control de Accesos
                <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Auditoría en Vivo
                </span>
              </h2>
              <p className="text-sm text-stone-500 mt-0.5">
                Controla en tiempo real qué usuarios inician sesión, sus dispositivos, cursos y horas de conexión.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Descargar historial filtrado en formato CSV compatible con Excel"
            >
              <Download size={14} />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={handleCleanOldLogs}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Eliminar logs de más de 30 días para optimizar almacenamiento"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Limpiar &gt;30d</span>
            </button>
          </div>
        </div>

        {/* Métricas KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-stone-100">
          <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/80">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Accesos Hoy</span>
              <Calendar size={15} className="text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{stats.today}</div>
            <p className="text-[11px] text-stone-500 mt-0.5">sesiones iniciadas hoy</p>
          </div>

          <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-100">
            <div className="flex items-center justify-between text-teal-800 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Usuarios Activos Hoy</span>
              <UserCheck size={15} className="text-teal-600" />
            </div>
            <div className="text-2xl font-bold text-teal-950">{stats.uniqueToday}</div>
            <p className="text-[11px] text-teal-700 mt-0.5">usuarios distintos hoy</p>
          </div>

          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between text-blue-800 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Activos Últimos 7 Días</span>
              <Users size={15} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-950">{stats.uniqueWeek}</div>
            <p className="text-[11px] text-blue-700 mt-0.5">docentes y alumnos esta semana</p>
          </div>

          <div className={`p-3.5 rounded-xl border ${
            stats.unauthorized > 0 
              ? 'bg-red-50/80 border-red-200 text-red-900' 
              : 'bg-stone-50/80 border-stone-200/80 text-stone-900'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium uppercase tracking-wider ${stats.unauthorized > 0 ? 'text-red-700 font-bold' : 'text-stone-500'}`}>
                No Autorizados
              </span>
              <ShieldAlert size={15} className={stats.unauthorized > 0 ? 'text-red-600' : 'text-stone-400'} />
            </div>
            <div className={`text-2xl font-bold ${stats.unauthorized > 0 ? 'text-red-700' : 'text-stone-900'}`}>
              {stats.unauthorized}
            </div>
            <p className={`text-[11px] mt-0.5 ${stats.unauthorized > 0 ? 'text-red-700' : 'text-stone-500'}`}>
              {stats.unauthorized > 0 ? 'intentos bloqueados' : 'sin accesos bloqueados'}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-stone-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo, curso o dispositivo..."
              className="w-full pl-9 pr-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Rol */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Todos los roles</option>
              <option value="docente">Docentes</option>
              <option value="student">Alumnos</option>
              <option value="compras">Compras</option>
              <option value="admin">Tutor (Admin)</option>
              <option value="unregistered">No registrados</option>
            </select>

            {/* Filtro Periodo */}
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Cualquier fecha</option>
              <option value="today">Hoy</option>
              <option value="7days">Últimos 7 días</option>
              <option value="30days">Últimos 30 días</option>
            </select>

            {/* Filtro Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Todos los estados</option>
              <option value="success">Acceso Correcto</option>
              <option value="unauthorized">Rechazado</option>
            </select>
          </div>
        </div>

        {/* Resumen de resultados filtrados */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
          <span>
            Mostrando <strong>{filteredLogs.length}</strong> de {logs.length} registros registrados
          </span>
          {(search || roleFilter !== 'all' || periodFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setPeriodFilter('all');
                setStatusFilter('all');
              }}
              className="text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-sm">Cargando historial de accesos...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-stone-50/50">
            <History size={36} className="mx-auto text-stone-300 mb-2" />
            <p className="text-base font-bold text-stone-700">No se encontraron accesos</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {logs.length === 0 
                ? 'El sistema empezará a registrar automáticamente los accesos a medida que los usuarios inicien sesión.' 
                : 'Ningún registro coincide con los filtros de búsqueda aplicados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Usuario</th>
                  <th className="px-5 py-3.5">Rol / Curso</th>
                  <th className="px-5 py-3.5">Fecha y Hora</th>
                  <th className="px-5 py-3.5">Dispositivo y Navegador</th>
                  <th className="px-5 py-3.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {paginatedLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const isValidDate = !isNaN(dateObj.getTime());
                  const formattedExact = isValidDate 
                    ? dateObj.toLocaleString('es-ES', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      })
                    : log.timestamp;
                  const relative = isValidDate ? formatTimeAgo(log.timestamp) : '';

                  const isCurrentUser = currentAdminEmail && log.userEmail?.toLowerCase() === currentAdminEmail.toLowerCase();

                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-stone-50/80 transition-colors ${
                        log.status === 'unauthorized' ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Usuario */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            log.status === 'unauthorized'
                              ? 'bg-red-100 text-red-700'
                              : log.userRole === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : log.userRole === 'docente'
                                  ? 'bg-blue-100 text-blue-800'
                                  : log.userRole === 'compras'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900'
                          }`}>
                            {(log.userName || log.userEmail || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 flex items-center gap-1.5 truncate">
                              <span className="truncate">{log.userName || 'Usuario'}</span>
                              {isCurrentUser && (
                                <span className="bg-stone-200 text-stone-700 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono truncate">
                              {log.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol / Curso */}
                      <td className="px-5 py-3">
                        <div className="space-y-1">
                          <div>{getRoleBadge(log.userRole)}</div>
                          {(log.userCourse || log.userGroup) && (
                            <div className="text-[11px] text-stone-500 font-medium">
                              {log.userCourse || ''} {log.userGroup ? `· Grupo ${log.userGroup}` : ''}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Fecha y Hora */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="text-stone-900 font-medium font-mono text-[11px]">
                          {formattedExact}
                        </div>
                        <div className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          <span>{relative}</span>
                        </div>
                      </td>

                      {/* Dispositivo y Navegador */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(log.device, log.platform)}
                          <div className="min-w-0">
                            <div className="text-stone-800 font-medium text-xs truncate">
                              {log.device || 'Navegador Web'}
                            </div>
                            <div className="text-[11px] text-stone-500 truncate">
                              {log.platform ? `${log.platform}` : ''} {log.browser ? `· ${log.browser}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 shadow-2xs">
                            <CheckCircle size={12} className="text-green-600" />
                            Correcto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs" title="El usuario intentó acceder con una cuenta no autorizada">
                            <AlertCircle size={12} className="text-red-600" />
                            No Autorizado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {filteredLogs.length > itemsPerPage && (
          <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs">
            <span className="text-stone-500">
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredLogs.length} accesos)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-100"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
