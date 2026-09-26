import { OrderCutoffConfig } from '../types';

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export interface CutoffStatus {
  isLocked: boolean;
  reason: 'disabled' | 'scheduled_lock' | 'manual_lock' | 'unlocked_by_admin' | 'open_before_cutoff';
  cutoffText: string;
  nextCutoffText: string;
}

export function checkOrderCutoffStatus(cutoff?: OrderCutoffConfig): CutoffStatus {
  if (!cutoff || !cutoff.enabled) {
    if (cutoff?.isManuallyLocked) {
      return {
        isLocked: true,
        reason: 'manual_lock',
        cutoffText: 'Bloqueado manualmente',
        nextCutoffText: 'Hasta que compras o administración lo reactive',
      };
    }
    return {
      isLocked: false,
      reason: 'disabled',
      cutoffText: 'Sin límite activo',
      nextCutoffText: 'Abierto continuamente',
    };
  }

  const dayIndex = typeof cutoff.dayOfWeek === 'number' ? cutoff.dayOfWeek : 1;
  const dayObj = DAYS_OF_WEEK.find(d => d.value === dayIndex) || DAYS_OF_WEEK[0];
  const timeStr = cutoff.time || '11:00';
  const cutoffText = `${dayObj.label} a las ${timeStr}`;

  if (cutoff.isManuallyLocked) {
    return {
      isLocked: true,
      reason: 'manual_lock',
      cutoffText,
      nextCutoffText: 'Bloqueado manualmente por compras',
    };
  }

  const now = new Date();
  const [targetHourStr, targetMinuteStr] = timeStr.split(':');
  const targetHour = parseInt(targetHourStr || '11', 10);
  const targetMinute = parseInt(targetMinuteStr || '0', 10);

  const currentDay = now.getDay();
  const daysSinceTarget = (currentDay - dayIndex + 7) % 7;

  const targetDateThisCycle = new Date(now);
  targetDateThisCycle.setDate(now.getDate() - daysSinceTarget);
  targetDateThisCycle.setHours(targetHour, targetMinute, 0, 0);

  // If targetDay is today, but the target time is in the future:
  if (daysSinceTarget === 0 && now.getTime() < targetDateThisCycle.getTime()) {
    targetDateThisCycle.setDate(targetDateThisCycle.getDate() - 7);
  }

  // Next upcoming cutoff date is 7 days after the last cutoff
  const nextCutoffDate = new Date(targetDateThisCycle.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextDayName = DAYS_OF_WEEK.find(d => d.value === nextCutoffDate.getDay())?.label || '';
  const nextCutoffText = `${nextDayName} ${nextCutoffDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} a las ${timeStr}`;

  // Check if admin/compras unlocked it AFTER the most recent cutoff date
  if (cutoff.lastUnlockedAt) {
    const unlockDate = new Date(cutoff.lastUnlockedAt);
    if (unlockDate.getTime() >= targetDateThisCycle.getTime()) {
      return {
        isLocked: false,
        reason: 'unlocked_by_admin',
        cutoffText,
        nextCutoffText,
      };
    }
  }

  // Cutoff has passed and manager hasn't unlocked it yet
  return {
    isLocked: true,
    reason: 'scheduled_lock',
    cutoffText,
    nextCutoffText,
  };
}
