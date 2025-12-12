import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Video, MessageSquare, Loader2 } from 'lucide-react';
import { Layout } from './ui/Layout';
import { UserSession } from '../types';
import { supabaseService } from '../services/supabaseService';
import { PAISES, TEMAS } from '../services/mockData';
import { initializeJitsi } from '../services/jitsi';
import { SatisfactionSurvey } from './SatisfactionSurvey';
import { ChatRoom } from './ChatRoom';

interface UserFlowProps {
  onExit: () => void;
  onVolunteerAccess?: () => void;
}

type Step = 'selection' | 'form' | 'waiting' | 'call' | 'chat-active' | 'feedback';
type Mode = 'video' | 'chat';

export const UserFlow: React.FC<UserFlowProps> = ({ onExit, onVolunteerAccess }) => {
  const [step, setStep] = useState<Step>('selection');

  const [mode, setMode] = useState<Mode>('video');
  const [sessionData, setSessionData] = useState<UserSession | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    pais: '',
    tema: '',
    email: '',
    terms: false
  });

  // Call State
  const [jitsiApi, setJitsiApi] = useState<any>(null);

  // Load saved user data
  useEffect(() => {
    const saved = localStorage.getItem('centro_virtual_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({
          ...prev,
          nombre: parsed.nombre || '',
          apellido: parsed.apellido || '',
          pais: parsed.pais || '',
          email: parsed.email || ''
        }));
      } catch (e) {
        console.error("Error loading saved user data", e);
      }
    }
  }, []);

  // 1. Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.terms) {
      toast.error("Debes aceptar los términos y condiciones");
      return;
    }

    // Save user preference for future (except terms and topic)
    localStorage.setItem('centro_virtual_user', JSON.stringify({
      nombre: formData.nombre,
      apellido: formData.apellido,
      pais: formData.pais,
      email: formData.email
    }));

    // Generate a descriptive, URL-safe room name
    const clean = (str: string) => str
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, ''); // alphanumeric only

    const slugName = clean(formData.nombre) + clean(formData.apellido);
    const slugTopic = clean(formData.tema).substring(0, 20); // First 20 chars of topic
    const slugCountry = clean(formData.pais);

    // Format: name-topic-country-random
    const slug = `${slugName}-${slugTopic}-${slugCountry}-${Date.now().toString().slice(-4)}`;

    // Create session in DB
    const { data, error } = await supabaseService.createSession({
      ...formData,
      sala_jitsi_id: slug,
      type: mode
    });

    if (data) {
      setSessionData(data);
      setStep('waiting');
      toast.success("Solicitud enviada correctamente");
    } else {
      toast.error("Error al crear la sesión");
    }
  };

  // 2. Cancel Request
  const handleCancel = async () => {
    if (sessionData) {
      await supabaseService.updateSessionStatus(sessionData.id, 'abandonado');
      toast("Solicitud cancelada");
      onExit();
    }
  };

  // 3. Waiting Room Logic
  useEffect(() => {
    let timeoutTimer: ReturnType<typeof setTimeout>;
    let pollInterval: ReturnType<typeof setInterval>;

    if (step === 'waiting' && sessionData) {
      // Poll for status changes
      pollInterval = setInterval(async () => {
        const { data } = await supabaseService.getSessionById(sessionData.id);
        if (data && data.estado === 'en_atencion') {
          setSessionData(data);
          if (data.type === 'chat') {
            setStep('chat-active');
            toast.success("Un voluntario se ha unido al chat");
          } else {
            setStep('call');
            toast.success("Voluntario conectado");
          }
        }
      }, 3000);

      // Timeout after 5 minutes
      timeoutTimer = setTimeout(async () => {
        await supabaseService.updateSessionStatus(sessionData.id, 'abandonado');
        toast.error("Lo sentimos, no hay voluntarios disponibles en este momento.");
        onExit();
      }, 5 * 60 * 1000);
    }

    return () => {
      clearTimeout(timeoutTimer);
      clearInterval(pollInterval);
    };
  }, [step, sessionData, onExit]);

  // 4. Handle User Exit (Chat or Video)
  const handleUserExit = async () => {
    if (!sessionData) return;

    // 1. Send notification message
    await supabaseService.sendMessage(sessionData.id, 'system', 'El usuario ha finalizado la sesión.');

    // 2. Mark as finalized immediately
    await supabaseService.updateSessionStatus(sessionData.id, 'finalizado');

    // 3. Go to feedback
    setStep('feedback');
  };

  // 3. Jitsi Logic
  useEffect(() => {
    if (step === 'call' && sessionData) {
      const api = initializeJitsi(
        'jitsi-container',
        sessionData.sala_jitsi_id,
        `${sessionData.nombre} ${sessionData.apellido}`,
        () => handleUserExit()
      );

      setJitsiApi(api);
    }
  }, [step, sessionData, mode]);

  // Render Steps
  if (step === 'selection') {
    return (
      <Layout showBack={false} onVolunteerClick={onVolunteerAccess}>
        <div className="max-w-4xl mx-auto py-2 md:py-10 animate-fade-in flex flex-col justify-center min-h-[70vh] md:min-h-0 md:block">
          <h2 className="text-xl md:text-2xl text-center mb-4 md:mb-10 font-light text-[var(--color-fs-text)]">
            ¿Cómo le gustaría comunicarse con nosotros?
          </h2>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-2xl mx-auto">
            <button
              onClick={() => { setMode('video'); setStep('form'); }}
              className="group flex flex-col items-center justify-center p-5 md:p-8 bg-white border-2 border-[var(--color-fs-blue)] rounded-xl hover:bg-blue-50 transition-all shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] cursor-pointer"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform text-[var(--color-fs-blue)]">
                <Video className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <span className="text-lg md:text-xl font-bold text-[var(--color-fs-blue)] uppercase tracking-wide">Video Llamada</span>
              <span className="text-xs md:text-sm text-gray-500 mt-2 text-center">Hable cara a cara con un Misionero de Servicio</span>
            </button>

            <button
              onClick={() => { setMode('chat'); setStep('form'); }}
              className="group flex flex-col items-center justify-center p-5 md:p-8 bg-white border-2 border-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary-50)] transition-all shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] cursor-pointer"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform text-[var(--color-primary-800)]">
                <MessageSquare className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <span className="text-lg md:text-xl font-bold text-[var(--color-primary-800)] uppercase tracking-wide">Chat</span>
              <span className="text-xs md:text-sm text-gray-500 mt-2 text-center">Escriba sus preguntas en tiempo real</span>
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (step === 'form') {
    return (
      <Layout title={`Solicitar ${mode === 'video' ? 'Video Llamada' : 'Chat'}`} showBack onBack={() => setStep('selection')} onVolunteerClick={onVolunteerAccess}>
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-[var(--shadow-card)] animate-fade-in">
          <h2 className="text-xl mb-4 font-semibold text-[var(--color-primary)]">
            {mode === 'video' ? 'Inicia tu videoconsulta' : 'Inicia el chat de ayuda'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                className="w-full border border-gray-300 rounded p-2"
                required placeholder="Nombre"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              />
              <input
                type="text"
                className="w-full border border-gray-300 rounded p-2"
                required placeholder="Apellido"
                value={formData.apellido}
                onChange={e => setFormData({ ...formData, apellido: e.target.value })}
              />
            </div>

            <select required value={formData.pais} onChange={e => setFormData({ ...formData, pais: e.target.value })}>
              <option value="">Selecciona tu país</option>
              {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select required value={formData.tema} onChange={e => setFormData({ ...formData, tema: e.target.value })}>
              <option value="">¿Sobre qué tema necesitas ayuda?</option>
              {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <input
              type="email" placeholder="Email (Opcional)"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />

            <div className="flex items-center gap-2 text-sm text-[var(--color-fs-text-light)]">
              <input
                type="checkbox"
                id="terms"
                className="w-auto cursor-pointer"
                checked={formData.terms}
                onChange={e => setFormData({ ...formData, terms: e.target.checked })}
              />
              <label htmlFor="terms" className="cursor-pointer">Acepto los términos y condiciones</label>
            </div>

            <button type="submit" className="btn-primary w-full mt-4 cursor-pointer">
              {mode === 'video' ? 'Iniciar Conversación' : 'Entrar al Chat'}
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  if (step === 'waiting') {
    return (
      <Layout title="Sala de Espera" onVolunteerClick={onVolunteerAccess}>
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
          <Loader2 className="w-16 h-16 text-[var(--color-primary)] animate-spin mb-6" />
          <h2 className="text-2xl font-light mb-2">Esperando a un voluntario...</h2>
          <p className="text-[var(--color-fs-text-light)]">Por favor no cierres esta ventana.</p>
          <div className="mt-8 p-4 bg-blue-50 text-[var(--color-fs-blue)] rounded-lg text-sm max-w-md">
            Un consultor revisará tu solicitud ({sessionData?.tema}) y se unirá en breve.
          </div>
          <button onClick={handleCancel} className="mt-8 text-red-500 hover:text-red-700 font-medium text-sm underline cursor-pointer">
            Cancelar solicitud
          </button>
        </div>
      </Layout>
    );
  }

  if (step === 'chat-active' && sessionData) {
    return (
      <Layout title="Chat de Asistencia" showBack={false}>
        <div className="max-w-4xl mx-auto h-[calc(100dvh-100px)] md:h-[80vh] animate-fade-in shadow-[var(--shadow-card)] my-4 rounded-lg overflow-hidden">
          <ChatRoom
            session={sessionData}
            currentUser="user"
            onExit={handleUserExit}
          />
        </div>
      </Layout>
    );
  }

  if (step === 'call') {
    return (
      <div className="h-screen w-full flex flex-col bg-black">
        <div id="jitsi-container" className="flex-1 w-full h-full"></div>
      </div>
    );
  }

  if (step === 'feedback') {
    return (
      <Layout title="Encuesta de Satisfacción" onVolunteerClick={onVolunteerAccess}>
        <SatisfactionSurvey session={sessionData!} onComplete={onExit} />
      </Layout>
    );
  }

  return null;
};