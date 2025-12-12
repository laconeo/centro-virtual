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
  // ...

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