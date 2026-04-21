import { supabase } from './supabaseClient';
import { UserSession, Volunteer, SatisfactionSurvey, Message, Topic } from '../types';
import emailjs from '@emailjs/browser';
import { cacheService } from './cacheService';

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
                idioma: cleanData.idioma,
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

        // OPTIMIZATION: Run notification check asynchronously (don't await)
        // This prevents blocking the user's session creation
        this.checkAndNotifyVolunteers(session).catch(err =>
            console.error('Error in background notification:', err)
        );

        return { data: this.mapSession(session), error: null };
    }

    async getSessions(activeOnly: boolean = false) {
        let query = supabase
            .from('sessions')
            .select('*, volunteer:volunteers(nombre)');

        if (activeOnly) {
            query = query.in('estado', ['esperando', 'en_atencion']);
        } else {
            query = query.in('estado', ['esperando', 'en_atencion', 'abandonado', 'finalizado']);
        }

        const { data, error } = await query.order('fecha_ingreso', { ascending: true }); // Oldest first for queue

        if (error) {
            console.error('Error fetching sessions:', error);
            return { data: [], error };
        }

        return { data: data.map(this.mapSession), error: null };
    }

    async getHistory() {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .in('estado', ['abandonado', 'finalizado'])
            .order('fecha_ingreso', { ascending: false });

        if (error) {
            console.error('Error fetching history:', error);
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
            .select('*, volunteer:volunteers(nombre)')
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
                timestamp: m.created_at,
                volunteer_id: m.volunteer_id
            })),
            error: null
        };
    }

    async sendMessage(sessionId: string, sender: string, text: string, volunteerId?: string) {
        const messageData: any = {
            session_id: sessionId,
            sender,
            text
        };

        // Si es un voluntario, guardar su ID
        if (sender === 'volunteer' && volunteerId) {
            messageData.volunteer_id = volunteerId;
        }

        const { data, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select()
            .single();

        if (error) return { data: null, error };

        return {
            data: {
                id: data.id,
                sessionId: data.session_id,
                sender: data.sender,
                text: data.text,
                timestamp: data.created_at,
                volunteer_id: data.volunteer_id
            },
            error: null
        };
    }

    // --- VOLUNTEER METHODS ---

    // --- AUTH METHODS (Real Supabase Auth) ---

    async getCurrentVolunteer() {
        // Obtenemos la sesión asíncrona real en lugar de getSession para evitar bugs
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return null;

        const { data: volunteer } = await supabase
            .from('volunteers')
            .select('*')
            .eq('email', session.user.email)
            .single();

        if (volunteer) {
            // Check if status is offline and update if needed, or just return as online
            if (volunteer.status === 'offline') {
                await this.updateVolunteerStatus(volunteer.id, 'online');
                volunteer.status = 'online';
            }
            return volunteer;
        }
        return null;
    }

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
            // OPTIMIZATION: Update status asynchronously (don't await)
            // This makes login faster - status will update in background
            this.updateVolunteerStatus(volunteer.id, 'online').catch(err =>
                console.error('Error updating volunteer status:', err)
            );
        }

        return { data: { ...volunteer, status: 'online' }, error: null };
    }

    async onAuthStateChange(callback: (event: string, session: any) => void) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
        return subscription;
    }

    async updatePassword(newPassword: string) {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) return { error: error.message };
        return { success: true };
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
        // OPTIMIZATION: Check cache first
        const cacheKey = 'all_volunteers';
        const cachedData = cacheService.get<any[]>(cacheKey);
        if (cachedData) return { data: cachedData, error: null };

        // Now fetching with roles
        const { data, error } = await supabase
            .from('volunteers')
            .select('*, role:roles(*)')
            .order('status', { ascending: true }); // specific ordering if needed

        if (data && !error) {
            // Cache for 2 minutes - volunteers status changes relatively often but names don't
            cacheService.set(cacheKey, data, 2 * 60 * 1000);
        }

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
            idioma: dbSession.idioma,
            tema: dbSession.tema,
            estado: dbSession.estado,
            type: dbSession.type as 'video' | 'chat',
            sala_jitsi_id: dbSession.sala_jitsi_id,
            voluntario_id: dbSession.voluntario_id,
            voluntario_nombre: dbSession.volunteer?.nombre, // Extract volunteer name from JOIN
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
        // OPTIMIZATION: Use cache to avoid repeated DB queries
        const cacheKey = `topics:${country || 'all'}`;
        const cached = cacheService.get<Topic[]>(cacheKey);

        if (cached) {
            return { data: cached, error: null };
        }

        let query = supabase.from('topics').select('*').eq('active', true);

        if (country) {
            query = query.or(`pais.eq.${country},pais.eq.Todos`);
        } else {
            query = query.eq('pais', 'Todos');
        }

        const { data, error } = await query.order('pais', { ascending: true });

        if (data && !error) {
            // Cache for 5 minutes
            cacheService.set(cacheKey, data as Topic[], 5 * 60 * 1000);
        }

        return { data: data as Topic[] || [], error };
    }

    async getAllTopics() {
        // For admin screen
        const { data, error } = await supabase.from('topics').select('*').order('created_at', { ascending: false });
        return { data: data as Topic[] || [], error };
    }

    async createTopic(topic: { pais: string; titulo: string }) {
        const { data, error } = await supabase.from('topics').insert(topic).select().single();

        // Invalidate cache when topics are modified
        if (!error) {
            cacheService.invalidatePattern('topics:');
        }

        return { data, error };
    }

    async deleteTopic(id: string) {
        const { error } = await supabase.from('topics').delete().eq('id', id);

        // Invalidate cache when topics are modified
        if (!error) {
            cacheService.invalidatePattern('topics:');
        }

        return { error };
    }

    // --- EXTENSIONS DASHBOARD ---
    async getExtensionInstallsCount() {
        const userCountResp = await supabase
            .from('extension_installs')
            .select('*', { count: 'exact', head: true })
            .eq('extension_type', 'user');

        const missionaryCountResp = await supabase
            .from('extension_installs')
            .select('*', { count: 'exact', head: true })
            .eq('extension_type', 'missionary');

        return {
            data: {
                user: userCountResp.count || 0,
                missionary: missionaryCountResp.count || 0,
            },
            error: userCountResp.error || missionaryCountResp.error
        };
    }
    
    // --- SHIFT MANAGEMENT (GUARDIAS) ---

    async getShifts(startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('shifts')
            .select('*, volunteer:volunteers(nombre, email)')
            .gte('date', startDate)
            .lte('date', endDate);
        return { data: data || [], error };
    }

    async createShift(shift: { volunteer_id: string; date: string; start_time?: string; end_time?: string }) {
        const { data, error } = await supabase.from('shifts').insert(shift).select().single();
        return { data, error };
    }

    async deleteShift(id: string) {
        const { error } = await supabase.from('shifts').delete().eq('id', id);
        return { error };
    }

    async recordLogin(volunteerId: string) {
        const today = new Date().toLocaleDateString('en-CA');
        // Using upsert or manually checking to avoid duplicate key errors.
        // Supabase has upsert, but we need to ignore conflicts on (volunteer_id, date) if we don't want to update first_login_at
        const { error } = await supabase.from('volunteer_logins').upsert({
            volunteer_id: volunteerId,
            date: today,
        }, { onConflict: 'volunteer_id,date', ignoreDuplicates: true });
        
        if (error) console.error("Error recording login:", error);
    }

    async getVolunteerMetrics(startDate: string, endDate: string, volunteers: Volunteer[]) {
        // 1. Get Shifts
        const shiftsRes = await supabase.from('shifts').select('*').gte('date', startDate).lte('date', endDate);
        const shifts = shiftsRes.data || [];

        // 2. Get Logins
        const loginsRes = await supabase.from('volunteer_logins').select('*').gte('date', startDate).lte('date', endDate);
        const logins = loginsRes.data || [];

        // 3. Get Sessions to calculate attended (Need history sessions attended by them)
        const sessionsRes = await supabase.from('sessions')
            .select('volunteered_by:voluntario_id, fecha_ingreso')
            .in('estado', ['finalizado'])
            .gte('fecha_ingreso', startDate)
            // Note: date logic here can be tricky due to timezones, but we'll approximate based on date prefix. 
            // In a real app we might need exact boundaries. We'll add one day to end date to fetch all.
            .lte('fecha_ingreso', endDate + 'T23:59:59Z');
        
        const attendedSessions = sessionsRes.data || [];

        // Build Indicators
        const indicators: Record<string, any> = {};
        
        volunteers.forEach(v => {
            indicators[v.id] = {
                volunteerId: v.id,
                volunteerName: v.nombre,
                days: {}
            };
        });

        // Initialize Days within the range (using local time parsing)
        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, sDay);
        const end = new Date(eYear, eMonth - 1, eDay);
        
        for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
           const dateStr = d.toLocaleDateString('en-CA');
           Object.values(indicators).forEach(ind => {
               ind.days[dateStr] = { hasShift: false, loggedIn: false, sessionsAttended: 0 };
           });
        }

        // Apply logic
        shifts.forEach(s => {
            if (indicators[s.volunteer_id] && indicators[s.volunteer_id].days[s.date]) {
                indicators[s.volunteer_id].days[s.date].hasShift = true;
            }
        });

        logins.forEach(l => {
            if (indicators[l.volunteer_id] && indicators[l.volunteer_id].days[l.date]) {
                indicators[l.volunteer_id].days[l.date].loggedIn = true;
            }
        });

        attendedSessions.forEach(ses => {
            const dateOnly = new Date(ses.fecha_ingreso).toLocaleDateString('en-CA');
            const vId = ses.volunteered_by;
            if (vId && indicators[vId] && indicators[vId].days[dateOnly]) {
                 indicators[vId].days[dateOnly].sessionsAttended++;
            }
        });

        return indicators;
    }

    async getDetailedSessionsByDay(date: string) {
        const { data, error } = await supabase
            .from('sessions')
            .select('volunteered_by:voluntario_id, nombre, apellido, fecha_ingreso, estado')
            .eq('estado', 'finalizado')
            .gte('fecha_ingreso', date + 'T00:00:00Z')
            .lte('fecha_ingreso', date + 'T23:59:59Z');
        return { data: data || [], error };
    }


}

export const supabaseService = new SupabaseService();
