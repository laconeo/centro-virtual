import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../src/contexts/LanguageContext';
import { Send, User, BadgeHelp } from 'lucide-react';

import { UserSession, Message } from '../types';
import { supabaseService } from '../services/supabaseService';

interface ChatRoomProps {
    session: UserSession;
    currentUser: 'user' | 'volunteer';
    onExit?: () => void; // Para salir del chat (misioneros secundarios)
    onEndSession?: () => void; // Para finalizar la sesión (usuario o primer misionero)
    currentVolunteerId?: string; // ID del voluntario actual para determinar si es el primero
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ session, currentUser, onExit, onEndSession, currentVolunteerId }) => {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [volunteerNames, setVolunteerNames] = useState<Record<string, string>>({}); // Map volunteer_id -> nombre
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Poll for messages
    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabaseService.getMessages(session.id);
            if (data) {
                const newMessages = data as Message[];
                // OPTIMIZATION: Only update state if messages actually changed
                setMessages(prev => {
                    if (prev.length === newMessages.length &&
                        (prev.length === 0 || prev[prev.length - 1].id === newMessages[newMessages.length - 1].id)) {
                        return prev;
                    }
                    return newMessages;
                });
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 2000); // 2 second poll
        return () => clearInterval(interval);
    }, [session.id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch volunteer names for messages
    useEffect(() => {
        const fetchVolunteerNames = async () => {
            // Obtener IDs únicos de voluntarios de los mensajes
            const volunteerIds = [...new Set(
                messages
                    .filter(m => m.sender === 'volunteer' && m.volunteer_id)
                    .map(m => m.volunteer_id!)
            )];

            // Solo buscar los que no tenemos ya
            const missingIds = volunteerIds.filter(id => !volunteerNames[id]);

            if (missingIds.length === 0) return;

            // Obtener nombres de voluntarios
            const { data } = await supabaseService.getAllVolunteers();
            if (data) {
                const newNames: Record<string, string> = { ...volunteerNames };
                data.forEach(vol => {
                    if (missingIds.includes(vol.id)) {
                        newNames[vol.id] = vol.nombre;
                    }
                });
                setVolunteerNames(newNames);
            }
        };

        fetchVolunteerNames();
    }, [messages]);

    // Handle mobile keyboard - maintain scroll position and input visibility
    useEffect(() => {
        const handleResize = () => {
            // When keyboard opens, scroll to bottom to keep input visible
            if (document.activeElement === inputRef.current) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        };

        const handleFocus = () => {
            // Ensure input stays visible when focused
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 300); // Delay to allow keyboard animation
        };

        window.addEventListener('resize', handleResize);
        inputRef.current?.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('resize', handleResize);
            inputRef.current?.removeEventListener('focus', handleFocus);
        };
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        // Pasar volunteerId si es un voluntario enviando el mensaje
        await supabaseService.sendMessage(
            session.id,
            currentUser,
            inputText,
            currentUser === 'volunteer' ? currentVolunteerId : undefined
        );
        setInputText('');

        // Immediate refresh
        const { data } = await supabaseService.getMessages(session.id);
        if (data) setMessages(data as Message[]);

        // Keep input focused after sending
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 md:rounded-lg overflow-hidden md:border border-[var(--color-fs-border)]">
            {/* Header */}
            <div className="bg-[var(--color-fs-blue)] text-white p-4 shadow-md flex justify-between items-center">
                <div>
                    <h3 className="font-bold flex items-center gap-2">
                        {currentUser === 'user' ? (
                            <>
                                <BadgeHelp className="w-5 h-5" /> {t('chat_with_volunteer')}
                            </>
                        ) : (
                            <>
                                <User className="w-5 h-5" /> {t('chat_with_user').replace('{name}', session.nombre)}
                            </>
                        )}
                    </h3>
                    <p className="text-xs text-blue-100">
                        {currentUser === 'user' ? t('chat_wait_message') : t('chat_topic').replace('{topic}', session.tema)}
                    </p>
                </div>
                {/* Determine which button to show */}
                {(() => {
                    // User can always end the session
                    if (currentUser === 'user' && onEndSession) {
                        return (
                            <button
                                onClick={onEndSession}
                                className="text-xs bg-red-500/90 hover:bg-red-600 px-3 py-1 rounded transition-colors cursor-pointer font-semibold"
                            >
                                {t('chat_end_session')}
                            </button>
                        );
                    }

                    // Volunteer: check if they're the first one (who accepted the session)
                    if (currentUser === 'volunteer') {
                        const isFirstVolunteer = session.voluntario_id === currentVolunteerId;

                        if (isFirstVolunteer && onEndSession) {
                            // First volunteer can end the session
                            return (
                                <button
                                    onClick={onEndSession}
                                    className="text-xs bg-red-500/90 hover:bg-red-600 px-3 py-1 rounded transition-colors cursor-pointer font-semibold"
                                >
                                    {t('chat_end_session')}
                                </button>
                            );
                        } else if (onExit) {
                            // Secondary volunteers can only exit the chat
                            return (
                                <button
                                    onClick={onExit}
                                    className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors cursor-pointer"
                                >
                                    {t('chat_exit')}
                                </button>
                            );
                        }
                    }

                    return null;
                })()}
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-sm mt-10">
                        {currentUser === 'user' ? t('chat_placeholder_user') : t('chat_placeholder_volunteer')}
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.sender === currentUser;
                    const isSystem = msg.sender === 'system';

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-2">
                                <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">{msg.text}</span>
                            </div>
                        );
                    }

                    // Get initials for avatar
                    const getInitials = (name: string) => {
                        return name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .substring(0, 2);
                    };

                    // Determine who sent the message and their info
                    const showVolunteerInfo = !isMe && currentUser === 'user';
                    const showUserInfo = !isMe && currentUser === 'volunteer';

                    // Get volunteer name - use the specific volunteer who sent THIS message
                    let volunteerName = 'Misionero';
                    if (msg.sender === 'volunteer' && msg.volunteer_id) {
                        // Try to get from our volunteerNames map
                        volunteerName = volunteerNames[msg.volunteer_id] || session.voluntario_nombre || 'Misionero';
                    } else if (msg.sender === 'volunteer') {
                        // Fallback to session volunteer (first one)
                        volunteerName = session.voluntario_nombre || 'Misionero';
                    }

                    const userName = `${session.nombre} ${session.apellido}`;

                    const displayName = showVolunteerInfo ? volunteerName : userName;
                    const displayInitials = getInitials(displayName);
                    const showAvatar = showVolunteerInfo || showUserInfo;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                            {/* Avatar - show for other person's messages */}
                            {showAvatar && (
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm cursor-help relative group ${showVolunteerInfo
                                    ? 'bg-[var(--color-fs-blue)]'
                                    : 'bg-[var(--color-primary)]'
                                    }`}>
                                    {displayInitials}

                                    {/* Tooltip for volunteer viewing user info */}
                                    {showUserInfo && (
                                        <div className="absolute left-10 bottom-0 hidden group-hover:block z-50 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-none">
                                            <div className="space-y-1.5">
                                                <div className="font-bold text-sm border-b border-gray-700 pb-1.5 mb-1.5">
                                                    Información del Usuario
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Nombre:</span>
                                                    <span className="ml-2 font-medium">{session.nombre} {session.apellido}</span>
                                                </div>
                                                {session.email && (
                                                    <div>
                                                        <span className="text-gray-400">Email:</span>
                                                        <span className="ml-2 font-medium break-all">{session.email}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-gray-400">País:</span>
                                                    <span className="ml-2 font-medium">{session.pais}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Idioma:</span>
                                                    <span className="ml-2 font-bold text-amber-400 uppercase">{session.idioma || 'ES'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Tema:</span>
                                                    <span className="ml-2 font-medium">{session.tema}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Tipo:</span>
                                                    <span className="ml-2 font-medium capitalize">{session.type}</span>
                                                </div>
                                            </div>
                                            {/* Tooltip arrow */}
                                            <div className="absolute left-[-6px] top-3 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-gray-900"></div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col max-w-[75%]">
                                {/* Name label */}
                                {showAvatar && (
                                    <span className="text-xs text-gray-500 mb-1 ml-1">{displayName}</span>
                                )}

                                <div
                                    className={`rounded-lg p-3 shadow-sm ${isMe
                                        ? 'bg-[var(--color-primary-100)] text-[var(--color-fs-text)] rounded-br-none'
                                        : 'bg-white text-[var(--color-fs-text)] rounded-bl-none border border-gray-200'
                                        }`}
                                >
                                    <p className="text-sm">{msg.text}</p>
                                    <span className="text-[10px] text-gray-500 block text-right mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="bg-white p-3 border-t border-[var(--color-fs-border)] flex gap-2 sticky bottom-0 z-10">
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="text"
                    enterKeyHint="send"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="sentences"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t('chat_input_placeholder')}
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-[var(--color-fs-blue)] text-base"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-[var(--color-fs-blue)] text-white p-2 rounded-full hover:bg-[var(--color-fs-blue-hover)] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    <Send className="w-5 h-5 ml-0.5" />
                </button>
            </form>

        </div>
    );
};
