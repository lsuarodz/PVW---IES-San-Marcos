import { AppUser } from '../types';

interface ItemWithVisibility {
  createdBy: string;
  group?: string;
  [key: string]: any;
}

export function canViewItem(
  item: ItemWithVisibility, 
  currentUser: AppUser | null, 
  allUsers: AppUser[],
  options?: {
    commissionMode?: boolean;
    viewOtherGroups?: boolean;
    selectedGroupFilter?: string;
    viewAsStudent?: boolean;
    isKaled?: boolean;
  }
): boolean {
  if (!currentUser) return false;
  
  // Si es un admin real actuando como admin, lo ve todo
  if (currentUser.role === 'admin' && !options?.viewAsStudent) {
    return true;
  }

  const creator = allUsers.find(u => u.name === item.createdBy || u.uid === item.createdBy);
  const itemCourse = creator?.course;
  const itemGroup = item.group || creator?.group;

  // 1. Course Isolation
  // Un usuario regular solo ve lo de su propio curso. 
  // Ojo: Si el creador no tiene curso (ej. admin puro), no se ve por alumnos/docentes, lo cual es lo que pidió el usuario: "ni lo que he añadido yo como administrador"
  if (currentUser.course !== itemCourse) {
    return false;
  }

  // 2. Subgroup Isolation
  if (currentUser.role === 'docente') {
    // Los docentes ven todos los subgrupos de su curso
    return true;
  } else if (currentUser.role === 'student' || (currentUser.role === 'admin' && options?.viewAsStudent)) {
    const isKaled = options?.isKaled;
    const commissionMode = options?.commissionMode;
    const viewOtherGroups = options?.viewOtherGroups;
    const selectedGroupFilter = options?.selectedGroupFilter;

    if (!commissionMode) {
      const matchesGroup = itemGroup ? itemGroup === currentUser.group : item.createdBy === currentUser.name;
      if (!matchesGroup) return false;
    }
    
    if (!viewOtherGroups && !isKaled && commissionMode) {
      const matchesGroup = itemGroup ? itemGroup === currentUser.group : item.createdBy === currentUser.name;
      if (!matchesGroup) return false;
    } 
    
    if (viewOtherGroups && selectedGroupFilter) {
      const matchesGroup = itemGroup ? itemGroup === selectedGroupFilter : true;
      if (!matchesGroup) return false;
    }

    return true;
  }

  return false;
}
