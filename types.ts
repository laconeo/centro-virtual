export interface UserSession {
  id: string; // UUID
  nombre: string;
  apellido: string;
  email?: string;
  pais: string;
  idioma?: string; // Idioma preferido del usuario (es, pt, fr, gn)
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
  voluntario_nombre?: string; // Nombre del voluntario que atiende
  created_at: string;
}

export interface Message {
  id: string;
  sessionId: string;
  sender: 'user' | 'volunteer' | 'system';
  text: string;
  timestamp: string;
  volunteer_id?: string; // ID del voluntario que envió el mensaje (si sender === 'volunteer')
}

export interface Role {
  id: string;
  name: string;
  is_leader: boolean; // simple flag for now
  description?: string;
}

export interface Volunteer {
  id: string; // UUID
  email: string;
  nombre: string;
  role_id?: string; // Foreign key to Role
  role?: Role; // Joined data
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
