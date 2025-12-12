import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { LogOut, FileSpreadsheet, Users, Video, MessageSquare, RefreshCw, Activity, Clock, CheckCircle, Play, Star, Calendar } from 'lucide-react';
import { Volunteer, UserSession, SatisfactionSurvey } from '../types';
import { supabaseService } from '../services/supabaseService';
import { initializeJitsi } from '../services/jitsi';
import { Layout } from './ui/Layout';
import { ChatRoom } from './ChatRoom';

interface DashboardProps {
  volunteer: Volunteer;
  onLogout: () => void;
}

export const VolunteerDashboard: React.FC<DashboardProps> = ({ volunteer, onLogout }) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [activeSession, setActiveSession] = useState<UserSession | null>(null);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);

  // Date and Status Filter
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'finalizado' | 'abandonado'>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'waiting' | 'active' | 'video' | 'chat'>('all');

  // Status State
  const [currentStatus, setCurrentStatus] = useState<'online' | 'busy' | 'offline'>('online');
  const [onlineCount, setOnlineCount] = useState(1);

  const fetchData = async () => {
    const sessionRes = await supabaseService.getSessions();
    if (sessionRes.data) setSessions(sessionRes.data as UserSession[]);

    const surveyRes = await supabaseService.getSurveys();
    if (surveyRes.data) setSurveys(surveyRes.data as SatisfactionSurvey[]);

    const countRes = await supabaseService.getOnlineVolunteersCount();
    if (countRes.count !== null) setOnlineCount(countRes.count);
  };
  // ... toggleStatus logic remains
  const toggleStatus = async () => {
    const newStatus = currentStatus === 'online' ? 'busy' : 'online';
    setCurrentStatus(newStatus);
    await supabaseService.updateVolunteerStatus(volunteer.id, newStatus);
    toast.success(`Estado cambiado a ${newStatus === 'online' ? 'Disponible' : 'Ocupado'}`);
    fetchData();
  };

  // Sound Utility
  const playSound = (type: 'new' | 'alert') => {
    // ... same logic
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      if (type === 'new') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, audioContext.currentTime);
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        osc.start(audioContext.currentTime);
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioContext.currentTime + 0.3);
        gain.gain.setValueAtTime(0, audioContext.currentTime + 0.45);
        osc.stop(audioContext.currentTime + 0.5);
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const prevWaitingIds = useRef<Set<string>>(new Set());
  const lastAlertTime = useRef<number>(0);
  const activeSessionRef = useRef<UserSession | null>(null);

  // Sync ref with state to avoid stale closure in interval
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Poll for sessions & Alerts
  useEffect(() => {
    const handleAlerts = (currentSessions: UserSession[]) => {

      // 0. Check if ACTIVE session was finished by USER
      if (activeSessionRef.current) {
        const found = currentSessions.find(s => s.id === activeSessionRef.current?.id);
        if (found && found.estado === 'finalizado') {
          setActiveSession(null);
          toast("El usuario ha finalizado la sesión", { icon: '👋' });
          // Play specific sound?
          playSound('new');
        }
      }

      const waiting = currentSessions.filter(s => s.estado === 'esperando');
      const now = Date.now();

      // 1. Check for NEW Priority (New arrival in waiting list)
      let hasNew = false;
      waiting.forEach(s => {
        if (!prevWaitingIds.current.has(s.id)) {
          hasNew = true;
        }
      });

      if (hasNew) {
        playSound('new');
        toast("¡Nueva prioridad en cola!", { icon: '🔔' });
      }

      // Update known IDs
      prevWaitingIds.current = new Set(waiting.map(s => s.id));

      // 2. Check for Long Wait (> 1 min)
      // Throttle: only alert every 60 seconds
      if (now - lastAlertTime.current > 60000) {
        const hasLongWait = waiting.some(s => {
          const waitTime = now - new Date(s.fecha_ingreso).getTime();
          return waitTime > 60000; // > 1 minute
        });

        if (hasLongWait) {
          playSound('alert');
          toast("Atención: Tiempo de espera elevado", { icon: '⚠️' });
          lastAlertTime.current = now;
        }
      }
    };

    fetchData(); // Initial load

    // Set status to online on mount
    supabaseService.updateVolunteerStatus(volunteer.id, 'online');

    const interval = setInterval(async () => {
      const sessionRes = await supabaseService.getSessions();
      if (sessionRes.data) {
        const data = sessionRes.data as UserSession[];
        setSessions(data);
        handleAlerts(data);
      }

      const surveyRes = await supabaseService.getSurveys();
      if (surveyRes.data) setSurveys(surveyRes.data as SatisfactionSurvey[]);

      const countRes = await supabaseService.getOnlineVolunteersCount();
      if (countRes.count !== null) setOnlineCount(countRes.count);
    }, 3000); // Polling every 3s

    return () => {
      clearInterval(interval);
      // Set offline on unmount (best effort)
      supabaseService.updateVolunteerStatus(volunteer.id, 'offline');
    };
  }, []);

  // ... (handleAttend and handleFinishSession activeSession logic unchanged) 
  const handleAttend = async (session: UserSession) => {
    const { data } = await supabaseService.updateSessionStatus(session.id, 'en_atencion', volunteer.id);

    if (data) {
      setActiveSession(data);
      if (data.type === 'video') {
        toast("Conectando videollamada...", { icon: 'video' });
      } else {
        toast("Entrando al chat...", { icon: 'chat' });
      }
    } else {
      toast.error("Error al atender la sesión");
    }
  };

  const handleFinishSession = async () => {
    if (!activeSession) return;
    await supabaseService.updateSessionStatus(activeSession.id, 'finalizado');
    setActiveSession(null);
    toast.success("Sesión finalizada");
    fetchData();
  };

  useEffect(() => {
    if (activeSession && activeSession.type === 'video') {
      // ... (jitsi init logic unchanged)
      const timer = setTimeout(() => {
        initializeJitsi(
          'dashboard-jitsi',
          activeSession.sala_jitsi_id,
          `Voluntario ${volunteer.nombre}`,
          () => { },
          true
        );
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSession, volunteer.nombre]);
  const handleExport = () => {
    if (sessions.length === 0) {
      toast.error("No hay datos nuevos para exportar");
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(sessions);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sesiones");
      XLSX.writeFile(wb, "sesiones_dashboard.xlsx");
      toast.success("Reporte generado correctamente");
    } catch (error) {
      console.error("Error exporting", error);
      toast.error("Error al generar el reporte");
    }
  };

  const handleExportHistory = () => {
    if (historyFiltered.length === 0) {
      toast.error("No hay historial para exportar");
      return;
    }
    try {
      // Enrich data for export
      const exportData = historyFiltered.map(s => {
        const survey = surveys.find(sur => sur.sesion_id === s.id);
        return {
          Fecha: new Date(s.fecha_ingreso).toLocaleDateString(),
          Hora: new Date(s.fecha_ingreso).toLocaleTimeString(),
          Usuario: `${s.nombre} ${s.apellido}`,
          País: s.pais,
          Tema: s.tema,
          Canal: s.type,
          Estado: s.estado,
          AtendidoPor: s.voluntario_id ? (s.voluntario_id === volunteer.id ? 'Mí' : 'Otro') : 'Nadie',
          Calificación: survey?.calificacion || 'N/A',
          Comentario: survey?.comentarios || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial");
      XLSX.writeFile(wb, `historial_${selectedDate}.xlsx`);
      toast.success("Historial exportado");
    } catch (error) {
      console.error(error);
      toast.error("Error al exportar historial");
    }
  };

  // --- Statistics ---
  const totalSesiones = sessions.length;
  const waitingCount = sessions.filter(s => s.estado === 'esperando').length;
  const activeCount = sessions.filter(s => s.estado === 'en_atencion').length;
  const videoCount = sessions.filter(s => s.type === 'video' && s.estado !== 'finalizado' && s.estado !== 'abandonado').length;
  const chatCount = sessions.filter(s => s.type === 'chat' && s.estado !== 'finalizado' && s.estado !== 'abandonado').length;

  // --- Filtered Lists based on Dashboard Filter ---

  // 1. Waiting List
  let waitingSessions = sessions.filter(s => s.estado === 'esperando');
  if (filterMode === 'video') waitingSessions = waitingSessions.filter(s => s.type === 'video');
  if (filterMode === 'chat') waitingSessions = waitingSessions.filter(s => s.type === 'chat');

  // 2. Active List
  let activeSessionsList = sessions.filter(s => s.estado === 'en_atencion');
  if (filterMode === 'video') activeSessionsList = activeSessionsList.filter(s => s.type === 'video');
  if (filterMode === 'chat') activeSessionsList = activeSessionsList.filter(s => s.type === 'chat');

  // 3. History
  const historyRaw = sessions.filter(s => ['finalizado', 'abandonado'].includes(s.estado));
  const historyFiltered = historyRaw.filter(s => {
    const sessionDate = new Date(s.fecha_ingreso).toISOString().split('T')[0];
    const matchDate = sessionDate === selectedDate;
    const matchStatus = statusFilter === 'all' ? true : s.estado === statusFilter;

    // Apply Dashboard Filter to History as well if type-based
    let matchType = true;
    if (filterMode === 'video') matchType = s.type === 'video';
    if (filterMode === 'chat') matchType = s.type === 'chat';

    return matchDate && matchStatus && matchType;
  }).sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime());

  // Visibility flags
  const showWaiting = ['all', 'waiting', 'video', 'chat'].includes(filterMode);
  const showActive = ['all', 'active', 'video', 'chat'].includes(filterMode);
  const showHistory = ['all', 'video', 'chat'].includes(filterMode); // Hide history when focusing on Waiting or Active specific
  if (activeSession) {
    // ... (active session view logic unchanged)
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <div className="h-14 bg-gray-800 flex items-center justify-between px-6 text-white shadow-md z-10">
          <div className="flex flex-col">
            <span className="font-bold text-sm">Atendiendo a: {activeSession.nombre} {activeSession.apellido}</span>
            <span className="text-xs text-gray-300">
              {activeSession.type === 'video' ? '📹 Video Llamada' : '💬 Chat'} | Tema: {activeSession.tema}
            </span>
          </div>
          <button
            onClick={handleFinishSession}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-full text-sm font-bold cursor-pointer transition-colors"
          >
            Finalizar Sesión
          </button>
        </div>
        {activeSession.type === 'video' ? (
          <div id="dashboard-jitsi" className="flex-1 w-full bg-black"></div>
        ) : (
          <div className="flex-1 bg-gray-100 p-4">
            <ChatRoom session={activeSession} currentUser="volunteer" />
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout title="Panel de Misionero" rightContent={
      <div className="flex items-center gap-4">
        <div className="text-right hidden md:block">
          <div className="text-sm font-bold text-gray-700">{volunteer.nombre}</div>
          <button
            onClick={toggleStatus}
            className="text-xs flex items-center justify-end gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 transition-colors"
            title="Clic para cambiar estado"
          >
            <span className={`w-2 h-2 rounded-full ${currentStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={currentStatus === 'online' ? 'text-green-600' : 'text-red-500'}>
              {currentStatus === 'online' ? 'Online' : 'Ocupado'}
            </span>
          </button>
        </div>

        {/* Volunteers Online Count Badge */}
        <div className="flex items-center gap-1 bg-blue-50 text-[var(--color-fs-blue)] px-2 py-1 rounded-full text-xs font-bold" title="Voluntarios conectados">
          <Users className="w-3 h-3" />
          <span>{onlineCount}</span>
        </div>

        <button onClick={onLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors cursor-pointer" title="Salir">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    }>

      {/* Interactive Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <button onClick={() => setFilterMode('all')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'all' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-[var(--color-primary)]">{totalSesiones}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">Total</span>
        </button>
        <button onClick={() => setFilterMode('waiting')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'waiting' ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-orange-500">{waitingCount}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">Esperando</span>
        </button>
        <button onClick={() => setFilterMode('active')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'active' ? 'bg-green-50 border-green-400 ring-2 ring-green-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-green-500">{activeCount}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">Atendiendo</span>
        </button>
        <button onClick={() => setFilterMode('video')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'video' ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-blue-500">{videoCount}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">Video</span>
        </button>
        <button onClick={() => setFilterMode('chat')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'chat' ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-purple-500">{chatCount}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">Chat</span>
        </button>
      </div>

      {/* WAITING SECTION */}
      {showWaiting && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-fs-text)] flex items-center gap-2">
              <Users className="w-5 h-5" /> Cola de Espera ({waitingSessions.length})
            </h3>
            <button onClick={() => fetchData()} className="text-[var(--color-fs-blue)] hover:bg-blue-50 p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          </div>

          {waitingSessions.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">País</th>
                    <th className="px-4 py-3 font-medium">Tema</th>
                    <th className="px-4 py-3 font-medium">Canal</th>
                    <th className="px-4 py-3 font-medium text-right">Espera</th>
                    <th className="px-4 py-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {waitingSessions.map((s, index) => {
                    const isPriority = index === 0;
                    // Calculate real-time wait minutes
                    const waitMinutes = Math.max(0, Math.floor((Date.now() - new Date(s.fecha_ingreso).getTime()) / 60000));

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${isPriority ? 'bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)] border-l-4 border-l-[var(--color-fs-green)]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div className="flex flex-col">
                            <span>{s.nombre} {s.apellido}</span>
                            {isPriority && (
                              <span className="text-[10px] uppercase font-bold text-[var(--color-fs-green-dark)] tracking-wider">Siguiente Prioridad</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.pais}</td>
                        <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{s.tema}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.type === 'video' ? 'bg-blue-50 text-[var(--color-fs-blue)]' : 'bg-gray-100 text-gray-700'}`}>
                            {s.type === 'video' ? <Video className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            {s.type === 'video' ? 'Video' : 'Chat'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${isPriority ? 'text-[var(--color-fs-green-dark)]' : 'text-gray-700'} ${waitMinutes >= 1 ? 'text-red-600 animate-pulse' : ''}`}>
                          {waitMinutes}m
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleAttend(s)}
                            className={`${isPriority ? 'bg-[var(--color-fs-green)] text-white hover:bg-[var(--color-fs-green-dark)] px-3 py-1 rounded shadow-sm' : 'text-[var(--color-fs-blue)] hover:text-[var(--color-fs-blue-hover)] hover:underline'} font-bold text-xs uppercase tracking-wide cursor-pointer transition-all`}
                          >
                            {isPriority ? 'Atender Ahora' : 'Atender'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center mb-8 flex flex-col items-center animate-fade-in">
              <div className="w-16 h-16 bg-[var(--color-primary-50)] text-[var(--color-fs-green)] rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No hay personas en espera</h3>
              <p className="text-gray-500">¡Excelente trabajo! Todo está al día por el momento.</p>
            </div>
          )}
        </>
      )}

      {/* Active Sessions List */}
      {showActive && activeSessionsList.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-[var(--color-fs-blue)] mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Sesiones en Curso ({activeSessionsList.length})
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Hora Inicio</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Tema</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3">Atendido Por</th>
                  <th className="px-4 py-3 text-right">Tiempo Activo</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeSessionsList.map(s => {
                  const isMine = s.voluntario_id === volunteer.id;
                  const startTime = new Date(s.fecha_ingreso).getTime() + (s.tiempo_espera_minutos * 60000);
                  const activeDuration = Math.max(0, Math.floor((Date.now() - startTime) / 60000));

                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.nombre} {s.apellido}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{s.tema}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.type === 'video' ? 'bg-blue-50 text-[var(--color-fs-blue)]' : 'bg-gray-100 text-gray-700'}`}>
                          {s.type === 'video' ? <Video className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                          {s.type === 'video' ? 'Video' : 'Chat'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isMine ? 'bg-[var(--color-fs-green)]' : 'bg-gray-300'}`}></span>
                          <span className="text-gray-700 font-medium">{isMine ? 'Tú' : 'Otro Voluntario'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--color-fs-green-dark)]">{activeDuration} min</td>
                      <td className="px-4 py-3 text-right">
                        {isMine ? (
                          <button
                            onClick={() => setActiveSession(s)}
                            className="text-[var(--color-fs-green)] hover:text-[var(--color-fs-green-dark)] font-bold text-xs uppercase cursor-pointer hover:underline flex items-center justify-end gap-1 w-full"
                          >
                            Retomar <Play className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveSession(s)}
                            className="text-[var(--color-fs-blue)] hover:text-[var(--color-fs-blue-hover)] font-bold text-xs uppercase cursor-pointer hover:underline flex items-center justify-end gap-1 w-full"
                          >
                            Ayudar <Users className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY & ALERTS */}
      {showHistory && (
        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <h3 className="text-lg font-semibold text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Historial de Turnos
            </h3>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-2 py-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm outline-none bg-transparent"
                />
              </div>
              <select
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">Todos los Estados</option>
                <option value="finalizado">Atendidos</option>
                <option value="abandonado">Abandonados</option>
              </select>
              <button onClick={handleExportHistory} className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3 whitespace-nowrap">
                <FileSpreadsheet className="w-3 h-3" /> Exportar
              </button>
            </div>
          </div>

          {historyFiltered.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-4">No hay sesiones registradas para la fecha seleccionada.</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">País</th>
                    <th className="px-4 py-3">Tema</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3 text-center">Espera</th>
                    <th className="px-4 py-3 text-center">Duración</th>
                    <th className="px-4 py-3">Atendido Por</th>
                    <th className="px-4 py-3 text-center">Calificación / Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyFiltered.map(s => {
                    const survey = surveys.find(sur => sur.sesion_id === s.id);
                    const isAbandoned = s.estado === 'abandonado';
                    return (
                      <tr key={s.id} className={isAbandoned ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 text-gray-600">{new Date(s.fecha_ingreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.nombre} {s.apellido}</td>
                        <td className="px-4 py-3 text-gray-600">{s.pais}</td>
                        <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{s.tema}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.type === 'video' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {s.type === 'video' ? <Video className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            {s.type === 'video' ? 'Video' : 'Chat'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {s.tiempo_espera_minutos}m
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isAbandoned ? (
                            <span className="text-red-500 text-xs">-</span>
                          ) : (
                            <span className="font-semibold text-gray-700">{s.duracion_conversacion_minutos || 0}m</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.voluntario_id ? (
                            s.voluntario_id === volunteer.id ? 'Tú' : 'Otro Voluntario'
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {survey ? (
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-0.5 text-yellow-400">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < survey.calificacion ? 'fill-current' : 'text-gray-200'}`} />
                                ))}
                              </div>
                              {survey.comentarios && (
                                <button
                                  onClick={() => setSelectedComment(survey.comentarios!)}
                                  className="text-[var(--color-fs-blue)] hover:text-[var(--color-fs-blue-hover)] bg-blue-50 p-1.5 rounded-full transition-colors cursor-pointer"
                                  title="Ver comentario"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Comment Modal */}
      {selectedComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative animate-slide-up">
            <button
              onClick={() => setSelectedComment(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-[var(--color-fs-blue)] mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Comentario del Usuario
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 italic">
              "{selectedComment}"
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedComment(null)}
                className="btn-primary cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};