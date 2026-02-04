---
description: Plan de optimización para manejo de concurrencia
---

# Plan de Optimización - Sistema de Registro y Autenticación

## Problemas Identificados

### 1. Proceso de Registro (VolunteerLogin.tsx)
**Problema**: Múltiples queries secuenciales
- `supabase.auth.signUp()` 
- `SELECT` para verificar perfil existente
- `INSERT` o `UPDATE` en tabla volunteers

**Impacto**: ~500-1000ms por registro con 7 usuarios simultáneos

### 2. Proceso de Login
**Problema**: Actualización de estado en cada login
- `supabase.auth.signInWithPassword()`
- `SELECT` del perfil
- `UPDATE` del estado a 'online'

**Impacto**: ~300-500ms por login

### 3. Carga de Tópicos (UserFlow.tsx)
**Problema**: Query ejecutado cada vez que cambia el país
- No hay caché
- Query con OR condicional

**Impacto**: Pantalla en blanco si la query es lenta

### 4. Notificación de Voluntarios
**Problema**: Query con JOIN + envío secuencial de emails
- Query complejo con relación a roles
- Emails enviados uno por uno con Promise.all

**Impacto**: Bloquea la creación de sesión

## Soluciones Propuestas

### Optimización 1: Usar RPC Functions para Registro
Crear una función de PostgreSQL que maneje todo el proceso de registro en una sola transacción.

**Beneficios**:
- Reduce round-trips a la BD
- Manejo atómico de transacciones
- Mejor rendimiento bajo concurrencia

### Optimización 2: Lazy Loading del Estado de Voluntario
No actualizar el estado a 'online' durante el login, hacerlo después en background.

**Beneficios**:
- Login más rápido
- Mejor experiencia de usuario

### Optimización 3: Caché de Tópicos
Implementar caché local de tópicos con invalidación inteligente.

**Beneficios**:
- Formulario carga instantáneamente
- Reduce carga en BD

### Optimización 4: Notificaciones Asíncronas
Mover la notificación de voluntarios a un proceso background/webhook.

**Beneficios**:
- Creación de sesión más rápida
- No bloquea al usuario

### Optimización 5: Índices en Base de Datos
Asegurar índices apropiados en:
- `volunteers.email`
- `topics.pais`
- `sessions.estado`

## Prioridad de Implementación

1. **Alta**: Optimización 3 (Caché de Tópicos) - Soluciona pantalla en blanco
2. **Alta**: Optimización 4 (Notificaciones Asíncronas) - Mejora tiempo de respuesta
3. **Media**: Optimización 2 (Lazy Loading) - Mejora login
4. **Media**: Optimización 1 (RPC Functions) - Mejora registro
5. **Baja**: Optimización 5 (Índices) - Mejora general

## Métricas Esperadas

**Antes**:
- Registro: ~800ms
- Login: ~400ms
- Carga formulario: ~300ms (puede fallar)
- Creación sesión: ~600ms

**Después**:
- Registro: ~300ms
- Login: ~150ms
- Carga formulario: ~50ms (con caché)
- Creación sesión: ~200ms
