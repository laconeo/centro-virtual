import { supabase } from './supabaseClient';
import { UserSession, Volunteer, SatisfactionSurvey, Message } from '../types';

class SupabaseService {

    // --- SESSION METHODS ---

    async createSession(data: any) {
        // Sanitize input to remove 'terms' or any other non-DB fields
        const { terms, ...cleanData } = data;

        const { data: session, error } = await supabase
            .from('sessions')
            .insert({
                nombre: cleanData.nombre,
                apellido: cleanData.apellido,
                email: cleanData.email,
                pais: cleanData.pais,
                tema: cleanData.tema,
                sala_jitsi_id: cleanData.sala_jitsi_id,
                type: cleanData.type,
                estado: 'esperando',
                fecha_ingreso: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating session:', error);
            return { data: null, error };
        }

        return { data: this.mapSession(session), error: null };
    }

    async getSessions() {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .in('estado', ['esperando', 'en_atencion', 'abandonado', 'finalizado'])
            .order('fecha_ingreso', { ascending: true }); // Oldest first for queue

        if (error) {
            console.error('Error fetching sessions:', error);
            return { data: [], error };
        }

        return { data: data.map(this.mapSession), error: null };
    }

    async getSessionById(id: string) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return { data: null, error };
        return { data: this.mapSession(data), error: null };
    }

    async updateSessionStatus(id: string, status: UserSession['estado'], volunteerId?: string) {
        const updates: any = { estado: status };
        if (volunteerId) updates.voluntario_id = volunteerId;

        // Set timestamps based on status change
        if (status === 'en_atencion') {
            updates.fecha_atencion = new Date().toISOString();
        } else if (status === 'finalizado' || status === 'abandonado') {
            updates.fecha_fin = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('sessions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) return { data: null, error };
        return { data: this.mapSession(data), error: null };
    }

    // --- MESSAGING METHODS ---

    async getMessages(sessionId: string) {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) return { data: [], error };

        return {
            data: data.map(m => ({
                id: m.id,
                sessionId: m.session_id,
                sender: m.sender,
                text: m.text,
                timestamp: m.created_at
            })),
            error: null
        };
    }

    async sendMessage(sessionId: string, sender: string, text: string) {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                session_id: sessionId,
                sender,
                text
            })
            .select()
            .single();

        if (error) return { data: null, error };

        return {
            data: {
                id: data.id,
                sessionId: data.session_id,
                sender: data.sender,
                text: data.text,
                timestamp: data.created_at
            },
            error: null
        };
    }

    // --- VOLUNTEER METHODS ---

    // --- AUTH METHODS (Real Supabase Auth) ---

    async login(email: string, password?: string) {
        if (!password) return { data: null, error: 'Se requiere contraseña' };

        // 1. Auth with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) return { data: null, error: authError.message };
        if (!authData.user) return { data: null, error: 'No se pudo obtener el usuario' };

        // 2. Get Volunteer Profile (or create if missing sync)
        let { data: volunteer, error: profileError } = await supabase
            .from('volunteers')
            .select('*')
            .eq('email', email)
            .single();

        if (!volunteer) {
            // Auto-create profile if auth exists but profile doesn't
            const { data: newVol } = await supabase
                .from('volunteers')
                .insert({
                    email,
                    nombre: authData.user.user_metadata.full_name || email.split('@')[0],
                    status: 'online'
                })
                .select()
                .single();
            volunteer = newVol;
        } else {
            await this.updateVolunteerStatus(volunteer.id, 'online');
        }

        return { data: { ...volunteer, status: 'online' }, error: null };
    }

    async register(data: { email: string; password?: string; nombre: string }) {
        if (!data.password) return { data: null, error: 'Se requiere contraseña' };

        // 1. SignUp with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    full_name: data.nombre
                }
            }
        });

        if (authError) return { data: null, error: authError.message };

        // 2. Create or Update Profile in public.volunteers
        // We check if a volunteer profile already exists for this email
        if (authData.user) {

            // Check for existing profile by email
            const { data: existingProfile } = await supabase
                .from('volunteers')
                .select('id')
                .eq('email', data.email)
                .single();

            let dbResult;

            if (existingProfile) {
                // Profile exists (from old system), justify updating it
                dbResult = await supabase
                    .from('volunteers')
                    .update({
                        status: 'online',
                        // We could update name too if we wanted, but let's respect existing
                    })
                    .eq('email', data.email)
                    .select()
                    .single();
            } else {
                // New profile
                dbResult = await supabase
                    .from('volunteers')
                    .insert({
                        email: data.email,
                        nombre: data.nombre,
                        status: 'online'
                    })
                    .select()
                    .single();
            }

            return { data: dbResult.data, error: dbResult.error };
        }

        // If email confirmation is enabled, we might not get the user immediately in session
        return { data: null, error: 'Revisa tu email para confirmar tu cuenta antes de iniciar sesión.' };
    }

    async recoverPassword(email: string) {
        // Real Password Recovery
        // NOTE: This ONLY works if the user exists in Supabase Auth (auth.users).
        // If the user is only in the public.volunteers table (legacy), this will send nothing.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Check Supabase Dashboard -> URL Configuration
        });

        if (error) return { error: error.message };
        return { success: true };
    }

    async updateVolunteerStatus(id: string, status: 'online' | 'offline' | 'busy') {
        const { error } = await supabase
            .from('volunteers')
            .update({ status })
            .eq('id', id);

        return { error };
    }

    async getOnlineVolunteers() {
        // Return full list of online volunteers
        const { data, error } = await supabase
            .from('volunteers')
            .select('*')
            .eq('status', 'online');

        return { data: data || [], error };
    }

    async getOnlineVolunteersCount() {
        // Keep this for backward compatibility if needed, or just use the new one length
        const { count, error } = await supabase
            .from('volunteers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'online');

        return { count: count || 0, error };
    }

    // --- SURVEY METHODS ---

    async submitSurvey(data: any) {
        const { data: survey, error } = await supabase
            .from('surveys')
            .insert({
                session_id: data.sesion_id,
                calificacion: data.calificacion,
                comentarios: data.comentarios
            })
            .select()
            .single();

        if (error) return { data: null, error };
        return { data: survey, error: null };
    }

    async getSurveys() {
        const { data, error } = await supabase
            .from('surveys')
            .select('*');

        if (error) return { data: [], error };
        return {
            data: data.map(s => ({
                id: s.id,
                sesion_id: s.session_id,
                calificacion: s.calificacion,
                comentarios: s.comentarios,
                created_at: s.created_at
            })), error: null
        };
    }

    // --- HELPER ---
    private mapSession(dbSession: any): UserSession {
        // Calculate wait time: Time between entry and attention start (or now if still waiting)
        const endTimeWait = dbSession.fecha_atencion ? new Date(dbSession.fecha_atencion).getTime() : Date.now();
        const waitTime = Math.max(0, Math.floor((endTimeWait - new Date(dbSession.fecha_ingreso).getTime()) / 60000));

        // Calculate attention duration: Time between attention start and finish (or now if active)
        let durationConversation = 0;
        if (dbSession.fecha_atencion) {
            const endAttention = dbSession.fecha_fin ? new Date(dbSession.fecha_fin).getTime() : Date.now();
            durationConversation = Math.max(0, Math.floor((endAttention - new Date(dbSession.fecha_atencion).getTime()) / 60000));
        }

        return {
            id: dbSession.id,
            nombre: dbSession.nombre,
            apellido: dbSession.apellido,
            email: dbSession.email,
            pais: dbSession.pais,
            tema: dbSession.tema,
            estado: dbSession.estado,
            type: dbSession.type as 'video' | 'chat',
            sala_jitsi_id: dbSession.sala_jitsi_id,
            voluntario_id: dbSession.voluntario_id,
            fecha_ingreso: dbSession.fecha_ingreso,
            fecha_atencion: dbSession.fecha_atencion,
            fecha_fin: dbSession.fecha_fin,
            tiempo_espera_minutos: waitTime,
            duracion_conversacion_minutos: durationConversation,
            created_at: dbSession.created_at
        };
    }
}

export const supabaseService = new SupabaseService();
