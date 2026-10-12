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
  nextCutoffDate?: Date | null;
}

export function checkOrderCutoffStatus(cutoff?: OrderCutoffConfig): CutoffStatus {
  if (!cutoff || !cutoff.enabled) {
    if (cutoff?.isManuallyLocked) {
      return {
        isLocked: true,
        reason: 'manual_lock',
        cutoffText: 'Bloqueado manualmente',
        nextCutoffText: 'Hasta que compras o administración lo reactive',
        nextCutoffDate: null,
      };
    }
    return {
      isLocked: false,
      reason: 'disabled',
      cutoffText: 'Sin límite activo',
      nextCutoffText: 'Abierto continuamente',
      nextCutoffDate: null,
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
      nextCutoffDate: null,
    };
  }

  const now = new Date();
  const [targetHourStr, targetMinuteStr] = timeStr.split(':');
  const targetHour = parseInt(targetHourStr || '11', 10);
  const targetMinute = parseInt(targetMinuteStr || '0', 10);

  const currentDay = now.getDay();
  const daysSinceTarget = (currentDay - dayIndex + 7) % 7;

  const lastCutoffDate = new Date(now);
  lastCutoffDate.setDate(now.getDate() - daysSinceTarget);
  lastCutoffDate.setHours(targetHour, targetMinute, 0, 0);

  // If targetDay is today, but the target time is in the future:
  if (daysSinceTarget === 0 && now.getTime() < lastCutoffDate.getTime()) {
    lastCutoffDate.setDate(lastCutoffDate.getDate() - 7);
  }

  // Next upcoming cutoff date is 7 days after the last cutoff
  const nextCutoffDate = new Date(lastCutoffDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextDayName = DAYS_OF_WEEK.find(d => d.value === nextCutoffDate.getDay())?.label || '';
  const nextCutoffText = `${nextDayName} ${nextCutoffDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} a las ${timeStr}`;

  // Comprobar si compras o administración desbloqueó después del límite que acaba de pasar
  if (cutoff.lastUnlockedAt) {
    const unlockDate = new Date(cutoff.lastUnlockedAt);
    if (unlockDate.getTime() >= lastCutoffDate.getTime()) {
      return {
        isLocked: false,
        reason: 'unlocked_by_admin',
        cutoffText,
        nextCutoffText,
        nextCutoffDate,
      };
    }
  }

  // Al llegar la fecha límite, los pedidos se bloquean automáticamente
  // y permanecen cerrados hasta que el rol de compras lo vuelva a autorizar.
  return {
    isLocked: true,
    reason: 'scheduled_lock',
    cutoffText,
    nextCutoffText,
    nextCutoffDate: null,
  };
}

export interface WeeklyCycle {
  weekOffset: number; // 0 = actual, 1 = semana +1, 2 = semana +2, 3 = semana +3, 4 = semana +4
  key: string; // Identificador único "YYYY-MM-DD" del inicio de la semana
  label: string; // Ej: "Semana próxima (del 19 al 26 oct)"
  shortLabel: string; // Ej: "Semana 1", "Semana 2"
  title: string; // Ej: "Semana del 19 al 26 de Octubre"
  startDate: Date;
  endDate: Date;
  startDateFormatted: string; // "Lunes 19/10 a las 11:00"
  dateRangeFormatted: string; // "19 oct - 26 oct"
  activationNotice: string; // "Se activa el Lunes 19/10 a partir de las 11:00"
  isActiveNow: boolean;
}

const MONTH_NAMES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTH_NAMES_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export function getCycleStartAndEnd(cutoff?: OrderCutoffConfig, now = new Date()) {
  const dayIndex = typeof cutoff?.dayOfWeek === 'number' ? cutoff.dayOfWeek : 1;
  const timeStr = cutoff?.time || '11:00';
  const [targetHourStr, targetMinuteStr] = timeStr.split(':');
  const targetHour = parseInt(targetHourStr || '11', 10);
  const targetMinute = parseInt(targetMinuteStr || '0', 10);

  const currentDay = now.getDay();
  const daysSinceTarget = (currentDay - dayIndex + 7) % 7;

  const currentCycleStart = new Date(now);
  currentCycleStart.setDate(now.getDate() - daysSinceTarget);
  currentCycleStart.setHours(targetHour, targetMinute, 0, 0);

  if (daysSinceTarget === 0 && now.getTime() < currentCycleStart.getTime()) {
    currentCycleStart.setDate(currentCycleStart.getDate() - 7);
  }

  const currentCycleEnd = new Date(currentCycleStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { currentCycleStart, currentCycleEnd, dayIndex, timeStr };
}

export function formatCycleKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeeklyCycles(cutoff?: OrderCutoffConfig, futureWeeksCount: number = 4): WeeklyCycle[] {
  const now = new Date();
  const { currentCycleStart, dayIndex, timeStr } = getCycleStartAndEnd(cutoff, now);
  const dayObj = DAYS_OF_WEEK.find(d => d.value === dayIndex) || DAYS_OF_WEEK[0];

  const cycles: WeeklyCycle[] = [];

  for (let offset = 0; offset <= futureWeeksCount; offset++) {
    const startDate = new Date(currentCycleStart.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startDayObj = DAYS_OF_WEEK.find(d => d.value === startDate.getDay()) || dayObj;

    const key = formatCycleKey(startDate);
    const startMonthShort = MONTH_NAMES_SHORT[startDate.getMonth()];
    const endMonthShort = MONTH_NAMES_SHORT[endDate.getMonth()];
    const endMonthLong = MONTH_NAMES_LONG[endDate.getMonth()];

    const dateRangeFormatted = `${startDate.getDate()} ${startMonthShort} - ${endDate.getDate()} ${endMonthShort}`;
    const startDateFormatted = `${startDayObj.label} ${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')} a las ${timeStr}`;
    const activationNotice = `Se activa a partir del ${startDayObj.label} ${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')} a las ${timeStr}`;

    let label = '';
    let shortLabel = '';
    let title = '';

    if (offset === 0) {
      label = `Semana actual (${dateRangeFormatted})`;
      shortLabel = 'Semana actual';
      title = `Semana en curso (${dateRangeFormatted})`;
    } else if (offset === 1) {
      label = `Semana próxima (${dateRangeFormatted})`;
      shortLabel = 'Semana 1 (Próxima)';
      title = `Semana próxima del ${startDate.getDate()} al ${endDate.getDate()} de ${endMonthLong}`;
    } else {
      label = `Semana +${offset} (${dateRangeFormatted})`;
      shortLabel = `Semana +${offset}`;
      title = `Semana +${offset} del ${startDate.getDate()} al ${endDate.getDate()} de ${endMonthLong}`;
    }

    cycles.push({
      weekOffset: offset,
      key,
      label,
      shortLabel,
      title,
      startDate,
      endDate,
      startDateFormatted,
      dateRangeFormatted,
      activationNotice,
      isActiveNow: offset === 0,
    });
  }

  return cycles;
}

export function isOrderInCurrentWeek(
  order: { targetCycleKey?: string; targetCycleStartDate?: string; targetCycleEndDate?: string; isFuturePlan?: boolean; createdAt?: string },
  currentCycle: WeeklyCycle
): boolean {
  // Los pedidos de las 4 semanas vistas NO se añaden automáticamente a la semana actual mientras sean planes futuros
  if (order.isFuturePlan) {
    return false;
  }
  if (order.targetCycleKey) {
    return order.targetCycleKey === currentCycle.key;
  }
  if (order.createdAt) {
    const createdTime = new Date(order.createdAt).getTime();
    return createdTime >= currentCycle.startDate.getTime() && createdTime < currentCycle.endDate.getTime();
  }
  return false;
}

export function isOrderPlannedForCycle(
  order: { targetCycleKey?: string; targetCycleStartDate?: string; isFuturePlan?: boolean },
  cycle: WeeklyCycle
): boolean {
  if (order.targetCycleKey === cycle.key) return true;
  if (order.targetCycleStartDate) {
    const startTime = new Date(order.targetCycleStartDate).getTime();
    return Math.abs(startTime - cycle.startDate.getTime()) < 12 * 60 * 60 * 1000;
  }
  return false;
}

export function getOrderPlannedCycle(order: { targetCycleKey?: string; targetCycleStartDate?: string }, cycles: WeeklyCycle[]): WeeklyCycle | null {
  if (order.targetCycleKey) {
    const found = cycles.find(c => c.key === order.targetCycleKey);
    if (found) return found;
  }
  if (order.targetCycleStartDate) {
    const startTime = new Date(order.targetCycleStartDate).getTime();
    const found = cycles.find(c => Math.abs(c.startDate.getTime() - startTime) < 12 * 60 * 60 * 1000);
    if (found) return found;
  }
  return null;
}

