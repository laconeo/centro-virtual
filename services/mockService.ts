import { UserSession, Volunteer, SatisfactionSurvey, Message } from '../types';
import { MOCK_SESSIONS, MOCK_VOLUNTEERS, MOCK_SURVEYS } from './mockData';

// Simular latencia de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  SESSIONS: 'cv_sessions',
  VOLUNTEERS: 'cv_volunteers',
  SURVEYS: 'cv_surveys',
  MESSAGES: 'cv_messages'
};

class MockService {
  private sessions: UserSession[];
  private volunteers: Volunteer[];
  private surveys: SatisfactionSurvey[];
  private messages: Message[];

  constructor() {
    this.sessions = this.loadFromStorage(STORAGE_KEYS.SESSIONS, MOCK_SESSIONS);
    this.volunteers = this.loadFromStorage(STORAGE_KEYS.VOLUNTEERS, MOCK_VOLUNTEERS);
    this.surveys = this.loadFromStorage(STORAGE_KEYS.SURVEYS, MOCK_SURVEYS);
    this.messages = this.loadFromStorage(STORAGE_KEYS.MESSAGES, []);
  }

  private loadFromStorage<T>(key: string, defaultData: T[]): T[] {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(`Error parsing ${key}`, e);
      }
    }
    return defaultData;
  }

  private saveToStorage(key: string, data: any[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Session Methods ---

  async createSession(data: Omit<UserSession, 'id' | 'created_at' | 'estado' | 'fecha_ingreso' | 'tiempo_espera_minutos'>) {
    await delay(500);
    // Refresh state from storage before writing to avoid race conditions (basic)
    this.sessions = this.loadFromStorage(STORAGE_KEYS.SESSIONS, this.sessions);

    const newSession: UserSession = {
      ...data,
      id: crypto.randomUUID(),
      estado: 'esperando',
      fecha_ingreso: new Date().toISOString(),
      created_at: new Date().toISOString(),
      tiempo_espera_minutos: 0
    };
    this.sessions.push(newSession);
    this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);
    return { data: newSession, error: null };
  }

  async getSessions() {
    await delay(300);
    // Always load fresh for dashboard
    this.sessions = this.loadFromStorage(STORAGE_KEYS.SESSIONS, this.sessions);

    // Retornar solo las que están esperando, ordenadas por tiempo
    const activeSessions = this.sessions
      .filter(s => ['esperando', 'en_atencion', 'abandonado', 'finalizado'].includes(s.estado))
      .sort((a, b) => new Date(a.fecha_ingreso).getTime() - new Date(b.fecha_ingreso).getTime());

    return { data: activeSessions, error: null };
  }

  async getSessionById(id: string) {
    await delay(100);
    this.sessions = this.loadFromStorage(STORAGE_KEYS.SESSIONS, this.sessions);
    const session = this.sessions.find(s => s.id === id);
    return { data: session || null, error: session ? null : 'Not found' };
  }

  async updateSessionStatus(id: string, status: UserSession['estado'], volunteerId?: string) {
    await delay(300);
    this.sessions = this.loadFromStorage(STORAGE_KEYS.SESSIONS, this.sessions);
    const index = this.sessions.findIndex(s => s.id === id);
    if (index === -1) return { data: null, error: 'Session not found' };

    const updatedSession = {
      ...this.sessions[index],
      estado: status,
      voluntario_id: volunteerId || this.sessions[index].voluntario_id
    };

    this.sessions[index] = updatedSession;
    this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);
    return { data: updatedSession, error: null };
  }

  // --- Message Methods ---

  async getMessages(sessionId: string) {
    this.messages = this.loadFromStorage(STORAGE_KEYS.MESSAGES, this.messages);
    const msgs = this.messages.filter(m => m.sessionId === sessionId);
    return { data: msgs, error: null };
  }

  async sendMessage(sessionId: string, sender: Message['sender'], text: string) {
    this.messages = this.loadFromStorage(STORAGE_KEYS.MESSAGES, this.messages);
    const newMessage: Message = {
      id: crypto.randomUUID(),
      sessionId,
      sender,
      text,
      timestamp: new Date().toISOString()
    };
    this.messages.push(newMessage);
    this.saveToStorage(STORAGE_KEYS.MESSAGES, this.messages);
    return { data: newMessage, error: null };
  }

  // --- Volunteer Methods ---

  async login(email: string) {
    await delay(800);
    this.volunteers = this.loadFromStorage(STORAGE_KEYS.VOLUNTEERS, this.volunteers);
    const volunteer = this.volunteers.find(v => v.email.toLowerCase() === email.toLowerCase());
    if (volunteer) {
      return { data: volunteer, error: null };
    }
    // Si no existe, creamos uno temporal para el demo
    const newVolunteer: Volunteer = {
      id: crypto.randomUUID(),
      email,
      nombre: email.split('@')[0],
      created_at: new Date().toISOString()
    };
    this.volunteers.push(newVolunteer);
    this.saveToStorage(STORAGE_KEYS.VOLUNTEERS, this.volunteers);
    return { data: newVolunteer, error: null };
  }

  // --- Survey Methods ---

  async submitSurvey(data: Omit<SatisfactionSurvey, 'id' | 'created_at'>) {
    await delay(500);
    this.surveys = this.loadFromStorage(STORAGE_KEYS.SURVEYS, this.surveys);
    const newSurvey: SatisfactionSurvey = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.surveys.push(newSurvey);
    this.saveToStorage(STORAGE_KEYS.SURVEYS, this.surveys);
    return { data: newSurvey, error: null };
  }
  async getSurveys() {
    await delay(200);
    this.surveys = this.loadFromStorage(STORAGE_KEYS.SURVEYS, this.surveys);
    return { data: this.surveys, error: null };
  }
}

export const mockService = new MockService();