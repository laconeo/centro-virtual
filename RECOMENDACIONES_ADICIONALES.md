# Recomendaciones Adicionales de Rendimiento

## Configuración de Supabase

### 1. Connection Pooling
Para manejar mejor la concurrencia, configura PgBouncer en Supabase:

1. Ve a **Database Settings** en tu proyecto Supabase
2. Habilita **Connection Pooling**
3. Usa el connection string con pooling en producción:
   ```
   postgresql://[user]:[password]@[host]:6543/postgres
   ```
   (Nota el puerto 6543 en lugar de 5432)

### 2. Row Level Security (RLS)
Asegúrate de que las políticas RLS estén optimizadas:

```sql
-- Ejemplo: Política optimizada para sessions
CREATE POLICY "Users can view their own sessions"
ON sessions FOR SELECT
USING (auth.uid() = user_id OR estado = 'esperando');

-- Usa índices en las columnas usadas en políticas RLS
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### 3. Realtime Subscriptions
Si usas subscripciones en tiempo real, limita los canales:

```typescript
// ❌ Evitar: Suscribirse a toda la tabla
const subscription = supabase
  .from('sessions')
  .on('*', callback)
  .subscribe();

// ✅ Mejor: Suscribirse solo a lo necesario
const subscription = supabase
  .from('sessions')
  .on('INSERT', callback)
  .filter('estado', 'eq', 'esperando')
  .subscribe();
```

## Optimizaciones de Frontend

### 1. Code Splitting
Implementa lazy loading para componentes grandes:

```typescript
// En App.tsx o donde se usen componentes pesados
import { lazy, Suspense } from 'react';

const VolunteerDashboard = lazy(() => import('./components/VolunteerDashboard'));
const ReportsDashboard = lazy(() => import('./components/ReportsDashboard'));

// Uso:
<Suspense fallback={<Loader />}>
  <VolunteerDashboard />
</Suspense>
```

### 2. Debouncing en Búsquedas
Si tienes campos de búsqueda, implementa debouncing:

```typescript
import { useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Uso:
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    // Hacer búsqueda
  }
}, [debouncedSearch]);
```

### 3. Memoización de Componentes
Usa React.memo para componentes que no cambian frecuentemente:

```typescript
import { memo } from 'react';

export const TopicItem = memo(({ topic }: { topic: Topic }) => {
  return <option value={topic.titulo}>{topic.titulo}</option>;
});
```

## Monitoreo y Alertas

### 1. Implementar Logging Estructurado
```typescript
// services/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    // Aquí podrías enviar a un servicio como Sentry
  },
  performance: (operation: string, duration: number) => {
    console.log(`[PERF] ${operation}: ${duration}ms`);
    // Enviar a analytics si duration > threshold
  }
};

// Uso:
const start = Date.now();
await supabaseService.login(email, password);
logger.performance('login', Date.now() - start);
```

### 2. Error Boundaries
Implementa error boundaries para capturar errores:

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Enviar a servicio de logging
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Algo salió mal</h1>
          <p>Por favor, recarga la página</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Configuración de Producción

### 1. Variables de Entorno
Asegúrate de tener configuraciones separadas:

```bash
# .env.production
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-key-de-produccion
VITE_ENABLE_ANALYTICS=true
VITE_LOG_LEVEL=error
```

### 2. Build Optimizations
En `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['lucide-react', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.logs en producción
      }
    }
  }
});
```

### 3. Caché HTTP
Configura headers de caché en tu servidor:

```
# Para assets estáticos
Cache-Control: public, max-age=31536000, immutable

# Para index.html
Cache-Control: no-cache, must-revalidate
```

## Testing de Carga

### Herramientas Recomendadas

1. **Artillery** - Para pruebas de carga
```bash
npm install -g artillery

# artillery.yml
config:
  target: 'https://tu-app.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "User Registration Flow"
    flow:
      - post:
          url: "/api/register"
          json:
            email: "test{{ $randomNumber() }}@test.com"
            password: "test123"
```

2. **Lighthouse CI** - Para métricas de rendimiento
```bash
npm install -g @lhci/cli

# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['https://tu-app.com'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['error', {maxNumericValue: 2000}],
        'interactive': ['error', {maxNumericValue: 3500}]
      }
    }
  }
};
```

## Checklist de Despliegue

Antes de cada despliegue a producción:

- [ ] Ejecutar `npm run build` sin errores
- [ ] Aplicar migraciones de BD (`migration_performance_indexes.sql`)
- [ ] Verificar variables de entorno en producción
- [ ] Ejecutar pruebas de carga con 20+ usuarios
- [ ] Verificar que el caché funcione correctamente
- [ ] Revisar logs de Supabase por queries lentas
- [ ] Verificar que las notificaciones por email funcionen
- [ ] Probar flujo completo: registro → login → crear sesión
- [ ] Verificar tiempos de respuesta < 500ms para operaciones críticas
- [ ] Confirmar que no hay memory leaks (usar Chrome DevTools)

## Métricas a Monitorear

### En Supabase Dashboard
- **Database → Query Performance**: Queries que toman > 100ms
- **Database → Connections**: Número de conexiones activas
- **API → Logs**: Errores 500 o timeouts

### En Browser
- **Network Tab**: Tiempo de carga de recursos
- **Performance Tab**: FCP, LCP, TTI
- **Memory Tab**: Uso de memoria a lo largo del tiempo

### Alertas Recomendadas
- Response time > 1 segundo
- Error rate > 1%
- Database connections > 80% del límite
- Cache hit rate < 70%

---

**Nota**: Estas son recomendaciones adicionales. Las optimizaciones principales ya están implementadas en el código.
