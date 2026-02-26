import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Layout } from './ui/Layout';
import { Users, ShieldCheck, Activity, DownloadCloud } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ExtensionsDashboard: React.FC = () => {
    const [counts, setCounts] = useState({ user: 0, missionary: 0, online: 0 });
    const [loading, setLoading] = useState(true);

    const loadCounts = async () => {
        setLoading(true);
        const [installsRes, onlineRes] = await Promise.all([
            supabaseService.getExtensionInstallsCount(),
            supabaseService.getOnlineVolunteersCount()
        ]);

        if (installsRes.error) {
            toast.error('Error al cargar métricas de extensiones');
        } else if (installsRes.data) {
            setCounts({
                user: installsRes.data.user,
                missionary: installsRes.data.missionary,
                online: onlineRes.count || 0
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadCounts();
    }, []);

    const metrics = [
        {
            title: 'Usuarios Totales',
            value: counts.user,
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-100',
        },
        {
            title: 'Misioneros en Línea',
            value: counts.online,
            icon: Activity,
            color: 'text-green-500',
            bg: 'bg-green-100',
        },
        {
            title: 'Misioneros Instalados',
            value: counts.missionary,
            icon: ShieldCheck,
            color: 'text-indigo-500',
            bg: 'bg-indigo-100',
        },
        {
            title: 'Instalaciones Totales',
            value: counts.user + counts.missionary,
            icon: DownloadCloud,
            color: 'text-purple-500',
            bg: 'bg-purple-100',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Dashboard de Extensiones</h1>
                        <p className="mt-2 text-lg text-gray-600">Monitorea el total de instalaciones de forma eficiente y en tiempo real.</p>
                    </div>
                    <button
                        onClick={loadCounts}
                        disabled={loading}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Activity className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {metrics.map((metric, idx) => {
                        const Icon = metric.icon;
                        return (
                            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full group-hover:scale-110 transition-transform duration-500 z-0"></div>
                                <div className="flex justify-between items-start z-10">
                                    <div className="space-y-4">
                                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{metric.title}</p>
                                        <div className="flex items-baseline space-x-2">
                                            {loading ? (
                                                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                                            ) : (
                                                <h3 className="text-4xl font-bold text-gray-900">{metric.value.toLocaleString()}</h3>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-xl ${metric.bg}`}>
                                        <Icon className={`w-8 h-8 ${metric.color}`} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>


            </div>
        </div>
    );
};
