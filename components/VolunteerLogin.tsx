import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { LogIn, User, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';
import { Layout } from './ui/Layout';
import { Volunteer } from '../types';
import { supabaseService } from '../services/supabaseService';

interface LoginProps {
  onLoginSuccess: (volunteer: Volunteer) => void;
  onBack: () => void;
}

type ViewState = 'login' | 'register' | 'recover';

export const VolunteerLogin: React.FC<LoginProps> = ({ onLoginSuccess, onBack }) => {
  const [view, setView] = useState<ViewState>('login');
  const [loading, setLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabaseService.login(email, password);

    setLoading(false);

    if (data) {
      toast.success(`Bienvenido, ${data.nombre}`);
      onLoginSuccess(data);
    } else {
      toast.error(error || "Error al iniciar sesión");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    const { data, error } = await supabaseService.register({ email, password, nombre });

    setLoading(false);

    if (data) {
      toast.success("Registro creado. Verifica tu email para confirmar.");
      setView('login');
    } else if (error) {
      const errorMessage = typeof error === 'string' ? error : (error as any).message || 'Error desconocido';
      // Sometimes auth works but data is null if confirmation is required
      if (errorMessage.toLowerCase().includes('confirm')) {
        toast.success("Registro creado. Verifica tu email para confirmar.");
        setView('login');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { success, error } = await supabaseService.recoverPassword(email);

    setLoading(false);

    if (success) {
      toast.success("Se ha enviado un correo de recuperación a tu email.");
      setView('login');
    } else {
      toast.error(error || "Error al procesar solicitud");
    }
  };

  return (
    <Layout title="Acceso Voluntarios" showBack onBack={onBack}>
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-[var(--shadow-card)] mt-10 animate-fade-in relative">

        {/* Header Icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-primary-800)]">
            {view === 'login' && <User className="w-8 h-8" />}
            {view === 'register' && <UserPlus className="w-8 h-8" />}
            {view === 'recover' && <KeyRound className="w-8 h-8" />}
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            {view === 'login' && 'Iniciar Sesión'}
            {view === 'register' && 'Registro de Misionero'}
            {view === 'recover' && 'Recuperar Contraseña'}
          </h2>
        </div>

        {/* LOGIN FORM */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="voluntario@sistema.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setView('recover')}
                className="text-xs text-[var(--color-fs-blue)] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
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

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-2">¿Eres nuevo misionero?</p>
              <button
                type="button"
                onClick={() => setView('register')}
                className="text-sm font-bold text-[var(--color-fs-blue)] hover:underline cursor-pointer"
              >
                Registrarse como Misionero de Servicio
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Nombre Completo</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="Elder Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="voluntario@sistema.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center items-center gap-2 cursor-pointer mt-2"
            >
              {loading ? 'Registrando...' : (
                <>
                  <UserPlus className="w-4 h-4" /> Crear Cuenta
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setView('login')}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </button>
          </form>
        )}

        {/* RECOVER FORM */}
        {view === 'recover' && (
          <form onSubmit={handleRecover} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4 text-center">
              Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="voluntario@sistema.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center items-center gap-2 cursor-pointer"
            >
              {loading ? 'Enviando...' : (
                <>
                  <KeyRound className="w-4 h-4" /> Enviar Enlace
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setView('login')}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </button>
          </form>
        )}

      </div>
    </Layout>
  );
};