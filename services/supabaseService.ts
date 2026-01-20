import { supabase } from './supabaseClient';
import { UserSession, Volunteer, SatisfactionSurvey, Message, Topic } from '../types';
import emailjs from '@emailjs/browser';

class SupabaseService {

    // --- SESSION METHODS ---

    async checkAndNotifyVolunteers(sessionData: any) {
        const { count } = await this.getOnlineVolunteersCount();

        if (count === 0) {
            console.log('No online volunteers found. Initiating volunteer notification protocol...');

            // 1. Fetch volunteers with their roles
            const { data: volunteers, error } = await supabase
                .from('volunteers')
                .select('email, nombre, role:roles(is_leader)')
                .not('email', 'is', null);

            if (error || !volunteers) {
                console.error('Error fetching volunteer emails:', error);
                return;
            }

            // Filter only leaders
            const leaders = volunteers.filter((v: any) => v.role?.is_leader === true);
            const emails = leaders.map((v: any) => v.email);

            if (emails.length > 0) {
                console.log(`Sending email alert via EmailJS to ${emails.length} leaders...`);

                const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

                if (!serviceId || !templateId || !publicKey || serviceId === 'your_service_id') {
                    console.warn('EmailJS not configured. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in .env');
                    return;
                }

                const promises = emails.map((email: string) => {
                    const templateParams = {
                        to_email: email,
                        user_name: `${sessionData.nombre} ${sessionData.apellido}`,
                        user_country: sessionData.pais,
                        user_topic: sessionData.tema,
                        message: `El usuario está esperando en la sala virtual. Se requiere asistencia de un líder o voluntario disponible.`
                    };

                    return emailjs.send(serviceId, templateId, templateParams, publicKey)
                        .then(() => console.log(`Email sent to ${email}`))
                        .catch((err) => console.error(`Failed to send email to ${email}`, err));
                });

                await Promise.all(promises);

            } else {
                console.log('No leader emails found to notify.');
            }
        }
    }

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

    async getReportData(startDate?: string, endDate?: string) {
        let query = supabase
            .from('sessions')
            .select('*')
            .order('fecha_ingreso', { ascending: false });

        if (startDate) {
            query = query.gte('fecha_ingreso', startDate);
        }
        if (endDate) {
            // Add one day to end date to include the full day
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            query = query.lt('fecha_ingreso', nextDay.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching report data:', error);
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

        // Always redirect to the production URL as requested
        const redirectTo = 'https://laconeo.github.io/centro-virtual';

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        });

        if (error) return { error: error.message };
        return { success: true };
    }

    async updateVolunteerStatus(id: string, status: 'online' | 'offline' | 'busy') {
        const updates: any = { status };
        updates.last_status_change = new Date().toISOString();

        const { error } = await supabase
            .from('volunteers')
            .update(updates)
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

    // --- ROLE METHODS ---

    async getRoles() {
        const { data, error } = await supabase.from('roles').select('*');
        return { data: data as any[] || [], error };
    }

    async createRole(role: any) {
        const { data, error } = await supabase.from('roles').insert(role).select().single();
        return { data, error };
    }

    async updateRole(id: string, updates: any) {
        const { data, error } = await supabase.from('roles').update(updates).eq('id', id).select().single();
        return { data, error };
    }

    async deleteRole(id: string) {
        const { error } = await supabase.from('roles').delete().eq('id', id);
        return { error };
    }

    // --- VOLUNTEER (Admin) ---

    async updateVolunteerRole(volunteerId: string, roleId: string) {
        const { data, error } = await supabase
            .from('volunteers')
            .update({ role_id: roleId })
            .eq('id', volunteerId)
            .select()
            .single();
        return { data, error };
    }

    async getAllVolunteers() {
        // Now fetching with roles
        const { data, error } = await supabase
            .from('volunteers')
            .select('*, role:roles(*)')
            .order('status', { ascending: true }); // specific ordering if needed

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

    // --- TOPIC METHODS ---

    async getTopics(country?: string) {
        let query = supabase.from('topics').select('*').eq('active', true);

        if (country) {
            query = query.or(`pais.eq.${country},pais.eq.Todos`);
        } else {
            query = query.eq('pais', 'Todos');
        }

        const { data, error } = await query.order('pais', { ascending: true });
        return { data: data as Topic[] || [], error };
    }

    async getAllTopics() {
        // For admin screen
        const { data, error } = await supabase.from('topics').select('*').order('created_at', { ascending: false });
        return { data: data as Topic[] || [], error };
    }

    async createTopic(topic: { pais: string; titulo: string }) {
        const { data, error } = await supabase.from('topics').insert(topic).select().single();
        return { data, error };
    }

    async deleteTopic(id: string) {
        const { error } = await supabase.from('topics').delete().eq('id', id);
        return { error };
    }


}

export const supabaseService = new SupabaseService();
