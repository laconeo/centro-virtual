import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { UserSession, SatisfactionSurvey, Volunteer, VolunteerIndicator } from '../types';
import { X, Calendar, Download, BarChart2, PieChart, Clock, Star, Users, Video, MessageSquare, Activity, DownloadCloud, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsDashboardProps {
    onClose: () => void;
}

// Helper Icon as wrapper since lucide-react Globe might not be imported as GlobeIcon in all versions
const GlobeIcon = (props: any) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        {...props}
    >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
);

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ onClose }) => {
    // UTC-3 (America/Argentina/Buenos_Aires) timezone helpers
    const toUTC3DateStr = (isoString: string): string => {
        const date = new Date(isoString);
        // Shift by -3 hours (UTC-3 = UTC - 3h)
        const utc3 = new Date(date.getTime() - 3 * 60 * 60 * 1000);
        return utc3.toISOString().split('T')[0]; // YYYY-MM-DD in UTC-3
    };
    const toUTC3Hour = (isoString: string): number => {
        const date = new Date(isoString);
        const utc3 = new Date(date.getTime() - 3 * 60 * 60 * 1000);
        return utc3.getUTCHours();
    };

    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [indicators, setIndicators] = useState<Record<string, VolunteerIndicator>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'general' | 'volunteers' | 'consolidated'>('general');
    const [totalExactCount, setTotalExactCount] = useState(0);
    const [attendedExactCount, setAttendedExactCount] = useState(0);

    // Default to last 30 days
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    const [startDate, setStartDate] = useState(lastMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [selectedChannel, setSelectedChannel] = useState<'all' | 'video' | 'chat'>('all');


    useEffect(() => {
        fetchReportData();
    }, [startDate, endDate]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const sessionRes = await supabaseService.getReportData(startDate, endDate);
            const surveyRes = await supabaseService.getSurveys();
            const volRes = await supabaseService.getAllVolunteers();

            // Fetch exact counts for KPIs to bypass array limits
            const totalCountRes = await supabaseService.getSessionsCount(startDate, endDate);
            const attendedCountRes = await supabaseService.getSessionsCount(startDate, endDate, 'finalizado');

            if (totalCountRes.count !== undefined) setTotalExactCount(totalCountRes.count);
            if (attendedCountRes.count !== undefined) setAttendedExactCount(attendedCountRes.count);

            if (sessionRes.data) setSessions(sessionRes.data as UserSession[]);
            if (surveyRes.data && sessionRes.data) {
                // Filter surveys that belong to the fetched sessions
                const sessionIds = new Set(sessionRes.data.map(s => s.id));
                const filteredSurveys = (surveyRes.data as SatisfactionSurvey[]).filter(s => sessionIds.has(s.sesion_id));
                setSurveys(filteredSurveys);
            }
            
            if (volRes.data) {
                setVolunteers(volRes.data as Volunteer[]);
                const metrics = await supabaseService.getVolunteerMetrics(startDate, endDate, volRes.data as Volunteer[]);
                setIndicators(metrics);
            }
        } catch (error) {
            console.error("Failed to load report data:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- CALCULATIONS ---
    const filteredSessions = sessions.filter(s => selectedChannel === 'all' || s.type === selectedChannel);

    // Use filteredSessions for all downstream calculations
    const totalSessions = filteredSessions.length;
    const attendedSessions = filteredSessions.filter(s => s.estado === 'finalizado');
    const notAttendedSessions = filteredSessions.filter(s => ['abandonado', 'no_atendido'].includes(s.estado));

    // Average Wait Time (only for those who were attended or waited significantly? usually just attended for service level)
    const avgWaitTime = attendedSessions.length
        ? Math.round(attendedSessions.reduce((acc, s) => acc + s.tiempo_espera_minutos, 0) / attendedSessions.length)
        : 0;

    // Average Duration
    const avgDuration = attendedSessions.length
        ? Math.round(attendedSessions.reduce((acc, s) => acc + (s.duracion_conversacion_minutos || 0), 0) / attendedSessions.length)
        : 0;

    // CSAT (Customer Satisfaction)
    const avgRating = surveys.length
        ? (surveys.reduce((acc, s) => acc + s.calificacion, 0) / surveys.length).toFixed(1)
        : 'N/A';

    // Time Components (using UTC-3)
    const sessionHours = filteredSessions.map(s => toUTC3Hour(s.fecha_ingreso));

    const minHour = sessionHours.length ? Math.min(...sessionHours) : 0;
    const maxHour = sessionHours.length ? Math.max(...sessionHours) : 0;
    const timeRange = sessionHours.length ? `${minHour}:00 - ${maxHour + 1}:00` : 'N/A';

    // Grouping Helper
    const groupBy = (data: any[], key: string) => {
        return data.reduce((acc, item) => {
            const val = item[key] || 'Desconocido';
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    };

    const byTopic = groupBy(filteredSessions, 'tema');
    const byCountry = groupBy(filteredSessions, 'pais');
    const byChannel = groupBy(filteredSessions, 'type');


    // CSAT Breakdown
    const getAvgRatingBy = (key: keyof UserSession) => {
        const groups: Record<string, { total: number, count: number }> = {};

        surveys.forEach(survey => {
            const session = filteredSessions.find(s => s.id === survey.sesion_id);
            if (session) {
                const val = (session[key] as string) || 'Desconocido';
                if (!groups[val]) groups[val] = { total: 0, count: 0 };
                groups[val].total += survey.calificacion;
                groups[val].count += 1;
            }
        });

        return Object.entries(groups).map(([k, v]) => ({
            label: k,
            rating: (v.total / v.count).toFixed(1),
            count: v.count
        }));
    };

    const csatByTopic = getAvgRatingBy('tema');
    const csatByCountry = getAvgRatingBy('pais');

    // --- EVOLUTION DATA (Global - filtered by date only) ---
    // We use 'sessions' (original) to show comparison regardless of the top filter, 
    // OR we can use 'filteredSessions' if we want the chart to filter too. 
    // The request implies "Video AND Chat comparison", so providing both makes sense.
    // However, usually charts respect global filters. If 'All' is selected, show both bars.
    // If 'Video' is selected, maybe show only Video bar? 
    // Let's stick to showing BOTH in the evolution chart always for comparison as requested "chat AND video during the month".

    // Helper to generate a continuous date range
    const generateDateRange = (start: string, end: string) => {
        const dates: string[] = [];
        let current = new Date(`${start}T00:00:00Z`);
        const endD = new Date(`${end}T00:00:00Z`);
        while (current <= endD) {
            dates.push(current.toISOString().split('T')[0]);
            current.setUTCDate(current.getUTCDate() + 1);
        }
        return dates;
    };

    const allDays = generateDateRange(startDate, endDate);

    // Group by Date (using UTC-3 to avoid day-jump at midnight)
    const dailyStats = allDays.reduce((acc, d) => {
        acc[d] = { video: 0, chat: 0 };
        return acc;
    }, {} as Record<string, { video: number, chat: number }>);

    sessions.forEach(s => {
        if (s.estado === 'finalizado') {
            const date = toUTC3DateStr(s.fecha_ingreso);
            if (dailyStats[date]) {
                if (s.type === 'video') dailyStats[date].video++;
                if (s.type === 'chat') dailyStats[date].chat++;
            }
        }
    });

    const sortedDates = allDays;
    const maxDailyCount = sortedDates.reduce((max, date) => Math.max(max, dailyStats[date].video + dailyStats[date].chat), 0);
    const maxIndividualCount = sortedDates.reduce((max, date) => Math.max(max, dailyStats[date].video, dailyStats[date].chat), 0);

    // --- HOURLY ATTENTION DATA ---
    // Build a 24-slot array (0..23) for the filtered sessions
    const hourlyStats: { video: number; chat: number }[] = Array.from({ length: 24 }, () => ({ video: 0, chat: 0 }));
    filteredSessions.forEach(s => {
        const h = toUTC3Hour(s.fecha_ingreso);
        if (s.type === 'video') hourlyStats[h].video++;
        else hourlyStats[h].chat++;
    });

    // Determine visible range: only hours with at least 1 ticket (plus 1 padding each side)
    const activeHours = hourlyStats.map((_, i) => i).filter(i => hourlyStats[i].video + hourlyStats[i].chat > 0);
    const hourRangeStart = activeHours.length ? Math.max(0, activeHours[0] - 1) : 0;
    const hourRangeEnd   = activeHours.length ? Math.min(23, activeHours[activeHours.length - 1] + 1) : 23;
    const visibleHours   = Array.from({ length: hourRangeEnd - hourRangeStart + 1 }, (_, i) => i + hourRangeStart);

    const maxHourlyTotal  = visibleHours.reduce((m, h) => Math.max(m, hourlyStats[h].video + hourlyStats[h].chat), 0);
    const maxHourlyIndiv  = visibleHours.reduce((m, h) => Math.max(m, hourlyStats[h].video, hourlyStats[h].chat), 0);
    const avgHourlyTotal  = filteredSessions.length > 0 && visibleHours.length > 0
        ? filteredSessions.length / visibleHours.length
        : 0;
    const peakHour        = visibleHours.reduce((best, h) => {
        const total = hourlyStats[h].video + hourlyStats[h].chat;
        return total > (hourlyStats[best]?.video + hourlyStats[best]?.chat || 0) ? h : best;
    }, visibleHours[0] ?? 0);


    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: General Stats
        const generalStats = [
            { Metrica: 'Total Sesiones', Valor: totalSessions },
            { Metrica: 'Casos Atendidos', Valor: attendedSessions.length },
            { Metrica: 'No Atendidos', Valor: notAttendedSessions.length },
            { Metrica: 'Tiempo Espera Promedio (min)', Valor: avgWaitTime },
            { Metrica: 'Duración Promedio (min)', Valor: avgDuration },
            { Metrica: 'Satisfacción Promedio', Valor: avgRating },
            { Metrica: 'Franja Horaria', Valor: timeRange },
            { Metrica: 'Desde', Valor: startDate },
            { Metrica: 'Hasta', Valor: endDate },
        ];
        const wsGeneral = XLSX.utils.json_to_sheet(generalStats);
        XLSX.utils.book_append_sheet(wb, wsGeneral, "Resumen");


        // Sheet 2: Raw Data
        const rawData = filteredSessions.map(s => {
            const survey = surveys.find(sur => sur.sesion_id === s.id);
            return {
                ID: s.id,
                Fecha: new Date(s.fecha_ingreso).toLocaleDateString(),
                Hora: new Date(s.fecha_ingreso).toLocaleTimeString(),
                Nombre: `${s.nombre} ${s.apellido}`,
                Pais: s.pais,
                Tema: s.tema,
                Tipo: s.type,
                Estado: s.estado,
                Espera_Min: s.tiempo_espera_minutos,
                Duracion_Min: s.duracion_conversacion_minutos,
                Calificacion: survey?.calificacion || '',
                Comentario: survey?.comentarios || ''
            };
        });
        const wsData = XLSX.utils.json_to_sheet(rawData);
        XLSX.utils.book_append_sheet(wb, wsData, "Detalle Sesiones");

        XLSX.writeFile(wb, `Reporte_Centro_Virtual_${startDate}_${endDate}.xlsx`);
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <BarChart2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Reporte de Uso</h2>
                        <p className="text-xs text-gray-500">Analíticas y estadísticas del Centro Virtual</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            className="text-sm outline-none"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            className="text-sm outline-none"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    {/* Channel Filter */}
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-sm">
                        <Video className="w-4 h-4 text-gray-500" />
                        <select
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value as 'all' | 'video' | 'chat')}
                            className="bg-transparent text-sm outline-none border-none p-0 w-24"
                        >
                            <option value="all">Todos</option>
                            <option value="video">Video</option>
                            <option value="chat">Chat</option>
                        </select>
                    </div>

                    <a
                        href="?dashboard=extensions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                        title="Ver dashboard de instalaciones de extensiones"
                    >
                        <DownloadCloud className="w-4 h-4" /> Extensiones
                    </a>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        <Download className="w-4 h-4" /> Exportar Excel
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 mb-6 font-medium">
                            <button
                                className={`px-5 py-3 text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'border-[var(--color-fs-blue)] text-[var(--color-fs-blue)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                onClick={() => setActiveTab('general')}
                            >
                                <PieChart className="w-4 h-4" /> Resumen General
                            </button>
                            <button
                                className={`px-5 py-3 text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'volunteers' ? 'border-[var(--color-fs-blue)] text-[var(--color-fs-blue)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                onClick={() => setActiveTab('volunteers')}
                            >
                                <Users className="w-4 h-4" /> Rendimiento de Voluntarios
                            </button>
                            <button
                                className={`px-5 py-3 text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'consolidated' ? 'border-[var(--color-fs-blue)] text-[var(--color-fs-blue)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                onClick={() => setActiveTab('consolidated')}
                            >
                                <BarChart2 className="w-4 h-4" /> Consolidado
                            </button>
                        </div>

                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-[var(--color-fs-tree)] animate-slide-up" style={{ animationDelay: '0ms' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[var(--color-fs-text-secondary)] text-xs font-bold uppercase tracking-wider">Casos Atendidos</p>
                                        <h3 className="text-3xl font-light text-[var(--color-fs-text)] mt-1">
                                            {selectedChannel === 'all' ? attendedExactCount : attendedSessions.length}
                                        </h3>
                                    </div>
                                    <div className="text-[var(--color-fs-tree)]">
                                        <Users className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-xs text-[var(--color-fs-text-secondary)] flex justify-between border-t pt-2 mt-2 border-gray-100">
                                    <span>Total: {selectedChannel === 'all' ? totalExactCount : totalSessions}</span>
                                    <span className="text-red-500 font-medium">No atendidos: {notAttendedSessions.length}</span>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-[var(--color-fs-blue)] animate-slide-up" style={{ animationDelay: '100ms' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[var(--color-fs-text-secondary)] text-xs font-bold uppercase tracking-wider">Tiempo Espera</p>
                                        <h3 className="text-3xl font-light text-[var(--color-fs-text)] mt-1">{avgWaitTime}m</h3>
                                    </div>
                                    <div className="text-[var(--color-fs-blue)]">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-xs text-[var(--color-fs-text-secondary)] border-t pt-2 mt-2 border-gray-100">Promedio general</div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-[var(--color-fs-blue)] animate-slide-up" style={{ animationDelay: '200ms' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[var(--color-fs-text-secondary)] text-xs font-bold uppercase tracking-wider">Duración Atención</p>
                                        <h3 className="text-3xl font-light text-[var(--color-fs-text)] mt-1">{avgDuration}m</h3>
                                    </div>
                                    <div className="text-[var(--color-fs-blue)]">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-xs text-[var(--color-fs-text-secondary)] border-t pt-2 mt-2 border-gray-100">Promedio por sesión</div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-400 animate-slide-up" style={{ animationDelay: '300ms' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[var(--color-fs-text-secondary)] text-xs font-bold uppercase tracking-wider">Satisfacción</p>
                                        <h3 className="text-3xl font-light text-[var(--color-fs-text)] mt-1 flex items-center gap-2">
                                            {avgRating} <Star className="w-5 h-5 text-yellow-400 fill-current" />
                                        </h3>
                                    </div>
                                    <div className="text-yellow-400">
                                        <Star className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-xs text-[var(--color-fs-text-secondary)] border-t pt-2 mt-2 border-gray-100">{surveys.length} encuestas</div>
                            </div>
                        </div>

                        {/* - - - ROW 1: Breakdowns (3 Columns) - - - */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Breakdown by Topic */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <h4 className="font-medium text-[var(--color-fs-text)] mb-6 flex items-center gap-2 border-b pb-2 border-gray-100">
                                    <PieChart className="w-4 h-4 text-[var(--color-fs-blue)]" /> Distribución por Tema
                                </h4>
                                <div className="space-y-4">
                                    {Object.entries(byTopic).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([topic, count]) => (
                                        <div key={topic}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="text-[var(--color-fs-text-secondary)]">{topic}</span>
                                                <span className="font-bold text-[var(--color-fs-text)]">{count as number} <span className="text-xs font-normal text-gray-400">({Math.round(((count as number) / totalSessions) * 100)}%)</span></span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-sm h-3 overflow-hidden">
                                                <div
                                                    className="h-full rounded-sm"
                                                    style={{
                                                        width: `${((count as number) / totalSessions) * 100}%`,
                                                        backgroundColor: '#005994',
                                                        minWidth: '4px'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Breakdown by Country */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <h4 className="font-medium text-[var(--color-fs-text)] mb-6 flex items-center gap-2 border-b pb-2 border-gray-100">
                                    <GlobeIcon className="w-4 h-4 text-[var(--color-fs-tree)]" /> Distribución por País
                                </h4>
                                <div className="space-y-4">
                                    {Object.entries(byCountry).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([country, count]) => (
                                        <div key={country}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="text-[var(--color-fs-text-secondary)]">{country}</span>
                                                <span className="font-bold text-[var(--color-fs-text)]">{count as number} <span className="text-xs font-normal text-gray-400">({Math.round(((count as number) / totalSessions) * 100)}%)</span></span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-sm h-3 overflow-hidden">
                                                <div
                                                    className="h-full rounded-sm"
                                                    style={{
                                                        width: `${((count as number) / totalSessions) * 100}%`,
                                                        backgroundColor: '#8CB83E',
                                                        minWidth: '4px'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CSAT by Topic (Moved here) */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <h4 className="font-medium text-[var(--color-fs-text)] mb-6 flex items-center gap-2 border-b pb-2 border-gray-100">
                                    <Star className="w-4 h-4 text-yellow-500" /> Satisfacción por Tema
                                </h4>
                                <div className="space-y-4">
                                    {csatByTopic.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)).map((item) => (
                                        <div key={item.label} className="flex items-center gap-4 group">
                                            <div className="w-40 text-sm text-[var(--color-fs-text-secondary)] truncate font-medium" title={item.label}>{item.label}</div>
                                            <div className="flex-1 bg-gray-100 rounded-sm h-2.5 overflow-hidden">
                                                <div
                                                    className="bg-yellow-400 h-full group-hover:bg-yellow-500 transition-colors"
                                                    style={{ width: `${(parseFloat(item.rating) / 5 * 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="w-12 text-right font-bold text-sm text-[var(--color-fs-text)]">{item.rating}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* - - - ROW 2: Chart (Full Width) - - - */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Monthly Evolution Chart (Bar Chart) */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-3">
                                <h4 className="font-medium text-[var(--color-fs-text)] mb-6 flex items-center gap-2 border-b pb-2 border-gray-100">
                                    <Activity className="w-4 h-4 text-[var(--color-fs-blue)]" /> Evolución Diaria (Casos Atendidos)
                                </h4>
                                <div className="h-72 w-full flex flex-col mb-4">
                                    {sortedDates.length === 0 ? (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                            No hay datos para el periodo seleccionado.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 flex items-end justify-between gap-1 px-2 pb-2 relative border-b border-gray-100">
                                                {/* Y-Axis Grid Lines (Simplified) */}
                                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                                    {[1, 0.75, 0.5, 0.25, 0].map((tick) => (
                                                        <div key={tick} className="w-full border-t border-gray-100 h-0 flex items-center">
                                                            {/* <span className="text-[10px] text-gray-300 -mt-4 pl-1">{Math.round(maxIndividualCount * tick)}</span> */}
                                                        </div>
                                                    ))}
                                                </div>

                                                {sortedDates.map((date, i) => {
                                                    const vid = dailyStats[date].video;
                                                    const chat = dailyStats[date].chat;
                                                    const vidH = maxIndividualCount > 0 ? (vid / maxIndividualCount) * 100 : 0;
                                                    const chatH = maxIndividualCount > 0 ? (chat / maxIndividualCount) * 100 : 0;

                                                    return (
                                                        <div key={date} className="flex-1 flex flex-col justify-end items-center group h-full relative min-w-[10px] z-10">
                                                            <div className="flex gap-[1px] md:gap-1 w-full justify-center items-end h-full px-[1px]">
                                                                {/* Video Bar */}
                                                                <div
                                                                    className="w-1/2 bg-[var(--color-fs-blue)] rounded-t-sm relative hover:bg-opacity-90 transition-all"
                                                                    style={{ height: `${Math.max(vidH, 2)}%` }}
                                                                    title={`Video: ${vid}`}
                                                                >
                                                                    {/* Tooltip on Hover */}
                                                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] bg-gray-800 text-white px-1 py-0.5 rounded shadow-sm whitespace-nowrap z-20 pointer-events-none hidden md:block">
                                                                        V: {vid}
                                                                    </div>
                                                                </div>
                                                                {/* Chat Bar */}
                                                                <div
                                                                    className="w-1/2 rounded-t-sm relative hover:bg-opacity-90 transition-all"
                                                                    style={{ height: `${Math.max(chatH, 2)}%`, backgroundColor: '#8CB83E' }}
                                                                    title={`Chat: ${chat}`}
                                                                >
                                                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] bg-gray-800 text-white px-1 py-0.5 rounded shadow-sm whitespace-nowrap z-20 pointer-events-none hidden md:block">
                                                                        C: {chat}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* X Axis Labels */}
                                            <div className="flex w-full mt-2 px-2 text-[9px] text-gray-400">
                                                {sortedDates.map((date) => (
                                                    <div key={date} className="flex-1 flex justify-center">
                                                        <span className="-rotate-45 origin-top-left whitespace-nowrap mt-2 -ml-2">
                                                            {new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm bg-[var(--color-fs-blue)]"></span> Video
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8CB83E' }}></span> Chat
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* - - - ROW 3: Hourly Attention Chart (Full Width) - - - */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-6 border-b pb-2 border-gray-100">
                                <h4 className="font-medium text-[var(--color-fs-text)] flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[var(--color-fs-blue)]" /> Atención por Hora del Día
                                </h4>
                                {filteredSessions.length > 0 && (
                                    <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                        Hora pico: <strong className="text-[var(--color-fs-blue)]">{peakHour}:00–{peakHour + 1}:00</strong>
                                        &nbsp;·&nbsp;{hourlyStats[peakHour]?.video + hourlyStats[peakHour]?.chat} tickets
                                    </span>
                                )}
                            </div>

                            {filteredSessions.length === 0 ? (
                                <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
                                    No hay datos para el periodo seleccionado.
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    {/* Y-Axis Labels */}
                                    <div className="flex flex-col justify-between text-right pr-2 pb-6 w-8 flex-shrink-0">
                                        {[1, 0.75, 0.5, 0.25, 0].map(tick => (
                                            <span key={tick} className="text-[10px] text-gray-400 leading-none">
                                                {Math.round(maxHourlyTotal * tick)}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Chart Area */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        {/* Bars */}
                                        <div className="relative flex-1 flex items-end gap-[3px] border-b border-l border-gray-200 pb-0 min-h-[200px]">
                                            {/* Grid lines */}
                                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                                {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                                                    <div key={tick} className="w-full border-t border-gray-100 h-0" />
                                                ))}
                                            </div>

                                            {/* Average line */}
                                            {maxHourlyTotal > 0 && avgHourlyTotal > 0 && (
                                                <div
                                                    className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400/70 z-10 pointer-events-none"
                                                    style={{ bottom: `${(avgHourlyTotal / maxHourlyTotal) * 100}%` }}
                                                    title={`Promedio: ${avgHourlyTotal.toFixed(1)} tickets/hora`}
                                                >
                                                    <span className="absolute right-1 -top-4 text-[9px] font-bold text-amber-500 bg-white px-1 rounded">
                                                        Prom. {avgHourlyTotal.toFixed(1)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Hour bars */}
                                            {visibleHours.map(h => {
                                                const vid  = hourlyStats[h].video;
                                                const chat = hourlyStats[h].chat;
                                                const total = vid + chat;
                                                const vidH  = maxHourlyIndiv > 0 ? (vid  / maxHourlyIndiv) * 100 : 0;
                                                const chatH = maxHourlyIndiv > 0 ? (chat / maxHourlyIndiv) * 100 : 0;
                                                const isPeak = h === peakHour && total > 0;

                                                return (
                                                    <div
                                                        key={h}
                                                        className={`flex-1 flex flex-col justify-end items-center group relative h-full z-10 min-w-[12px] ${isPeak ? 'rounded-t-sm ring-1 ring-amber-300/40' : ''}`}
                                                    >
                                                        {/* Tooltip */}
                                                        {total > 0 && (
                                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[10px] bg-gray-800 text-white px-2 py-1.5 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none hidden md:block">
                                                                <div className="font-bold mb-0.5">{h}:00 – {h + 1}:00</div>
                                                                {vid > 0 && <div className="text-blue-300">📹 Video: {vid}</div>}
                                                                {chat > 0 && <div style={{ color: '#a3d45a' }}>💬 Chat: {chat}</div>}
                                                                <div className="border-t border-gray-600 mt-0.5 pt-0.5 font-semibold">Total: {total}</div>
                                                                {/* Tooltip arrow */}
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                                                            </div>
                                                        )}

                                                        <div className="flex gap-[1px] w-full justify-center items-end h-full px-[1px]">
                                                            {/* Video bar */}
                                                            <div
                                                                className="w-1/2 rounded-t-sm transition-all duration-200 hover:opacity-80"
                                                                style={{
                                                                    height: `${Math.max(vidH, vid > 0 ? 2 : 0)}%`,
                                                                    backgroundColor: '#005994',
                                                                }}
                                                                title={`Video: ${vid}`}
                                                            />
                                                            {/* Chat bar */}
                                                            <div
                                                                className="w-1/2 rounded-t-sm transition-all duration-200 hover:opacity-80"
                                                                style={{
                                                                    height: `${Math.max(chatH, chat > 0 ? 2 : 0)}%`,
                                                                    backgroundColor: '#8CB83E',
                                                                }}
                                                                title={`Chat: ${chat}`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* X-Axis Labels */}
                                        <div className="flex gap-[3px] mt-1 pl-0">
                                            {visibleHours.map((h, i) => {
                                                const showLabel = visibleHours.length <= 14
                                                    || i === 0
                                                    || i === visibleHours.length - 1
                                                    || h % 2 === 0;
                                                return (
                                                    <div key={h} className="flex-1 text-center min-w-[12px]">
                                                        {showLabel && (
                                                            <span className={`text-[9px] leading-none ${h === peakHour && hourlyStats[h].video + hourlyStats[h].chat > 0 ? 'font-bold text-amber-500' : 'text-gray-400'}`}>
                                                                {h}h
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Legend */}
                            <div className="flex justify-center gap-6 mt-5 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-sm bg-[var(--color-fs-blue)]" /> Video
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8CB83E' }} /> Chat
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-5 border-t-2 border-dashed border-amber-400" /> Promedio
                                </div>
                            </div>
                        </div>

                        </div>
                        )}


                        {activeTab === 'volunteers' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* VOLUNTEERS SUMMARY STATS */}
                                {(() => {
                                    const volunteerStats = volunteers.map(vol => {
                                        const ind = indicators[vol.id];
                                        let totalShifts = 0;
                                        let metAuth = 0;
                                        let missedShifts = 0;
                                        
                                        if (ind) {
                                            Object.values(ind.days).forEach(day => {
                                                if (day.hasShift) {
                                                    totalShifts++;
                                                    if (day.loggedIn) metAuth++;
                                                    else missedShifts++;
                                                }
                                            });
                                        }

                                        const vsessions = filteredSessions.filter(s => s.voluntario_id === vol.id && s.estado === 'finalizado');
                                        const sessionsHandledCount = vsessions.length;
                                        
                                        const avgDuration = vsessions.length 
                                           ? Math.round(vsessions.reduce((acc, s) => acc + (s.duracion_conversacion_minutos || 0), 0) / vsessions.length) 
                                           : 0;

                                        return {
                                            id: vol.id,
                                            name: vol.nombre,
                                            email: vol.email,
                                            shifts: totalShifts,
                                            attendedAuth: metAuth,
                                            absentPoints: missedShifts,
                                            casesHandled: sessionsHandledCount,
                                            avgResolutionTime: avgDuration,
                                            attendanceRate: totalShifts > 0 ? Math.round((metAuth / totalShifts) * 100) : 0
                                        };
                                    }).filter(v => v.shifts > 0 || v.casesHandled > 0);

                                    const topVolunteersByCases = [...volunteerStats].sort((a,b) => b.casesHandled - a.casesHandled).slice(0, 5);
                                    const maxCases = Math.max(...topVolunteersByCases.map(v => v.casesHandled), 1);
                                    
                                    const totalAssignedShifts = volunteerStats.reduce((sum, v) => sum + v.shifts, 0);
                                    const totalAttendedShifts = volunteerStats.reduce((sum, v) => sum + v.attendedAuth, 0);
                                    const totalCasesHandled = volunteerStats.reduce((sum, v) => sum + v.casesHandled, 0);
                                    const globalAttendanceRate = totalAssignedShifts > 0 ? Math.round((totalAttendedShifts / totalAssignedShifts) * 100) : 0;

                                    return (
                                        <div className="space-y-6">
                                            {/* Gráficos de Voluntarios */}
                                            {volunteerStats.length > 0 && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Top 5 Voluntarios */}
                                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                                        <h4 className="font-medium text-[var(--color-fs-text)] mb-6 flex items-center gap-2 border-b pb-2 border-gray-100">
                                                            <BarChart2 className="w-4 h-4 text-[var(--color-fs-blue)]" /> Top 5 - Casos Atendidos
                                                        </h4>
                                                        <div className="space-y-4">
                                                            {topVolunteersByCases.map((vol) => (
                                                                <div key={vol.id}>
                                                                    <div className="flex justify-between text-sm mb-1.5">
                                                                        <span className="text-[var(--color-fs-text-secondary)] truncate w-40" title={vol.name}>{vol.name}</span>
                                                                        <span className="font-bold text-[var(--color-fs-text)]">{vol.casesHandled} casos</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-100 rounded-sm h-3 overflow-hidden">
                                                                        <div 
                                                                            className="h-full rounded-sm bg-[var(--color-fs-blue)]"
                                                                            style={{ width: `${(vol.casesHandled / maxCases) * 100}%`, minWidth: '4px' }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Resumen de Asistencia */}
                                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-center items-center">
                                                        <h4 className="font-medium text-[var(--color-fs-text)] mb-6 w-full flex items-center gap-2 border-b pb-2 border-gray-100">
                                                            <PieChart className="w-4 h-4 text-[var(--color-fs-tree)]" /> Tasa de Asistencia Global
                                                        </h4>
                                                        <div className="relative w-32 h-32 flex items-center justify-center">
                                                            {/* SVG Donut Chart */}
                                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                                {/* Background circle */}
                                                                <path
                                                                    className="text-gray-100"
                                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="4"
                                                                />
                                                                {/* Value circle */}
                                                                <path
                                                                    className={`${globalAttendanceRate >= 80 ? 'text-[#8CB83E]' : globalAttendanceRate >= 50 ? 'text-orange-400' : 'text-red-500'}`}
                                                                    strokeDasharray={`${globalAttendanceRate}, 100`}
                                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="4"
                                                                />
                                                            </svg>
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                <span className="text-2xl font-bold text-[var(--color-fs-text)]">{globalAttendanceRate}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 text-center text-xs text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1">
                                                            <div className="text-right">Guardias Totales:</div>
                                                            <div className="text-left font-bold text-gray-700">{totalAssignedShifts}</div>
                                                            <div className="text-right">Guardias Cumplidas:</div>
                                                            <div className="text-left font-bold text-green-600">{totalAttendedShifts}</div>
                                                            <div className="text-right border-t pt-1">Casos Atendidos:</div>
                                                            <div className="text-left font-bold text-blue-600 border-t pt-1">{totalCasesHandled}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                <h4 className="font-medium text-[var(--color-fs-text)] flex items-center gap-2">
                                                    <Users className="w-5 h-5 text-[var(--color-fs-tree)]" /> Desglose de Guardias
                                                </h4>
                                                <div className="text-xs text-gray-500">Periodo actual vs Guardias asignadas</div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-[#f0f4f8] text-[var(--color-fs-text-secondary)] uppercase text-[10px] font-bold">
                                                        <tr>
                                                            <th className="px-6 py-4">Voluntario</th>
                                                            <th className="px-6 py-4 text-center">Tasa Asistencia</th>
                                                            <th className="px-6 py-4 text-center">Faltas (Pts)</th>
                                                            <th className="px-6 py-4 text-center">Casos Atendidos</th>
                                                            <th className="px-6 py-4 text-center">Tiempo Promedio (min)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {volunteerStats.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No hay actividad de voluntarios para este periodo.</td>
                                                            </tr>
                                                        ) : (
                                                            volunteerStats.sort((a,b) => b.casesHandled - a.casesHandled).map(stat => (
                                                                <tr key={stat.id} className="hover:bg-gray-50 transition-colors group">
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-bold text-[var(--color-fs-text)]">{stat.name}</div>
                                                                        <div className="text-[10px] text-gray-400">{stat.email}</div>
                                                                        <div className="text-[10px] text-[var(--color-fs-text-secondary)] mt-1">Guardias asignadas: {stat.shifts}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <span className={`font-bold ${stat.attendanceRate >= 80 ? 'text-[#8CB83E]' : stat.attendanceRate >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                                                                                {stat.attendanceRate}%
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400 mt-1">{stat.attendedAuth} / {stat.shifts} completadas</div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        {stat.absentPoints > 0 ? (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold text-xs">
                                                                                <ShieldAlert className="w-3 h-3" /> {stat.absentPoints}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold text-xs">
                                                                                <CheckCircle className="w-3 h-3" /> 0
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className="inline-flex items-center justify-center min-w-[30px] rounded-full bg-blue-50 text-[var(--color-fs-blue)] font-bold px-2 py-1">
                                                                            {stat.casesHandled}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center text-[var(--color-fs-text)] font-medium">
                                                                        {stat.avgResolutionTime} min
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })()}
                            </div>
                        )}

                        {activeTab === 'consolidated' && (() => {
                            // --- CONSOLIDATED DATA ---
                            const attendedOnly = filteredSessions.filter(s => s.estado === 'finalizado');

                            // Unique volunteers who worked
                            const activeVolIds = new Set(attendedOnly.map(s => s.voluntario_id).filter(Boolean));
                            const activeVolCount = activeVolIds.size;

                            // Per-missionary stats
                            interface MissionaryStats {
                                id: string;
                                name: string;
                                cases: number;
                                avgTime: number;
                                avgStars: number;
                                starCount: number;
                            }
                            const missionaryMap: Record<string, MissionaryStats> = {};
                            attendedOnly.forEach(s => {
                                const vid = s.voluntario_id || 'unknown';
                                const vol = volunteers.find(v => v.id === vid);
                                const vname = vol ? vol.nombre : (s.voluntario_nombre || 'Desconocido');
                                if (!missionaryMap[vid]) missionaryMap[vid] = { id: vid, name: vname, cases: 0, avgTime: 0, avgStars: 0, starCount: 0 };
                                missionaryMap[vid].cases++;
                                missionaryMap[vid].avgTime += s.duracion_conversacion_minutos || 0;
                            });
                            surveys.forEach(sv => {
                                const sess = attendedOnly.find(s => s.id === sv.sesion_id);
                                if (sess && sess.voluntario_id && missionaryMap[sess.voluntario_id]) {
                                    missionaryMap[sess.voluntario_id].avgStars += sv.calificacion;
                                    missionaryMap[sess.voluntario_id].starCount++;
                                }
                            });
                            const missionaryList = Object.values(missionaryMap).map(m => ({
                                ...m,
                                avgTime: m.cases > 0 ? Math.round(m.avgTime / m.cases) : 0,
                                avgStars: m.starCount > 0 ? parseFloat((m.avgStars / m.starCount).toFixed(1)) : 0
                            })).sort((a, b) => b.cases - a.cases);
                            const maxCasesC = Math.max(...missionaryList.map(m => m.cases), 1);

                            // Daily evolution: volunteers active per day + cases
                            const dailyConsolidated = allDays.reduce((acc, d) => {
                                acc[d] = { cases: 0, vols: new Set<string>() };
                                return acc;
                            }, {} as Record<string, { cases: number; vols: Set<string> }>);

                            attendedOnly.forEach(s => {
                                const d = toUTC3DateStr(s.fecha_ingreso);
                                if (dailyConsolidated[d]) {
                                    dailyConsolidated[d].cases++;
                                    if (s.voluntario_id) dailyConsolidated[d].vols.add(s.voluntario_id);
                                }
                            });
                            const sortedDaysC = allDays;
                            const maxCasesDay = Math.max(...sortedDaysC.map(d => dailyConsolidated[d].cases), 1);
                            const maxVolsDay = Math.max(...sortedDaysC.map(d => dailyConsolidated[d].vols.size), 1);

                            // Hourly evolution (all filtered)
                            const hourlyC: number[] = Array(24).fill(0);
                            const hourlyVolsC: Set<string>[] = Array.from({ length: 24 }, () => new Set());
                            attendedOnly.forEach(s => { 
                                const h = toUTC3Hour(s.fecha_ingreso);
                                hourlyC[h]++; 
                                if (s.voluntario_id) hourlyVolsC[h].add(s.voluntario_id);
                            });
                            const activeHoursC = hourlyC.map((_, i) => i).filter(i => hourlyC[i] > 0);
                            const hourStartC = activeHoursC.length ? Math.max(0, activeHoursC[0] - 1) : 0;
                            const hourEndC   = activeHoursC.length ? Math.min(23, activeHoursC[activeHoursC.length-1]+1) : 23;
                            const visibleHoursC = Array.from({ length: hourEndC - hourStartC + 1 }, (_, i) => i + hourStartC);
                            const maxHourlyC = Math.max(...visibleHoursC.map(h => hourlyC[h]), 1);

                            // Per-missionary hourly: top 5 by cases
                            const top5 = missionaryList.slice(0, 5);
                            const colors = ['#005994','#8CB83E','#f59e0b','#8b5cf6','#ef4444'];

                            const missionaryHourly: Record<string, number[]> = {};
                            top5.forEach(m => { missionaryHourly[m.id] = Array(24).fill(0); });
                            attendedOnly.forEach(s => {
                                if (s.voluntario_id && missionaryHourly[s.voluntario_id]) {
                                    missionaryHourly[s.voluntario_id][toUTC3Hour(s.fecha_ingreso)]++;
                                }
                            });
                            const maxMissionaryHourly = Math.max(
                                ...top5.flatMap(m => visibleHoursC.map(h => missionaryHourly[m.id][h])), 1
                            );

                            return (
                                <div className="space-y-6 animate-fade-in">
                                    {/* KPI Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-[var(--color-fs-blue)]">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Misioneros Activos</p>
                                            <p className="text-3xl font-light text-gray-800">{activeVolCount}</p>
                                            <p className="text-xs text-gray-400 mt-1">en el período</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-[var(--color-fs-tree)]">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Casos Atendidos</p>
                                            <p className="text-3xl font-light text-gray-800">{attendedOnly.length}</p>
                                            <p className="text-xs text-gray-400 mt-1">sesiones finalizadas</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-amber-400">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Tiempo Prom. Atención</p>
                                            <p className="text-3xl font-light text-gray-800">
                                                {missionaryList.length > 0
                                                    ? Math.round(missionaryList.reduce((a,m)=>a+m.avgTime*m.cases,0)/Math.max(attendedOnly.length,1))
                                                    : 0}m
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">promedio global</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-yellow-400">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Estrellas Promedio</p>
                                            <p className="text-3xl font-light text-gray-800 flex items-center gap-1">
                                                {surveys.length > 0 ? (surveys.reduce((a,s)=>a+s.calificacion,0)/surveys.length).toFixed(1) : 'N/A'}
                                                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{surveys.length} encuestas</p>
                                        </div>
                                    </div>

                                    {/* Daily Evolution */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <h4 className="font-medium text-gray-800 mb-4 flex items-center gap-2 border-b pb-2 border-gray-100">
                                            <Activity className="w-4 h-4 text-[var(--color-fs-blue)]" /> Evolución Diaria de Casos y Misioneros
                                        </h4>
                                        {sortedDaysC.length === 0 ? (
                                            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No hay datos para el periodo.</div>
                                        ) : (
                                            <div className="h-64 flex flex-col mb-4">
                                                <div className="flex-1 flex items-end gap-1 border-b border-gray-100 pb-1 pt-6 relative">
                                                    {sortedDaysC.map(d => {
                                                        const barH = (dailyConsolidated[d].cases / maxCasesDay) * 100;
                                                        const volH = (dailyConsolidated[d].vols.size / maxVolsDay) * 100;
                                                        return (
                                                            <div key={d} className="flex-1 flex flex-col justify-end items-center group relative h-full min-w-[10px]">
                                                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none text-center">
                                                                    <div className="font-bold border-b border-gray-600 mb-1 pb-1">{new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                                                                    <div className="text-[var(--color-fs-blue)] font-bold">{dailyConsolidated[d].cases} casos en total</div>
                                                                    <div className="text-amber-400 font-bold">{dailyConsolidated[d].vols.size} misioneros activos</div>
                                                                    <div className="text-gray-300 mt-1 pt-1 border-t border-gray-600 font-medium">Promedio: {dailyConsolidated[d].vols.size > 0 ? (dailyConsolidated[d].cases / dailyConsolidated[d].vols.size).toFixed(1) : 0} casos/mis</div>
                                                                </div>
                                                                
                                                                {/* Voluntarios Badge */}
                                                                {dailyConsolidated[d].vols.size > 0 && (
                                                                    <div 
                                                                        className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm z-20 pointer-events-none border border-white"
                                                                        style={{ bottom: `${Math.min(volH, 100)}%`, marginBottom: '-8px' }}
                                                                    >
                                                                        {dailyConsolidated[d].vols.size}
                                                                    </div>
                                                                )}

                                                                <div className="w-full rounded-t-sm bg-[var(--color-fs-blue)] hover:opacity-80 transition-all z-10"
                                                                    style={{ height: `${Math.max(barH, 2)}%` }} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex w-full mt-2 text-[9px] text-gray-400 px-1">
                                                    {sortedDaysC.map(d => (
                                                        <div key={d} className="flex-1 flex justify-center">
                                                            <span className="-rotate-45 origin-top-right whitespace-nowrap mt-3 mr-2">
                                                                {new Date(d).toLocaleDateString(undefined, { weekday: 'short', day:'2-digit', month:'2-digit' })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hourly Evolution */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                        <h4 className="font-medium text-gray-800 mb-4 flex items-center gap-2 border-b pb-2 border-gray-100">
                                            <Clock className="w-4 h-4 text-[var(--color-fs-blue)]" /> Distribución Horaria de Casos
                                        </h4>
                                        {activeHoursC.length === 0 ? (
                                            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No hay datos.</div>
                                        ) : (
                                            <div className="h-48 flex gap-2">
                                                <div className="flex flex-col justify-between text-right pr-1 w-6 flex-shrink-0 pb-6">
                                                    {[1,.75,.5,.25,0].map(t => <span key={t} className="text-[9px] text-gray-400">{Math.round(maxHourlyC*t)}</span>)}
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    <div className="flex-1 flex items-end gap-[3px] border-b border-l border-gray-200 pt-6">
                                                        {visibleHoursC.map(h => {
                                                            const maxVolsH = Math.max(...visibleHoursC.map(hour => hourlyVolsC[hour].size), 1);
                                                            const volH = (hourlyVolsC[h].size / maxVolsH) * 100;
                                                            const barH = Math.max((hourlyC[h]/maxHourlyC)*100, hourlyC[h]>0?2:0);
                                                            return (
                                                                <div key={h} className="flex-1 flex flex-col justify-end items-center group relative h-full min-w-[10px]">
                                                                    {hourlyC[h] > 0 && (
                                                                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none text-center">
                                                                            <div className="font-bold border-b border-gray-600 mb-1 pb-1">{h}:00–{h+1}:00</div>
                                                                            <div className="text-[var(--color-fs-blue)] font-bold">{hourlyC[h]} casos</div>
                                                                            <div className="text-amber-400 mt-0.5">{hourlyVolsC[h].size} misioneros conectados</div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Voluntarios Badge */}
                                                                    {hourlyVolsC[h].size > 0 && (
                                                                        <div 
                                                                            className="absolute left-1/2 -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-bold shadow-sm z-20 pointer-events-none border border-white"
                                                                            style={{ bottom: `${Math.min(volH, 100)}%`, marginBottom: '-8px' }}
                                                                        >
                                                                            {hourlyVolsC[h].size}
                                                                        </div>
                                                                    )}

                                                                    <div className="w-full rounded-t-sm bg-[var(--color-fs-blue)] hover:opacity-80 transition-all"
                                                                        style={{ height: `${barH}%` }} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex gap-[3px] mt-1">
                                                        {visibleHoursC.map((h,i) => (
                                                            <div key={h} className="flex-1 text-center min-w-[10px]">
                                                                {(visibleHoursC.length <= 14 || i===0 || i===visibleHoursC.length-1 || h%2===0) && (
                                                                    <span className="text-[9px] text-gray-400">{h}h</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Per-Missionary Hourly (Top 5) */}
                                    {top5.length > 0 && (
                                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                            <h4 className="font-medium text-gray-800 mb-4 flex items-center gap-2 border-b pb-2 border-gray-100">
                                                <Users className="w-4 h-4 text-[var(--color-fs-blue)]" /> Distribución Horaria por Misionero (Top 5)
                                            </h4>
                                            <div className="flex flex-col gap-3">
                                                {top5.map((m, mi) => {
                                                    const maxM = Math.max(...visibleHoursC.map(h => missionaryHourly[m.id][h]), 1);
                                                    return (
                                                        <div key={m.id} className="flex items-center gap-3">
                                                            <div className="w-36 text-xs font-medium truncate" style={{color: colors[mi]}} title={m.name}>{m.name}</div>
                                                            <div className="flex-1 flex items-end gap-[2px] h-8">
                                                                {visibleHoursC.map(h => (
                                                                    <div key={h} className="flex-1 rounded-t-sm transition-all hover:opacity-70 min-w-[4px]"
                                                                        style={{ height: `${Math.max((missionaryHourly[m.id][h]/maxM)*100, missionaryHourly[m.id][h]>0?8:0)}%`, backgroundColor: colors[mi] }}
                                                                        title={`${m.name} ${h}:00 · ${missionaryHourly[m.id][h]} casos`} />
                                                                ))}
                                                            </div>
                                                            <div className="text-xs text-gray-400 w-16 text-right">{m.cases} casos</div>
                                                        </div>
                                                    );
                                                })}
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="w-36" />
                                                    <div className="flex-1 flex gap-[2px]">
                                                        {visibleHoursC.filter((_,i)=>visibleHoursC.length<=14||i===0||i===visibleHoursC.length-1||visibleHoursC[i]%2===0).map(h=>(
                                                            <span key={h} className="flex-1 text-center text-[9px] text-gray-400 min-w-[4px]">{h}h</span>
                                                        ))}
                                                    </div>
                                                    <div className="w-16" />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-4 mt-4">
                                                {top5.map((m,mi)=>(
                                                    <div key={m.id} className="flex items-center gap-1 text-xs text-gray-500">
                                                        <span className="w-3 h-3 rounded-sm" style={{backgroundColor:colors[mi]}} />{m.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Ranking Table */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                            <h4 className="font-medium text-gray-800 flex items-center gap-2">
                                                <Star className="w-4 h-4 text-yellow-400" /> Ranking de Misioneros
                                            </h4>
                                            <span className="text-xs text-gray-400">{missionaryList.length} misioneros activos</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="bg-[#f0f4f8] text-[10px] font-bold uppercase text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-3">#</th>
                                                        <th className="px-4 py-3">Misionero</th>
                                                        <th className="px-4 py-3 text-center">Casos</th>
                                                        <th className="px-4 py-3 text-center">Barra</th>
                                                        <th className="px-4 py-3 text-center">T. Prom. (min)</th>
                                                        <th className="px-4 py-3 text-center">⭐ Estrellas</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {missionaryList.length === 0 ? (
                                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">Sin actividad en este período.</td></tr>
                                                    ) : missionaryList.map((m, idx) => (
                                                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <span className={`font-bold text-sm ${idx===0?'text-yellow-500':idx===1?'text-gray-400':idx===2?'text-amber-600':'text-gray-400'}`}>
                                                                    {idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':`#${idx+1}`}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-blue-50 text-[var(--color-fs-blue)] font-bold px-2 py-0.5 text-xs">{m.cases}</span>
                                                            </td>
                                                            <td className="px-4 py-3 w-40">
                                                                <div className="w-full bg-gray-100 rounded-sm h-2 overflow-hidden">
                                                                    <div className="h-full rounded-sm bg-[var(--color-fs-blue)]" style={{width:`${(m.cases/maxCasesC)*100}%`, minWidth:'4px'}} />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-gray-700 font-medium">{m.avgTime > 0 ? `${m.avgTime} min` : '—'}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                {m.starCount > 0 ? (
                                                                    <span className="inline-flex items-center gap-1 font-bold text-yellow-500">
                                                                        {m.avgStars} <Star className="w-3.5 h-3.5 fill-current" />
                                                                        <span className="text-[10px] text-gray-400 font-normal">({m.starCount})</span>
                                                                    </span>
                                                                ) : <span className="text-gray-300 text-xs">Sin datos</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};
