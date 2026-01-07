
export enum ShiftType {
  LONG = 'LARGO',
  SHORT = 'CORTO',
  OFF = 'LIBRE',
}

export interface ShiftDefinition {
  type: ShiftType;
  label: string;
  hours: number;
  startTime: string;
  endTime: string;
  color: string;
}

export interface Tens {
  id: string;
  name: string;
  role: string;
}

export interface DayShift {
  tensId: string;
  date: string; // ISO format
  shiftType: ShiftType;
}

export interface WeeklyStats {
  totalHours: number;
  isCompliant: boolean;
}
