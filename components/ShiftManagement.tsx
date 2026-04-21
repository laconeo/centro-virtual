import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Volunteer, Shift, VolunteerIndicator } from '../types';
import { Calendar, ChevronLeft, ChevronRight, UserPlus, X, Check, Activity, ShieldAlert, Circle, User, Search, Plus, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const ShiftManagement: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [indicators, setIndicators] = useState<Record<string, VolunteerIndicator>>({});
    const [loading, setLoading] = useState(true);

    // Modal state
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isSummaryView, setIsSummaryView] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('17:00');
    const [daySessions, setDaySessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentDate]);

    const loadData = async () => {
        setLoading(true);
        // Date boundaries
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).toLocaleDateString('en-CA');
        // Gotcha: last day of month
        const lastDay = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

        // Fetch everything needed
        const volRes = await supabaseService.getAllVolunteers();
        if (volRes.data) setVolunteers(volRes.data as Volunteer[]);

        const shiftsRes = await supabaseService.getShifts(firstDay, lastDay);
        if (shiftsRes.data) setShifts(shiftsRes.data as Shift[]);

        if (volRes.data) {
             const ind = await supabaseService.getVolunteerMetrics(firstDay, lastDay, volRes.data as Volunteer[]);
             setIndicators(ind);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (selectedDay && isSummaryView) {
            loadDaySessions();
        }
    }, [selectedDay, isSummaryView]);

    const loadDaySessions = async () => {
        if (!selectedDay) return;
        setLoadingSessions(true);
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const { data } = await supabaseService.getDetailedSessionsByDay(dateStr);
        setDaySessions(data || []);
        setLoadingSessions(false);
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleAssignShift = async (volunteerId: string) => {
        if (!selectedDay) return;
        setIsAssigning(true);
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        
        // check if already assigned
        const exists = shifts.find(s => s.volunteer_id === volunteerId && s.date === dateStr);
        if (exists) {
            toast.error("El voluntario ya está asignado este día");
            setIsAssigning(false);
            return;
        }

        const { data, error } = await supabaseService.createShift({
            volunteer_id: volunteerId,
            date: dateStr,
            start_time: startTime,
            end_time: endTime
        });

        if (data) {
            toast.success("Voluntario asignado a la guardia");
            loadData(); // reload
        } else {
             toast.error("Error al asignar guardia");
        }
        setIsAssigning(false);
    };

    const handleRemoveShift = async (shiftId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabaseService.deleteShift(shiftId);
        if (!error) {
            toast.success("Guardia removida");
            loadData();
        } else {
             toast.error("Error al remover guardia");
        }
    };

    // Calendar generation
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday
    
    // Arrays for rendering
    const calendarDays = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarDays.push(null); // empty slots before 1st
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* 1. INDICATORS HEADER */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#005994]" />
                        Indicadores de Guardia Mensual
                    </h3>
                    <div className="flex text-xs space-x-4">
                        <span className="flex items-center gap-1"><Circle className="w-3 h-3 fill-[#8CB83E] text-[#8CB83E]" /> Autenticado (Día de Guardia)</span>
                        <span className="flex items-center gap-1"><Circle className="w-3 h-3 fill-[#005994] text-[#005994]" /> Asistencias &gt; 0</span>
                    </div>
                </div>

                {/* Horizontal scrollable indicators list */}
                <div className="flex overflow-x-auto pb-2 gap-4 snap-x">
                    {volunteers.map(vol => {
                        const ind = indicators[vol.id];
                        if (!ind) return null;
                        
                        // Count metrics
                        let totalShifts = 0;
                        let metAuth = 0;
                        let metAssist = 0;

                        Object.values(ind.days).forEach(day => {
                            if (day.hasShift) {
                                totalShifts++;
                                if (day.loggedIn) metAuth++;
                                if (day.sessionsAttended > 0) metAssist++;
                            }
                        });

                        // Only show volunteers with at least one shift to save space, or maybe all?
                        if (totalShifts === 0) return null;

                        return (
                            <div key={vol.id} className="snap-start flex-shrink-0 w-48 bg-gray-50 border border-gray-100 rounded-md p-3">
                                <div className="text-sm font-bold text-gray-800 truncate" title={vol.nombre}>{vol.nombre}</div>
                                <div className="text-xs text-gray-500 mb-2">{totalShifts} Guardias programadas</div>
                                
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Autenticado:</span>
                                        <span className={`font-medium ${metAuth === totalShifts ? 'text-green-600' : 'text-orange-500'}`}>
                                            {metAuth} / {totalShifts}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Asistencias:</span>
                                        <span className={`font-medium ${metAssist === totalShifts ? 'text-blue-600' : 'text-orange-500'}`}>
                                            {metAssist} / {totalShifts}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {volunteers.length > 0 && Object.values(indicators).every(ind => Object.values(ind.days).every(d => !d.hasShift)) && (
                        <div className="text-sm text-gray-400 italic py-2">
                             Aún no hay guardias programadas este mes. Asigne voluntarios en el calendario abajo.
                        </div>
                    )}
                </div>
            </div>

            {/* 2. CALENDAR */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-[400px]">
                {/* Calendar Header */}
                <div className="flex items-center justify-between p-4 border-b">
                     <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        Calendario de Guardias
                    </h3>
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="font-bold text-lg min-w-[150px] text-center">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 p-4 grid grid-cols-7 gap-2">
                    {/* Weekdays */}
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase py-2">
                            {day}
                        </div>
                    ))}
                    
                    {/* Days */}
                    {loading ? (
                        <div className="col-span-7 flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005994]"></div>
                        </div>
                    ) : (
                        calendarDays.map((day, idx) => {
                            if (day === null) {
                                return <div key={`empty-${idx}`} className="bg-transparent border border-transparent"></div>;
                            }

                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayShifts = shifts.filter(s => s.date === dateStr);
                            const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

                            return (
                                <div 
                                    key={day} 
                                    onClick={() => {
                                        setSelectedDay(day);
                                        setIsSummaryView(true);
                                    }}
                                    className={`min-h-[110px] border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md relative group
                                        ${isToday ? 'border-[#D0E3A2] bg-[#F2F7E6] ring-1 ring-[#D0E3A2]' : 'border-gray-200 bg-white hover:border-gray-300'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDay(day);
                                                setIsSummaryView(false);
                                                setSearchTerm('');
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 bg-[#D0E3A2] text-[#005994] rounded hover:bg-[#F2F7E6] transition-all"
                                            title="Asignar Voluntario"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <div className={`text-xs font-bold ${isToday ? 'text-[#005994]' : 'text-gray-400'}`}>
                                            {day}
                                        </div>
                                    </div>
                                    <div className="space-y-1 overflow-hidden">
                                        {dayShifts.slice(0, 3).map(shift => {
                                             const vol = volunteers.find(v => v.id === shift.volunteer_id);
                                             return (
                                                 <div key={shift.id} className="text-[9px] bg-[#D0E3A2] text-[#005994] rounded px-1.5 py-0.5 flex justify-between items-center gap-1">
                                                     <span className="truncate font-medium">{vol?.nombre || 'Voluntario'}</span>
                                                     <span className="opacity-80 whitespace-nowrap text-[8px]">{shift.start_time?.slice(0,5) || '08:00'}-{shift.end_time?.slice(0,5) || '17:00'}</span>
                                                 </div>
                                             );
                                        })}
                                        {dayShifts.length > 3 && (
                                            <div className="text-[9px] text-[#005994] font-bold text-center">
                                                + {dayShifts.length - 3} más
                                            </div>
                                        )}
                                        {dayShifts.length === 0 && (
                                            <div className="text-[10px] text-gray-300 text-center py-2 italic opacity-0 group-hover:opacity-100">
                                                Sin guardias
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* MODAL ASIGNAR GUARDIA O RESUMEN */}
            {selectedDay !== null && (
                <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
                     <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in border border-gray-100">
                          <div className="flex items-center justify-between p-4 border-b border-gray-100">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                  {isSummaryView ? (
                                      <><Activity className="w-5 h-5 text-[#005994]" /> Resumen del Día</>
                                  ) : (
                                      <><UserPlus className="w-5 h-5 text-[#005994]" /> Asignar Voluntario</>
                                  )}
                              </h3>
                              <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                  <X className="w-5 h-5" />
                              </button>
                          </div>
                          
                          <div className="p-4 bg-[#F2F7E6] text-[#005994] border-b border-[#D0E3A2]">
                              <div className="text-xs uppercase font-bold text-[#005994] tracking-wider">Fecha</div>
                              <div className="text-lg font-bold">{selectedDay} de {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
                          </div>

                          {!isSummaryView ? (
                              <div className="flex flex-col h-[500px]">
                                  {/* SEARCH AND TIMES */}
                                  <div className="p-4 space-y-4 border-b border-gray-50 bg-white">
                                      <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-gray-400 uppercase">Hora Inicio</label>
                                              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                                                  <Clock className="w-3 h-3 text-gray-400" />
                                                  <input 
                                                    type="time" 
                                                    value={startTime} 
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="bg-transparent text-sm outline-none w-full"
                                                  />
                                              </div>
                                          </div>
                                          <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-gray-400 uppercase">Hora Fin</label>
                                              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                                                  <Clock className="w-3 h-3 text-gray-400" />
                                                  <input 
                                                    type="time" 
                                                    value={endTime} 
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="bg-transparent text-sm outline-none w-full"
                                                  />
                                              </div>
                                          </div>
                                      </div>
                                      <div className="relative">
                                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                          <input 
                                            type="text" 
                                            placeholder="Buscar voluntario por nombre..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#005994] focus:border-[#005994] outline-none transition-all"
                                          />
                                      </div>
                                  </div>

                                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                       {volunteers
                                        .filter(v => v.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(vol => {
                                           const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                                           const isAssigned = shifts.some(s => s.volunteer_id === vol.id && s.date === dateStr);

                                           return (
                                               <div key={vol.id} className="flex items-center justify-between p-2.5 hover:bg-[#F2F7E6] rounded-lg group transition-colors">
                                                   <div className="flex items-center gap-3">
                                                       <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm group-hover:border-[#D0E3A2]">
                                                           <User className="w-5 h-5" />
                                                       </div>
                                                       <div>
                                                           <div className="text-sm font-semibold text-gray-700 group-hover:text-[#005994]">{vol.nombre}</div>
                                                           <div className="text-[10px] text-gray-400 font-medium group-hover:text-[#005994]/70">{vol.email}</div>
                                                       </div>
                                                   </div>
                                                   {isAssigned ? (
                                                        <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                                                            <Check className="w-3 h-3" /> Asignado
                                                        </span>
                                                   ) : (
                                                        <button 
                                                            disabled={isAssigning}
                                                            onClick={() => handleAssignShift(vol.id)}
                                                            className="opacity-0 group-hover:opacity-100 text-xs bg-[#005994] hover:bg-[#005994] text-white px-4 py-1.5 rounded-full font-bold shadow-sm transition-all disabled:opacity-50"
                                                        >
                                                            Asignar
                                                        </button>
                                                   )}
                                               </div>
                                           );
                                       })}
                                       {volunteers.filter(v => v.nombre.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                           <div className="text-center py-10 text-gray-400 italic text-sm">
                                               No se encontraron voluntarios.
                                           </div>
                                       )}
                                  </div>
                              </div>
                          ) : (
                              <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                                   {shifts
                                    .filter(s => s.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`)
                                    .length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 italic text-sm">
                                            No hay voluntarios asignados para este día.
                                        </div>
                                    ) : (
                                        shifts
                                        .filter(s => s.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`)
                                        .map(shift => {
                                            const vol = volunteers.find(v => v.id === shift.volunteer_id);
                                            return (
                                                <div key={shift.id} className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center justify-between group hover:border-[#D0E3A2] hover:bg-[#F2F7E6] transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-[#005994] rounded-full flex items-center justify-center shadow-sm">
                                                            <User className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-800">{vol?.nombre || 'Voluntario'}</div>
                                                            <div className="text-[10px] text-gray-400 font-medium mb-1">{vol?.email}</div>
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-2">
                                                                <Clock className="w-3 h-3" />
                                                                {shift.start_time?.slice(0, 5) || '08:00'} - {shift.end_time?.slice(0, 5) || '17:00'}
                                                            </div>
                                                            
                                                            {/* ATTENDED USERS */}
                                                            <div className="border-t border-gray-100 pt-2">
                                                                <div className="text-[9px] font-bold text-[#005994] uppercase mb-1">Usuarios Atendidos:</div>
                                                                {loadingSessions ? (
                                                                    <div className="animate-pulse text-[9px] text-gray-400 italic">Cargando histórico...</div>
                                                                ) : (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {daySessions.filter(ds => ds.volunteered_by === shift.volunteer_id).length > 0 ? (
                                                                            daySessions
                                                                            .filter(ds => ds.volunteered_by === shift.volunteer_id)
                                                                            .map((ds, i) => (
                                                                                <span key={i} className="text-[9px] bg-[#8CB83E]/10 text-[#8CB83E] px-1.5 py-0.5 rounded-full font-medium">
                                                                                    {ds.nombre} {ds.apellido}
                                                                                </span>
                                                                            ))
                                                                        ) : (
                                                                            <span className="text-[9px] text-gray-300 italic">Sin atenciones registradas</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => handleRemoveShift(shift.id, e)}
                                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                                        title="Eliminar asignación"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                    <button 
                                        onClick={() => setIsSummaryView(false)}
                                        className="w-full mt-4 py-3 border-2 border-dashed border-[#D0E3A2] rounded-xl text-[#005994] font-bold hover:bg-[#F2F7E6] hover:border-[#D0E3A2] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Agregar otro voluntario
                                    </button>
                              </div>
                          )}
                     </div>
                </div>
            )}
        </div>
    );
};
