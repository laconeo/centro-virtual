export interface UserSession {
  id: string; // UUID
  nombre: string;
  apellido: string;
  email?: string;
  pais: string;
  tema: string;
  fecha_ingreso: string; // ISO String
  fecha_atencion?: string; // ISO String - When volunteer started help
  fecha_fin?: string; // ISO String - When session ended
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
  status: 'online' | 'offline' | 'busy';
  last_status_change?: string; // ISO String
  created_at: string;
}

export interface SatisfactionSurvey {
  id: string; // UUID
  sesion_id: string;
  calificacion: number; // 1-5
  comentarios?: string;
  created_at: string;
}

export interface Topic {
  id: string;
  pais: string;
  titulo: string;
  active: boolean;
  created_at: string;
}
