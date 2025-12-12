import { UserSession, Volunteer, SatisfactionSurvey } from '../types';

// Seed Data for Volunteers
export const MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: 'vol-1',
    email: 'misionero@servicio.org',
    nombre: 'Elder Smith',
    status: 'online',
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'vol-2',
    email: 'hermana@servicio.org',
    nombre: 'Hermana Jones',
    status: 'offline',
    created_at: new Date('2024-01-15').toISOString()
  }
];

// Seed Data for Sessions
// Seed Data for Sessions
export const MOCK_SESSIONS: UserSession[] = [
  {
    id: 'ses-1',
    nombre: 'Juan',
    apellido: 'Perez',
    pais: 'México',
    tema: 'No puedo ver registros restringidos',
    email: 'juan@example.com',
    estado: 'esperando',
    type: 'video',
    tiempo_espera_minutos: 12,
    sala_jitsi_id: 'sala-juan-perez-123',
    fecha_ingreso: new Date(Date.now() - 12 * 60000).toISOString(), // hace 12 mins
    created_at: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    id: 'ses-2',
    nombre: 'Maria',
    apellido: 'Gonzalez',
    pais: 'Colombia',
    tema: 'Tengo duplicados en mi arbol',
    estado: 'esperando',
    type: 'chat',
    tiempo_espera_minutos: 5,
    sala_jitsi_id: 'sala-maria-gonzalez-456',
    fecha_ingreso: new Date(Date.now() - 5 * 60000).toISOString(), // hace 5 mins
    created_at: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: 'ses-3',
    nombre: 'Carlos',
    apellido: 'Rodriguez',
    pais: 'Perú',
    tema: 'Como puedo enviar mas nombres al templo',
    estado: 'finalizado',
    type: 'video',
    tiempo_espera_minutos: 2,
    duracion_conversacion_minutos: 15,
    sala_jitsi_id: 'sala-carlos-rodriguez-789',
    voluntario_id: 'vol-1',
    fecha_ingreso: new Date(Date.now() - 60 * 60000).toISOString(), // hace 1 hora
    created_at: new Date(Date.now() - 60 * 60000).toISOString()
  },
  {
    id: 'ses-4',
    nombre: 'Ana',
    apellido: 'Lopez',
    pais: 'Chile',
    tema: 'Acceso a FamilySearch',
    estado: 'en_atencion',
    type: 'video',
    tiempo_espera_minutos: 1,
    sala_jitsi_id: 'sala-ana-lopez-101',
    voluntario_id: 'vol-2', // Hermana Jones
    fecha_ingreso: new Date(Date.now() - 10 * 60000).toISOString(),
    created_at: new Date(Date.now() - 10 * 60000).toISOString()
  },
  {
    id: 'ses-5',
    nombre: 'Pedro',
    apellido: 'Ramirez',
    pais: 'Argentina',
    tema: 'Cual es el stado de mi solicitud de permiso 110',
    estado: 'abandonado',
    type: 'chat',
    tiempo_espera_minutos: 25,
    sala_jitsi_id: 'sala-pedro-ramirez-abandoned',
    fecha_ingreso: new Date(Date.now() - 40 * 60000).toISOString(),
    created_at: new Date(Date.now() - 40 * 60000).toISOString()
  }
];

// Seed Data for Surveys
export const MOCK_SURVEYS: SatisfactionSurvey[] = [
  {
    id: 'surv-1',
    sesion_id: 'ses-3',
    calificacion: 5,
    comentarios: 'Excelente ayuda, muy paciente.',
    created_at: new Date().toISOString()
  }
];

// Helpers for catalogs
export const PAISES = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'México',
  'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela'
];

export const TEMAS = [
  'Acceso a FamilySearch',
  'Cual es el stado de mi solicitud de permiso 110',
  'No puedo ver registros restringidos',
  'Tengo duplicados en mi arbol',
  'Como puedo enviar mas nombres al templo'
];