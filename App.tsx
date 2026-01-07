
import React, { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  getISOWeek,
  isSameMonth,
  isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Info,
  Clock,
  Download,
  AlertCircle,
  CheckCircle2,
  Settings,
  X,
  Save,
  Share2,
  Lock,
  Plus,
  Trash2,
  Palette,
  AlertTriangle,
  CalendarDays,
  Check,
  UserPlus
} from 'lucide-react';
import { ShiftType, DayShift, WeeklyStats, Tens, ShiftDefinition } from './types';
import { INITIAL_TENS, SHIFT_DEFINITIONS, WORK_DAYS } from './constants';

const COLOR_PRESETS = [
  'bg-indigo-600', 'bg-emerald-500', 'bg-slate-500', 'bg-rose-500', 
  'bg-amber-500', 'bg-sky-500', 'bg-violet-600', 'bg-fuchsia-500', 
  'bg-orange-500', 'bg-cyan-500', 'bg-pink-500', 'bg-lime-500',
  'bg-teal-500', 'bg-blue-700', 'bg-purple-700', 'bg-zinc-800'
];

const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const isReadOnly = queryParams.get('mode') === 'view';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<DayShift[]>([]);
  const [selectedTensId, setSelectedTensId] = useState<string | null>(null);
  const [monitorWeeks, setMonitorWeeks] = useState<Record<string, number>>({});

  const [tensList, setTensList] = useState<Tens[]>(() => {
    const saved = localStorage.getItem('tens_list');
    return saved ? JSON.parse(saved) : INITIAL_TENS;
  });

  const [customShiftDefs, setCustomShiftDefs] = useState<Record<string, ShiftDefinition>>(() => {
    const saved = localStorage.getItem('shift_definitions');
    return saved ? JSON.parse(saved) : SHIFT_DEFINITIONS;
  });

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingTensList, setEditingTensList] = useState<Tens[]>([]);
  const [editingShifts, setEditingShifts] = useState<Record<string, ShiftDefinition>>({});

  useEffect(() => {
    localStorage.setItem('tens_list', JSON.stringify(tensList));
  }, [tensList]);

  useEffect(() => {
    localStorage.setItem('shift_definitions', JSON.stringify(customShiftDefs));
  }, [customShiftDefs]);

  const monthDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  useEffect(() => {
    const monthKey = format(currentDate, 'yyyy-MM');
    const existingInMonth = shifts.some(s => s.date.startsWith(monthKey));
    
    // Auto-generate logic for Mon-Fri workdays if no shifts exist for the month
    if (!existingInMonth && tensList.length > 0) {
      const newShifts: DayShift[] = [];
      monthDays.forEach((day) => {
        const dayOfWeek = day.getDay();
        if (WORK_DAYS.includes(dayOfWeek)) {
          const offset = day.getDate() % tensList.length;
          tensList.forEach((tens, index) => {
            const isShort = (index + offset) % tensList.length < 2;
            newShifts.push({
              tensId: tens.id,
              date: day.toISOString(),
              shiftType: isShort ? ShiftType.SHORT : ShiftType.LONG
            });
          });
        } else {
          tensList.forEach((tens) => {
            newShifts.push({
              tensId: tens.id,
              date: day.toISOString(),
              shiftType: ShiftType.OFF
            });
          });
        }
      });
      setShifts(prev => [...prev.filter(s => !s.date.startsWith(monthKey)), ...newShifts]);
    }
  }, [currentDate, tensList, monthDays]);

  const monthWeeks = useMemo(() => {
    const weeks = new Set<number>();
    monthDays.forEach(day => weeks.add(getISOWeek(day)));
    return Array.from(weeks).sort((a, b) => {
      if (a > 50 && b < 10) return -1;
      if (b > 50 && a < 10) return 1;
      return a - b;
    });
  }, [monthDays]);

  useEffect(() => {
    const currentISO = getISOWeek(new Date());
    const initialWeeks: Record<string, number> = { ...monitorWeeks };
    let changed = false;
    tensList.forEach(t => {
      if (!initialWeeks[t.id]) {
        initialWeeks[t.id] = monthWeeks.includes(currentISO) ? currentISO : (monthWeeks[0] || 1);
        changed = true;
      }
    });
    if (changed) setMonitorWeeks(initialWeeks);
  }, [tensList, monthWeeks]);

  const toggleShift = (tensId: string, dateStr: string) => {
    if (isReadOnly) return;
    setShifts(prev => {
      const existing = prev.find(s => s.tensId === tensId && s.date === dateStr);
      const types = Object.keys(customShiftDefs) as ShiftType[];
      
      if (!existing) return prev;
      
      const currentIndex = types.indexOf(existing.shiftType);
      const nextIndex = (currentIndex + 1) % types.length;
      const nextType = types[nextIndex];

      return prev.map(s => (s.tensId === tensId && s.date === dateStr) ? { ...s, shiftType: nextType } : s);
    });
  };

  const getStatsForWeek = (tensId: string, weekNumber: number): WeeklyStats => {
    const weekShifts = shifts.filter(s => {
      const shiftDate = new Date(s.date);
      return s.tensId === tensId && getISOWeek(shiftDate) === weekNumber;
    });
    
    const totalHours = weekShifts.reduce((acc, curr) => {
      const def = customShiftDefs[curr.shiftType];
      return acc + (def?.hours || 0);
    }, 0);

    return {
      totalHours,
      isCompliant: totalHours <= 42
    };
  };

  const filteredTens = selectedTensId 
    ? tensList.filter(t => t.id === selectedTensId)
    : tensList;

  const openManageModal = () => {
    setEditingTensList([...tensList]);
    setIsManageModalOpen(true);
  };

  const openShiftModal = () => {
    setEditingShifts({...customShiftDefs});
    setIsShiftModalOpen(true);
  };

  const handleAddTens = () => {
    const newId = `TENS-${Date.now()}`;
    setEditingTensList(prev => [
      ...prev,
      { id: newId, name: `TENS ${prev.length + 1}`, role: 'Enfermería' }
    ]);
  };

  const handleRemoveTens = (id: string) => {
    setEditingTensList(prev => prev.filter(t => t.id !== id));
  };

  const shareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'view');
    navigator.clipboard.writeText(url.toString());
    alert('Enlace de solo lectura copiado al portapapeles');
  };

  const handleShiftDefChange = (key: string, field: keyof ShiftDefinition, value: any) => {
    setEditingShifts(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const addShiftType = () => {
    const newKey = `EXTRA_${Date.now()}`;
    const usedColors = Object.values(editingShifts).map(d => d.color);
    const availableColor = COLOR_PRESETS.find(c => !usedColors.includes(c)) || COLOR_PRESETS[0];
    
    setEditingShifts(prev => ({
      ...prev,
      [newKey]: {
        type: newKey as ShiftType,
        label: 'Nuevo',
        hours: 8,
        startTime: '08:00',
        endTime: '16:00',
        color: availableColor
      }
    }));
  };

  const removeShiftType = (key: string) => {
    const newShifts = {...editingShifts};
    delete newShifts[key];
    setEditingShifts(newShifts);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white ${isReadOnly ? 'bg-slate-400' : 'bg-indigo-600'}`}>
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Sistema de Turnos TENS</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-500 font-medium">Límite 42 Horas Semanales</p>
                {isReadOnly && (
                  <span className="flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                    <Lock size={10} /> Solo Lectura
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 font-semibold min-w-[140px] text-center capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                <ChevronRight size={20} />
              </button>
            </div>

            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <button onClick={openManageModal} className="p-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100" title="Gestionar Personal">
                  <Users size={20} />
                </button>
                <button onClick={openShiftModal} className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100" title="Configurar Turnos">
                  <Settings size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={selectedTensId || ''}
              onChange={(e) => setSelectedTensId(e.target.value || null)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-auto"
            >
              <option value="">Todos los TENS</option>
              {tensList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Alerts & Legend Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Leyenda de Turnos</h3>
            </div>
            <div className="space-y-3">
              {(Object.values(customShiftDefs) as ShiftDefinition[]).map(def => (
                <div key={def.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${def.color}`} />
                    <span className="font-medium">{def.label}</span>
                  </div>
                  <span className="text-slate-500">{def.startTime} - {def.endTime} ({def.hours}h)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-indigo-700">
              <Clock size={18} />
              <h3 className="font-semibold">Control Mensual</h3>
            </div>
            <p className="text-sm text-indigo-600 leading-relaxed">
              Visualización estricta del mes seleccionado, del día 1 al último día.
            </p>
          </div>

          <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-rose-700">
              <AlertTriangle size={18} />
              <h3 className="font-semibold">Alerta Semanal</h3>
            </div>
            <p className="text-sm text-rose-600 leading-relaxed">
              El monitor inferior agrupa las horas por semanas ISO para asegurar el cumplimiento de las <strong>42h</strong>.
            </p>
          </div>
        </div>

        {/* Main Calendar Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-12">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 p-4 text-left font-semibold text-slate-600 text-sm border-r min-w-[180px] z-20">Personal TENS</th>
                  {monthDays.map(day => (
                    <th 
                      key={day.toISOString()} 
                      className={`p-4 text-center min-w-[100px] border-r last:border-r-0 ${[0,6].includes(day.getDay()) ? 'bg-slate-100 text-slate-400' : 'text-slate-600'}`}
                    >
                      <div className="text-xs uppercase font-bold tracking-wider">{format(day, 'EEE', { locale: es })}</div>
                      <div className="text-lg font-bold">{format(day, 'd')}</div>
                    </th>
                  ))}
                  <th className="p-4 text-center min-w-[100px] font-semibold text-slate-600 text-sm bg-slate-50">Total Mes</th>
                </tr>
              </thead>
              <tbody>
                {filteredTens.length > 0 ? filteredTens.map((tens) => (
                  <tr key={tens.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 p-4 border-r font-medium text-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      <div className="flex flex-col truncate">
                        <span className="truncate">{tens.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{tens.role}</span>
                      </div>
                    </td>
                    {monthDays.map(day => {
                      const dayStr = day.toISOString();
                      const shift = shifts.find(s => s.tensId === tens.id && s.date === dayStr);
                      const def = (shift && customShiftDefs[shift.shiftType]) || customShiftDefs[ShiftType.OFF] || SHIFT_DEFINITIONS[ShiftType.OFF];
                      const isWeekend = [0, 6].includes(day.getDay());
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                        <td 
                          key={dayStr} 
                          className={`p-3 border-r last:border-r-0 text-center ${isWeekend ? 'bg-slate-50/50' : ''} ${isToday ? 'bg-indigo-50/30' : ''}`}
                        >
                          <button
                            onClick={() => toggleShift(tens.id, dayStr)}
                            disabled={isReadOnly}
                            className={`w-full h-12 rounded-xl flex flex-col items-center justify-center transition-all ${def.color} ${def.type === ShiftType.OFF ? 'text-slate-400 border border-slate-200 bg-white' : 'text-white shadow-sm ring-2 ring-transparent hover:ring-indigo-300'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest truncate w-full px-1">{def.label}</span>
                            <span className="text-[9px] opacity-80">{def.hours > 0 ? `${def.hours}h` : ''}</span>
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-4 text-center bg-slate-50/30">
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-base font-bold text-indigo-600">
                          {shifts
                            .filter(s => s.tensId === tens.id && isSameMonth(new Date(s.date), currentDate))
                            .reduce((acc, curr) => acc + (customShiftDefs[curr.shiftType]?.hours || 0), 0)
                            .toFixed(1)}h
                        </div>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={monthDays.length + 2} className="p-12 text-center text-slate-400 font-medium">
                      No hay personal registrado. Pulsa el icono de personal para agregar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly Monitor Optimized */}
        <section className="mt-16 mb-20 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Clock size={28} className="text-indigo-600" />
                Monitor de Horas Semanales
              </h2>
              <p className="text-slate-500 text-sm">Cálculo agrupado por semanas laborales para cumplimiento legal.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTens.map(tens => {
              const selectedWeek = monitorWeeks[tens.id] || monthWeeks[0];
              const stats = getStatsForWeek(tens.id, selectedWeek);
              const isExceeded = !stats.isCompliant;

              return (
                <div key={tens.id} className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden group hover:shadow-xl ${isExceeded ? 'border-rose-200 shadow-rose-100 shadow-md ring-1 ring-rose-500/20' : 'border-slate-200 shadow-sm'}`}>
                  {/* Card Header */}
                  <div className={`px-5 py-4 border-b flex items-center justify-between transition-colors ${isExceeded ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-colors ${isExceeded ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
                        {tens.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 leading-none">{tens.name}</h4>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Técnico en Enfermería</span>
                      </div>
                    </div>
                  </div>

                  {/* Selector & Content */}
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <CalendarDays size={12} /> Seleccionar Semana
                      </label>
                      <select 
                        value={selectedWeek}
                        onChange={(e) => setMonitorWeeks(prev => ({ ...prev, [tens.id]: parseInt(e.target.value) }))}
                        className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 transition-all ${isExceeded ? 'border-rose-200 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'}`}
                      >
                        {monthWeeks.map(wn => <option key={wn} value={wn}>Semana {wn}</option>)}
                      </select>
                    </div>

                    <div className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${isExceeded ? 'bg-rose-500 text-white border-transparent' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isExceeded ? 'text-rose-100' : 'text-slate-400'}`}>Total Semanal</span>
                        <div className="text-3xl font-black">{stats.totalHours.toFixed(1)}<span className="text-lg ml-0.5 opacity-70">h</span></div>
                      </div>
                      <div className="flex flex-col items-center">
                        {isExceeded ? (
                          <>
                            <AlertTriangle size={32} className="animate-bounce mb-1" />
                            <span className="text-[9px] font-black bg-white text-rose-600 px-2 py-0.5 rounded-full">¡ALERTA!</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={32} className="text-emerald-500 mb-1" />
                            <span className="text-[9px] font-black text-emerald-600">CUMPLE</span>
                          </>
                        )}
                      </div>
                    </div>

                    {isExceeded && (
                      <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-rose-700 leading-tight">
                          Exceso de {(stats.totalHours - 42).toFixed(1)}h. Ajusta los turnos en el calendario.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer Actions */}
        <div className="mt-20 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-5 text-slate-500">
            <div className="p-3 bg-slate-50 rounded-2xl">
              <AlertCircle size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Gestión de Turnos 42 Horas</p>
              <p className="text-xs text-slate-400">Control estricto mensual con monitoreo semanal dinámico.</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {!isReadOnly && (
              <button onClick={shareLink} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 active:scale-95">
                <Share2 size={20} /> Compartir Acceso
              </button>
            )}
            <button onClick={() => window.print()} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-2xl hover:bg-slate-800 transition-all font-bold active:scale-95">
              <Download size={20} /> PDF
            </button>
          </div>
        </div>
      </main>

      {/* Modal: Personal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Users size={24} className="text-indigo-600" />Gestionar Personal</h2>
              <button onClick={() => setIsManageModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-slate-500 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                Agrega o quita técnicos según las necesidades del servicio. Los turnos se recalcularán automáticamente al guardar.
              </p>
              
              <div className="space-y-4">
                {editingTensList.map((tens, idx) => (
                  <div key={tens.id} className="group relative flex items-center gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TENS #{idx+1}</label>
                      <input 
                        type="text" 
                        value={tens.name} 
                        onChange={(e) => setEditingTensList(prev => prev.map(t => t.id === tens.id ? {...t, name: e.target.value} : t))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <button 
                      onClick={() => handleRemoveTens(tens.id)}
                      className="mt-6 text-slate-300 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all"
                      title="Eliminar TENS"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}

                <button 
                  onClick={handleAddTens}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 font-bold group"
                >
                  <UserPlus size={20} className="group-hover:scale-110 transition-transform" /> Agregar Técnico
                </button>
              </div>
            </div>
            <div className="p-8 bg-slate-50/50 flex gap-4">
              <button onClick={() => setIsManageModalOpen(false)} className="flex-1 px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-all">Cancelar</button>
              <button 
                onClick={() => { 
                  setTensList(editingTensList); 
                  setIsManageModalOpen(false); 
                  // Reset selected filter if person removed
                  if (selectedTensId && !editingTensList.some(t => t.id === selectedTensId)) {
                    setSelectedTensId(null);
                  }
                }} 
                className="flex-1 bg-indigo-600 px-6 py-3.5 rounded-2xl text-white font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Turnos */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Palette size={24} className="text-emerald-600" />Configuración de Turnos</h2>
              <button onClick={() => setIsShiftModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-slate-500 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                Define aquí los tipos de turnos que usarás. El sistema permite crear múltiples tipos para una mejor organización visual.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Object.entries(editingShifts) as [string, ShiftDefinition][]).map(([key, def]) => (
                  <div key={key} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-5 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {key.substring(0,8)}</span>
                      {key !== ShiftType.OFF && (
                        <button onClick={() => removeShiftType(key)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all"><Trash2 size={18} /></button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Etiqueta</label>
                          <input type="text" value={def.label} onChange={(e) => handleShiftDefChange(key, 'label', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horas</label>
                          <input type="number" step="0.5" value={def.hours} onChange={(e) => handleShiftDefChange(key, 'hours', parseFloat(e.target.value))} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color del Turno</label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map(colorClass => (
                            <button
                              key={colorClass}
                              onClick={() => handleShiftDefChange(key, 'color', colorClass)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-125 ${colorClass} ${def.color === colorClass ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`}
                            >
                              {def.color === colorClass && <Check size={14} className="text-white" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inicio</label>
                          <input type="text" value={def.startTime} onChange={(e) => handleShiftDefChange(key, 'startTime', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fin</label>
                          <input type="text" value={def.endTime} onChange={(e) => handleShiftDefChange(key, 'endTime', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addShiftType} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 font-bold group">
                <Plus size={24} className="group-hover:scale-110 transition-transform" /> Añadir Nuevo Tipo de Turno
              </button>
            </div>
            <div className="p-8 bg-slate-50/50 flex gap-4">
              <button onClick={() => setIsShiftModalOpen(false)} className="flex-1 px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-all">Cancelar</button>
              <button onClick={() => { setCustomShiftDefs(editingShifts); setIsShiftModalOpen(false); }} className="flex-1 bg-emerald-600 px-6 py-3.5 rounded-2xl text-white font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                <Save size={20} /> Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
