import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, Shield, Edit2, Save, X } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { Role } from '../types';

export const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form
    const [formData, setFormData] = useState({ name: '', description: '', is_leader: false });

    // Helper for reset
    const resetForm = () => setFormData({ name: '', description: '', is_leader: false });

    const fetchRoles = async () => {
        setLoading(true);
        const { data } = await supabaseService.getRoles();
        setRoles(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        if (editingId) {
            // Update
            const { error } = await supabaseService.updateRole(editingId, formData);
            if (error) toast.error('Error al actualizar rol');
            else {
                toast.success('Rol actualizado');
                setEditingId(null);
                resetForm();
                fetchRoles();
            }
        } else {
            // Create
            const { error } = await supabaseService.createRole(formData);
            if (error) toast.error('Error al crear rol');
            else {
                toast.success('Rol creado');
                resetForm();
                fetchRoles();
            }
        }
    };

    const handleEdit = (role: Role) => {
        setEditingId(role.id);
        setFormData({
            name: role.name,
            description: role.description || '',
            is_leader: role.is_leader
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar rol? Los usuarios asignados podrían perder permisos.')) return;
        const { error } = await supabaseService.deleteRole(id);
        if (error) toast.error('Error al eliminar');
        else {
            toast.success('Rol eliminado');
            fetchRoles();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Editar Rol' : 'Crear Nuevo Rol'}</h3>
                <form onSubmit={handleSave} className="grid md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Nombre del Rol</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Ej: Lider de Turno"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Descripción</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Breve descripción..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            id="is_leader"
                            className="w-4 h-4 text-blue-600"
                            checked={formData.is_leader}
                            onChange={e => setFormData({ ...formData, is_leader: e.target.checked })}
                        />
                        <label htmlFor="is_leader" className="text-sm text-gray-700 font-medium">¿Es Líder de Turno?</label>
                    </div>
                    <div className="flex gap-2">
                        {editingId && (
                            <button
                                type="button"
                                onClick={() => { setEditingId(null); resetForm(); }}
                                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={!formData.name.trim()}
                            className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-lg font-semibold hover:brightness-90 transition-all flex items-center gap-2 cursor-pointer w-full justify-center disabled:opacity-50"
                        >
                            {editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {editingId ? 'Guardar Cambios' : 'Crear Rol'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Roles Configurados</h3>
                <div className="grid gap-3">
                    {roles.map(role => (
                        <div key={role.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role.is_leader ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-500'}`}>
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                        {role.name}
                                        {role.is_leader && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Líder</span>}
                                    </h4>
                                    <p className="text-xs text-gray-500">{role.description || 'Sin descripción'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEdit(role)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(role.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                    {roles.length === 0 && !loading && (
                        <p className="text-center text-gray-400 py-8">No hay roles creados.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
