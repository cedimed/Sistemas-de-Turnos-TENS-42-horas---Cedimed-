
import { ShiftType, ShiftDefinition, Tens } from './types';

export const SHIFT_DEFINITIONS: Record<ShiftType, ShiftDefinition> = {
  [ShiftType.LONG]: {
    type: ShiftType.LONG,
    label: 'Largo',
    hours: 9.5,
    startTime: '08:00',
    endTime: '18:30',
    color: 'bg-indigo-600',
  },
  [ShiftType.SHORT]: {
    type: ShiftType.SHORT,
    label: 'Corto',
    hours: 4.0, // Adjusted to meet the 42h requirement (4*9.5 + 4 = 42)
    startTime: '09:30',
    endTime: '13:30', // Adjusted to 4 hours as per "1 día turno corto -> 4h"
    color: 'bg-emerald-500',
  },
  [ShiftType.OFF]: {
    type: ShiftType.OFF,
    label: 'Libre',
    hours: 0,
    startTime: '-',
    endTime: '-',
    color: 'bg-slate-200',
  },
};

export const INITIAL_TENS: Tens[] = [
  { id: '1', name: 'TENS 1', role: 'Enfermería' },
  { id: '2', name: 'TENS 2', role: 'Enfermería' },
  { id: '3', name: 'TENS 3', role: 'Enfermería' },
  { id: '4', name: 'TENS 4', role: 'Enfermería' },
  { id: '5', name: 'TENS 5', role: 'Enfermería' },
  { id: '6', name: 'TENS 6', role: 'Enfermería' },
];

export const WORK_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
