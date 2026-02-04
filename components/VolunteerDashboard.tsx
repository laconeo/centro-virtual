import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useLanguage } from '../src/contexts/LanguageContext';
import { LogOut, FileSpreadsheet, Users, Video, MessageSquare, RefreshCw, Activity, Clock, CheckCircle, Play, Star, Calendar, Settings, Globe, Power, BarChart2 } from 'lucide-react';
import { Volunteer, UserSession, SatisfactionSurvey } from '../types';
import { supabaseService } from '../services/supabaseService';
import { initializeJitsi } from '../services/jitsi';
import { Layout } from './ui/Layout';
import { ChatRoom } from './ChatRoom';
import { ReportsDashboard } from './ReportsDashboard';


interface DashboardProps {
  volunteer: Volunteer;
  onLogout: () => void;
  onConfigClick: () => void;
}

export const VolunteerDashboard: React.FC<DashboardProps> = ({ volunteer, onLogout, onConfigClick }) => {
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [historySessions, setHistorySessions] = useState<UserSession[]>([]);
  // Combined for existing logic compatibility, though we could refactor downstream
  const sessions = [...activeSessions, ...historySessions];
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [activeSession, setActiveSession] = useState<UserSession | null>(null);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);

  // Date and Status Filter
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'finalizado' | 'abandonado'>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'waiting' | 'active' | 'video' | 'chat'>('all');

  // Status State
  const [currentStatus, setCurrentStatus] = useState<'online' | 'busy' | 'offline'>('online');
  const [onlineVolunteers, setOnlineVolunteers] = useState<Volunteer[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isOnlineOpen, setIsOnlineOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);


  const fetchData = async () => {
    // Fetch Active
    const activeRes = await supabaseService.getSessions(true);
    if (activeRes.data) setActiveSessions(activeRes.data as UserSession[]);

    // Fetch History
    const historyRes = await supabaseService.getHistory();
    if (historyRes.data) setHistorySessions(historyRes.data as UserSession[]);

    const surveyRes = await supabaseService.getSurveys();
    if (surveyRes.data) setSurveys(surveyRes.data as SatisfactionSurvey[]);

    // Updated to get full list
    const volRes = await supabaseService.getAllVolunteers();
    if (volRes.data) {
      setOnlineVolunteers(volRes.data as Volunteer[]);
      setOnlineCount(volRes.data.filter(v => v.status === 'online').length);
    }
  };
  const toggleStatus = async () => {
    const newStatus = currentStatus === 'online' ? 'busy' : 'online';
    setCurrentStatus(newStatus);
    await supabaseService.updateVolunteerStatus(volunteer.id, newStatus);
    toast.success(t('dashboard_status_change').replace('{status}', newStatus === 'online' ? t('dashboard_available') : t('dashboard_busy')));
    fetchData();
  };

  const forceOffline = async (volId: string) => {
    await supabaseService.updateVolunteerStatus(volId, 'offline');
    toast.success('Voluntario desconectado');
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

    // Counter for slower polling
    let tickCount = 0;

    const interval = setInterval(async () => {
      tickCount++;

      // Poll ACTIVE sessions (Fast: 3s)
      const sessionRes = await supabaseService.getSessions(true);
      if (sessionRes.data) {
        const data = sessionRes.data as UserSession[];
        setActiveSessions(prev => {
          // Simple string comparison to avoid re-render if data is identical
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
        handleAlerts(data);
      }

      // Poll Surveys & History (Slow: every 30s - 10 ticks)
      if (tickCount % 10 === 0) {
        const surveyRes = await supabaseService.getSurveys();
        if (surveyRes.data) setSurveys(surveyRes.data as SatisfactionSurvey[]);

        // Optional: Poll history too if we want to see other people's finished sessions eventually
        // const histRes = await supabaseService.getHistory();
        // if (histRes.data) setHistorySessions(histRes.data as UserSession[]);
      }

      // Poll Volunteers (Fast-ish: 3s) - Needed for 'Online' status accuracy
      const volRes = await supabaseService.getAllVolunteers();
      if (volRes.data) {
        const data = volRes.data as Volunteer[];
        setOnlineVolunteers(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
        setOnlineCount(data.filter(v => v.status === 'online').length);
      }
    }, 3000); // Polling every 3s

    const handleBeforeUnload = () => {
      supabaseService.updateVolunteerStatus(volunteer.id, 'offline');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // NOTE: We do NOT set offline here anymore, to avoid "flickering" to offline 
      // when navigating to Config or during React StrictMode re-renders.
      // Offline is now handled by 'beforeunload' (tab close) or manual Logout.
    };
  }, []);

  const handleLogoutClick = async () => {
    // Set offline explicitly when user clicks Logout
    await supabaseService.updateVolunteerStatus(volunteer.id, 'offline');
    onLogout();
  };

  // ... (handleAttend and handleFinishSession activeSession logic unchanged) 
  const handleAttend = async (session: UserSession) => {
    const { data } = await supabaseService.updateSessionStatus(session.id, 'en_atencion', volunteer.id);

    if (data) {
      setActiveSession(data);
      // Auto-update status to busy
      await supabaseService.updateVolunteerStatus(volunteer.id, 'busy');
      setCurrentStatus('busy');

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

    // Auto-update status back to online
    await supabaseService.updateVolunteerStatus(volunteer.id, 'online');
    setCurrentStatus('online');

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
          AtendidoPor: s.voluntario_id ? (s.voluntario_id === volunteer.id ? 'Mí' : (onlineVolunteers.find(v => v.id === s.voluntario_id)?.nombre || 'Otro')) : 'Nadie',
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
  // The header has a badge with `onlineCount`. Feature request says "esquina superior derecha".
  // So I will implement a dropdown for the `onlineCount` badge to show online volunteers.
  // But wait, `getOnlineVolunteersCount` only returns a number. I might need to update service to get names.
  // Or check if I can get them from `sessions`? No, sessions track users. Volunteers table tracks volunteers.

  // Let's check SupabaseService for `getOnlineVolunteers`.

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
            <ChatRoom
              session={activeSession}
              currentUser="volunteer"
              currentVolunteerId={volunteer.id}
              onExit={() => {
                // Solo salir del chat, no finalizar la sesión
                setActiveSession(null);
                supabaseService.updateVolunteerStatus(volunteer.id, 'online');
                setCurrentStatus('online');
                toast('Has salido del chat', { icon: '👋' });
              }}
              onEndSession={handleFinishSession}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout title={t('app_title')} rightContent={
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
              {currentStatus === 'online' ? 'Online' : t('dashboard_status_busy')}
            </span>
          </button>
        </div>

        {/* 1. Sesion Info (Volunteers Dropdown) */}
        <div className="relative">
          <button
            onClick={() => setIsOnlineOpen(!isOnlineOpen)}
            className="flex items-center gap-1 bg-blue-50 text-[var(--color-fs-blue)] px-2 py-1 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
            title="Ver voluntarios"
          >
            <Users className="w-3 h-3" />
            <span>{onlineCount}</span>
          </button>

          {isOnlineOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsOnlineOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg py-2 z-20 border border-gray-100 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase">Voluntarios ({onlineVolunteers.length})</span>
                </div>
                {onlineVolunteers.map(vol => (
                  <div key={vol.id} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0 group">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${vol.status === 'online' ? 'bg-green-500' : vol.status === 'busy' ? 'bg-red-500' : 'bg-gray-300'}`} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">{vol.nombre} {vol.id === volunteer.id && '(Tú)'}</span>
                        <span className="text-xs text-gray-400">
                          {vol.status === 'online' ? 'Online' : vol.status === 'busy' ? t('dashboard_status_busy') : 'Offline'}
                          {vol.last_status_change && ` • ${new Date(vol.last_status_change).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                    </div>

                    {vol.id !== volunteer.id && vol.status !== 'offline' && (
                      <button
                        onClick={() => forceOffline(vol.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                        title="Desconectar usuario (Forzar Offline)"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 2. Config */}
        <button onClick={onConfigClick} className="text-gray-500 hover:bg-gray-50 p-2 rounded-full transition-colors cursor-pointer" title="Configuración">
          <Settings className="w-5 h-5" />
        </button>

        {/* 2.1 Reports */}
        <button
          onClick={() => setIsReportsOpen(true)}
          className="text-gray-500 hover:bg-gray-50 p-2 rounded-full transition-colors cursor-pointer"
          title="Ver Reportes y Estadísticas"
        >
          <BarChart2 className="w-5 h-5" />
        </button>


        {/* 3. Language */}
        <div className="relative">
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 flex items-center gap-1"
            title="Cambiar idioma"
          >
            <Globe className="w-5 h-5" />
            <span className="text-xs font-medium uppercase">{language}</span>
          </button>
          {isLangOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsLangOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-100">
                {availableLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${language === lang.code ? 'text-[var(--color-primary)] font-semibold bg-blue-50' : 'text-gray-700'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 4. Logout (Last) */}
        <button onClick={handleLogoutClick} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors cursor-pointer" title="Salir">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    }>

      {/* Interactive Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <button onClick={() => setFilterMode('all')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'all' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-[var(--color-primary)]">{totalSesiones}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">{t('dashboard_stats_total')}</span>
        </button>
        <button onClick={() => setFilterMode('waiting')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'waiting' ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-orange-500">{waitingCount}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">{t('dashboard_stats_waiting')}</span>
        </button>
        <button onClick={() => setFilterMode('active')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'active' ? 'bg-green-50 border-green-400 ring-2 ring-green-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-green-500">{activeCount}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">{t('dashboard_stats_active')}</span>
        </button>
        <button onClick={() => setFilterMode('video')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'video' ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-blue-500">{videoCount}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">{t('dashboard_stats_video')}</span>
        </button>
        <button onClick={() => setFilterMode('chat')} className={`p-4 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center ${filterMode === 'chat' ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
          <span className="text-2xl font-bold text-purple-500">{chatCount}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold mt-1">{t('dashboard_stats_chat')}</span>
        </button>
      </div>

      {/* WAITING SECTION */}
      {showWaiting && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-fs-text)] flex items-center gap-2">
              <Users className="w-5 h-5" /> {t('dashboard_tab_waiting')} ({waitingSessions.length})
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
                    <th className="px-4 py-3 font-medium">{t('dashboard_col_name')}</th>
                    <th className="px-4 py-3 font-medium">{t('dashboard_col_country')}</th>
                    <th className="px-4 py-3 font-medium">{t('dashboard_col_topic')}</th>
                    <th className="px-4 py-3 font-medium">{t('dashboard_col_channel')}</th>
                    <th className="px-4 py-3 font-medium">{t('dashboard_col_language')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('dashboard_stats_waiting')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('dashboard_col_actions')}</th>
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
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase">
                            {s.idioma || 'ES'}
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
                            {t('dashboard_btn_attend')}
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
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('dashboard_no_users_waiting')}</h3>
              <p className="text-gray-500">{t('dashboard_all_good')}</p>
            </div>
          )}
        </>
      )}

      {/* Active Sessions List */}
      {showActive && activeSessionsList.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-[var(--color-fs-blue)] mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" /> {t('dashboard_active_sessions')} ({activeSessionsList.length})
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">{t('dashboard_col_time')}</th>
                  <th className="px-4 py-3">{t('dashboard_col_name')}</th>
                  <th className="px-4 py-3">{t('dashboard_col_topic')}</th>
                  <th className="px-4 py-3">{t('dashboard_col_channel')}</th>
                  <th className="px-4 py-3">{t('dashboard_col_language')}</th>
                  <th className="px-4 py-3">Atendido Por</th>
                  <th className="px-4 py-3 text-right">Tiempo Activo</th>
                  <th className="px-4 py-3 text-right">{t('dashboard_col_actions')}</th>
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase">
                          {s.idioma || 'ES'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isMine ? 'bg-[var(--color-fs-green)]' : 'bg-gray-300'}`}></span>
                          <span className="text-gray-700 font-medium">{isMine ? t('dashboard_you') : (onlineVolunteers.find(v => v.id === s.voluntario_id)?.nombre || t('dashboard_other_volunteer'))}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--color-fs-green-dark)]">{activeDuration} min</td>
                      <td className="px-4 py-3 text-right">
                        {isMine ? (
                          <button
                            onClick={() => {
                              setActiveSession(s);
                              supabaseService.updateVolunteerStatus(volunteer.id, 'busy');
                              setCurrentStatus('busy');
                            }}
                            className="text-[var(--color-fs-green)] hover:text-[var(--color-fs-green-dark)] font-bold text-xs uppercase cursor-pointer hover:underline flex items-center justify-end gap-1 w-full"
                          >
                            {t('dashboard_btn_resume')} <Play className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveSession(s)}
                            className="text-[var(--color-fs-blue)] hover:text-[var(--color-fs-blue-hover)] font-bold text-xs uppercase cursor-pointer hover:underline flex items-center justify-end gap-1 w-full"
                          >
                            {t('dashboard_btn_help')} <Users className="w-3 h-3" />
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
              <CheckCircle className="w-5 h-5" /> {t('dashboard_history_title')}
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
                    <th className="px-4 py-3">Idioma</th>
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
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase">
                            {s.idioma || 'ES'}
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
                            s.voluntario_id === volunteer.id
                              ? t('dashboard_you')
                              : (onlineVolunteers.find(v => v.id === s.voluntario_id)?.nombre || t('dashboard_other_volunteer'))
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
              <MessageSquare className="w-5 h-5" /> {t('dashboard_comment_title')}
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 italic">
              "{selectedComment}"
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedComment(null)}
                className="btn-primary cursor-pointer"
              >
                {t('dashboard_btn_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {isReportsOpen && (
        <ReportsDashboard onClose={() => setIsReportsOpen(false)} />
      )}

    </Layout>
  );
};