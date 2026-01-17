import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, Shield, User } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { Volunteer, Role } from '../types';

export const VolunteerManagement: React.FC = () => {
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const [volRes, roleRes] = await Promise.all([
            supabaseService.getAllVolunteers(),
            supabaseService.getRoles()
        ]);
        setVolunteers(volRes.data as Volunteer[]);
        setRoles(roleRes.data as Role[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRoleChange = async (volunteerId: string, roleId: string) => {
        const { error } = await supabaseService.updateVolunteerRole(volunteerId, roleId);
        if (error) toast.error('Error al asignar rol');
        else {
            toast.success('Rol actualizado');
            fetchData();
        }
    };

    const filtered = volunteers.filter(v =>
        v.nombre.toLowerCase().includes(search.toLowerCase()) ||
        v.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-bold text-gray-800">Voluntarios Registrados ({volunteers.length})</h3>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar voluntario..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-50"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Voluntario</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Registrado</th>
                                <th className="px-6 py-4">Rol Asignado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(vol => (
                                <tr key={vol.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                {vol.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{vol.nombre}</div>
                                                <div className="text-xs text-gray-500">{vol.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                                            ${vol.status === 'online' ? 'bg-green-100 text-green-700' :
                                                vol.status === 'busy' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${vol.status === 'online' ? 'bg-green-500' : vol.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                                            {vol.status === 'online' ? 'Online' : vol.status === 'busy' ? 'Ocupado' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(vol.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative">
                                            <Shield className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                                            <select
                                                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-white focus:ring-2 focus:ring-blue-100 outline-none w-full md:w-48 appearance-none cursor-pointer"
                                                value={vol.role_id || ''}
                                                onChange={(e) => handleRoleChange(vol.id, e.target.value)}
                                            >
                                                <option value="">Sin Rol (Voluntario)</option>
                                                {roles.map(r => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name} {r.is_leader ? '(Líder)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-400">No se encontraron voluntarios</div>
                    )}
                </div>
            </div>
        </div>
    );
};
