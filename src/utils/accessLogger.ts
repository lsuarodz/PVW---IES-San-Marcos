import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AccessLog } from '../types';

export function detectDeviceInfo(): { device: string; platform: string; browser: string } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { device: 'Ordenador', platform: 'Escritorio', browser: 'Web' };
  }

  const ua = navigator.userAgent;
  let browser = 'Navegador Web';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Chromium|OPR|Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome|Chromium|OPR|Edg/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

  let platform = 'PC / Escritorio';
  if (/Windows/i.test(ua)) platform = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) platform = 'macOS';
  else if (/Android/i.test(ua)) platform = 'Android';
  else if (/iPhone/i.test(ua)) platform = 'iPhone (iOS)';
  else if (/iPad/i.test(ua)) platform = 'iPad (iPadOS)';
  else if (/Linux/i.test(ua)) platform = 'Linux';

  const isMobile = /Android|iPhone|iPod/i.test(ua);
  const isTablet = /iPad/i.test(ua) || (platform.includes('macOS') && navigator.maxTouchPoints > 1);

  let deviceCategory = 'Ordenador';
  if (isTablet) deviceCategory = 'Tablet';
  else if (isMobile) deviceCategory = 'Móvil';

  return {
    device: `${deviceCategory} (${browser})`,
    platform,
    browser
  };
}

interface RecordAccessParams {
  userId?: string;
  userEmail: string;
  userName: string;
  userRole: 'admin' | 'student' | 'docente' | 'compras' | 'unregistered';
  userCourse?: string;
  userGroup?: string;
  status: 'success' | 'unauthorized';
  action?: 'login' | 'session_start';
}

export async function logUserAccess(params: RecordAccessParams): Promise<void> {
  try {
    const { device, platform, browser } = detectDeviceInfo();
    const timestamp = new Date().toISOString();
    const logRef = doc(collection(db, 'access_logs'));

    const accessData: AccessLog = {
      id: logRef.id,
      userEmail: params.userEmail.toLowerCase().trim(),
      userName: params.userName.trim() || 'Usuario',
      userRole: params.userRole,
      timestamp,
      device,
      platform,
      browser,
      status: params.status,
      action: params.action || 'login'
    };

    if (params.userId) accessData.userId = params.userId;
    if (params.userCourse) accessData.userCourse = params.userCourse;
    if (params.userGroup) accessData.userGroup = params.userGroup;

    // Guardar en la colección de auditoría de accesos
    await setDoc(logRef, accessData);

    // Si es un acceso exitoso, actualizar el último acceso en el documento del usuario
    if (params.status === 'success' && params.userEmail) {
      try {
        const userDocRef = doc(db, 'users', params.userEmail.toLowerCase().trim());
        await updateDoc(userDocRef, {
          lastLoginAt: timestamp,
          lastActiveAt: timestamp,
          lastDevice: device
        });
      } catch (userUpdateErr) {
        // En caso de que el usuario no tenga permisos de escritura directa en su propio perfil o no exista aún
        console.debug('Notice updating user last login timestamp:', userUpdateErr);
      }
    }
  } catch (error) {
    console.error('Error logging user access:', error);
  }
}
