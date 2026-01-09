import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../src/contexts/LanguageContext';
import { Send, User, BadgeHelp } from 'lucide-react';
import { UserSession, Message } from '../types';
import { supabaseService } from '../services/supabaseService';

interface ChatRoomProps {
    session: UserSession;
    currentUser: 'user' | 'volunteer';
    onExit?: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ session, currentUser, onExit }) => {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Poll for messages
    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabaseService.getMessages(session.id);
            if (data) setMessages(data as Message[]);
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 2000); // 2 second poll
        return () => clearInterval(interval);
    }, [session.id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        await supabaseService.sendMessage(session.id, currentUser, inputText);
        setInputText('');

        // Immediate refresh
        const { data } = await supabaseService.getMessages(session.id);
        if (data) setMessages(data as Message[]);
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
                {onExit && (
                    <button onClick={onExit} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors cursor-pointer">
                        {t('chat_end')}
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] rounded-lg p-3 shadow-sm ${isMe
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
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="bg-white p-3 border-t border-[var(--color-fs-border)] flex gap-2 sticky bottom-0 z-10">
                <input
                    type="text"
                    inputMode="text"
                    enterKeyHint="send"
                    autoComplete="off"
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
