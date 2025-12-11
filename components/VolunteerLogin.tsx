import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { LogIn, User } from 'lucide-react';
import { Layout } from './ui/Layout';
import { Volunteer } from '../types';
import { mockService } from '../services/mockService';

interface LoginProps {
  onLoginSuccess: (volunteer: Volunteer) => void;
  onBack: () => void;
}

export const VolunteerLogin: React.FC<LoginProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Use mock service to simulate login
    const { data } = await mockService.login(email);
    
    setLoading(false);
    
    if (data) {
        toast.success(`Bienvenido, ${data.nombre}`);
        onLoginSuccess(data);
    } else {
        toast.error("Error al iniciar sesión");
    }
  };

  return (
    <Layout title="Acceso Voluntarios" showBack onBack={onBack}>
      <div className="max-w-sm mx-auto bg-white p-8 rounded-lg shadow-[var(--shadow-card)] mt-10 animate-fade-in">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-primary-800)]">
             <User className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-bold">Iniciar Sesión</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voluntario@sistema.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          <div className="flex items-center gap-2 mb-4">
             <input type="checkbox" id="keep" className="w-auto cursor-pointer" />
             <label htmlFor="keep" className="text-sm cursor-pointer">Mantener sesión iniciada</label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full flex justify-center items-center gap-2 cursor-pointer"
          >
            {loading ? 'Verificando...' : (
              <>
                <LogIn className="w-4 h-4" /> Entrar al Dashboard
              </>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
};