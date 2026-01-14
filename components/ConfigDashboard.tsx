import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { useLanguage } from '../src/contexts/LanguageContext';
import { Topic } from '../types';
import { PAISES } from '../services/mockData';
import { Layout } from './ui/Layout';

interface ConfigDashboardProps {
    onBack: () => void;
}

export const ConfigDashboard: React.FC<ConfigDashboardProps> = ({ onBack }) => {
    const { t } = useLanguage();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [newTopic, setNewTopic] = useState({ pais: 'Todos', titulo: '' });

    const fetchTopics = async () => {
        setLoading(true);
        const { data } = await supabaseService.getAllTopics();
        setTopics(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTopics();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopic.titulo.trim()) return;

        const { error } = await supabaseService.createTopic(newTopic);
        if (error) {
            toast.error('Error al crear tema');
        } else {
            toast.success('Tema creado correctamente');
            setNewTopic({ pais: 'Todos', titulo: '' });
            fetchTopics();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este tema?')) return;

        const { error } = await supabaseService.deleteTopic(id);
        if (error) {
            toast.error('Error al eliminar tema');
        } else {
            toast.success('Tema eliminado');
            fetchTopics();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 p-6 flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Configuración de Temas</h2>
                        <p className="text-sm text-gray-500">Gestiona los temas disponibles por país para los usuarios</p>
                    </div>
                </div>

                {/* Add Form */}
                <div className="p-6 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-sm font-semibold uppercase text-gray-400 mb-4">Agregar Nuevo Tema</h3>
                    <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-600 mb-1">País/Región</label>
                            <select
                                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                                value={newTopic.pais}
                                onChange={e => setNewTopic({ ...newTopic, pais: e.target.value })}
                            >
                                <option value="Todos">Global (Todos los países)</option>
                                {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="flex-[2] w-full">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Título del Tema</label>
                            <input
                                type="text"
                                placeholder="Ej: Feria de Historia Familiar"
                                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100"
                                value={newTopic.titulo}
                                onChange={e => setNewTopic({ ...newTopic, titulo: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newTopic.titulo.trim()}
                            className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-lg font-semibold hover:brightness-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-5 h-5" /> Agregar
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="p-6">
                    <h3 className="text-sm font-semibold uppercase text-gray-400 mb-4">Temas Existentes ({topics.length})</h3>

                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Cargando...</div>
                    ) : topics.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            No hay temas configurados
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {topics.map(topic => (
                                <div key={topic.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${topic.pais === 'Todos' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {topic.pais === 'Todos' ? 'Global' : topic.pais}
                                        </span>
                                        <span className="font-medium text-gray-700">{topic.titulo}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(topic.id)}
                                        className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
