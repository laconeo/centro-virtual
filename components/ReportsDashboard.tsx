import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { UserSession, SatisfactionSurvey } from '../types';
import { X, Calendar, Download, BarChart2, PieChart, Clock, Star, Users, Video, MessageSquare, Activity } from 'lucide-react';
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
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
    const [loading, setLoading] = useState(true);

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
        const sessionRes = await supabaseService.getReportData(startDate, endDate);
        const surveyRes = await supabaseService.getSurveys();

        if (sessionRes.data) setSessions(sessionRes.data as UserSession[]);
        if (surveyRes.data) {
            // Filter surveys that belong to the fetched sessions
            const sessionIds = new Set(sessionRes.data?.map(s => s.id));
            const filteredSurveys = (surveyRes.data as SatisfactionSurvey[]).filter(s => sessionIds.has(s.sesion_id));
            setSurveys(filteredSurveys);
        }
        setLoading(false);
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

    // Time Components
    const sessionHours = filteredSessions.map(s => new Date(s.fecha_ingreso).getHours());

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

    // Group by Date
    const dailyStats = sessions.reduce((acc, s) => {
        const date = s.fecha_ingreso.split('T')[0]; // YYYY-MM-DD
        if (!acc[date]) acc[date] = { video: 0, chat: 0 };
        if (s.type === 'video') acc[date].video++;
        if (s.type === 'chat') acc[date].chat++;
        return acc;
    }, {} as Record<string, { video: number, chat: number }>);

    const sortedDates = Object.keys(dailyStats).sort();
    const maxDailyCount = sortedDates.reduce((max, date) => Math.max(max, dailyStats[date].video + dailyStats[date].chat), 0); // Scale by max total or max individual? Max individual is better for side-by-side.
    const maxIndividualCount = sortedDates.reduce((max, date) => Math.max(max, dailyStats[date].video, dailyStats[date].chat), 0);


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


                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-[var(--color-fs-tree)] animate-slide-up" style={{ animationDelay: '0ms' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[var(--color-fs-text-secondary)] text-xs font-bold uppercase tracking-wider">Casos Atendidos</p>
                                        <h3 className="text-3xl font-light text-[var(--color-fs-text)] mt-1">{attendedSessions.length}</h3>
                                    </div>
                                    <div className="text-[var(--color-fs-tree)]">
                                        <Users className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-xs text-[var(--color-fs-text-secondary)] flex justify-between border-t pt-2 mt-2 border-gray-100">
                                    <span>Total: {totalSessions}</span>
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

                        {/* - - - ROW 2: Channels (1/3) & Chart (2/3) - - - */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Channel Stats */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <h4 className="font-medium text-[var(--color-fs-text)] mb-6 border-b pb-2 border-gray-100">Canales de Atención</h4>
                                <div className="flex items-center justify-around py-4">
                                    <div className="text-center group">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--color-fs-blue)] group-hover:bg-[var(--color-fs-blue)] group-hover:text-white transition-colors duration-300">
                                            <Video className="w-8 h-8" />
                                        </div>
                                        <div className="text-3xl font-light text-[var(--color-fs-text)]">{byChannel['video'] || 0}</div>
                                        <div className="text-xs text-[var(--color-fs-text-secondary)] font-bold uppercase tracking-wider mt-1">Video</div>
                                    </div>
                                    <div className="h-20 w-px bg-gray-200"></div>
                                    <div className="text-center group">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--color-fs-tree)] group-hover:bg-[var(--color-fs-tree)] group-hover:text-white transition-colors duration-300">
                                            <MessageSquare className="w-8 h-8" />
                                        </div>
                                        <div className="text-3xl font-light text-[var(--color-fs-text)]">{byChannel['chat'] || 0}</div>
                                        <div className="text-xs text-[var(--color-fs-text-secondary)] font-bold uppercase tracking-wider mt-1">Chat</div>
                                    </div>
                                </div>
                            </div>


                            {/* Monthly Evolution Chart (Bar Chart) */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
                                <h4 className="font-medium text-[var(--color-fs-text)] mb-6 flex items-center gap-2 border-b pb-2 border-gray-100">
                                    <Activity className="w-4 h-4 text-[var(--color-fs-blue)]" /> Evolución Diaria (Casos Atendidos)
                                </h4>
                                <div className="h-64 w-full flex flex-col">
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
                                                                    className="w-1/2 bg-[var(--color-fs-tree)] rounded-t-sm relative hover:bg-opacity-90 transition-all"
                                                                    style={{ height: `${Math.max(chatH, 2)}%` }}
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
                                            <div className="flex justify-between mt-2 px-2 text-[10px] text-gray-400">
                                                {sortedDates.map((date, i) => {
                                                    // Show just a few labels
                                                    const step = Math.ceil(sortedDates.length / 6);
                                                    if (i % step === 0 || i === sortedDates.length - 1) {
                                                        return <span key={date}>{new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}</span>;
                                                    }
                                                    return <span key={date} className="w-4"></span>; // spacer
                                                }).filter((_, i, arr) => {
                                                    // Basic filtering to match the rendering logic above, or just rely on CSS
                                                    const step = Math.ceil(sortedDates.length / 6);
                                                    return i % step === 0 || i === sortedDates.length - 1;
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm bg-[var(--color-fs-blue)]"></span> Video
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm bg-[var(--color-fs-tree)]"></span> Chat
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="bg-[var(--color-fs-bg-alt)] border border-[var(--color-fs-border)] p-4 rounded text-center text-[var(--color-fs-text-secondary)] text-sm">
                            <Clock className="w-4 h-4 inline-block mr-2 text-[var(--color-fs-blue)]" /> Franja horaria de servicio detectada: <span className="font-bold text-[var(--color-fs-text)]">{timeRange}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
