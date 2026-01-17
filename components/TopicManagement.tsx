import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { Topic } from '../types';
import { PAISES } from '../services/mockData';

export const TopicManagement: React.FC = () => {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
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
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Agregar Nuevo Tema</h3>
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
                        className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-lg font-semibold hover:brightness-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-5 h-5" /> Agregar
                    </button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Temas Existentes ({topics.length})</h3>
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
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
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
    );
};
