import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../src/contexts/LanguageContext';
import { Video, MessageSquare, Loader2, X, FileText } from 'lucide-react';
import { Layout } from './ui/Layout';
import { UserSession } from '../types';
import { supabaseService } from '../services/supabaseService';
import { PAISES } from '../services/mockData';
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
  const { t, language } = useLanguage();
  const [step, setStep] = useState<Step>('selection');

  const [mode, setMode] = useState<Mode>('video');
  const [sessionData, setSessionData] = useState<UserSession | null>(null);
  const [showTerms, setShowTerms] = useState(false);

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

  // Dynamic Topics
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // OPTIMIZATION: Preload global topics on mount, then reload when country changes
  useEffect(() => {
    const fetchTopics = async () => {
      setLoadingTopics(true);
      const countryParam = formData.pais || undefined;
      const { data } = await supabaseService.getTopics(countryParam);
      setAvailableTopics(data.map(t => t.titulo));
      setLoadingTopics(false);
    };
    fetchTopics();
  }, [formData.pais]);

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
      toast.error(t('error_terms'));
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
      idioma: language,
      sala_jitsi_id: slug,
      type: mode,
      startWithAudioMuted: false, // FORCE AUDIO ON
      startWithVideoMuted: false,
      prejoinPageEnabled: false,
    });

    if (data) {
      setSessionData(data);
      // Store session ID for recovery
      localStorage.setItem('centro_virtual_active_session', JSON.stringify({ id: data.id }));

      // OPTIMIZATION: Notification is now handled asynchronously in createSession service

      setStep('waiting');
      toast.success(t('success_request'));
    } else {
      toast.error(t('error_request'));
    }
  };

  // 2. Cancel Request
  const handleCancel = async () => {
    if (sessionData) {
      await supabaseService.updateSessionStatus(sessionData.id, 'abandonado');
      toast(t('cancel_request'));
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
            toast.success(t('volunteer_joined_chat'));
          } else {
            setStep('call');
            toast.success(t('volunteer_connected'));
          }
        }
      }, 3000);

      // Timeout after 5 minutes
      timeoutTimer = setTimeout(async () => {
        await supabaseService.updateSessionStatus(sessionData.id, 'abandonado');
        toast.error(t('no_volunteers'));
        onExit();
      }, 5 * 60 * 1000);
    }

    return () => {
      clearTimeout(timeoutTimer);
      clearInterval(pollInterval);
    };
  }, [step, sessionData, onExit]);

  // Check for existing active session on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      const storedSession = localStorage.getItem('centro_virtual_active_session');
      if (storedSession && step === 'selection') {
        const { id } = JSON.parse(storedSession);
        const { data } = await supabaseService.getSessionById(id);
        if (data && data.estado === 'en_atencion') {
          // Recover session
          setSessionData(data);
          const isChat = data.type === 'chat';
          setMode(data.type);
          setStep(isChat ? 'chat-active' : 'call');
          toast.success('Sesión activa recuperada');
        } else {
          localStorage.removeItem('centro_virtual_active_session');
        }
      }
    };
    checkActiveSession();
  }, []);

  // 4. Handle User Exit (Chat or Video)

  // 4. Handle User Exit (Chat or Video)
  const handleUserExit = async () => {
    if (!sessionData) return;

    // Clear local storage recovery
    localStorage.removeItem('centro_virtual_active_session');

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
            {t('welcome_title')}
          </h2>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-2xl mx-auto">
            <button
              onClick={() => { setMode('video'); setStep('form'); }}
              className="group flex flex-col items-center justify-center p-5 md:p-8 bg-white border-2 border-[var(--color-fs-blue)] rounded-xl hover:bg-blue-50 transition-all shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] cursor-pointer"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform text-[var(--color-fs-blue)]">
                <Video className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <span className="text-lg md:text-xl font-bold text-[var(--color-fs-blue)] uppercase tracking-wide">{t('video_call')}</span>
              <span className="text-xs md:text-sm text-gray-500 mt-2 text-center">{t('video_desc')}</span>
            </button>

            <button
              onClick={() => { setMode('chat'); setStep('form'); }}
              className="group flex flex-col items-center justify-center p-5 md:p-8 bg-white border-2 border-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary-50)] transition-all shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] cursor-pointer"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform text-[var(--color-primary-800)]">
                <MessageSquare className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <span className="text-lg md:text-xl font-bold text-[var(--color-fs-blue)] uppercase tracking-wide">{t('chat_option')}</span>
              <span className="text-xs md:text-sm text-gray-500 mt-2 text-center">{t('chat_desc')}</span>
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (step === 'form') {
    return (
      <Layout title={mode === 'video' ? t('request_video_title') : t('request_chat_title')} showBack onBack={() => setStep('selection')} onVolunteerClick={onVolunteerAccess}>
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-[var(--shadow-card)] animate-fade-in">
          <h2 className="text-xl mb-4 font-semibold text-[var(--color-primary)]">
            {mode === 'video' ? t('start_video_header') : t('start_chat_header')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                className="w-full border border-gray-300 rounded p-2"
                required placeholder={t('form_name')}
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              />
              <input
                type="text"
                className="w-full border border-gray-300 rounded p-2"
                required placeholder={t('form_surname')}
                value={formData.apellido}
                onChange={e => setFormData({ ...formData, apellido: e.target.value })}
              />
            </div>

            <select required value={formData.pais} onChange={e => setFormData({ ...formData, pais: e.target.value })}>
              <option value="">{t('form_country_placeholder')}</option>
              {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select required value={formData.tema} disabled={loadingTopics} onChange={e => setFormData({ ...formData, tema: e.target.value })}>
              <option value="">{loadingTopics ? t('form_loading') || 'Cargando temas...' : t('form_topic_placeholder')}</option>
              {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <input
              type="email" placeholder={t('form_email')}
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
              <label htmlFor="terms" className="cursor-pointer">{t('form_terms')}</label>
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-blue-500 hover:text-blue-700 underline flex items-center gap-1 ml-1"
                title="Leer términos"
              >
                <FileText className="w-3 h-3" />
                <span className="text-xs">{t('terms_link') || 'Leer'}</span>
              </button>
            </div>

            <button type="submit" className="btn-primary w-full mt-4 cursor-pointer">
              {mode === 'video' ? t('btn_start_video') : t('btn_start_chat')}
            </button>
          </form>

          {/* Terms Modal */}
          {showTerms && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden relative">
                <div className="bg-[var(--color-primary)] text-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-bold text-lg">{t('terms_modal_title') || 'Términos y Condiciones'}</h3>
                  <button onClick={() => setShowTerms(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 text-gray-700 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
                  <p>{t('terms_modal_content')}</p>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                  <button
                    onClick={() => { setShowTerms(false); setFormData({ ...formData, terms: true }); }}
                    className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-md hover:bg-[var(--color-primary-700)] transition-colors text-sm font-medium"
                  >
                    {t('accept') || 'Aceptar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  if (step === 'waiting') {
    return (
      <Layout title={t('waiting_title')} onVolunteerClick={onVolunteerAccess}>
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
          <Loader2 className="w-16 h-16 text-[var(--color-primary)] animate-spin mb-6" />
          <h2 className="text-2xl font-light mb-2">{t('waiting_status')}</h2>
          <p className="text-[var(--color-fs-text-light)]">{t('waiting_desc')}</p>
          <div className="mt-8 p-4 bg-blue-50 text-[var(--color-fs-blue)] rounded-lg text-sm max-w-md">
            {t('waiting_info').replace('{topic}', sessionData?.tema || '')}
          </div>
          <button onClick={handleCancel} className="mt-8 text-red-500 hover:text-red-700 font-medium text-sm underline cursor-pointer">
            {t('cancel_request')}
          </button>
        </div>
      </Layout>
    );
  }

  if (step === 'chat-active' && sessionData) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--color-fs-bg-alt)] flex flex-col items-center">
        {/* Full screen container avoiding Layout wrapper for better mobile keyboard handling */}
        <div className="w-full h-full md:h-[85vh] md:max-w-4xl md:mt-6 animate-fade-in shadow-none md:shadow-[var(--shadow-card)]">
          <ChatRoom
            session={sessionData}
            currentUser="user"
            onEndSession={handleUserExit}
          />
        </div>
      </div>
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
      <Layout title={t('survey_title')} onVolunteerClick={onVolunteerAccess}>
        <SatisfactionSurvey session={sessionData!} onComplete={onExit} />
      </Layout>
    );
  }

  return null;
};