import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Users, Shield, Grid, ChevronRight } from 'lucide-react';
import { TopicManagement } from './TopicManagement';
import { VolunteerManagement } from './VolunteerManagement';
import { RoleManagement } from './RoleManagement';
import { MissionaryExtensionInfo } from './MissionaryExtensionInfo';
import { BellRing } from 'lucide-react';

interface ConfigDashboardProps {
    onBack: () => void;
}

type ConfigView = 'menu' | 'topics' | 'volunteers' | 'roles' | 'extension';

export const ConfigDashboard: React.FC<ConfigDashboardProps> = ({ onBack }) => {
    const [view, setView] = useState<ConfigView>('menu');

    const menuItems = [
        {
            id: 'topics',
            label: 'Temas de Ayuda',
            desc: 'Gestionar las categorías y temas disponibles.',
            icon: <MessageSquare className="w-8 h-8 text-[#005994]" />, // FS Blue
            bgColor: 'bg-white',
            borderColor: 'border-l-4 border-[#005994]',
            action: () => setView('topics')
        },
        {
            id: 'volunteers',
            label: 'Directorio de Voluntarios',
            desc: 'Administrar el registro de voluntarios y roles.',
            icon: <Users className="w-8 h-8 text-[#8CB83E]" />, // FS Green
            bgColor: 'bg-white',
            borderColor: 'border-l-4 border-[#8CB83E]',
            action: () => setView('volunteers')
        },
        {
            id: 'roles',
            label: 'Roles y Permisos',
            desc: 'Configurar los tipos de roles (Líderes, etc).',
            icon: <Shield className="w-8 h-8 text-[#575757]" />, // Gray
            bgColor: 'bg-white',
            borderColor: 'border-l-4 border-[#575757]',
            action: () => setView('roles')
        },
        {
            id: 'extension',
            label: 'Extensión Misionero',
            desc: 'Servicio en segundo plano y notificaciones push.',
            icon: <BellRing className="w-8 h-8 text-amber-500" />,
            bgColor: 'bg-white',
            borderColor: 'border-l-4 border-amber-500',
            action: () => setView('extension')
        }
    ];

    const renderHeader = (title: string, subtitle?: string) => (
        <div className="bg-white border-b border-[#dcdcdc] p-6 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
            <button
                onClick={() => view === 'menu' ? onBack() : setView('menu')}
                className="p-2 hover:bg-[#f3f3f3] rounded-full transition-colors cursor-pointer"
            >
                <ArrowLeft className="w-6 h-6 text-[#575757]" />
            </button>
            <div className="flex-1">
                <h2 className="text-2xl font-[300] text-[#282829]">{title}</h2>
                {subtitle && <p className="text-sm text-[#575757] mt-1">{subtitle}</p>}
            </div>
            {view !== 'menu' && (
                <button
                    onClick={() => setView('menu')}
                    className="px-4 py-2 hover:bg-[#f3f3f3] text-[#005994] rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors"
                >
                    <Grid className="w-4 h-4" /> Menú Principal
                </button>
            )}
        </div>
    );

    const renderContent = () => {
        switch (view) {
            case 'topics':
                return <div className="p-6"><TopicManagement /></div>;
            case 'volunteers':
                return <div className="p-6"><VolunteerManagement /></div>;
            case 'roles':
                return <div className="p-6"><RoleManagement /></div>;
            case 'extension':
                return <div className="p-6"><MissionaryExtensionInfo /></div>;
            default:
                return (
                    <div className="p-6 md:p-10 animate-fade-in max-w-6xl mx-auto w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className={`group relative overflow-hidden ${item.bgColor} rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-300 border border-[#e0e0e0] ${item.borderColor} p-6 text-left h-full flex flex-col`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-[#f9f9f9] rounded-full group-hover:scale-110 transition-transform duration-300">
                                            {item.icon}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-[#282829] mb-2 group-hover:text-[#005994] transition-colors">
                                        {item.label}
                                    </h3>
                                    <p className="text-sm text-[#575757] leading-relaxed flex-1">
                                        {item.desc}
                                    </p>

                                    <div className="mt-6 flex items-center text-sm font-semibold text-[#005994] opacity-80 group-hover:opacity-100">
                                        Administrar <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-16 text-center">
                            <p className="text-[#575757] text-sm">Panel de Administración &bull; Centro Virtual</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#f3f3f3] flex flex-col items-center">
            <div className="w-full h-full bg-[#f3f3f3] min-h-screen flex flex-col">
                {renderHeader(
                    view === 'menu' ? 'Configuración del Sistema' :
                        view === 'topics' ? 'Gestión de Temas' :
                            view === 'volunteers' ? 'Directorio de Voluntarios' :
                                view === 'roles' ? 'Roles y Permisos' : 'Extensión del Misionero',
                    view === 'menu' ? 'Selecciona un módulo para administrar' : undefined
                )}

                <div className="flex-1 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
