export interface UserSession {
  id: string; // UUID
  nombre: string;
  apellido: string;
  email?: string;
  pais: string;
  tema: string;
  fecha_ingreso: string; // ISO String
  tiempo_espera_minutos: number;
  duracion_conversacion_minutos?: number;
  sala_jitsi_id: string;
  estado: 'esperando' | 'en_atencion' | 'finalizado' | 'no_atendido' | 'abandonado';
  type: 'video' | 'chat';
  voluntario_id?: string;
  created_at: string;
}

export interface Message {
  id: string;
  sessionId: string;
  sender: 'user' | 'volunteer' | 'system';
  text: string;
  timestamp: string;
}

export interface Volunteer {
  id: string; // UUID
  email: string;
  nombre: string;
  created_at: string;
}

export interface SatisfactionSurvey {
  id: string; // UUID
  sesion_id: string;
  calificacion: number; // 1-5
  comentarios?: string;
  created_at: string;
}
